package com.curve.pojos.transformations.condition;

import com.curve.pojos.cell.DataRow;

import java.util.Objects;

public abstract class InvertableCondition implements Condition {

    private final boolean not;

    public InvertableCondition(boolean not) {
        this.not = not;
    }

    @Override
    public final boolean evaluate(DataRow dataRow) {
        if (not) {
            return evaluateInverted(dataRow);
        } else {
            return evaluateUninverted(dataRow);
        }
    }

    protected abstract boolean evaluateUninverted(DataRow dataRow);

    protected boolean evaluateInverted(DataRow dataRow) {
        return !evaluateUninverted(dataRow);
    }

    public boolean isNot() {
        return not;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        InvertableCondition that = (InvertableCondition) o;
        return not == that.not;
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(not);
    }

    @Override
    public String toString() {
        return "InvertableCondition{" +
                "not=" + not +
                '}';
    }
}
