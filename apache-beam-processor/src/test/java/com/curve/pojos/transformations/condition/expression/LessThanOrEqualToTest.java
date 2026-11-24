package com.curve.pojos.transformations.condition.expression;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataCell;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.transformations.condition.simple.LessThanOrEqualTo;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import javax.annotation.Nullable;
import java.math.BigDecimal;
import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asNumeric;
import static com.curve.pojos.data.DataWrapper.Factory.asString;
import static com.curve.testutil.AssertionUtils.assertFalseIfNotInverted;
import static com.curve.testutil.AssertionUtils.assertTrueIfNotInverted;
import static org.junit.jupiter.api.Assertions.assertFalse;

public class LessThanOrEqualToTest {

    private static final String FIELD_TO_MATCH = "myField";

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testLessThanReturnsTrue(boolean inverted) throws ValidationException {
        var toTest = createExpression("4.0", inverted);
        var result = toTest.evaluate(createDataRow(new BigDecimal("3")));
        assertTrueIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testEqualsReturnsTrue(boolean inverted) throws ValidationException {
        var toTest = createExpression("3.0", inverted);
        var result = toTest.evaluate(createDataRow(new BigDecimal("3")));
        assertTrueIfNotInverted(result, inverted);
    }

    /**
     * Verify that, regardless of scale or precision, numbers that are similar are still equal to
     */
    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testSimilarReturnsTrue(boolean inverted) throws Exception {
        var toTest = createExpression("3.00", inverted);
        var result = toTest.evaluate(createDataRow(new BigDecimal("3")));
        assertTrueIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testLessThanReturnsFalse(boolean inverted) throws ValidationException {
        var toTest = createExpression("2.0", inverted);
        var result = toTest.evaluate(createDataRow(new BigDecimal("3")));
        assertFalseIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"Stuff"})
    public void testInvalidLeftValueReturnsFalse(@Nullable String leftValue) throws ValidationException {
        var toTest = createExpression("4.0", false);
        var result = toTest.evaluate(createDataRow(leftValue));
        assertFalse(result);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"Stuff"})
    public void testInvalidRightValueReturnsFalse(@Nullable String rightValue) throws ValidationException {
        var toTest = createExpression(rightValue, false);
        var result = toTest.evaluate(createDataRow(new BigDecimal("3")));
        assertFalse(result);
    }

    private LessThanOrEqualTo createExpression(String rightValue, boolean inverted) throws ValidationException {
        return new LessThanOrEqualTo("lessThanOrEqualTo", inverted, FIELD_TO_MATCH, null, null, rightValue);
    }

    private DataRow createDataRow(String value) {
        List<DataCell> dataCells = List.of(
                new NonNullDataCell(FIELD_TO_MATCH, asString(value))
        );
        return new DataRow(dataCells, dataCells);
    }

    private DataRow createDataRow(BigDecimal value) {
        List<DataCell> dataCells = List.of(
                new NonNullDataCell(FIELD_TO_MATCH, asNumeric(value))
        );
        return new DataRow(dataCells, dataCells);
    }

}
