package com.curve.pojos.transformations.calculation;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataCell;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import org.junit.Test;

import java.math.BigDecimal;
import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asNumeric;
import static com.curve.pojos.data.DataWrapper.Factory.asString;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

public class AdditionTest {
    private static final String FIELD_TO_MATCH = "myField";

    @Test
    public void testBasicAddition() throws Exception {
        var toTest = createEquation();
        var result = toTest.calculate(createDataRow(new BigDecimal("3.0")), asString("3"));
        assertEquals(new BigDecimal("6.0"), result.data());
    }

    @Test
    public void testFloatingPointAddition() throws Exception {
        var toTest = createEquation();
        var result = toTest.calculate(createDataRow(new BigDecimal("0.2")), asString("0.1"));
        assertEquals(new BigDecimal("0.3"), result.data());
    }

    @Test
    public void testNullReturnOnTypeMismatch() throws Exception {
        var toTest = createEquation();
        var result = toTest.calculate(createDataRow("Hello"), asString("3"));
        assertNull(result);
    }

    @Test
    public void testNullLeftValue() throws Exception {
        var toTest = createEquation();
        var result = toTest.calculate(createDataRowWithNull(), asString("3"));
        assertNull(result);
    }

    @Test
    public void testNullRightValue() throws Exception {
        var toTest = createEquation();
        var result = toTest.calculate(createDataRow(new BigDecimal("2.0")), null);
        assertNull(result);
    }

    private Addition createEquation() throws ValidationException {
        return new Addition("addition", FIELD_TO_MATCH, null, null);
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
