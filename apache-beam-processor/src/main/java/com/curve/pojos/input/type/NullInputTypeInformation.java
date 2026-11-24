package com.curve.pojos.input.type;

import javax.annotation.Nonnull;

public final class NullInputTypeInformation implements InputTypeInformation {

    public static final String TYPE = "NULL";
    public static final NullInputTypeInformation INSTANCE = new NullInputTypeInformation();

    @Nonnull
    @Override
    public String getType() {
        return TYPE;
    }
}
