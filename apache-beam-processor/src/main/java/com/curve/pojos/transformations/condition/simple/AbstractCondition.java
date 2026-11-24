package com.curve.pojos.transformations.condition.simple;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.transformations.condition.InvertableCondition;
import com.curve.pojos.transformations.value.ValueProvider;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.util.Objects;

import static com.curve.pojos.data.DataWrapper.Factory.fromSerializable;

public abstract class AbstractCondition extends InvertableCondition {

    private final String type;
    private final String leftValueFieldName;
    private final Integer leftValueColumnIndex;
    private final Serializable leftFixedValue;
    private final Serializable rightValue;

    private final ValueProvider leftValueProvider;
    private final DataWrapper<?> rightValueWrapper;

    public AbstractCondition(
            String type,
            boolean not,
            String leftValueFieldName,
            Integer leftValueColumnIndex,
            Serializable leftFixedValue,
            Serializable rightValue
    ) throws ValidationException {
        super(not);
        this.type = type;
        this.leftValueFieldName = leftValueFieldName;
        this.leftValueColumnIndex = leftValueColumnIndex;
        this.leftFixedValue = leftFixedValue;
        this.rightValue = rightValue;

        this.leftValueProvider = ValueProvider.create(leftValueFieldName, leftValueColumnIndex, leftFixedValue);
        this.rightValueWrapper = rightValue != null ? fromSerializable(rightValue) : null;
    }

    @Nonnull
    public String getType() {
        return this.type;
    }

    @Nullable
    public String getLeftValueFieldName() {
        return leftValueFieldName;
    }

    @Nullable
    public Integer getLeftValueColumnIndex() {
        return leftValueColumnIndex;
    }

    @Nullable
    public Serializable getLeftFixedValue() {
        return leftFixedValue;
    }

    @Nullable
    public DataWrapper<?> getRightValue() {
        return rightValueWrapper;
    }

    @Nullable
    public DataWrapper<?> createLeftValue(DataRow dataRow) {
        return leftValueProvider.provide(dataRow);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        if (!super.equals(o)) return false;
        AbstractCondition that = (AbstractCondition) o;
        return Objects.equals(type, that.type) && Objects.equals(leftValueFieldName, that.leftValueFieldName) && Objects.equals(leftValueColumnIndex, that.leftValueColumnIndex) && Objects.equals(leftFixedValue, that.leftFixedValue) && Objects.equals(rightValue, that.rightValue) && Objects.equals(leftValueProvider, that.leftValueProvider) && Objects.equals(rightValueWrapper, that.rightValueWrapper);
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), type, leftValueFieldName, leftValueColumnIndex, leftFixedValue, rightValue, leftValueProvider, rightValueWrapper);
    }

    @Override
    public String toString() {
        return "AbstractCondition{" +
                "type='" + type + '\'' +
                ", leftValueFieldName='" + leftValueFieldName + '\'' +
                ", leftValueColumnIndex=" + leftValueColumnIndex +
                ", leftFixedValue=" + leftFixedValue +
                ", rightValue=" + rightValue +
                ", leftValueProvider=" + leftValueProvider +
                ", rightValueWrapper=" + rightValueWrapper +
                "} " + super.toString();
    }
}
