package com.curve.pojos.transformations.condition.expression;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataCell;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.transformations.condition.simple.Contains;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asString;
import static com.curve.testutil.AssertionUtils.assertFalseIfNotInverted;
import static com.curve.testutil.AssertionUtils.assertTrueIfNotInverted;

public class ContainsTest {

    private static final String FIELD_TO_MATCH = "myField";

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testContains(boolean inverted) throws ValidationException {
        var toTest = createExpression("hello", inverted);
        var result = toTest.evaluate(createDataRow("hello world"));
        assertTrueIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testDoesNotContain(boolean inverted) throws ValidationException {
        var toTest = createExpression("hello", inverted);
        var result = toTest.evaluate(createDataRow("goodbye world"));
        assertFalseIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testLeftNullReturnsFalse(boolean inverted) throws ValidationException {
        var toTest = createExpression("hello", inverted);
        var result = toTest.evaluate(createDataRow(null));
        assertFalseIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testRightNullReturnsFalse(boolean inverted) throws ValidationException {
        var toTest = createExpression(null, inverted);
        var result = toTest.evaluate(createDataRow("hello world"));
        assertFalseIfNotInverted(result, inverted);
    }

    private Contains createExpression(String rightValue, boolean inverted) throws ValidationException {
        return new Contains("contains", inverted, FIELD_TO_MATCH, null, null, rightValue, false);
    }

    private DataRow createDataRow(String value) {
        List<DataCell> dataCells = List.of(
                new NonNullDataCell(FIELD_TO_MATCH, asString(value))
        );
        return new DataRow(dataCells, dataCells);
    }
}
