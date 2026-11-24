package com.curve.pojos.input.type;

import javax.annotation.Nonnull;

public final class StringInputTypeInformation
        implements InputTypeInformation {

    public static final String TYPE = "STRING";
    public static final StringInputTypeInformation INSTANCE = new StringInputTypeInformation();

    @Nonnull
    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    public String toString() {
        return "StringInputColumnSchema{}";
    }
}
