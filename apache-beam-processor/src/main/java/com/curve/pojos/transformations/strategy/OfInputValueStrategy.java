package com.curve.pojos.transformations.strategy;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.transformations.strategy.input.InputValueProcessor;
import com.curve.pojos.transformations.value.ValueProvider;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;

/**
 * OfInputValueStrategy generates a new value by delegating the work to a ValueProvider, who defines an input value
 * to extract from a DataRow, and an InputValueProcessor, who converts the found input value to an output value to
 * be emitted
 */
public class OfInputValueStrategy implements NewValueGenerator {
    @Nonnull
    private final ValueProvider valueProvider;
    @Nonnull
    private final InputValueProcessor inputValueProcessor;

    public OfInputValueStrategy(
            @Nullable String inputValueFieldName,
            @Nullable Integer inputValueColumnIndex,
            @Nullable Serializable inputFixedValue,
            @Nonnull InputValueProcessor inputValueProcessor
    ) throws ValidationException {
        this.valueProvider = ValueProvider.create(inputValueFieldName, inputValueColumnIndex, inputFixedValue);
        this.inputValueProcessor = inputValueProcessor;
    }

    @Nullable
    @Override
    public DataWrapper<?> generate(@Nonnull DataRow dataRow) {
        return inputValueProcessor.process(dataRow, valueProvider.provide(dataRow));
    }
}
