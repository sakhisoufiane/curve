package com.curve.file.read;

import com.curve.file.read.excel.XLSBFileReader;
import com.curve.file.read.iterator.TabularDataSupplier;
import com.curve.file.read.iterator.XLSBClosableIterator;
import com.curve.file.read.source.DataRowUnsplitableBoundedSource;
import com.curve.file.read.source.StartingRowAwareBoundedReader;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.DefaultValue;
import com.curve.pojos.input.config.source.FileSource;
import com.curve.pojos.input.config.type.XLSBFileType;
import com.curve.pojos.input.schemas.InputColumnSchemas;
import com.curve.pojos.transformations.value.ValueProvider;
import com.curve.util.DefaultValueMapping;
import com.curve.util.parser.data.row.DataRowParser;
import com.curve.util.parser.data.wrapper.StringDataWrapperParser;
import com.curve.util.parser.line.NoOpLineSplitter;
import org.apache.beam.sdk.io.BoundedSource;
import org.apache.beam.sdk.options.PipelineOptions;
import org.apache.poi.openxml4j.util.ZipSecureFile;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;

/**
 * FileTypeReader for XLSB formatted files.
 */
public class XLSBFileTypeHandler extends SourcedFileTypeHandler {
    private static final long MAX_TEXT_SIZE = 0xFFFFFFFFL; // 4GB

    static {
        // Probably not ideal but a workaround for now
        ZipSecureFile.setMaxTextSize(MAX_TEXT_SIZE);
    }

    private final XLSBFileType fileType;

    public XLSBFileTypeHandler(XLSBFileType fileType) {
        this.fileType = fileType;
    }

    @Override
    @Nonnull
    public DefaultValueMapping extractDefaultValuesFromFile(
            @Nonnull FileSource fileSource,
            @Nonnull List<DefaultValue> defaultValues
    ) throws IOException {
        TabularDataSupplier<String[]> supplier = () -> new XLSBClosableIterator(fileSource, fileType);
        var splitter = new NoOpLineSplitter<String>();
        var parser = new StringDataWrapperParser();
        return new DefaultValueLookupStrategy().extractDefaultValuesFromFile(supplier, splitter, parser, defaultValues);
    }

    @Nonnull
    @Override
    public BigDecimal getTotalUnits(@Nonnull FileSource fileSource, @Nonnull InputColumnSchemas inputColumnSchemas, @Nonnull ValueProvider valueProvider, @Nonnull DefaultValueMapping defaultValues) throws IOException {
        TabularDataSupplier<String[]> supplier = () -> new XLSBClosableIterator(fileSource, fileType);
        var splitter = new NoOpLineSplitter<String>();
        DataRowParser<String> parser = new DataRowParser<>(
                fileType,
                inputColumnSchemas,
                defaultValues,
                new StringDataWrapperParser()
        );

        return new TotalUnitCalculationStrategy().findTotalUnits(supplier, splitter, parser, valueProvider, fileType);
    }

    /**
     * Gives a Source for accessing DataRows from a XLSB formatted file.
     * <p>
     * Source capabilities:
     * * Not able to stream the file (memory inefficient)
     * * Unsplitable (loading of data cannot be parallelized)
     *
     * @param fileSource         Used to access the file from the source
     * @param inputColumnSchemas Describes what is contained within the row
     * @param defaultValues      A map of DefaultValues to their values, for use in creating DataRows
     * @return A source for accessing data rows
     */
    @Override
    protected BoundedSource<DataRow> createRowSource(
            @Nonnull FileSource fileSource,
            @Nonnull InputColumnSchemas inputColumnSchemas,
            @Nonnull DefaultValueMapping defaultValues
    ) {
        return new XLSBSource(
                fileSource,
                fileType,
                inputColumnSchemas,
                defaultValues
        );
    }

    /**
     * Extract all the rows from file
     *
     * @param fileSource From where to source the file from
     * @param fileType   Information on the type of file we are parsing
     * @return An array, where each element represents a line in the file
     * @throws IOException Occurs during access to the file
     */
    private static List<List<String>> getAllRows(FileSource fileSource, XLSBFileType fileType) throws IOException {
        return new XLSBFileReader().readFile(fileSource, fileType.getTab());
    }

    /**
     * A source for accessing DataRows from a XLSB formatted file
     */
    private static class XLSBSource extends DataRowUnsplitableBoundedSource {

        private final FileSource fileSource;
        private final XLSBFileType fileType;
        private final InputColumnSchemas inputColumnSchemas;
        private final DefaultValueMapping defaultValueMapping;

        private XLSBSource(
                FileSource fileSource,
                XLSBFileType fileType,
                InputColumnSchemas inputColumnSchemas,
                DefaultValueMapping defaultValueMapping) {
            this.fileSource = fileSource;
            this.fileType = fileType;
            this.inputColumnSchemas = inputColumnSchemas;
            this.defaultValueMapping = defaultValueMapping;
        }

        @Override
        public BoundedReader<DataRow> createReader(@Nonnull PipelineOptions options) {
            return new ArrayReader(this, fileSource, fileType, inputColumnSchemas, defaultValueMapping);
        }
    }

    /**
     * A reader for accessing DataRows from a XLSB formatted file
     */
    private static class ArrayReader extends StartingRowAwareBoundedReader<DataRow, XLSBFileType> {

        private final BoundedSource<DataRow> source;
        private final FileSource fileSource;
        private final DataRowParser<String> parser;

        private List<List<String>> lines = null;
        private int currentIndex = -1;

        public ArrayReader(
                @Nonnull BoundedSource<DataRow> source,
                @Nonnull FileSource fileSource,
                @Nonnull XLSBFileType fileType,
                @Nonnull InputColumnSchemas inputColumnSchemas,
                @Nonnull DefaultValueMapping defaultValueMapping
        ) {
            super(fileType);
            this.source = source;
            this.fileSource = fileSource;
            this.parser = new DataRowParser<>(
                    fileType,
                    inputColumnSchemas,
                    defaultValueMapping,
                    new StringDataWrapperParser()
            );
        }

        @Override
        public boolean start() throws IOException {
            this.lines = getAllRows(fileSource, fileType);
            return super.start();
        }

        @Override
        public boolean advance() {
            if (lines == null) {
                throw new IllegalStateException("Attempted to advance XLSB file before start");
            }

            currentIndex++;
            return lines.size() > currentIndex;
        }

        @Override
        public DataRow getCurrent() throws NoSuchElementException {
            if (lines == null) {
                throw new NoSuchElementException();
            }

            return parser.parse(lines.get(currentIndex).toArray(String[]::new));
        }

        @Override
        public void close() {
        }

        @Override
        @Nonnull
        public BoundedSource<DataRow> getCurrentSource() {
            return source;
        }
    }
}
