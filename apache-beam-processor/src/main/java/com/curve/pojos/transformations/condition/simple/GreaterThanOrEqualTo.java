package com.curve.pojos.transformations.condition.simple;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.NumericDataWrapper;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;

import static com.curve.pojos.data.DataWrapper.Factory.asNumeric;

public class GreaterThanOrEqualTo extends AbstractCondition {
    public static final String TYPE = "greaterThanOrEqualTo";

    @JsonCreator
    public GreaterThanOrEqualTo(
            @JsonProperty(value = "type", required = true) String type,
            @JsonProperty(value = "not") boolean not,
            @JsonProperty(value = "leftValueFieldName") String leftValueFieldName,
            @JsonProperty(value = "leftValueColumnIndex") Integer leftValueColumnIndex,
            @JsonProperty(value = "leftFixedValue") Integer leftFixedValue,
            @JsonProperty(value = "rightValue") Serializable rightValue
    ) throws ValidationException {
        super(type, not, leftValueFieldName, leftValueColumnIndex, leftFixedValue, rightValue);
    }

    @Override
    protected boolean evaluateUninverted(DataRow dataRow) {
        NumericDataWrapper left = asNumeric(createLeftValue(dataRow));
        NumericDataWrapper right = asNumeric(getRightValue());

        return left != null && right != null && left.data().compareTo(right.data()) >= 0;
    }
}
