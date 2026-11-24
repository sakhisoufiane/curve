package com.curve.pojos.input.type;

import javax.annotation.Nonnull;

public final class Number2DPInputTypeInformation implements InputTypeInformation {
    
    public static final String TYPE = "NUMBER 2 DECIMAL PLACES";
    public static final Number2DPInputTypeInformation INSTANCE = new Number2DPInputTypeInformation();

    @Nonnull
    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    public String toString() {
        return "Number2DPInputColumnSchema{}";
    }

}
