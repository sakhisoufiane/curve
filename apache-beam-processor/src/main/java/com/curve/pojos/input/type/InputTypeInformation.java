package com.curve.pojos.input.type;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import javax.annotation.Nonnull;
import java.io.Serializable;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = BooleanInputTypeInformation.class, name = BooleanInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = DateInputTypeInformation.class, name = DateInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = NullInputTypeInformation.class, name = NullInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = Number2DPInputTypeInformation.class, name = Number2DPInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = Number5DPInputTypeInformation.class, name = Number5DPInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = NumberCommaSeparatedInputTypeInformation.class, name = NumberCommaSeparatedInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = NumberInputTypeInformation.class, name = NumberInputTypeInformation.TYPE),
        @JsonSubTypes.Type(value = StringInputTypeInformation.class, name = StringInputTypeInformation.TYPE),
})
public sealed interface InputTypeInformation extends Serializable 
        permits BooleanInputTypeInformation, 
        DateInputTypeInformation, 
        NullInputTypeInformation, 
        Number2DPInputTypeInformation, 
        Number5DPInputTypeInformation, 
        NumberCommaSeparatedInputTypeInformation, 
        NumberInputTypeInformation, 
        StringInputTypeInformation {
    @Nonnull
    String getType();
}
