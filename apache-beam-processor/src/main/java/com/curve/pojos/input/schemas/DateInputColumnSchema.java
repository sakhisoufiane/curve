package com.curve.pojos.input.schemas;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.input.type.DateInputTypeInformation;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;

public final class DateInputColumnSchema extends NonNullInputColumnSchema<DateInputTypeInformation> {
    
    public static final String TYPE = "DATE";
    
    @JsonCreator
    public DateInputColumnSchema(
            @JsonProperty(value = "field", required = true) @Nonnull String field,
            @JsonProperty("characters") int characters,
            @JsonProperty(value = "dateFormat") @Nullable String dateFormat
    ) throws ValidationException {
        // TODO test null input date format
        super(field, new DateInputTypeInformation(dateFormat), characters);
    }

    @Override
    public String toString() {
        return "DateInputColumnSchema{}";
    }
}
