package com.curve.pojos.transformations.strategy.input;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;

/**
 * A function, which given some input data, converts this to an output value.
 *
 * The DataRow from which the input data was extracted is also provided for further calculations.
 */
@FunctionalInterface
public interface InputValueProcessor extends Serializable {
    @Nullable
    DataWrapper<?> process(@Nonnull DataRow dataRow, @Nullable DataWrapper<?> inputData);
}
