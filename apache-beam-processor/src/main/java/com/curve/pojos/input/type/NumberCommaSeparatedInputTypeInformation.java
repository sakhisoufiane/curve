package com.curve.pojos.input.type;

import javax.annotation.Nonnull;

public final class NumberCommaSeparatedInputTypeInformation implements InputTypeInformation {

    public static final String TYPE = "NUMBER COMMA SEPARATED";
    public static final NumberCommaSeparatedInputTypeInformation INSTANCE = new NumberCommaSeparatedInputTypeInformation();

    @Nonnull
    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    public String toString() {
        return "NumberCommaSeparatedInputColumnSchema{}";
    }
}
