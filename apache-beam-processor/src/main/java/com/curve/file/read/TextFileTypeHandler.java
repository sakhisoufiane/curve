package com.curve.file.read;

import com.curve.file.read.iterator.TabularDataSupplier;
import com.curve.file.read.iterator.TextClosableIterator;
import com.curve.file.read.source.text.FileSourceStringBoundedSource;
import com.curve.file.read.source.text.SDK253TextSource;
import com.curve.file.read.source.text.StringToDataRowBoundedSource;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.DefaultValue;
import com.curve.pojos.input.config.CharacterEncoding;
import com.curve.pojos.input.config.source.FileSource;
import com.curve.pojos.input.config.source.TextIOSupportedFileSource;
import com.curve.pojos.input.config.type.AbstractTextFileType;
import com.curve.pojos.input.config.type.CSVFileType;
import com.curve.pojos.input.config.type.TextFileType;
import com.curve.pojos.input.schemas.InputColumnSchemas;
import com.curve.pojos.transformations.value.ValueProvider;
import com.curve.util.DefaultValueMapping;
import com.curve.util.parser.data.row.DataRowParser;
import com.curve.util.parser.data.wrapper.StringDataWrapperParser;
import com.curve.util.parser.line.CSVLineSplitter;
import com.curve.util.parser.line.DelimiterLineSplitter;
import com.curve.util.parser.line.FixedIndexLineSplitter;
import org.apache.beam.sdk.io.BoundedSource;
import org.apache.beam.sdk.io.fs.EmptyMatchTreatment;

import javax.annotation.Nonnull;
import java.io.*;
import java.math.BigDecimal;
import java.util.*;

import static org.apache.beam.sdk.options.ValueProvider.StaticValueProvider.of;

/**
 * A File Type readers for managing access to text file types
 */
public class TextFileTypeHandler extends SourcedFileTypeHandler {
    private final AbstractTextFileType fileType;

    public TextFileTypeHandler(AbstractTextFileType fileType) {
        this.fileType = fileType;
    }

    @Override
    @Nonnull
    public DefaultValueMapping extractDefaultValuesFromFile(
            @Nonnull FileSource fileSource,
            @Nonnull List<DefaultValue> defaultValues
    ) throws IOException {

        // TODO move this logic
        if (fileType.isIndexSeparated()) {
            throw new IllegalStateException("Cannot look up target cells in index separated file");
        }

        TabularDataSupplier<String> supplier = () -> new TextClosableIterator(fileSource, fileType);
        
        var splitter = switch (fileType) {
            case CSVFileType csvFileType -> new CSVLineSplitter(csvFileType.getDelimiter());
            case TextFileType textFileType -> new DelimiterLineSplitter(textFileType.getDelimiter());
        };
        
        var parser = new StringDataWrapperParser();
        
        return new DefaultValueLookupStrategy().extractDefaultValuesFromFile(supplier, splitter, parser, defaultValues);
    }

    @Nonnull
    @Override
    public BigDecimal getTotalUnits(
            @Nonnull FileSource fileSource, 
            @Nonnull InputColumnSchemas inputColumnSchemas,
            @Nonnull ValueProvider valueProvider,
            @Nonnull DefaultValueMapping defaultValues
    ) throws IOException {
        var splitter = switch (fileType) {
            case CSVFileType csvFileType -> new CSVLineSplitter(csvFileType.getDelimiter());
            case TextFileType textFileType -> {
                if (fileType.isIndexSeparated()) {
                    yield new FixedIndexLineSplitter(inputColumnSchemas.getIndexSeparationLengths());
                } else {
                    yield new DelimiterLineSplitter(textFileType.getDelimiter());
                }
            }
        };

        TabularDataSupplier<String> supplier = () -> new TextClosableIterator(fileSource, fileType);

        DataRowParser<String> parser = new DataRowParser<>(
                fileType,
                inputColumnSchemas,
                defaultValues,
                new StringDataWrapperParser()
        );
        
        return new TotalUnitCalculationStrategy().findTotalUnits(supplier, splitter, parser, valueProvider, fileType);
    }

    /**
     * Gives a Source for accessing DataRows from a text file.
     * <p>
     * Source capabilities:
     * * Able to stream the file (memory efficient)
     * * Splitable (Loading of data can be parrellised) if:
     * ** The file source is splitable, and the input encoding is UTF-8
     * ** Otherwise the source is unsplitable
     *
     * @param fileSource         Used to access the file from the source
     * @param inputColumnSchemas The column schemas. Used to determine how to create data rows from the file
     * @param defaultValues      A map of DefaultValues to their values, for use in creating DataRows
     * @return A source for accessing data rows
     */
    @Override
    protected BoundedSource<DataRow> createRowSource(
            @Nonnull FileSource fileSource,
            @Nonnull InputColumnSchemas inputColumnSchemas,
            @Nonnull DefaultValueMapping defaultValues
    ) {
        BoundedSource<String> stringProducer;
        if (fileType.getEncoding() == CharacterEncoding.UTF_8 && fileSource instanceof TextIOSupportedFileSource tioSource) {
            stringProducer = new SDK253TextSource(
                    of(tioSource.getTextIOURL()),
                    EmptyMatchTreatment.DISALLOW,
                    null,
                    1
            );
        } else {
            stringProducer = new FileSourceStringBoundedSource(fileSource, fileType);
        }


        DataRowParser<String> parser = new DataRowParser<>(
                fileType, 
                inputColumnSchemas, 
                defaultValues, 
                new StringDataWrapperParser()
        );

        var splitter = switch (fileType) {
            case CSVFileType csvFileType -> new CSVLineSplitter(csvFileType.getDelimiter());
            case TextFileType textFileType -> {
                if (fileType.isIndexSeparated()) {
                    yield new FixedIndexLineSplitter(inputColumnSchemas.getIndexSeparationLengths());
                } else {
                    yield new DelimiterLineSplitter(textFileType.getDelimiter());
                }
            }
        };

        return new StringToDataRowBoundedSource(
                stringProducer,
                splitter, 
                parser
        );
    }
}
