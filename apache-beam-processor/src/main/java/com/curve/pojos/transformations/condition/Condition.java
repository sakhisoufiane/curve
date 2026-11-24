package com.curve.pojos.transformations.condition;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.transformations.condition.group.And;
import com.curve.pojos.transformations.condition.group.Or;
import com.curve.pojos.transformations.condition.simple.*;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.io.Serializable;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type", visible = true)
@JsonSubTypes({
        @JsonSubTypes.Type(value = Always.class, name = Always.TYPE),
        @JsonSubTypes.Type(value = Contains.class, name = Contains.TYPE),
        @JsonSubTypes.Type(value = DoesNotContain.class, name = DoesNotContain.TYPE),
        @JsonSubTypes.Type(value = Equals.class, name = Equals.TYPE),
        @JsonSubTypes.Type(value = GreaterThan.class, name = GreaterThan.TYPE),
        @JsonSubTypes.Type(value = GreaterThanOrEqualTo.class, name = GreaterThanOrEqualTo.TYPE),
        @JsonSubTypes.Type(value = IsBlank.class, name = IsBlank.TYPE),
        @JsonSubTypes.Type(value = IsNotBlank.class, name = IsNotBlank.TYPE),
        @JsonSubTypes.Type(value = LessThan.class, name = LessThan.TYPE),
        @JsonSubTypes.Type(value = LessThanOrEqualTo.class, name = LessThanOrEqualTo.TYPE),
        @JsonSubTypes.Type(value = NotEquals.class, name = NotEquals.TYPE),

        @JsonSubTypes.Type(value = And.class, name = And.TYPE),
        @JsonSubTypes.Type(value = Or.class, name = Or.TYPE)
})
public interface Condition extends Serializable {
    String getType();

    boolean evaluate(DataRow dataRow);
}
