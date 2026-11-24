package com.curve.pojos.transformations;

import com.curve.pojos.transformations.condition.Condition;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;
import java.util.Objects;

/**
 * The Discard transformation will discard the row, if the given transformation evaluates to true
 */
public class Discard extends Transformation {
    public static final String NAME = "Discard";
    
    @Nonnull
    private final String type;
    @Nonnull
    private final Condition condition;

    @JsonCreator
    public Discard(@JsonProperty(value = "type", required = true) @Nonnull String type,
                   @JsonProperty(value = "condition", required = true) @Nonnull Condition condition) {
        super(dataRow -> condition.evaluate(dataRow) ? null : dataRow);
        this.type = type;
        this.condition = condition;
    }

    @Nonnull
    public String getType() {
        return type;
    }

    @Nonnull
    public Condition getCondition() {
        return condition;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Discard discard = (Discard) o;
        return Objects.equals(type, discard.type) && Objects.equals(condition, discard.condition);
    }

    @Override
    public int hashCode() {
        return Objects.hash(type, condition);
    }

    @Override
    public String toString() {
        return "Discard{" +
                "type='" + type + '\'' +
                ", condition=" + condition +
                "} " + super.toString();
    }
}
