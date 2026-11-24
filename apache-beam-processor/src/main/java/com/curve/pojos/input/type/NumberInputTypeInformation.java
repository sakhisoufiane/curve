package com.curve.pojos.input.type;

import javax.annotation.Nonnull;

public final class NumberInputTypeInformation implements InputTypeInformation {
    
    public static final String TYPE = "NUMBER";
    public static final NumberInputTypeInformation INSTANCE = new NumberInputTypeInformation();

    @Nonnull
    @Override
    public String getType() {
        return TYPE;
    }
    
    @Override
    public String toString() {
        return "NumberInputColumnSchema{}";
    }
}
