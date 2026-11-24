package com.curve.pojos.output.schemas;

import com.curve.pojos.data.DataWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nullable;
import java.math.RoundingMode;

import static com.curve.pojos.data.DataWrapper.Factory.asNumeric;

public final class IntegerColumnSchema extends OutputColumnSchema<Integer> {

    private static final Logger LOGGER = LoggerFactory.getLogger(IntegerColumnSchema.class);

    public IntegerColumnSchema(String field, String type) {
        super(field, type);
    }

    @Nullable
    @Override
    public Integer coerceToType(@Nullable DataWrapper<?> dataWrapper) {
        var numericWrapper = asNumeric(dataWrapper);

        if (numericWrapper == null) return null;

        var numeric = numericWrapper.data();

        // Check if the number can parse to an integer
        try {
            var decimal = numeric.setScale(0, RoundingMode.HALF_UP);
            return decimal.intValueExact();
        } catch (ArithmeticException e) {
            // Due to value being larger than an Integer
            LOGGER.error("Failed to coerce DataWrapper to string: " + dataWrapper, e);
            return null;
        }
    }
}
