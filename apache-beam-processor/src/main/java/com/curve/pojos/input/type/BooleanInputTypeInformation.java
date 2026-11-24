package com.curve.pojos.input.type;

import javax.annotation.Nonnull;

public final class BooleanInputTypeInformation
        implements InputTypeInformation {

    public static final String TYPE = "BOOLEAN";
    public static final BooleanInputTypeInformation INSTANCE = new BooleanInputTypeInformation();

    @Nonnull
    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    public String toString() {
        return "BooleanInputColumnSchema{}";
    }
}
