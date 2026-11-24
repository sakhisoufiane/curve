package com.curve.pojos.output.schemas;

import com.curve.pojos.data.DataWrapper;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

import static com.curve.pojos.data.DataWrapper.Factory.asLocalDate;

public final class DateColumnSchema extends OutputColumnSchema<LocalDate> {
    private final String originalDateFormat;
    private final String cleanedDateFormat;
    private transient DateTimeFormatter formatter;

    public DateColumnSchema(String field, String type, String dateFormat) {
        super(field, type);
        this.originalDateFormat = dateFormat;
        this.cleanedDateFormat = cleanOutputDateFormat(dateFormat);
    }

    @Nonnull
    public String getDateFormat() {
        return originalDateFormat;
    }

    public DateTimeFormatter getFormatter() {
        // Formatter is transient - Initialize the date formatter if it's not yet set
        if (formatter == null) formatter = DateTimeFormatter.ofPattern(cleanedDateFormat);
        return formatter;
    }

    @Nullable
    @Override
    public LocalDate coerceToType(@Nullable DataWrapper<?> dataWrapper) {
        var dateWrapper = asLocalDate(dataWrapper);
        return dateWrapper != null ? dateWrapper.data(): null;
    }

    private static String cleanOutputDateFormat(String format) {
        // If there are no d/D's at all we add one.
        if (!format.toUpperCase().contains("D")) {
            format += "dd";
            // If there are D's we lower case them.
        } else if (format.contains(("D"))) {
            format = format.replace("D", "d");
        }

        // Lower case all 'Y' for date formatting.
        format = format.replace("Y", "y");

        return format;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        if (!super.equals(o)) return false;
        DateColumnSchema that = (DateColumnSchema) o;
        return Objects.equals(originalDateFormat, that.originalDateFormat);
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), originalDateFormat);
    }

    @Override
    public String toString() {
        return "DateColumnSchema{" +
                "dateFormat='" + originalDateFormat + '\'' +
                "} " + super.toString();
    }


}
