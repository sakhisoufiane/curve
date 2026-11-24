package com.curve.pojos.transformations.condition.simple;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.StringDataWrapper;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;

import static com.curve.pojos.data.DataWrapper.Factory.asString;

public class IsNotBlank extends AbstractCondition {
    public static final String TYPE = "isNotBlank";

    @JsonCreator
    public IsNotBlank(
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
        // A blank in Java will only be a null or the empty string, 0 is valid value.
        StringDataWrapper left = asString(createLeftValue(dataRow));
        return left != null && !left.data().isEmpty();
    }
}
