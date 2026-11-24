package com.curve.pojos.output.schemas;

import com.curve.pojos.data.DataWrapper;

import javax.annotation.Nullable;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.curve.pojos.data.DataWrapper.Factory.asString;

public final class VarcharColumnSchema extends OutputColumnSchema<String> {
    public static final Pattern VARCHAR_SIZE_LIMIT_MATCHER = Pattern.compile("\\((\\d+)\\)");

    private final Integer length;

    public VarcharColumnSchema(String field, String type) {
        super(field, type);
        this.length = determineStringLength(type);
    }

    @Nullable
    @Override
    public String coerceToType(@Nullable DataWrapper<?> dataWrapper) {
        var stringWrapper = asString(dataWrapper);

        if (stringWrapper == null) return null;

        var string = stringWrapper.data();

        // If there is a number in the parentheses i.e, VARCHAR(255)
        if (length != null && string.length() > length) {
            return string.substring(0, length);
        } else {
            return string;
        }
    }

    @Nullable
    private static Integer determineStringLength(String type) {
        Matcher matcher = VARCHAR_SIZE_LIMIT_MATCHER.matcher(type);
        if (matcher.find()) {
            String lengthString = matcher.group(1);
            return Integer.valueOf(lengthString);
        } else {
            return null;
        }
    }
}
