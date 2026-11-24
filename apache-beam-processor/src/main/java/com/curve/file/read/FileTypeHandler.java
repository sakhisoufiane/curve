package com.curve.file.read;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.DefaultValue;
import com.curve.pojos.input.config.source.FileSource;
import com.curve.pojos.input.schemas.InputColumnSchemas;
import com.curve.pojos.transformations.value.ValueProvider;
import com.curve.util.DefaultValueMapping;
import org.apache.beam.sdk.transforms.PTransform;
import org.apache.beam.sdk.values.PBegin;
import org.apache.beam.sdk.values.PCollection;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

/**
 * Handles various aspects of dealing with accessing files based on their file type
 */
public interface FileTypeHandler extends Serializable {

    /**
     * Returns the values corresponding to the configured DefaultValues. If the DefaultValue requires looking up a cell
     * location, this will be done by reading the given FileSource. Otherwise the configured default value will returned.
     *
     * @param fileSource    Used to access the file from the source
     * @param defaultValues The configured default values to find values for.
     * @return A map of each DefaultValue to their found determined value
     * @throws IOException If the file cannot be accessed
     */
    @Nonnull
    DefaultValueMapping extractDefaultValuesFromFile(
            @Nonnull FileSource fileSource,
            @Nonnull List<DefaultValue> defaultValues
    ) throws IOException;

    @Nonnull
    BigDecimal getTotalUnits(
            @Nonnull FileSource fileSource,
            @Nonnull InputColumnSchemas inputColumnSchemas,
            @Nonnull ValueProvider valueProvider,
            @Nonnull DefaultValueMapping defaultValues
    ) throws IOException;
    
    /**
     * Create a PTransform which generates a PCollection of DataRows, based on the given application configuration
     *
     * @param fileSource         Used to access the file from the source
     * @param inputColumnSchemas The column schemas. Used to help parse DataRows
     * @param defaultValues      A map of DefaultValues to their values
     * @return A PTransform that initializes the Beam pipeline with data
     */
    PTransform<PBegin, PCollection<DataRow>> createRowReader(
            @Nonnull FileSource fileSource,
            @Nonnull InputColumnSchemas inputColumnSchemas,
            @Nonnull DefaultValueMapping defaultValues
    );

}
