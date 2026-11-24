package com.curve.pojos.input.schemas;

import com.curve.pojos.input.type.*;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import javax.annotation.Nonnull;
import java.io.Serializable;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = BooleanInputColumnSchema.class, name = BooleanInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = DateInputColumnSchema.class, name = DateInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = NullInputColumnSchema.class, name = NullInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = Number2DPInputColumnSchema.class, name = Number2DPInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = Number5DPInputColumnSchema.class, name = Number5DPInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = NumberCommaSeparatedInputColumnSchema.class, name = NumberCommaSeparatedInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = NumberInputColumnSchema.class, name = NumberInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = StringInputColumnSchema.class, name = StringInputTypeInformation.TYPE),
})
public sealed interface InputColumnSchema<T extends InputTypeInformation> extends Serializable
        permits NullInputColumnSchema, NonNullInputColumnSchema {
    @Nonnull
    T getTypeInformation();

    int getCharacters();
}
