package com.curve.pojos.input.schemas;

import com.curve.pojos.input.type.BooleanInputTypeInformation;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;

public final class BooleanInputColumnSchema
        extends NonNullInputColumnSchema<BooleanInputTypeInformation> {

    public static final String TYPE = "BOOLEAN";
    
    @JsonCreator
    public BooleanInputColumnSchema(
            @JsonProperty(value = "field", required = true) @Nonnull String field,
            @JsonProperty("characters") int characters
    ) {
        super(field, BooleanInputTypeInformation.INSTANCE, characters);
    }

    @Override
    public String toString() {
        return "BooleanInputColumnSchema{} " + super.toString();
    }
}
