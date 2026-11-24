package com.curve.pojos.transformations;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.transformations.condition.Condition;
import com.curve.pojos.transformations.strategy.OfInputValueStrategy;
import com.curve.pojos.transformations.strategy.OutputConfiguration;
import com.curve.pojos.transformations.strategy.SingleOutputEmittingStrategy;
import com.curve.pojos.transformations.strategy.input.HierarchicalMappingStrategy;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.util.*;

public class HierarchicalMapping extends Transformation {

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
    @Nonnull
    private final JsonNode mappings;
    @Nonnull
    private final List<String> context;
    @Nullable
    private final String regex;

    @JsonCreator
    public HierarchicalMapping(
            @JsonProperty(value = "type", required = true) @Nonnull String type,
            @JsonProperty(value = "condition") @Nullable Condition condition,
            @JsonProperty(value = "inputValueFieldName") @Nullable String inputValueFieldName,
            @JsonProperty(value = "inputValueColumnIndex") @Nullable Integer inputValueColumnIndex,
            @JsonProperty(value = "inputFixedValue") @Nullable Serializable inputFixedValue,
            @JsonProperty(value = "outputField", required = true) @Nonnull String outputField,
            @JsonProperty(value = "replaceOutputValue") boolean replaceOutputValue,
            @JsonProperty(value = "mappings", required = true) @Nonnull JsonNode mappings,
            @JsonProperty(value = "context", required = true) @Nonnull List<String> context,
            @JsonProperty(value = "regex") @Nullable String regex
    ) throws ValidationException {
        super(new SingleOutputEmittingStrategy(
                new OfInputValueStrategy(
                        inputValueFieldName,
                        inputValueColumnIndex,
                        inputFixedValue,
                        new HierarchicalMappingStrategy(mappings, context, regex)
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
        this.mappings = mappings;
        this.context = Collections.unmodifiableList(context);
        this.regex = regex;
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

    @Nonnull
    public JsonNode getMappings() {
        return mappings;
    }

    @Nonnull
    public List<String> getContext() {
        return context;
    }

    @Nullable
    public String getRegex() {
        return regex;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        HierarchicalMapping that = (HierarchicalMapping) o;
        return replaceOutputValue == that.replaceOutputValue &&
                Objects.equals(type, that.type) &&
                Objects.equals(condition, that.condition) &&
                Objects.equals(inputValueFieldName, that.inputValueFieldName) &&
                Objects.equals(inputValueColumnIndex, that.inputValueColumnIndex) &&
                Objects.equals(inputFixedValue, that.inputFixedValue) &&
                Objects.equals(outputField, that.outputField) &&
                Objects.equals(mappings, that.mappings) &&
                Objects.equals(context, that.context) &&
                Objects.equals(regex, that.regex);
    }

    @Override
    public int hashCode() {
        return Objects.hash(type,
                condition,
                inputValueFieldName,
                inputValueColumnIndex,
                inputFixedValue,
                outputField,
                replaceOutputValue,
                mappings,
                context,
                regex);
    }

    @Override
    public String toString() {
        return "HierarchicalMapping{" +
                "type='" + type + '\'' +
                ", condition=" + condition +
                ", inputValueFieldName='" + inputValueFieldName + '\'' +
                ", inputValueColumnIndex=" + inputValueColumnIndex +
                ", inputFixedValue=" + inputFixedValue +
                ", outputField='" + outputField + '\'' +
                ", replaceOutputValue=" + replaceOutputValue +
                ", mappings=" + mappings +
                ", context=" + context +
                ", regex='" + regex + '\'' +
                "} " + super.toString();
    }
}
