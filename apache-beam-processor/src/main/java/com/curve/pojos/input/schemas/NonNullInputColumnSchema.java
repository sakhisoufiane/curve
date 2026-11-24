package com.curve.pojos.input.schemas;

import com.curve.pojos.input.type.InputTypeInformation;

import javax.annotation.Nonnull;
import java.util.Objects;

public sealed abstract class NonNullInputColumnSchema<T extends InputTypeInformation>
        implements InputColumnSchema<T>
        permits BooleanInputColumnSchema,
        DateInputColumnSchema,
        Number2DPInputColumnSchema,
        Number5DPInputColumnSchema,
        NumberCommaSeparatedInputColumnSchema,
        NumberInputColumnSchema,
        StringInputColumnSchema {

    @Nonnull
    private final String field;
    
    @Nonnull
    private final T typeInformation;
    
    private final int characters;

    public NonNullInputColumnSchema(
            @Nonnull String field, 
            @Nonnull T typeInformation, 
            int characters
    ) {
        this.field = field;
        this.typeInformation = typeInformation;
        this.characters = characters;
    }

    @Nonnull
    public String getField() {
        return field;
    }

    @Nonnull
    @Override
    public T getTypeInformation() {
        return typeInformation;
    }

    @Override
    public int getCharacters() {
        return characters;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        NonNullInputColumnSchema<?> that = (NonNullInputColumnSchema<?>) o;
        return characters == that.characters 
                && Objects.equals(field, that.field) 
                && Objects.equals(typeInformation, that.typeInformation);
    }

    @Override
    public int hashCode() {
        return Objects.hash(field, typeInformation, characters);
    }

    @Override
    public String toString() {
        return "NonNullInputColumnSchema{" +
                "field='" + field + '\'' +
                ", type='" + typeInformation + '\'' +
                ", characters=" + characters +
                '}';
    }
}
