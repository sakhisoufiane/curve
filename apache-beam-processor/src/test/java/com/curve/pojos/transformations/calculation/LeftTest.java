package com.curve.pojos.transformations.calculation;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataCell;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.data.DataWrapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import javax.annotation.Nullable;
import java.io.Serializable;
import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asString;
import static org.junit.jupiter.api.Assertions.*;

public class LeftTest {
    @Test
    void testGetLeftCharacters() throws Exception {
        var toTest = createEquationFromFixed(3);

        var result = toTest.calculate(createDataRow(), asString("Hello"));

        assertNotNull(result);
        assertEquals("Hel", result.data());
    }

    @Test
    void testGetLeftCharactersOverflow() throws Exception {
        var toTest = createEquationFromFixed(7);

        var result = toTest.calculate(createDataRow(), asString("Hello"));

        assertNotNull(result);
        assertEquals("Hello", result.data());
    }

    @Test
    void testLeftValueNull() throws Exception {
        var toTest = createEquationFromFixed(3);

        var result = toTest.calculate(createDataRow(), null);

        assertNull(result);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"Hello"})
    void testInvalidRightValue(@Nullable String rightValue) throws Exception {
        var toTest = createEquationFromField("fieldName");

        var result = toTest.calculate(createDataRow("fieldName", rightValue), asString("Hello"));

        assertNull(result);
    }

    private Left createEquationFromField(String fieldName) throws ValidationException {
        return new Left("left", fieldName, null, null);
    }

    private Left createEquationFromFixed(Serializable fixedValue) throws ValidationException {
        return new Left("left", null, null, fixedValue);
    }

    private DataRow createDataRow(String fieldName, @Nullable Serializable value) {
        List<DataCell> dataCells = List.of(
                new NonNullDataCell(fieldName, value != null ? DataWrapper.Factory.fromSerializable(value) : null)
        );
        return new DataRow(dataCells, dataCells);
    }

    private DataRow createDataRow() {
        List<DataCell> dataCells = List.of();
        return new DataRow(dataCells, dataCells);
    }
}
