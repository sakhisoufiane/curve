package com.curve.pojos.transformations.condition.expression;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataCell;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.transformations.condition.simple.IsBlank;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asString;
import static com.curve.testutil.AssertionUtils.assertFalseIfNotInverted;
import static com.curve.testutil.AssertionUtils.assertTrueIfNotInverted;

public class IsBlankTest {

    private static final String FIELD_TO_MATCH = "myField";

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testNull(boolean inverted) throws ValidationException {
        var toTest = createExpression(inverted);
        var result = toTest.evaluate(createDataRow(null));
        assertTrueIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testEmptyString(boolean inverted) throws ValidationException {
        var toTest = createExpression(inverted);
        var result = toTest.evaluate(createDataRow(""));
        assertTrueIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    public void testNonEmptyString(boolean inverted) throws ValidationException {
        var toTest = createExpression(inverted);
        var result = toTest.evaluate(createDataRow("hello world"));
        assertFalseIfNotInverted(result, inverted);
    }

    private IsBlank createExpression(boolean inverted) throws ValidationException {
        return new IsBlank("isBlank", inverted, FIELD_TO_MATCH, null, null, null);
    }

    private DataRow createDataRow(String value) {
        List<DataCell> dataCells = List.of(
                new NonNullDataCell(FIELD_TO_MATCH, asString(value))
        );
        return new DataRow(dataCells, dataCells);
    }
}
