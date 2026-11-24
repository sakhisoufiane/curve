package com.curve.pojos.input.schemas;

import com.curve.pojos.input.type.NumberCommaSeparatedInputTypeInformation;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;

public final class NumberCommaSeparatedInputColumnSchema 
        extends NonNullInputColumnSchema<NumberCommaSeparatedInputTypeInformation> {

    public static final String TYPE = "NUMBER COMMA SEPARATED";
    
    @JsonCreator
    public NumberCommaSeparatedInputColumnSchema(
            @JsonProperty(value = "field", required = true) @Nonnull String field,
            @JsonProperty("characters") int characters
    ) {
        super(field, NumberCommaSeparatedInputTypeInformation.INSTANCE, characters);
    }

    @Override
    public String toString() {
        return "NumberCommaSeparatedInputColumnSchema{} " + super.toString();
    }
}
