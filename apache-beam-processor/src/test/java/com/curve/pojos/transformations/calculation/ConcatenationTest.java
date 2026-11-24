package com.curve.pojos.transformations.calculation;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataCell;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.data.DataWrapper;
import org.junit.jupiter.api.Test;

import javax.annotation.Nullable;
import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asString;
import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertNull;

public class ConcatenationTest {
    private static final String FIELD_TO_MATCH = "myField";

    @Test
    void testConcatenate() throws Exception {
        var toTest = createEquation();

        var result = toTest.calculate(createDataRow("World"), asString("Hello "));

        assertNotNull(result);
        assertEquals("Hello World", result.data());
    }

    @Test
    void testLeftValueNull() throws Exception {
        var toTest = createEquation();

        var result = toTest.calculate(createDataRow("World"), null);

        assertNull(result);
    }

    @Test
    void testRightValueNull() throws Exception {
        var toTest = createEquation();

        var result = toTest.calculate(createDataRow(null), asString("Hello"));

        assertNull(result);
    }

    private Concatenation createEquation() throws ValidationException {
        return new Concatenation("concatenation", FIELD_TO_MATCH, null, null);
    }

    private DataRow createDataRow(@Nullable String data) {
        List<DataCell> dataCells = List.of(
                new NonNullDataCell(FIELD_TO_MATCH, data != null ? DataWrapper.Factory.fromSerializable(data) : null)
        );
        return new DataRow(dataCells, dataCells);
    }
}
