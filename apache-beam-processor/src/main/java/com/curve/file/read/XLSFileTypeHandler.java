package com.curve.file.read;

import com.curve.file.read.iterator.PoiClosableIterator;
import com.curve.file.read.iterator.TabularDataSupplier;
import com.curve.file.read.source.DataRowUnsplitableBoundedSource;
import com.curve.file.read.source.StartingRowAwareBoundedReader;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.DefaultValue;
import com.curve.pojos.input.config.source.FileSource;
import com.curve.pojos.input.config.type.AbstractExcelFileType;
import com.curve.pojos.input.schemas.InputColumnSchemas;
import com.curve.pojos.transformations.value.ValueProvider;
import com.curve.util.DefaultValueMapping;
import com.curve.util.parser.data.row.DataRowParser;
import com.curve.util.parser.data.wrapper.PoiDataWrapperParser;
import com.curve.util.parser.line.LineSplitter;
import com.curve.util.parser.line.PoiLineSplitter;
import com.monitorjbl.xlsx.StreamingReader;
import org.apache.beam.sdk.io.BoundedSource;
import org.apache.beam.sdk.options.PipelineOptions;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Workbook;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.*;

/**
 * FileTypeReader for XLS formatted files.
 */
public class XLSFileTypeHandler extends SourcedFileTypeHandler {
    private static final int BUFFER_SIZE = 4096;
    private static final int ROW_SIZE = 100;

    private final AbstractExcelFileType fileType;

    public XLSFileTypeHandler(AbstractExcelFileType fileType) {
        this.fileType = fileType;
    }

    @Override
    @Nonnull
    public DefaultValueMapping extractDefaultValuesFromFile(
            @Nonnull FileSource fileSource,
            @Nonnull List<DefaultValue> defaultValues
    ) throws IOException {
        TabularDataSupplier<Row> supplier = () -> new PoiClosableIterator(fileSource, fileType);
        LineSplitter<Row, Cell> splitter = new PoiLineSplitter();
        
        var parser = new PoiDataWrapperParser();
        
        return new DefaultValueLookupStrategy().extractDefaultValuesFromFile(supplier, splitter, parser, defaultValues);
    }

    @Nonnull
    @Override
    public BigDecimal getTotalUnits(@Nonnull FileSource fileSource, @Nonnull InputColumnSchemas inputColumnSchemas, @Nonnull ValueProvider valueProvider, @Nonnull DefaultValueMapping defaultValues) throws IOException {
        TabularDataSupplier<Row> supplier = () -> new PoiClosableIterator(fileSource, fileType);

        LineSplitter<Row, Cell> splitter = new PoiLineSplitter();
        
        DataRowParser<Cell> parser = new DataRowParser<>(
                fileType,
                inputColumnSchemas,
                defaultValues,
                new PoiDataWrapperParser()
        );

        return new TotalUnitCalculationStrategy().findTotalUnits(supplier, splitter, parser, valueProvider, fileType);
    }
    
    /**
     * Gives a Source for accessing DataRows from a XLS formatted file.
     * <p>
     * Source capabilities:
     * * Able to stream the file (memory efficient)
     * * Unsplitable (loading of data cannot be parallelized)
     *
     * @param fileSource            Used to access the file from the source
     * @param inputColumnSchemas    The input schema
     * @param defaultValues         A map of DefaultValues to their values, for use in creating DataRows
     * @return A source for accessing data rows
     */
    @Override
    protected BoundedSource<DataRow> createRowSource(
            @Nonnull FileSource fileSource,
            @Nonnull InputColumnSchemas inputColumnSchemas,
            @Nonnull DefaultValueMapping defaultValues
    ) {
        return new XLSSource(fileSource, fileType, inputColumnSchemas, defaultValues);
    }

    /**
     * Creates an Apache POI workbook from the given input stream.
     * <p>
     * This is a streaming workbook - Avoid accessing anything other than the iterator for the rows.
     *
     * @param in The input stream for the file
     * @return A workbook
     */
    private static Workbook createWorkbook(InputStream in) {
        return StreamingReader.builder()
                .rowCacheSize(ROW_SIZE)
                .bufferSize(BUFFER_SIZE)
                .open(in);
    }

    /**
     * Gets a string representation of the value of the cell.
     *
     * @param cell The cell to extract the data from
     * @return The value of the cell, as a string
     */
    @Nullable
    private static String getCellValueAsString(@Nullable Cell cell) {
        if (cell == null) return null;

        return switch (cell.getCellType()) {
            case NUMERIC -> BigDecimal.valueOf(cell.getNumericCellValue()).toPlainString();
            default -> cell.getStringCellValue();
        };
    }

    /**
     * A source for accessing DataRows from a XLS formatted file
     */
    private static class XLSSource extends DataRowUnsplitableBoundedSource {

        private final FileSource fileSource;
        private final AbstractExcelFileType fileType;
        private final InputColumnSchemas inputColumnSchemas;
        private final DefaultValueMapping defaultValueMapping;

        private XLSSource(@Nonnull FileSource fileSource,
                          @Nonnull AbstractExcelFileType fileType,
                          InputColumnSchemas inputColumnSchemas,
                          DefaultValueMapping defaultValueMapping) {
            this.fileSource = fileSource;
            this.fileType = fileType;
            this.inputColumnSchemas = inputColumnSchemas;
            this.defaultValueMapping = defaultValueMapping;
        }

        @Override
        public BoundedReader<DataRow> createReader(@Nonnull PipelineOptions options) {
            return new SheetReader(this, fileSource, fileType, inputColumnSchemas, defaultValueMapping);
        }
    }

    /**
     * A reader for accessing DataRows from a XLS formatted file
     */
    private static class SheetReader extends StartingRowAwareBoundedReader<DataRow, AbstractExcelFileType> {

        private final BoundedSource<DataRow> source;
        private final DataRowParser<Cell> parser;
        private final PoiLineSplitter splitter = new PoiLineSplitter();
        private final FileSource fileSource;

        private Workbook workbook;
        private Iterator<Row> rowIterator;

        private Cell[] currentRow;

        public SheetReader(
                @Nonnull BoundedSource<DataRow> source,
                @Nonnull FileSource fileSource,
                @Nonnull AbstractExcelFileType fileType,
                @Nonnull InputColumnSchemas inputColumnSchemas,
                @Nonnull DefaultValueMapping defaultValueMapping
        ) {
            super(fileType);
            this.source = source;
            this.parser = new DataRowParser<>(
                    fileType, 
                    inputColumnSchemas, 
                    defaultValueMapping, 
                    new PoiDataWrapperParser()
            );
            this.fileSource = fileSource;
        }

        @Override
        public boolean start() throws IOException {
            this.workbook = createWorkbook(fileSource.getInputStream());
            this.rowIterator = workbook.getSheetAt(fileType.getTab()).iterator();
            return super.start();
        }

        @Override
        public boolean advance() throws IOException {
            if (rowIterator.hasNext()) {
                var row = rowIterator.next();
                currentRow = row != null ? splitter.split(row) : null;
            } else {
                currentRow = null;
            }

            return currentRow != null;
        }

        @Override
        public DataRow getCurrent() {
            return parser.parse(currentRow);
        }

        @Override
        public void close() throws IOException {
            if (workbook != null) {
                workbook.close();
            }
        }

        @Override
        @Nonnull
        public BoundedSource<DataRow> getCurrentSource() {
            return source;
        }
    }
}
