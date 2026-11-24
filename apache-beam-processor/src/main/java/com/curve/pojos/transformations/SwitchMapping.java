package com.curve.pojos.transformations;

import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.transformations.condition.Condition;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.util.Objects;

public class SwitchMapping implements Serializable {

    @Nonnull
    private final Condition condition;
    @Nullable
    private final DataWrapper<?> value;

    @JsonCreator
    public SwitchMapping(
            @JsonProperty(value = "condition", required = true) @Nonnull Condition condition,
            @JsonProperty(value = "value") @Nullable Serializable value) {
        this.condition = condition;
        this.value = value != null ? DataWrapper.Factory.fromSerializable(value) : null;
    }

    @Nonnull
    public Condition getCondition() {
        return condition;
    }

    @Nullable
    public DataWrapper<?> getValue() {
        return value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SwitchMapping that = (SwitchMapping) o;
        return Objects.equals(condition, that.condition) && Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(condition, value);
    }

    @Override
    public String toString() {
        return "SwitchMapping{" +
                "condition=" + condition +
                ", value=" + value +
                '}';
    }
}
