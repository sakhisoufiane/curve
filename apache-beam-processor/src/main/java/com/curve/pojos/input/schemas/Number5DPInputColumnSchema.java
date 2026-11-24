package com.curve.pojos.input.schemas;

import com.curve.pojos.input.type.Number5DPInputTypeInformation;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;

public final class Number5DPInputColumnSchema
        extends NonNullInputColumnSchema<Number5DPInputTypeInformation> {

    public static final String TYPE = "NUMBER 5 DECIMAL PLACES";
    
    @JsonCreator
    public Number5DPInputColumnSchema(
            @JsonProperty(value = "field", required = true) @Nonnull String field,
            @JsonProperty("characters") int characters
    ) {
        super(field, Number5DPInputTypeInformation.INSTANCE, characters);
    }

    @Override
    public String toString() {
        return "Number5DPInputColumnSchema{} " + super.toString();
    }
}
