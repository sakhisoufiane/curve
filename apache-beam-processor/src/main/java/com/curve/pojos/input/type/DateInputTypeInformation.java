package com.curve.pojos.input.type;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.input.type.date.DateFormatEnum;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.Objects;

public final class DateInputTypeInformation implements InputTypeInformation {
    
    public static final String TYPE = "DATE";
    
    @Nullable
    private final String dateFormat;
    
    @Nonnull
    private final DateFormatEnum dateFormatEnum;

    @JsonCreator
    public DateInputTypeInformation(
            @JsonProperty(value = "dateFormat") @Nullable String dateFormat
    ) throws ValidationException {
        this.dateFormat = dateFormat;
        
        // TODO update docs about defaulting behaviour
        this.dateFormatEnum = findDateFormatEnum(dateFormat);
    }

    @Nonnull
    @Override
    public String getType() {
        return TYPE;
    }
    
    @Nullable
    public String getDateFormat() {
        return dateFormat;
    }

    @Nonnull
    public DateFormatEnum getDateFormatEnum() {
        return dateFormatEnum;
    }

    @Nonnull
    private static DateFormatEnum findDateFormatEnum(@Nullable String dateFormat) throws ValidationException {
        if (dateFormat == null) return DateFormatEnum.DEFAULT;
        
        var rtn = DateFormatEnum.fromName(dateFormat);
        if (rtn == null) throw new ValidationException("Unknown date format: " + dateFormat);
        return rtn;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        if (!super.equals(o)) return false;
        DateInputTypeInformation that = (DateInputTypeInformation) o;
        return Objects.equals(dateFormat, that.dateFormat);
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), dateFormat);
    }

    @Override
    public String toString() {
        return "DateInputColumnSchema{" +
                "dateFormat='" + dateFormat + '\'' +
                "}";
    }
}
