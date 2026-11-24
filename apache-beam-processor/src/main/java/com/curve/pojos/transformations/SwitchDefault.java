package com.curve.pojos.transformations;

import com.curve.pojos.transformations.condition.Condition;
import com.curve.pojos.transformations.strategy.OutputConfiguration;
import com.curve.pojos.transformations.strategy.SingleOutputEmittingStrategy;
import com.curve.pojos.transformations.strategy.SwitchDefaultStrategy;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.util.List;
import java.util.Objects;

public class SwitchDefault extends Transformation {

    public static final String NAME = "SwitchDefault";

    @Nonnull
    private final String type;
    @Nullable
    private final Condition condition;
    @Nonnull
    private final String outputField;
    private final boolean replaceOutputValue;
    @Nullable
    private final List<SwitchMapping> mappings;
    @Nullable
    private final Serializable defaultValue;

    @JsonCreator
    public SwitchDefault(
            @JsonProperty(value = "type", required = true) @Nonnull String type,
            @JsonProperty("condition") @Nullable Condition condition,
            @JsonProperty(value = "outputField", required = true) @Nonnull String outputField,
            @JsonProperty(value = "replaceOutputValue") boolean replaceOutputValue,
            @JsonProperty(value = "mappings") @Nullable List<SwitchMapping> mappings,
            @JsonProperty(value = "defaultValue") @Nullable Serializable defaultValue
    ) {
        super(
                new SingleOutputEmittingStrategy(
                        new SwitchDefaultStrategy(mappings, defaultValue),
                        new OutputConfiguration(outputField, replaceOutputValue),
                        condition
                )
        );
        this.type = type;
        this.condition = condition;
        this.outputField = outputField;
        this.replaceOutputValue = replaceOutputValue;
        this.mappings = mappings;
        this.defaultValue = defaultValue;
    }

    @Nonnull
    public String getType() {
        return type;
    }

    @Nullable
    public Condition getCondition() {
        return condition;
    }

    @Nonnull
    public String getOutputField() {
        return outputField;
    }

    public boolean isReplaceOutputValue() {
        return replaceOutputValue;
    }

    @Nullable
    public List<SwitchMapping> getMappings() {
        return mappings;
    }

    @Nullable
    public Serializable getDefaultValue() {
        return defaultValue;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SwitchDefault that = (SwitchDefault) o;
        return replaceOutputValue == that.replaceOutputValue &&
                Objects.equals(type, that.type) &&
                Objects.equals(condition, that.condition) &&
                Objects.equals(outputField, that.outputField) &&
                Objects.equals(mappings, that.mappings) &&
                Objects.equals(defaultValue, that.defaultValue);
    }

    @Override
    public int hashCode() {
        return Objects.hash(type, condition, outputField, replaceOutputValue, mappings, defaultValue);
    }

    @Override
    public String toString() {
        return "SwitchDefault{" +
                "type='" + type + '\'' +
                ", condition='" + condition + '\'' +
                ", outputField='" + outputField + '\'' +
                ", replaceOutputValue=" + replaceOutputValue +
                ", mappings=" + mappings +
                ", defaultValue=" + defaultValue +
                "} " + super.toString();
    }
}
