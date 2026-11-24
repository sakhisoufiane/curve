package com.curve.pojos.input.schemas;

import com.curve.pojos.input.type.StringInputTypeInformation;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;

public final class StringInputColumnSchema
        extends NonNullInputColumnSchema<StringInputTypeInformation> {

    public static final String TYPE = "STRING";
    
    @JsonCreator
    public StringInputColumnSchema(
            @JsonProperty(value = "field", required = true) @Nonnull String field,
            @JsonProperty("characters") int characters
    ) {
        super(field, StringInputTypeInformation.INSTANCE, characters);
    }

    @Override
    public String toString() {
        return "StringInputColumnSchema{} " + super.toString();
    }
}
