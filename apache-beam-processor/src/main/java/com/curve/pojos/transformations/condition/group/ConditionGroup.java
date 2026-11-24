package com.curve.pojos.transformations.condition.group;

import com.curve.pojos.transformations.condition.Condition;
import com.curve.pojos.transformations.condition.InvertableCondition;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

public abstract class ConditionGroup extends InvertableCondition {
    @Nonnull
    private final String type;

    @Nonnull
    private final List<Condition> conditions;

    public ConditionGroup(
            @Nonnull String type,
            boolean not,
            @Nullable List<Condition> conditions
    ) {
        super(not);
        this.type = type;
        this.conditions = conditions != null ? conditions : Collections.emptyList();
    }

    @Nonnull
    @Override
    public String getType() {
        return type;
    }

    @Nonnull
    public List<Condition> getConditions() {
        return conditions;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ConditionGroup that = (ConditionGroup) o;
        return Objects.equals(type, that.type) && Objects.equals(conditions, that.conditions);
    }

    @Override
    public int hashCode() {
        return Objects.hash(type, conditions);
    }

    @Override
    public String toString() {
        return "ConditionGroup{" +
                "type='" + type + '\'' +
                ", conditions=" + conditions +
                '}';
    }
}