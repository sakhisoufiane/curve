package com.curve.pojos.input.schemas;

import com.curve.pojos.input.type.Number2DPInputTypeInformation;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;

public final class Number2DPInputColumnSchema extends NonNullInputColumnSchema<Number2DPInputTypeInformation> {
    
    public static final String TYPE = "NUMBER 2 DECIMAL PLACES";
    
    @JsonCreator
    public Number2DPInputColumnSchema(
            @JsonProperty(value = "field", required = true) @Nonnull String field,
            @JsonProperty("characters") int characters
    ) {
        super(field, Number2DPInputTypeInformation.INSTANCE, characters);
    }

    @Override
    public String toString() {
        return "Number2DPInputColumnSchema{} " + super.toString();
    }
}
