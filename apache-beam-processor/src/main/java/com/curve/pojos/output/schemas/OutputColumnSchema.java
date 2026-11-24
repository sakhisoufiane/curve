package com.curve.pojos.output.schemas;

import com.curve.pojos.cell.DataCell;
import com.curve.pojos.data.DataWrapper;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonPOJOBuilder;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.util.Objects;

@JsonDeserialize(builder = OutputColumnSchema.Builder.class)
public sealed abstract class OutputColumnSchema<T> implements Serializable
        permits BooleanColumnSchema, DateColumnSchema, IntegerColumnSchema, NumericOutputSchema, VarcharColumnSchema {

    private final String field;
    private final String type;

    public OutputColumnSchema(String field, String type) {
        this.field = field;
        this.type = type.toUpperCase();
    }

    @Nonnull
    public String getField() {
        return field;
    }

    @Nonnull
    public String getType() {
        return type;
    }

    @Nullable
    public T coerceToType(@Nonnull DataCell dataCell) {
        return coerceToType(dataCell.getDataWrapper());
    }

    @Nullable
    public abstract T coerceToType(@Nullable DataWrapper<?> dataWrapper);

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        OutputColumnSchema that = (OutputColumnSchema) o;
        return Objects.equals(field, that.field) && Objects.equals(type, that.type);
    }

    @Override
    public int hashCode() {
        return Objects.hash(field, type);
    }

    @Override
    public String toString() {
        return "OutputColumnSchema{" +
                "field='" + field + '\'' +
                ", type='" + type + '\'' +
                '}';
    }

    @JsonPOJOBuilder
    public static class Builder {

        private String field;
        private String type;
        private String dateFormat;

        public Builder withField(String value) {
            field = value;
            return this;
        }

        public Builder withType(String value) {
            type = value.toUpperCase();
            return this;
        }

        public Builder withDateFormat(String value) {
            dateFormat = value;
            return this;
        }

        public OutputColumnSchema build() {
            Objects.requireNonNull(field, "Field is required for creating an output column schema");
            Objects.requireNonNull(type, "Type is required for creating an output column schema");

            if (type.contains("VARCHAR")) {
                return new VarcharColumnSchema(field, type);
            } else if (type.equalsIgnoreCase("INTEGER")) {
                return new IntegerColumnSchema(field, type);
            } else if (type.equalsIgnoreCase("BOOLEAN")) {
                return new BooleanColumnSchema(field, type);
            } else if (type.equalsIgnoreCase("DATE")) {
                Objects.requireNonNull(dateFormat, "Date format is required for date type output schemas");
                return new DateColumnSchema(field, type, dateFormat);
            } else if (type.contains("NUMERIC")) {
                return new NumericOutputSchema(field, type);
            } else {
                throw new UnsupportedColumnTypeException(type);
            }
        }
    }

    public static class UnsupportedColumnTypeException extends RuntimeException {
        public UnsupportedColumnTypeException(String type) {
            super("Unsupported type of column: " + type);
        }
    }
}
