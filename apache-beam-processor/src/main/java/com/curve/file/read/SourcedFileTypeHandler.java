package com.curve.file.read;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.input.config.source.FileSource;
import com.curve.pojos.input.schemas.InputColumnSchemas;
import com.curve.util.DefaultValueMapping;
import org.apache.beam.sdk.io.BoundedSource;
import org.apache.beam.sdk.io.Read;
import org.apache.beam.sdk.transforms.PTransform;
import org.apache.beam.sdk.values.PBegin;
import org.apache.beam.sdk.values.PCollection;

import javax.annotation.Nonnull;

/**
 * A File Type Handler, that provides a DataRow source for fetching file rows for the row reader
 */
public abstract class SourcedFileTypeHandler implements FileTypeHandler {
    /**
     * Create a PTransform which generates a PCollection of DataRows, based on the given application configuration
     *
     * @param fileSource            Used to access the file from the source
     * @param inputColumnSchemas    The column schemas. Used to help parse DataRows
     * @param defaultValueMapping   A map of DefaultValues to their values
     * @return A PTransform that initializes the Beam pipeline with data
     */
    public PTransform<PBegin, PCollection<DataRow>> createRowReader(
            @Nonnull FileSource fileSource,
            @Nonnull InputColumnSchemas inputColumnSchemas,
            @Nonnull DefaultValueMapping defaultValueMapping
    ) {
        return Read.from(createRowSource(fileSource, inputColumnSchemas, defaultValueMapping));
    }

    /**
     * Create a source for accessing rows from the file.
     *
     * @param fileSource         Used to access the file from the source
     * @param inputColumnSchemas The column schemas. Used to help parse DataRows
     * @param defaultValueMapping   A map of DefaultValues to their values
     * @return A source for accessing data rows
     */
    protected abstract BoundedSource<DataRow> createRowSource(
            @Nonnull FileSource fileSource,
            @Nonnull InputColumnSchemas inputColumnSchemas,
            @Nonnull DefaultValueMapping defaultValueMapping
    );
}
