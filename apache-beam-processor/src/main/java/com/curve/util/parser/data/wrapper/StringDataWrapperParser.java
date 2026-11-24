package com.curve.util.parser.data.wrapper;

import com.curve.pojos.data.*;
import com.curve.pojos.input.type.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.temporal.ChronoField;
import java.util.Locale;

import static com.curve.pojos.data.DataWrapper.Factory.*;

/**
 * A parser which takes strings, and maps these strings to DataWrappers
 */
public class StringDataWrapperParser implements DataWrapperParser<String> {

    private static final Logger LOGGER = LoggerFactory.getLogger(StringDataWrapperParser.class);

    @Nullable
    @Override
    public BooleanDataWrapper parse(@Nonnull BooleanInputTypeInformation inputTypeInformation, @Nonnull String input) {
        if (input.isEmpty()) {
            return null;
        } else {
            return asBoolean(Boolean.parseBoolean(input));
        }
    }

    @Nullable
    @Override
    public LocalDateDataWrapper parse(@Nonnull DateInputTypeInformation inputTypeInformation, @Nonnull String input) {
        if (input.isEmpty()) {
            return null;
        } else {
            return asLocalDate(inputTypeInformation.getDateFormatEnum().parseDate(input));
        }

    }

    @Nullable
    @Override
    public DataWrapper<?> parse(@Nonnull NullInputTypeInformation inputTypeInformation, @Nonnull String input) {
        return null;
    }

    @Nullable
    @Override
    public NumericDataWrapper parse(@Nonnull Number2DPInputTypeInformation inputTypeInformation, @Nonnull String input) {
        if (input.isEmpty()) {
            return null;
        } else {
            return getNumberWithDecimalPlaces(input, 2);
        }
    }

    @Nullable
    @Override
    public NumericDataWrapper parse(@Nonnull Number5DPInputTypeInformation inputTypeInformation, @Nonnull String input) {
        if (input.isEmpty()) {
            return null;
        } else {
            return getNumberWithDecimalPlaces(input, 5);
        }
    }

    @Nullable
    @Override
    public NumericDataWrapper parse(@Nonnull NumberCommaSeparatedInputTypeInformation inputTypeInformation, @Nonnull String input) {
        if (input.isEmpty()) {
            return null;
        } else {
            if (input.contains(",")) {
                String decimalSeparated = input.replace(',', '.');
                return asNumeric(asString(decimalSeparated));
            } else {
                LOGGER.error("Invalid number. Type is NUMBER_COMMA_SEPARATED and number does not contain a comma: {}", input);
                return null;
            }
        }
    }

    @Nullable
    @Override
    public NumericDataWrapper parse(@Nonnull NumberInputTypeInformation inputTypeInformation, @Nonnull String input) {
        if (input.isEmpty()) {
            return null;
        } else {
            return asNumeric(asString(input));
        }
    }

    @Nullable
    @Override
    public StringDataWrapper parse(@Nonnull StringInputTypeInformation inputTypeInformation, @Nonnull String input) {
        if (input.isEmpty()) {
            return null;
        } else {
            return asString(input);
        }
    }

    @Nullable
    private static NumericDataWrapper getNumberWithDecimalPlaces(String value, int decimalPlaces) {
        int pointIndex = value.indexOf('.');

        // TODO is all this checking necessary, and is it correct? 3.500 can be represented as 3.5 and still be to 3 DP

        // Check if '.' is found and there are at least 2 characters after it
        if (pointIndex != -1 && value.length() - pointIndex - 1 >= decimalPlaces) {
            return asNumeric(asString(value));
        } else {
            LOGGER.error("Invalid number. Type is NUMBER_{}_DECIMAL_PLACES and number does not have {} decimal places: {}", decimalPlaces, decimalPlaces, value);
            return null;
        }
    }
}
