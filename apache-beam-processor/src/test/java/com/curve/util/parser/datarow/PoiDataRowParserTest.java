package com.curve.util.parser.datarow;

import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.input.config.type.AbstractExcelFileType;
import com.curve.pojos.input.config.type.XLSFileType;
import com.curve.pojos.input.schemas.InputColumnSchema;
import com.curve.pojos.input.schemas.InputColumnSchemas;
import com.curve.util.SchemaTypes;
import com.curve.util.DefaultValueMapping;
import com.curve.util.parser.data.row.DataRowParser;
import com.curve.util.parser.data.wrapper.PoiDataWrapperParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.junit.Test;
import org.mockito.stubbing.Answer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.mockito.Mockito.*;

// TODO I really really wanna use jUnit 5. Parameterized tests with CSV sources and Nested classes would be cleaner
public class PoiDataRowParserTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final Answer<?> DEFAULT_ANSWER = (invocationOnMock -> {
        throw new IllegalStateException("Invoked method " + invocationOnMock.getMethod().getName() +
                " but this hasn't been explicitly implemented. Falling back to throwing IllegalStateException"
        );
    });

    /*
     * Mapping cells
     */

    @Test
    public void testCellMappingForStringCases() throws Exception {

        var testCases = List.of(
                // Strings should be mappable to string field
                new StringCellMappingTestCase("Hello", SchemaTypes.STRING, "java.lang.String", "Hello"),
                // Numerics should be mapped to BigDecimals
                new StringCellMappingTestCase("1234", SchemaTypes.NUMBER, "java.math.BigDecimal", "1234"),
                new StringCellMappingTestCase("1234,56", SchemaTypes.NUMBER_COMMA_SEPARATED, "java.math.BigDecimal", "1234.56"),
                new StringCellMappingTestCase("78.90", SchemaTypes.NUMBER_2_DECIMAL_PLACES, "java.math.BigDecimal", "78.90"),
                new StringCellMappingTestCase("23.45678", SchemaTypes.NUMBER_5_DECIMAL_PLACES, "java.math.BigDecimal", "23.45678"),
                // Booleans should be mapped to Booleans
                new StringCellMappingTestCase("true", SchemaTypes.BOOLEAN, "java.lang.Boolean", "true"),
                // Dates should be mapped to LocalDates
                new StringCellMappingTestCase("31/01/2020", SchemaTypes.DATE, "DD/MM/YYYY", "java.time.LocalDate", "2020-01-31"),
                new StringCellMappingTestCase("28-02-2020", SchemaTypes.DATE, "DD-MM-YYYY", "java.time.LocalDate", "2020-02-28"),
                new StringCellMappingTestCase("30-Jun-2020", SchemaTypes.DATE, "DD-MMM-YYYY", "java.time.LocalDate", "2020-06-30"),
                // Formats with no day portion should be mapped to the first day of the month
                new StringCellMappingTestCase("2001", SchemaTypes.DATE, "YYMM", "java.time.LocalDate", "2020-01-01"),
                // Formats containing Q (quarter) or H (half) should be mapped to the first day of the first month of the quarter/half of the year
                new StringCellMappingTestCase("2020_2", SchemaTypes.DATE, "YYYY_Q", "java.time.LocalDate", "2020-04-01"),
                new StringCellMappingTestCase("20203", SchemaTypes.DATE, "YYYYQ", "java.time.LocalDate", "2020-07-01"),
                new StringCellMappingTestCase("2020_1", SchemaTypes.DATE, "YYYY_H", "java.time.LocalDate", "2020-01-01"),
                // Date ranges should be mapped to the first date in the range
                new StringCellMappingTestCase("08201020", SchemaTypes.DATE, "MMYYMMYY", "java.time.LocalDate", "2020-08-01")
        );

        for (var testCase : testCases) {
            var row = mockRow(mockStringCell(testCase.cellValue));

            var toTest = new DataRowParser<>(
                    mockFileType(),
                    mockInputColumnSchemas("myField", testCase.columnType, testCase.dateFormat),
                    new DefaultValueMapping(Collections.emptyMap()),
                    new PoiDataWrapperParser()
            );

            var actual = toTest.parse(row);

            var errorMessage = "For cellValue: %s, columnType: %s".formatted(testCase.cellValue, testCase.columnType);
            assertEquals(errorMessage, 1, actual.size());

            assertThat(actual.get(0)).isInstanceOfSatisfying(NonNullDataCell.class, nonNullDataCell -> {
                assertEquals(errorMessage, "myField", nonNullDataCell.getField());
                assertEquals(errorMessage, testCase.expectedClass, nonNullDataCell.getDataWrapper().data().getClass().getName());
                assertEquals(errorMessage, testCase.expectedValue, nonNullDataCell.getDataWrapper().data().toString());
            });


        }
    }

    @Test
    public void testCellMappingForNumericCases() throws Exception {
        var testCases = List.of(
                new BigDecimalCellMappingTestCase(new BigDecimal("1234.56"), SchemaTypes.NUMBER, "java.math.BigDecimal", "1234.56"),
                new BigDecimalCellMappingTestCase(new BigDecimal("7890.12"), SchemaTypes.NUMBER_COMMA_SEPARATED, "java.math.BigDecimal", "7890.12"),
                new BigDecimalCellMappingTestCase(new BigDecimal("3456.78"), SchemaTypes.NUMBER_2_DECIMAL_PLACES, "java.math.BigDecimal", "3456.78"),
                new BigDecimalCellMappingTestCase(new BigDecimal("9012.34"), SchemaTypes.NUMBER_5_DECIMAL_PLACES, "java.math.BigDecimal", "9012.34")
        );

        for (var testCase : testCases) {
            var row = mockRow(mockNumericCell(testCase.cellValue));

            var toTest = new DataRowParser<>(
                    mockFileType(),
                    mockInputColumnSchemas("myField", testCase.columnType),
                    new DefaultValueMapping(Collections.emptyMap()),
                    new PoiDataWrapperParser()
            );

            var actual = toTest.parse(row);

            var errorMessage = "For cellValue: %s, columnType: %s".formatted(testCase.cellValue, testCase.columnType);
            assertEquals(errorMessage, 1, actual.size());
            assertThat(actual.get(0)).isInstanceOfSatisfying(NonNullDataCell.class, nonNullDataCell -> {
                assertEquals(errorMessage, "myField", nonNullDataCell.getField());
                assertEquals(errorMessage, testCase.expectedClass, nonNullDataCell.getDataWrapper().data().getClass().getName());
                assertEquals(errorMessage, testCase.expectedValue, nonNullDataCell.getDataWrapper().data().toString());
            });
        }
    }

    @Test
    public void testCellMappingForBooleanCase() throws Exception {
        boolean cellValue = true;
        String columnType = SchemaTypes.BOOLEAN;
        String expectedClass = "java.lang.Boolean";
        String expectedValue = "true";

        var row = mockRow(mockBooleanCell(cellValue));

        var toTest = new DataRowParser<>(
                mockFileType(),
                mockInputColumnSchemas("myField", columnType),
                new DefaultValueMapping(Collections.emptyMap()),
                new PoiDataWrapperParser()
        );

        var actual = toTest.parse(row);

        assertEquals(1, actual.size());
        assertThat(actual.get(0)).isInstanceOfSatisfying(NonNullDataCell.class, nonNullDataCell -> {
            assertEquals("myField", nonNullDataCell.getField());
            assertEquals(expectedClass, nonNullDataCell.getDataWrapper().data().getClass().getName());
            assertEquals(expectedValue, nonNullDataCell.getDataWrapper().data().toString());
        });
    }

    @Test
    public void testCellMappingForDateCase() throws Exception {
        LocalDate cellValue = LocalDate.of(2024, 3, 14);
        String columnType = SchemaTypes.DATE;
        String expectedClass = "java.time.LocalDate";
        String expectedValue = "2024-03-14";

        var row = mockRow(mockDateCell(cellValue));

        var toTest = new DataRowParser<>(
                mockFileType(),
                mockInputColumnSchemas("myField", columnType, "YYYY-MM-DD"),
                new DefaultValueMapping(Collections.emptyMap()),
                new PoiDataWrapperParser()
        );

        var actual = toTest.parse(row);

        assertEquals(1, actual.size());
        assertThat(actual.get(0)).isInstanceOfSatisfying(NonNullDataCell.class, nonNullDataCell -> {
            assertEquals("myField", nonNullDataCell.getField());
            assertEquals(expectedClass, nonNullDataCell.getDataWrapper().data().getClass().getName());
            assertEquals(expectedValue, nonNullDataCell.getDataWrapper().data().toString());
        });
    }

    @Test
    public void testCellMappingForNullCase() throws Exception {
        String columnType = SchemaTypes.STRING;

        var row = mockRow(null);

        var toTest = new DataRowParser<>(
                mockFileType(),
                mockInputColumnSchemas("myField", columnType),
                new DefaultValueMapping(Collections.emptyMap()),
                new PoiDataWrapperParser()
        );

        var actual = toTest.parse(row);

        assertEquals(1, actual.size());
        assertThat(actual.get(0)).isInstanceOfSatisfying(NonNullDataCell.class, nonNullDataCell -> {
            assertEquals("myField", nonNullDataCell.getField());
            assertNull(nonNullDataCell.getDataWrapper());
        });
    }

    /*
     * Utility
     */

    private AbstractExcelFileType mockFileType() {
        var fileTypeInfo = mock(XLSFileType.class);
        doReturn(0).when(fileTypeInfo).getStartingColumn();
        return fileTypeInfo;
    }

    private InputColumnSchemas mockInputColumnSchemas(String columnField, String columnType, String dateFormat) throws JsonProcessingException {
        var objectNode = MAPPER.createObjectNode()
                .put("field", columnField)
                .put("type", columnType);

        if (dateFormat != null) {
            objectNode.put("dateFormat", dateFormat);
        }

        var schema = MAPPER.treeToValue(objectNode, InputColumnSchema.class);
        return new InputColumnSchemas(List.of(schema));
    }

    private InputColumnSchemas mockInputColumnSchemas(String columnField, String columnType) throws JsonProcessingException {
        return mockInputColumnSchemas(columnField, columnType, null);
    }

    private Cell[] mockRow(Cell cell) {
        return new Cell[]{cell};
    }

    private Cell mockStringCell(String cellValue) {
        var cell = mock(Cell.class, DEFAULT_ANSWER);
        doReturn(cellValue).when(cell).getStringCellValue();
        doReturn(CellType.STRING).when(cell).getCellType();
        return cell;
    }

    private Cell mockNumericCell(BigDecimal cellValue) {
        var cell = mock(Cell.class, DEFAULT_ANSWER);
        doReturn(cellValue.doubleValue()).when(cell).getNumericCellValue();
        doReturn(CellType.NUMERIC).when(cell).getCellType();
        return cell;
    }

    private Cell mockDateCell(LocalDate cellValue) {
        var cell = mock(Cell.class, DEFAULT_ANSWER);
        doReturn(cellValue.atStartOfDay()).when(cell).getLocalDateTimeCellValue();
        doReturn(CellType.NUMERIC).when(cell).getCellType();
        return cell;
    }

    private Cell mockBooleanCell(boolean cellValue) {
        var cell = mock(Cell.class, DEFAULT_ANSWER);
        doReturn(cellValue).when(cell).getBooleanCellValue();
        doReturn(CellType.BOOLEAN).when(cell).getCellType();
        return cell;
    }

    private record StringCellMappingTestCase(String cellValue, String columnType, String dateFormat,
                                             String expectedClass, String expectedValue) {
        private StringCellMappingTestCase(String cellValue, String columnType, String expectedClass, String expectedValue) {
            this(cellValue, columnType, null, expectedClass, expectedValue);
        }
    }

    private record BigDecimalCellMappingTestCase(BigDecimal cellValue, String columnType, String expectedClass,
                                                 String expectedValue) {
    }
}
