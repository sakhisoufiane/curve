package com.curve.transforms;

import com.curve.configuration.Configuration;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.transformations.Transformation;
import org.apache.beam.sdk.transforms.*;
import org.apache.beam.sdk.values.PCollection;

public class TransformationApplier extends PTransform<PCollection<DataRow>, PCollection<DataRow>> {
    private final Configuration configuration;

    public TransformationApplier (Configuration configuration) {
        this.configuration = configuration;
    }

    @Override
    public PCollection<DataRow> expand(PCollection<DataRow> input) {
        // Will writing over the reference to the input parameter cause issues? Is this bad practise?
        PCollection<DataRow> dataRowPCollection = input;
        for (Transformation transformation : configuration.getTransformations()) {
            dataRowPCollection = dataRowPCollection.apply(ParDo.of(transformation));
        }
        return dataRowPCollection;
    }
}
