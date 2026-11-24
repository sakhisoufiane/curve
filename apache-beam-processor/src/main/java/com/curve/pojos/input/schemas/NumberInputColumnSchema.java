package com.curve.pojos.input.schemas;

import com.curve.pojos.input.type.NumberInputTypeInformation;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;

public final class NumberInputColumnSchema extends NonNullInputColumnSchema<NumberInputTypeInformation> {
    
    public static final String TYPE = "NUMBER";
    
    @JsonCreator
    public NumberInputColumnSchema(
            @JsonProperty(value = "field", required = true) @Nonnull String field,
            @JsonProperty("characters") int characters
    ) {
        super(field, NumberInputTypeInformation.INSTANCE, characters);
    }

    @Override
    public String toString() {
        return "NumberInputColumnSchema{} " + super.toString();
    }
}
