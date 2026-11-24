package com.curve.pojos.transformations;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.transformations.condition.Condition;
import com.curve.pojos.transformations.strategy.OfInputValueStrategy;
import com.curve.pojos.transformations.strategy.OutputConfiguration;
import com.curve.pojos.transformations.strategy.SingleOutputEmittingStrategy;
import com.curve.pojos.transformations.strategy.input.CopyStrategy;
import com.curve.pojos.transformations.strategy.input.SimpleMappingStrategy;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.util.Collections;
import java.util.Map;
import java.util.Objects;

public class Copy extends Transformation {
    public static final String NAME = "Copy";
    
    @Nonnull
    private final String type;
    @Nullable
    private final Condition condition;
    @Nullable
    private final String inputValueFieldName;
    @Nullable
    private final Integer inputValueColumnIndex;
    @Nullable
    private final Serializable inputFixedValue;
    @Nonnull
    private final String outputField;
    private final boolean replaceOutputValue;

    @JsonCreator
    public Copy(
            @JsonProperty(value = "type", required = true) @Nonnull String type,
            @JsonProperty(value = "condition") @Nullable Condition condition,
            @JsonProperty(value = "inputValueFieldName") @Nullable String inputValueFieldName,
            @JsonProperty(value = "inputValueColumnIndex") @Nullable Integer inputValueColumnIndex,
            @JsonProperty(value = "inputFixedValue") @Nullable Serializable inputFixedValue,
            @JsonProperty(value = "outputField", required = true) @Nonnull String outputField,
            @JsonProperty(value = "replaceOutputValue") boolean replaceOutputValue
    ) throws ValidationException {
        super(
                new SingleOutputEmittingStrategy(
                        new OfInputValueStrategy(
                                inputValueFieldName,
                                inputValueColumnIndex,
                                inputFixedValue,
                                new CopyStrategy()
                        ),
                        new OutputConfiguration(outputField, replaceOutputValue),
                        condition
                ));
        this.type = type;
        this.condition = condition;
        this.inputValueFieldName = inputValueFieldName;
        this.inputValueColumnIndex = inputValueColumnIndex;
        this.inputFixedValue = inputFixedValue;
        this.outputField = outputField;
        this.replaceOutputValue = replaceOutputValue;
    }

    @Nonnull
    public String getType() {
        return type;
    }

    @Nullable
    public Condition getCondition() {
        return condition;
    }

    @Nullable
    public String getInputValueFieldName() {
        return inputValueFieldName;
    }

    @Nullable
    public Integer getInputValueColumnIndex() {
        return inputValueColumnIndex;
    }

    @Nullable
    public Serializable getInputFixedValue() {
        return inputFixedValue;
    }

    @Nonnull
    public String getOutputField() {
        return outputField;
    }

    public boolean isReplaceOutputValue() {
        return replaceOutputValue;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Copy that = (Copy) o;
        return replaceOutputValue == that.replaceOutputValue &&
                Objects.equals(type, that.type) &&
                Objects.equals(condition, that.condition) &&
                Objects.equals(inputValueFieldName, that.inputValueFieldName) &&
                Objects.equals(inputValueColumnIndex, that.inputValueColumnIndex) &&
                Objects.equals(inputFixedValue, that.inputFixedValue) &&
                Objects.equals(outputField, that.outputField);
    }

    @Override
    public int hashCode() {
        return Objects.hash(type,
                condition,
                inputValueFieldName,
                inputValueColumnIndex,
                inputFixedValue,
                outputField,
                replaceOutputValue
        );
    }

    @Override
    public String toString() {
        return "Copy{" +
                "type='" + type + '\'' +
                ", condition=" + condition +
                ", inputValueFieldName='" + inputValueFieldName + '\'' +
                ", inputValueColumnIndex=" + inputValueColumnIndex +
                ", inputFixedValue=" + inputFixedValue +
                ", outputField='" + outputField + '\'' +
                ", replaceOutputValue=" + replaceOutputValue +
                "} " + super.toString();
    }
}
