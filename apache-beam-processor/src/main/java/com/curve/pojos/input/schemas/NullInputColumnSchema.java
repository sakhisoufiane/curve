package com.curve.pojos.input.schemas;

import com.curve.pojos.input.type.NullInputTypeInformation;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;

public final class NullInputColumnSchema implements InputColumnSchema<NullInputTypeInformation> {

    public static final String TYPE = "NULL";
    
    private final int characters;

    @JsonCreator
    public NullInputColumnSchema(
            @JsonProperty("characters") int characters
    ) {
        this.characters = characters;
    }

    @Nonnull
    @Override
    public NullInputTypeInformation getTypeInformation() {
        return NullInputTypeInformation.INSTANCE;
    }

    @Override
    public int getCharacters() {
        return characters;
    }
}
