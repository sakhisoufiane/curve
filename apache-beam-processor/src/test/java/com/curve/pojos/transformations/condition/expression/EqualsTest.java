package com.curve.pojos.transformations.condition.expression;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataCell;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.transformations.condition.simple.Equals;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asNumeric;
import static com.curve.pojos.data.DataWrapper.Factory.asString;
import static com.curve.testutil.AssertionUtils.assertFalseIfNotInverted;
import static com.curve.testutil.AssertionUtils.assertTrueIfNotInverted;

public class EqualsTest {

    private static final String FIELD_TO_MATCH = "myField";

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testCheckStringsMatch(boolean inverted) throws ValidationException {
        var toTest = createExpression("hello", inverted);
        var result = toTest.evaluate(createDataRow("hello"));
        assertTrueIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testCheckStringsDontMatch(boolean inverted) throws ValidationException {
        var toTest = createExpression("hello", inverted);
        var result = toTest.evaluate(createDataRow("goodbye"));
        assertFalseIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testLeftValueNullRightValueString(boolean inverted) throws ValidationException {
        var toTest = createExpression("hello", inverted);
        var result = toTest.evaluate(createDataRowWithNull());
        assertFalseIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testLeftValueStringRightValueNull(boolean inverted) throws ValidationException {
        var toTest = createExpression(null, inverted);
        var result = toTest.evaluate(createDataRow("hello"));
        assertFalseIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testCheckNumbersMatch(boolean inverted) throws ValidationException {
        var toTest = createExpression("0.3", inverted);
        var result = toTest.evaluate(createDataRow(new BigDecimal("0.3")));
        assertTrueIfNotInverted(result, inverted);
    }

    /**
     * Numbers should match regardless of their scale
     */
    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testCheckSimilarNumbersMatch(boolean inverted) throws Exception {
        var toTest = createExpression("0.30", inverted);
        var result = toTest.evaluate(createDataRow(new BigDecimal("0.3")));
        assertTrueIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testCheckNumbersDontMatch(boolean inverted) throws ValidationException {
        var toTest = createExpression("0.3", inverted);
        var result = toTest.evaluate(createDataRow(new BigDecimal("0.5")));
        assertFalseIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testLeftValueNullRightValueNumber(boolean inverted) throws ValidationException {
        var toTest = createExpression("0.3", inverted);
        var result = toTest.evaluate(createDataRowWithNull());
        assertFalseIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testLeftValueNumberRightValueNull(boolean inverted) throws ValidationException {
        var toTest = createExpression(null, inverted);
        var result = toTest.evaluate(createDataRow(new BigDecimal("0.3")));
        assertFalseIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testNullsMatch(boolean inverted) throws ValidationException {
        var toTest = createExpression(null, inverted);
        var result = toTest.evaluate(createDataRowWithNull());
        assertTrueIfNotInverted(result, inverted);
    }

    private Equals createExpression(String rightValue, boolean inverted) throws ValidationException {
        return new Equals("equals", inverted, FIELD_TO_MATCH, null, null, rightValue);
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

    private DataRow createDataRowWithNull() {
        List<DataCell> dataCells = List.of(
                new NonNullDataCell(FIELD_TO_MATCH, null)
        );
        return new DataRow(dataCells, dataCells);
    }
}
