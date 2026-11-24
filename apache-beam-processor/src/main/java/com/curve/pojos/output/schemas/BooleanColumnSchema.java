package com.curve.pojos.output.schemas;

import com.curve.pojos.data.DataWrapper;

import javax.annotation.Nullable;

import static com.curve.pojos.data.DataWrapper.Factory.asBoolean;

public final class BooleanColumnSchema extends OutputColumnSchema<Boolean> {
    public BooleanColumnSchema(String field, String type) {
        super(field, type);
    }

    @Nullable
    @Override
    public Boolean coerceToType(@Nullable DataWrapper<?> dataWrapper) {
        var booleanWrapper = asBoolean(dataWrapper);
        return booleanWrapper != null ? booleanWrapper.data(): null;
    }
}
