package com.curve.pojos.transformations.strategy;

import com.curve.pojos.cell.DataCell;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.transformations.DataRowTransformer;
import com.curve.pojos.transformations.condition.Always;
import com.curve.pojos.transformations.condition.Condition;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;

import static com.curve.pojos.data.DataWrapper.Factory.asString;

/**
 * A SingleOutputEmittingStrategy works on the principle that many Transformers will take a DataRow, and
 * generate a single output value, that then will either replace an existing value in a DataCell, or will be appended
 * onto the DataRow as a new DataCell.
 * </b>
 * SingleOutputEmittingStrategy delegates out to a NewValueGenerator, which calculates what the new value
 * should be based on the incoming DataRow, and takes an OutputConfiguration, which describes where to output the
 * emitted value. It can optionally take a condition, which defines whether execute the transformation.
 */
public class SingleOutputEmittingStrategy implements DataRowTransformer {

    @Nonnull
    private final NewValueGenerator newValueGenerator;
    @Nonnull
    private final OutputConfiguration outputConfiguration;
    @Nonnull
    private final Condition condition;

    public SingleOutputEmittingStrategy(
            @Nonnull NewValueGenerator newValueGenerator,
            @Nonnull OutputConfiguration outputConfiguration,
            @Nullable Condition condition
    ) {
        this.outputConfiguration = outputConfiguration;
        this.newValueGenerator = newValueGenerator;
        this.condition = condition != null ? condition : Always.INSTANCE;
    }

    public SingleOutputEmittingStrategy(
            @Nonnull NewValueGenerator newValueGenerator,
            @Nonnull OutputConfiguration outputConfiguration
    ) {
        this(newValueGenerator, outputConfiguration, null);
    }

    @Nonnull
    @Override
    public DataRow transform(@Nonnull DataRow dataRow) {
        DataCell existingCell = dataRow.getDataCellFromFieldName(outputConfiguration.outputField());

        if ((existingCell == null || outputConfiguration.replaceOutput()) && condition.evaluate(dataRow)) {
            var newValue = newValueGenerator.generate(dataRow);
            // TODO - better data type handling
            DataCell newCell = new NonNullDataCell(outputConfiguration.outputField(), asString(newValue));

            if (existingCell == null) {
                return DataRow.Factory.createFromExistingRowWithNewCell(dataRow, newCell);
            } else {
                return DataRow.Factory.createFromExistingRowWithReplacementCell(dataRow, existingCell, newCell);
            }
        }

        return dataRow;
    }

}
