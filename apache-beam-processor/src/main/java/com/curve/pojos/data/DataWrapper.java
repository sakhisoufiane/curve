package com.curve.pojos.data;

import com.curve.util.parser.BigDecimalParseUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.ParsePosition;
import java.text.spi.NumberFormatProvider;
import java.time.LocalDate;
import java.util.Locale;

public sealed interface DataWrapper<T extends Serializable>
        extends Serializable
        permits BooleanDataWrapper, LocalDateDataWrapper, NumericDataWrapper, StringDataWrapper {

    @Nonnull
    T data();

    class Factory {

        private static final Logger LOGGER = LoggerFactory.getLogger(Factory.class);

        @Nullable
        public static BooleanDataWrapper asBoolean(@Nullable Boolean data) {
            return data != null ? new BooleanDataWrapper(data) : null;
        }

        @Nullable
        public static BooleanDataWrapper asBoolean(@Nullable DataWrapper<?> wrapper) {
            return asBoolean(wrapper, true);
        }

        @Nullable
        public static BooleanDataWrapper asBoolean(@Nullable DataWrapper<?> wrapper, boolean logOnFailure) {
            return switch (wrapper) {
                case BooleanDataWrapper booleanDataWrapper -> booleanDataWrapper;
                case LocalDateDataWrapper localDateDataWrapper -> {
                    if (logOnFailure) LOGGER.error("Cannot map LocalDate value: " + localDateDataWrapper.data() + " to Boolean");
                    yield null;
                }
                case NumericDataWrapper numericDataWrapper -> {
                    var integer = numericDataWrapper.data().intValue();
                    if (integer == 1) {
                        yield asBoolean(true);
                    } else if (integer == 0) {
                        yield asBoolean(false);
                    } else {
                        if (logOnFailure) LOGGER.error("Cannot map BigDecimal value: " + numericDataWrapper.data() + " to Boolean");
                        yield null;
                    }
                }
                case StringDataWrapper stringDataWrapper -> {
                    // Weird edge case - The number "1" should be regarded as boolean "true", even if it's been stringified
                    if ("1".equals(stringDataWrapper.data())) {
                        yield asBoolean(true);
                    } else {
                        yield asBoolean(Boolean.parseBoolean(stringDataWrapper.data()));
                    }
                }
                case null -> null;
            };
        }

        @Nullable
        public static LocalDateDataWrapper asLocalDate(@Nullable LocalDate data) {
            return data != null ? new LocalDateDataWrapper(data) : null;
        }

        @Nullable
        public static LocalDateDataWrapper asLocalDate(@Nullable DataWrapper<?> wrapper) {
            return asLocalDate(wrapper, true);
        }

        @Nullable
        public static LocalDateDataWrapper asLocalDate(@Nullable DataWrapper<?> wrapper, boolean logOnFailure) {
            return switch (wrapper) {
                case BooleanDataWrapper booleanDataWrapper -> {
                    if (logOnFailure) LOGGER.error("Cannot map Boolean value: " + booleanDataWrapper.data() + " to LocalDate");
                    yield null;
                }
                case LocalDateDataWrapper localDateDataWrapper -> localDateDataWrapper;
                case NumericDataWrapper numericDataWrapper -> {
                    if (logOnFailure) LOGGER.error("Cannot map BigDecimal value: " + numericDataWrapper.data() + " to LocalDate");
                    yield null;
                }
                case StringDataWrapper stringDataWrapper -> {
                    if (logOnFailure) LOGGER.error("Cannot map String value: " + stringDataWrapper.data() + " to LocalDate");
                    yield null;
                }
                case null -> null;
            };
        }

        @Nullable
        public static NumericDataWrapper asNumeric(@Nullable BigDecimal data) {
            return data != null ? new NumericDataWrapper(data) : null;
        }

        @Nullable
        public static NumericDataWrapper asNumeric(@Nullable DataWrapper<?> wrapper) {
            return asNumeric(wrapper, true);
        }

        @Nullable
        public static NumericDataWrapper asNumeric(@Nullable DataWrapper<?> wrapper, boolean logOnFailure) {
            return switch (wrapper) {
                case BooleanDataWrapper booleanDataWrapper -> {
                    if (logOnFailure) LOGGER.error("Cannot map Boolean value: " + booleanDataWrapper.data() + " to BigDecimal");
                    yield null;
                }
                case LocalDateDataWrapper localDateDataWrapper -> {
                    if (logOnFailure) LOGGER.error("Cannot map LocalDate value: " + localDateDataWrapper.data() + " to BigDecimal");
                    yield null;
                }
                case NumericDataWrapper numericDataWrapper -> numericDataWrapper;
                case StringDataWrapper stringDataWrapper -> {
                    String str = stringDataWrapper.data();
                    var output = BigDecimalParseUtil.parse(str);

                    if (logOnFailure && output == null) {
                        LOGGER.error("Cannot map BigDecimal value: " + str + " to BigDecimal");
                    }

                    yield asNumeric(output);
                }
                case null -> null;
            };
        }

        @Nullable
        public static StringDataWrapper asString(@Nullable String data) {
            return data != null ? new StringDataWrapper(data) : null;
        }

        @Nullable
        public static StringDataWrapper asString(@Nullable DataWrapper<?> wrapper) {
            return switch (wrapper) {
                case BooleanDataWrapper booleanDataWrapper -> asString(String.valueOf(booleanDataWrapper.data()));
                case LocalDateDataWrapper localDateDataWrapper -> asString(String.valueOf(localDateDataWrapper.data()));
                case NumericDataWrapper numericDataWrapper -> asString(numericDataWrapper.data().toPlainString());
                case StringDataWrapper stringDataWrapper -> stringDataWrapper;
                case null -> null;
            };
        }

        @Nonnull
        public static DataWrapper<?> fromSerializable(@Nonnull Serializable data) {
            return switch (data) {
                case Integer intCase -> asNumeric(new BigDecimal(intCase));
                case Long longCase -> asNumeric(new BigDecimal(longCase));
                case Boolean booleanCase -> asBoolean(booleanCase);
                default -> asString(String.valueOf(data));
            };
        }
    }
}
