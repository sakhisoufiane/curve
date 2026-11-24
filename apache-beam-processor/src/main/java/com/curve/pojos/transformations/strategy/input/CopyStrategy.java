package com.curve.pojos.transformations.strategy.input;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;

/**
 * A strategy for executing Copy. It simply takes the input data and returns it for use in the Output Row
 */
public class CopyStrategy implements InputValueProcessor {

    @Nullable
    @Override
    public DataWrapper<?> process(@Nonnull DataRow dataRow, @Nullable DataWrapper<?> inputData) {
        return inputData;
    }
}
