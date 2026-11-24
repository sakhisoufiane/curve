package com.curve.pojos.transformations.condition.group;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.transformations.condition.Condition;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public class And extends ConditionGroup {
    public static final String TYPE = "and";

    @JsonCreator
    public And(
            @JsonProperty(value = "type", required = true) String type,
            @JsonProperty(value = "not") boolean not,
            @JsonProperty(value = "conditions") List<Condition> conditions
    ) {
        super(type, not, conditions);
    }

    @Override
    protected boolean evaluateUninverted(DataRow dataRow) {
        for (Condition condition : getConditions()) {
            boolean expressionValue = condition.evaluate(dataRow);
            if (!expressionValue) {
                return false;
            }
        }
        return true;
    }
}
