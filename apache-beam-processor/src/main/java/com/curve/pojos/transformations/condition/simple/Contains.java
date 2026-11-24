package com.curve.pojos.transformations.condition.simple;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.StringDataWrapper;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.util.Locale;

import static com.curve.pojos.data.DataWrapper.Factory.asString;

public class Contains extends AbstractCondition {
    public static final String TYPE = "contains";
    
    private final boolean caseInsensitive;

    @JsonCreator
    public Contains(
            @JsonProperty(value = "type", required = true) String type,
            @JsonProperty(value = "not") boolean not,
            @JsonProperty(value = "leftValueFieldName") String leftValueFieldName,
            @JsonProperty(value = "leftValueColumnIndex") Integer leftValueColumnIndex,
            @JsonProperty(value = "leftFixedValue") Integer leftFixedValue,
            @JsonProperty(value = "rightValue") Serializable rightValue,
            @JsonProperty(value = "caseInsensitive") boolean caseInsensitive
    ) throws ValidationException {
        super(type, not, leftValueFieldName, leftValueColumnIndex, leftFixedValue, rightValue);
        this.caseInsensitive = caseInsensitive;
    }

    @Override
    protected boolean evaluateUninverted(DataRow dataRow) {
        StringDataWrapper left = asString(createLeftValue(dataRow));
        StringDataWrapper right = asString(getRightValue());

        if (left == null || right == null) return false;

        String leftData = left.data();
        String rightData = right.data();
        
        if (caseInsensitive) {
            leftData = leftData.toUpperCase(Locale.US);
            rightData = rightData.toUpperCase(Locale.US);
        }
        
        return leftData.contains(rightData);
    }
}
