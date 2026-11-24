package com.curve.pojos.transformations.calculation;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;

import static com.curve.pojos.data.DataWrapper.Factory.asNumeric;

public class Addition extends Equation {

    @JsonCreator
    public Addition(
            @JsonProperty(value = "calculationType", required = true) String calculationType,
            @JsonProperty(value = "equationValueFieldName") String equationValueFieldName,
            @JsonProperty(value = "equationValueColumnIndex") Integer equationValueColumnIndex,
            @JsonProperty(value = "equationFixedValue") Serializable equationFixedValue
    ) throws ValidationException {
        super(calculationType, equationValueFieldName, equationValueColumnIndex, equationFixedValue);
    }

    @Override
    @Nullable
    public DataWrapper<?> calculate(@Nonnull DataRow dataRow, @Nullable DataWrapper<?> currentValue) {
        var leftValueWrapper = asNumeric(currentValue);
        var rightValueWrapper = asNumeric(findEquationValue(dataRow));

        if (leftValueWrapper == null || rightValueWrapper == null) return null;

        var leftValue = leftValueWrapper.data();
        var rightValue = rightValueWrapper.data();
        var total = leftValue.add(rightValue);
        return asNumeric(total);
    }
}
