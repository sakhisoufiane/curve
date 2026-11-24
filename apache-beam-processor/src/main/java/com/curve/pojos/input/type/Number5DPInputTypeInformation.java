package com.curve.pojos.input.type;

import javax.annotation.Nonnull;

public final class Number5DPInputTypeInformation
        implements InputTypeInformation {

    public static final String TYPE = "NUMBER 5 DECIMAL PLACES";
    public static final Number5DPInputTypeInformation INSTANCE = new Number5DPInputTypeInformation();

    @Nonnull
    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    public String toString() {
        return "Number5DPInputColumnSchema{}";
    }
}
