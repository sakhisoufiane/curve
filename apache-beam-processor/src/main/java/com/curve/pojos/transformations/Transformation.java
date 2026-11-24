package com.curve.pojos.transformations;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.transformations.calculation.Calculation;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import org.apache.beam.sdk.transforms.DoFn;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.Objects;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type", visible = true)
@JsonSubTypes({
        @JsonSubTypes.Type(value = SimpleMapping.class, name = "simpleMapping"),
        @JsonSubTypes.Type(value = HierarchicalMapping.class, name = "hierarchicalMapping"),
        @JsonSubTypes.Type(value = Calculation.class, name = "calculation"),
        @JsonSubTypes.Type(value = SwitchDefault.class, name = SwitchDefault.NAME),
        @JsonSubTypes.Type(value = Copy.class, name = Copy.NAME),
        @JsonSubTypes.Type(value = Discard.class, name = Discard.NAME),
        @JsonSubTypes.Type(value = SearchAndReplace.class, name = SearchAndReplace.NAME)
})
public abstract class Transformation extends DoFn<DataRow, DataRow> implements DataRowTransformer {

    private final DataRowTransformer delegate;

    public Transformation(DataRowTransformer delegate) {
        this.delegate = delegate;
    }

    @ProcessElement
    public void processElement(ProcessContext c) {
        DataRow dataRow = Objects.requireNonNull(c.element());
        var output = transform(dataRow);
        if (output != null) {
            c.output(output);
        }
    }

    @Nullable
    @Override
    public DataRow transform(@Nonnull DataRow dataRow) {
        return delegate.transform(dataRow);
    }
}
