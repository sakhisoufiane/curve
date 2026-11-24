package com.curve.pojos.transformations.strategy.input;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.transformations.calculation.Equation;
import com.fasterxml.jackson.annotation.JsonCreator;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.Collections;
import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asString;

/**
 * A strategy for running Calculation transformations. This calculation delegates out to the user-provided equations
 * to convert the incoming data wrapper to an output value
 */
public class CalculationStrategy implements InputValueProcessor {
    @Nonnull
    private final List<Equation> equations;

    @JsonCreator
    public CalculationStrategy(@Nonnull List<Equation> equations) {
        this.equations = Collections.unmodifiableList(equations);
    }

    @Nullable
    @Override
    public DataWrapper<?> process(@Nonnull DataRow dataRow, @Nullable DataWrapper<?> dataWrapper) {
        DataWrapper<?> value = dataWrapper;
        for (Equation e : equations) {
            value = e.calculate(dataRow, value);
        }
        // TODO - better data type handling
        return asString(value);
    }
}
