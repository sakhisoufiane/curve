package com.curve.pojos.transformations.calculation;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

import static com.curve.pojos.data.DataWrapper.Factory.asNumeric;

public class Division extends Equation {

    private static final Logger LOGGER = LoggerFactory.getLogger(Division.class);
    
    // Kinda stupid, but in division, we don't know how if we will get a repeating decimal. Using this MathContext
    // for division will output either the minimum scale required to represent an exact decimal value, or up to
    // the same number of significant figures as a double (but with higher accuracy).
    private static final MathContext DOUBLE_PRECISION = new MathContext(17, RoundingMode.HALF_UP);

    @JsonCreator
    public Division(
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
        
        if (rightValue.compareTo(BigDecimal.ZERO) == 0) {
            LOGGER.error("Attempted to divide by zero. DataRow: {}. Division: {}", dataRow, this);
            return null;
        } else {
            var total = leftValue.divide(rightValue, DOUBLE_PRECISION);
            return asNumeric(total);
        }
    }
}
