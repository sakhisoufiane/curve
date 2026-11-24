package com.curve.pojos.output.schemas;

import com.curve.pojos.data.DataWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.curve.pojos.data.DataWrapper.Factory.asNumeric;

public final class NumericOutputSchema extends OutputColumnSchema<BigDecimal> {
    private static final Logger LOGGER = LoggerFactory.getLogger(NumericOutputSchema.class);

    private static final Pattern NUMERIC_WITH_SCALE = Pattern.compile("\\((\\d+)\\s*,\\s*(\\d+)\\)");
    private static final Pattern NUMERIC_WITH_PRECISION = Pattern.compile("\\(\\s*(\\d+)\\s*\\)");

    private final PrecisionAndScale precisionAndScale;

    public NumericOutputSchema(String field, String type) {
        super(field, type);
        this.precisionAndScale = findPrecisionAndScale(type);
    }

    @Nullable
    @Override
    public BigDecimal coerceToType(@Nullable DataWrapper<?> dataWrapper) {
        var numericWrapper = asNumeric(dataWrapper);

        if (numericWrapper == null) return null;

        var decimal = numericWrapper.data();

        if (precisionAndScale != null) {
            // If the current scale is larger than the allowed scale, then round it
            if (decimal.scale() > precisionAndScale.scale) {
                decimal = decimal.setScale(precisionAndScale.scale, RoundingMode.HALF_UP);
            }

            // If the current precision is larger than the allowed precision, return null
            if (decimal.precision() > precisionAndScale.precision) {
                LOGGER.error("Failed to coerce DataWrapper to string as a number as precision is too small: " + dataWrapper);
                return null;
            }
        }

        return decimal;
    }

    @Nullable
    private static PrecisionAndScale findPrecisionAndScale(String type) {
        Matcher numericWithScaleMatcher = NUMERIC_WITH_SCALE.matcher(type);

        // If there are numbers in the parentheses i.e, NUMERIC(10, 2)
        if (numericWithScaleMatcher.find()) {
            return new PrecisionAndScale(numericWithScaleMatcher.group(1), numericWithScaleMatcher.group(2));
        }

        Matcher numericWithPrecisionMatcher = NUMERIC_WITH_PRECISION.matcher(type);
        if (numericWithPrecisionMatcher.find()) {
            return new PrecisionAndScale(numericWithPrecisionMatcher.group(1));
        }

        // It's possible here that we return an actual string value instead of a number, more thought needs to
        // be put into how to handle invalid numbers.
        return null;
    }

    private record PrecisionAndScale(int precision, int scale) implements Serializable {
        private PrecisionAndScale(@Nonnull String precision, @Nullable String scale) {
            this(
                    Integer.parseInt(precision),
                    scale != null ? Integer.parseInt(scale) : 0
            );
        }

        private PrecisionAndScale(@Nonnull String precision) {
            this(
                    Integer.parseInt(precision),
                    0
            );
        }
    }
}
