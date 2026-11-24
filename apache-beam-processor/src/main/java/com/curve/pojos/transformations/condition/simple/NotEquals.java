package com.curve.pojos.transformations.condition.simple;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.data.StringDataWrapper;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.util.Objects;

import static com.curve.pojos.data.DataWrapper.Factory.asNumeric;
import static com.curve.pojos.data.DataWrapper.Factory.asString;

public class NotEquals extends AbstractCondition {
    public static final String TYPE = "notEquals";

    @JsonCreator
    public NotEquals(
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
        DataWrapper<?> leftWrapper = createLeftValue(dataRow);
        DataWrapper<?> rightWrapper = getRightValue();

        var leftBg = asNumeric(leftWrapper, false);
        var rightBg = asNumeric(rightWrapper, false);

        if (leftBg != null && rightBg != null) {
            return leftBg.data().compareTo(rightBg.data()) != 0;
        } else {
            StringDataWrapper leftStr = asString(leftWrapper);
            StringDataWrapper rightStr = asString(rightWrapper);

            return !Objects.equals(
                    leftStr != null ? leftStr.data() : null,
                    rightStr != null ? rightStr.data() : null
            );
        }
    }
}
