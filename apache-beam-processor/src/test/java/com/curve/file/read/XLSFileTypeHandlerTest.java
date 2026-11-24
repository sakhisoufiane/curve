package com.curve.file.read;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.DefaultValue;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.cell.NullDataCell;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.input.config.source.FileSource;
import com.curve.pojos.input.config.source.LocalFileSource;
import com.curve.pojos.input.config.type.XLSBFileType;
import com.curve.pojos.input.schemas.*;
import com.curve.pojos.transformations.value.ValueProvider;
import com.curve.util.DefaultValueMapping;
import org.apache.beam.sdk.testing.PAssert;
import org.apache.beam.sdk.testing.TestPipeline;
import org.junit.Rule;
import org.junit.Test;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

public class XLSFileTypeHandlerTest implements Serializable {

    @Rule
    public final transient TestPipeline pipeline = TestPipeline.create();

    @Test
    public void testExtractDefaultValuesFromFile() throws Exception {
        // Grab the test data. There are target cells:
        //     M1 (Which is the default value for column A - Territory) - Value is "UK"
        //     N3 (Which is the default value for column B - Channel) - Value is "Analog"
        DefaultValue target1 = createTargetCell("Territory", "String", "M1");
        DefaultValue target2 = createTargetCell("Channel", "String", "N3");
        DefaultValue fixed1 = createFixedDefault("Some field", "String", "Some value");
        DefaultValue fixed2 = createFixedDefault("Some other field", "Boolean", true);

        var toTest = new XLSFileTypeHandler(createFileType(1));

        var actual = toTest.extractDefaultValuesFromFile(
                createFileSource("/data/xlsx/target-cell-test-data.xlsx"),
                List.of(target1, target2, fixed1, fixed2)
        );

        assertThat(actual.getByFieldName("Territory")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo("UK");
        assertThat(actual.getByFieldName("Channel")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo("Analog");
        assertThat(actual.getByFieldName("Some field")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo("Some value");
        assertThat(actual.getByFieldName("Some other field")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo(true);
    }

    /**
     * Validate that no default values are returned if none are configured to be retrieved
     */
    @Test
    public void testNoDefaults() throws Exception {
        var toTest = new XLSFileTypeHandler(createFileType(1));

        var actual = toTest.extractDefaultValuesFromFile(
                createFileSource("/data/xlsx/target-cell-test-data.xlsx"),
                List.of()
        );

        assertNotNull(actual);
    }

    /**
     * Validate that if no target cells are given, and only fixed default values, then these values are returned
     */
    @Test
    public void testOnlyFixedDefaults() throws Exception {
        DefaultValue fixed1 = createFixedDefault("Some field", "String", "Some value");
        DefaultValue fixed2 = createFixedDefault("Some other field", "Boolean", true);

        var toTest = new XLSFileTypeHandler(createFileType(1));

        var actual = toTest.extractDefaultValuesFromFile(
                createFileSource("/data/xlsx/target-cell-test-data.xlsx"),
                List.of(fixed1, fixed2)
        );
        assertThat(actual.getByFieldName("Some field")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo("Some value");
        assertThat(actual.getByFieldName("Some other field")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo(true);
    }

    @Test
    public void testReadFile() throws Exception {
        var toTest = new XLSFileTypeHandler(createFileType(1));

        var reader = toTest.createRowReader(
                createFileSource("/data/xlsx/target-cell-test-data.xlsx"),
                createInputColumnSchemas(),
                new DefaultValueMapping(new LinkedHashMap<>() {{
                    put(createTargetCell("Territory", "String", "J1"), asString("UK"));
                    put(createTargetCell("Channel", "String", "K2"), asString("Analog"));
                    put(createFixedDefault("Some field", "String", "Some value"), asString("Some value"));
                    put(createFixedDefault("Some other field", "Boolean", Boolean.TRUE), asBoolean(true));
                }}));

        var result = pipeline
                .apply(reader);

        PAssert.that(result)
                .containsInAnyOrder(
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.31"), "Harry Styles", true, LocalDate.of(2023,6,17), new BigDecimal("1234.56"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "1", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Yoko Ono", true, LocalDate.of(2023,6,17), new BigDecimal("1234.57"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "2", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Cher Lloyd", true, LocalDate.of(2023,6,17), new BigDecimal("1234.58"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "3", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Yoko Ono", true, LocalDate.of(2023,6,17), new BigDecimal("1234.59"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "4", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Ricky Martin", true, LocalDate.of(2023,6,17), new BigDecimal("1234.60"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "5", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Thalia", true, LocalDate.of(2023,6,17), new BigDecimal("1234.61"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "6", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Lenny Kravitz", true, LocalDate.of(2023,6,17), new BigDecimal("1234.62"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "7", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Mac Miller", true, LocalDate.of(2023,6,17), new BigDecimal("1234.63"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "8", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "John Legend", true, LocalDate.of(2023,6,17), new BigDecimal("1234.64"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "9", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Daddy Yankee", true, LocalDate.of(2023,6,17), new BigDecimal("1234.65"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "10", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Siwon Choi", true, LocalDate.of(2023,6,17), new BigDecimal("1234.66"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "11", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Trey Songz", true, LocalDate.of(2023,6,17), new BigDecimal("1234.67"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "12", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "iamdiddy", true, LocalDate.of(2023,6,17), new BigDecimal("1234.68"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "13", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "T.I., One Direction, Cody Simpson", true, LocalDate.of(2023,6,17), new BigDecimal("1234.69"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "14", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "will.i.am", true, LocalDate.of(2023,6,17), new BigDecimal("1234.70"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "15", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Queen Latifah", true, LocalDate.of(2023,6,17), new BigDecimal("1234.71"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "16", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Rev Run", true, LocalDate.of(2023,6,17), new BigDecimal("1234.72"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "17", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Agnes Monica", true, LocalDate.of(2023,6,17), new BigDecimal("1234.73"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "18", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Cody Simpson", true, LocalDate.of(2023,6,17), new BigDecimal("1234.74"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "19", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Nick Jonas, Jaden Smith, Adam Levine", true, LocalDate.of(2023,6,17), new BigDecimal("1234.75"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "20", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Mariah Carey", true, LocalDate.of(2023,6,17), new BigDecimal("1234.76"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "21", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Usher, Lady Gaga", true, LocalDate.of(2023,6,17), new BigDecimal("1234.77"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "22", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Selena Gomez, Ne-Yo", true, LocalDate.of(2023,6,17), new BigDecimal("1234.78"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "23", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "Kelly Clarkson, Lily Allen", true, LocalDate.of(2023,6,17), new BigDecimal("1234.79"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "24", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "David Guetta", true, LocalDate.of(2023,6,17), new BigDecimal("1234.80"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "25", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Ne-Yo", true, LocalDate.of(2023,6,17), new BigDecimal("1234.81"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "26", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Kanye West", true, LocalDate.of(2023,6,17), new BigDecimal("1234.82"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "27", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "J. Cole, Agnes Monica", true, LocalDate.of(2023,6,17), new BigDecimal("1234.83"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "28", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Sherina Munaf", true, LocalDate.of(2023,6,17), new BigDecimal("1234.84"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "29", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "Jessie J, Alejandro Sanz", true, LocalDate.of(2023,6,17), new BigDecimal("1234.85"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "30", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Enrique Iglesias", true, LocalDate.of(2023,6,17), new BigDecimal("1234.86"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "31", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "50cent, Cody Simpson", true, LocalDate.of(2023,6,17), new BigDecimal("1234.87"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "32", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "joe jonas", true, LocalDate.of(2023,6,17), new BigDecimal("1234.88"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "33", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Britney Spears", true, LocalDate.of(2023,6,17), new BigDecimal("1234.89"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "34", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Rev Run", true, LocalDate.of(2023,6,17), new BigDecimal("1234.90"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "35", "Some value", true),
                        createDataRowAssertion("USA", "Analog", new BigDecimal("12.45"), "Britney Spears, Kelly Clarkson", true, LocalDate.of(2023,6,17), new BigDecimal("1234.91"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "36", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Lil Wayne WEEZY F", true, LocalDate.of(2023,6,17), new BigDecimal("1234.92"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "37", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Juan Luis Guerra, Vidi Aldiano", true, LocalDate.of(2023,6,17), new BigDecimal("1234.93"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "38", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Calle 13, Jason Mraz", true, LocalDate.of(2023,6,17), new BigDecimal("1234.94"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "39", "Some value", true),
                        createDataRowAssertion("USA", "Analog", new BigDecimal("12.45"), "Lily Allen", true, LocalDate.of(2023,6,17), new BigDecimal("1234.95"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "40", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Jonas Brothers", true, LocalDate.of(2023,6,17), new BigDecimal("1234.96"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "41", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Alejandro Sanz", true, LocalDate.of(2023,6,17), new BigDecimal("1234.97"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "42", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "50cent, Mary J. Blige, Sandy Leah", true, LocalDate.of(2023,6,17), new BigDecimal("1234.98"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "43", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Soulja Boy", true, LocalDate.of(2023,6,17), new BigDecimal("1234.99"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "44", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Lenny Kravitz, John Legend", true, LocalDate.of(2023,6,17), new BigDecimal("1235.00"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "45", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Marshall Mathers", true, LocalDate.of(2023,6,17), new BigDecimal("1235.01"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "46", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Katy Perry", true, LocalDate.of(2023,6,17), new BigDecimal("1235.02"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "47", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Luan Santana", true, LocalDate.of(2023,6,17), new BigDecimal("1235.03"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "48", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Pitbull", true, LocalDate.of(2023,6,17), new BigDecimal("1235.04"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "49", "Some value", true)
                );

        pipeline.run();
    }

    @Test
    public void testTotalUnitCalculation() throws Exception {
        var toTest = new XLSFileTypeHandler(createFileType(0));

        var totalUnits = toTest.getTotalUnits(
                createFileSource("/data/xlsx/pro-rata.xlsx"),
                new InputColumnSchemas(List.of(
                        new StringInputColumnSchema("Territory", 3),
                        new StringInputColumnSchema("Channel", 7),
                        new StringInputColumnSchema("Artist", 40),
                        new BooleanInputColumnSchema("Enabled", 5),
                        new DateInputColumnSchema("SaleDate", 11, "DD-MMM-YYYY"),
                        new StringInputColumnSchema("Unit Count", 3)
                )),
                ValueProvider.create("Unit Count", null, null),
                new DefaultValueMapping(Collections.emptyMap())
        );

        assertEquals(new BigDecimal("1225"), totalUnits);
    }

    /**
     * Validate that looking up values from different cell types works correctly
     */
    @Test
    public void testTargetCellLookupWithDifferentCellTypes() throws Exception {
        // The target cells are:
        //     A2 (A boolean) - Value is "true"
        //     B3 (A string containing a boolean) - Value is "false"
        //     C2 (A number) - Value is "12.4"
        //     D3 (A string containing a number) - Value is "12.5"
        //     E2 (A date) - Value is "2023-01-01"
        //     F3 (A string containing an ISO-8601 formatted date) - Value is "2023-01-02
        DefaultValue bool = createTargetCell("Boolean", "Boolean", "A2");
        DefaultValue boolStr = createTargetCell("Boolean String", "Boolean", "B3");
        DefaultValue num = createTargetCell("Number", "Number", "C2");
        DefaultValue numStr = createTargetCell("Number String", "Number", "D3");
        DefaultValue date = createTargetCell("Date", "Date", "E2");
        DefaultValue dateStr = createTargetCell("Date String", "Date", "F3");

        var toTest = new XLSFileTypeHandler(createFileType(0));

        var actual = toTest.extractDefaultValuesFromFile(
                createFileSource("/data/xlsx/types-test-data.xlsx"),
                List.of(bool, boolStr, num, numStr, date, dateStr)
        );

        assertThat(actual.getByFieldName("Boolean")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo(true);
        assertThat(actual.getByFieldName("Boolean String")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo(false);
        assertThat(actual.getByFieldName("Number")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo(new BigDecimal("12.4"));
        assertThat(actual.getByFieldName("Number String")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo(new BigDecimal("12.5"));
        assertThat(actual.getByFieldName("Date")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo(LocalDate.of(2023, 1, 1));
        assertThat(actual.getByFieldName("Date String")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo(LocalDate.of(2023, 1, 2));
    }


    @Test
    public void testReadFileWithDifferentCellTypes() throws Exception {
        var toTest = new XLSFileTypeHandler(createFileType(0));

        var reader = toTest.createRowReader(
                createFileSource("/data/xlsx/types-test-data.xlsx"),
                new InputColumnSchemas(List.of(
                        new BooleanInputColumnSchema("Boolean", 0),
                        new BooleanInputColumnSchema("Boolean String", 0),
                        new NumberInputColumnSchema("Number", 0),
                        new NumberInputColumnSchema("Number String", 0),
                        new DateInputColumnSchema("Date", 0, "YYYY-MM-DD"),
                        new DateInputColumnSchema("Date String", 0, "YYYY-MM-DD")
                )),
                new DefaultValueMapping(Collections.emptyMap())
        );

        var result = pipeline
                .apply(reader);

        PAssert.that(result)
                .containsInAnyOrder(
                        createDataRowAssertion(true, true, new BigDecimal("12.4"), new BigDecimal("12.4"), LocalDate.of(2023, 1, 1), LocalDate.of(2023, 1, 1)),
                        createDataRowAssertion(false, false, new BigDecimal("12.5"), new BigDecimal("12.5"), LocalDate.of(2023, 1, 2), LocalDate.of(2023, 1, 2)),
                        createDataRowAssertion(true, true, new BigDecimal("12.6"), new BigDecimal("12.6"), LocalDate.of(2023, 1, 3), LocalDate.of(2023, 1, 3)),
                        createDataRowAssertion(false, false, new BigDecimal("12.7"), new BigDecimal("12.7"), LocalDate.of(2023, 1, 4), LocalDate.of(2023, 1, 4)),
                        createDataRowAssertion(true, true, new BigDecimal("12.8"), new BigDecimal("12.8"), LocalDate.of(2023, 1, 5), LocalDate.of(2023, 1, 5)),
                        createDataRowAssertion(false, false, new BigDecimal("12.9"), new BigDecimal("12.9"), LocalDate.of(2023, 1, 6), LocalDate.of(2023, 1, 6)),
                        createDataRowAssertion(true, true, new BigDecimal("13.0"), new BigDecimal("13.0"), LocalDate.of(2023, 1, 7), LocalDate.of(2023, 1, 7)),
                        createDataRowAssertion(false, false, new BigDecimal("13.1"), new BigDecimal("13.1"), LocalDate.of(2023, 1, 8), LocalDate.of(2023, 1, 8)),
                        createDataRowAssertion(true, true, new BigDecimal("13.2"), new BigDecimal("13.2"), LocalDate.of(2023, 1, 9), LocalDate.of(2023, 1, 9)),
                        createDataRowAssertion(false, false, new BigDecimal("13.3"), new BigDecimal("13.3"), LocalDate.of(2023, 1, 10), LocalDate.of(2023, 1, 10)),
                        createDataRowAssertion(true, true, new BigDecimal("13.4"), new BigDecimal("13.4"), LocalDate.of(2023, 1, 11), LocalDate.of(2023, 1, 11)),
                        createDataRowAssertion(false, false, new BigDecimal("13.5"), new BigDecimal("13.5"), LocalDate.of(2023, 1, 12), LocalDate.of(2023, 1, 12)),
                        createDataRowAssertion(true, true, new BigDecimal("13.6"), new BigDecimal("13.6"), LocalDate.of(2023, 1, 13), LocalDate.of(2023, 1, 13)),
                        createDataRowAssertion(false, false, new BigDecimal("13.7"), new BigDecimal("13.7"), LocalDate.of(2023, 1, 14), LocalDate.of(2023, 1, 14)),
                        createDataRowAssertion(true, true, new BigDecimal("13.8"), new BigDecimal("13.8"), LocalDate.of(2023, 1, 15), LocalDate.of(2023, 1, 15)),
                        createDataRowAssertion(false, false, new BigDecimal("13.9"), new BigDecimal("13.9"), LocalDate.of(2023, 1, 16), LocalDate.of(2023, 1, 16)),
                        createDataRowAssertion(true, true, new BigDecimal("14.0"), new BigDecimal("14.0"), LocalDate.of(2023, 1, 17), LocalDate.of(2023, 1, 17)),
                        createDataRowAssertion(false, false, new BigDecimal("14.1"), new BigDecimal("14.1"), LocalDate.of(2023, 1, 18), LocalDate.of(2023, 1, 18)),
                        createDataRowAssertion(true, true, new BigDecimal("14.2"), new BigDecimal("14.2"), LocalDate.of(2023, 1, 19), LocalDate.of(2023, 1, 19)),
                        createDataRowAssertion(false, false, new BigDecimal("14.3"), new BigDecimal("14.3"), LocalDate.of(2023, 1, 20), LocalDate.of(2023, 1, 20)),
                        createDataRowAssertion(true, true, new BigDecimal("14.4"), new BigDecimal("14.4"), LocalDate.of(2023, 1, 21), LocalDate.of(2023, 1, 21)),
                        createDataRowAssertion(false, false, new BigDecimal("14.5"), new BigDecimal("14.5"), LocalDate.of(2023, 1, 22), LocalDate.of(2023, 1, 22)),
                        createDataRowAssertion(true, true, new BigDecimal("14.6"), new BigDecimal("14.6"), LocalDate.of(2023, 1, 23), LocalDate.of(2023, 1, 23)),
                        createDataRowAssertion(false, false, new BigDecimal("14.7"), new BigDecimal("14.7"), LocalDate.of(2023, 1, 24), LocalDate.of(2023, 1, 24)),
                        createDataRowAssertion(true, true, new BigDecimal("14.8"), new BigDecimal("14.8"), LocalDate.of(2023, 1, 25), LocalDate.of(2023, 1, 25)),
                        createDataRowAssertion(false, false, new BigDecimal("14.9"), new BigDecimal("14.9"), LocalDate.of(2023, 1, 26), LocalDate.of(2023, 1, 26)),
                        createDataRowAssertion(true, true, new BigDecimal("15.0"), new BigDecimal("15.0"), LocalDate.of(2023, 1, 27), LocalDate.of(2023, 1, 27)),
                        createDataRowAssertion(false, false, new BigDecimal("15.1"), new BigDecimal("15.1"), LocalDate.of(2023, 1, 28), LocalDate.of(2023, 1, 28)),
                        createDataRowAssertion(true, true, new BigDecimal("15.2"), new BigDecimal("15.2"), LocalDate.of(2023, 1, 29), LocalDate.of(2023, 1, 29)),
                        createDataRowAssertion(false, false, new BigDecimal("15.3"), new BigDecimal("15.3"), LocalDate.of(2023, 1, 30), LocalDate.of(2023, 1, 30)),
                        createDataRowAssertion(true, true, new BigDecimal("15.4"), new BigDecimal("15.4"), LocalDate.of(2023, 1, 31), LocalDate.of(2023, 1, 31)),
                        createDataRowAssertion(false, false, new BigDecimal("15.5"), new BigDecimal("15.5"), LocalDate.of(2023, 2, 1), LocalDate.of(2023, 2, 1)),
                        createDataRowAssertion(true, true, new BigDecimal("15.6"), new BigDecimal("15.6"), LocalDate.of(2023, 2, 2), LocalDate.of(2023, 2, 2)),
                        createDataRowAssertion(false, false, new BigDecimal("15.7"), new BigDecimal("15.7"), LocalDate.of(2023, 2, 3), LocalDate.of(2023, 2, 3)),
                        createDataRowAssertion(true, true, new BigDecimal("15.8"), new BigDecimal("15.8"), LocalDate.of(2023, 2, 4), LocalDate.of(2023, 2, 4)),
                        createDataRowAssertion(false, true, new BigDecimal("15.9"), new BigDecimal("15.9"), LocalDate.of(2023, 2, 5), LocalDate.of(2023, 2, 5)),
                        createDataRowAssertion(true, false, new BigDecimal("16.0"), new BigDecimal("16.0"), LocalDate.of(2023, 2, 6), LocalDate.of(2023, 2, 6)),
                        createDataRowAssertion(false, true, new BigDecimal("16.1"), new BigDecimal("16.1"), LocalDate.of(2023, 2, 7), LocalDate.of(2023, 2, 7)),
                        createDataRowAssertion(true, false, new BigDecimal("16.2"), new BigDecimal("16.2"), LocalDate.of(2023, 2, 8), LocalDate.of(2023, 2, 8)),
                        createDataRowAssertion(false, true, new BigDecimal("16.3"), new BigDecimal("16.3"), LocalDate.of(2023, 2, 9), LocalDate.of(2023, 2, 9)),
                        createDataRowAssertion(true, false, new BigDecimal("16.4"), new BigDecimal("16.4"), LocalDate.of(2023, 2, 10), LocalDate.of(2023, 2, 10)),
                        createDataRowAssertion(false, true, new BigDecimal("16.5"), new BigDecimal("16.5"), LocalDate.of(2023, 2, 11), LocalDate.of(2023, 2, 11)),
                        createDataRowAssertion(true, false, new BigDecimal("16.6"), new BigDecimal("16.6"), LocalDate.of(2023, 2, 12), LocalDate.of(2023, 2, 12)),
                        createDataRowAssertion(false, true, new BigDecimal("16.7"), new BigDecimal("16.7"), LocalDate.of(2023, 2, 13), LocalDate.of(2023, 2, 13)),
                        createDataRowAssertion(true, false, new BigDecimal("16.8"), new BigDecimal("16.8"), LocalDate.of(2023, 2, 14), LocalDate.of(2023, 2, 14)),
                        createDataRowAssertion(false, true, new BigDecimal("16.9"), new BigDecimal("16.9"), LocalDate.of(2023, 2, 15), LocalDate.of(2023, 2, 15)),
                        createDataRowAssertion(true, false, new BigDecimal("17.0"), new BigDecimal("17.0"), LocalDate.of(2023, 2, 16), LocalDate.of(2023, 2, 16)),
                        createDataRowAssertion(false, true, new BigDecimal("17.1"), new BigDecimal("17.1"), LocalDate.of(2023, 2, 17), LocalDate.of(2023, 2, 17)),
                        createDataRowAssertion(true, false, new BigDecimal("17.2"), new BigDecimal("17.2"), LocalDate.of(2023, 2, 18), LocalDate.of(2023, 2, 18))
                );

        pipeline.run();
    }

    private XLSBFileType createFileType(int startingColumn) {
        return new XLSBFileType(1, startingColumn, 0);
    }

    private static FileSource createFileSource(String resourcePath) {
        var url = XLSFileTypeHandlerTest.class.getResource(resourcePath);
        if (url == null) throw new RuntimeException("Could not find file at resource path: " + resourcePath);
        return new LocalFileSource(url.getPath());
    }

    private InputColumnSchemas createInputColumnSchemas() throws ValidationException {
        return new InputColumnSchemas(List.of(
                new StringInputColumnSchema("Territory", 0),
                new StringInputColumnSchema("Channel", 0),
                new NumberInputColumnSchema("Net Amount", 0),
                new NullInputColumnSchema(0),
                new StringInputColumnSchema("Artist", 40),
                new BooleanInputColumnSchema("Enabled", 0),
                new DateInputColumnSchema("SaleDate", 0, "DD-MMM-YYYY"),
                new NumberCommaSeparatedInputColumnSchema("Money", 0),
                new Number2DPInputColumnSchema("Two DP", 0),
                new Number5DPInputColumnSchema("Five DP", 0),
                new StringInputColumnSchema("Territory2", 0)
        ));
    }

    private DefaultValue createTargetCell(String field, String dataType, String cellLocation) throws ValidationException {
        return new DefaultValue(field, dataType, cellLocation, null, null);
    }

    private DefaultValue createFixedDefault(String field, String dataType, Serializable value) throws ValidationException {
        return new DefaultValue(field, dataType, null, value, null);
    }

    private DataRow createDataRowAssertion(
            String territory,
            String channel,
            BigDecimal netAmount,
            String artist,
            boolean enabled,
            LocalDate saleDate,
            BigDecimal money,
            BigDecimal twoDp,
            BigDecimal fiveDp,
            String territory2,
            String someField, 
            boolean someOtherField
    ) {
        var data = List.of(
                new NonNullDataCell("Territory", asString(territory)),
                new NonNullDataCell("Channel", asString(channel)),
                new NonNullDataCell("Net Amount", asNumeric(netAmount)),
                NullDataCell.INSTANCE,
                new NonNullDataCell("Artist", asString(artist)),
                new NonNullDataCell("Enabled", asBoolean(enabled)),
                new NonNullDataCell("SaleDate", asLocalDate(saleDate)),
                new NonNullDataCell("Money", asNumeric(money)),
                new NonNullDataCell("Two DP", asNumeric(twoDp)),
                new NonNullDataCell("Five DP", asNumeric(fiveDp)),
                new NonNullDataCell("Territory2", asString(territory2)),
                new NonNullDataCell("Some field", asString(someField)),
                new NonNullDataCell("Some other field", asBoolean(someOtherField))
        );

        return new DataRow(data, data);
    }

    private DataRow createDataRowAssertion(
            boolean bool,
            boolean boolStr,
            BigDecimal number,
            BigDecimal numberStr,
            LocalDate localDate,
            LocalDate localDateStr
    ) {
        var data = List.of(
                new NonNullDataCell("Boolean", asBoolean(bool)),
                new NonNullDataCell("Boolean String", asBoolean(boolStr)),
                new NonNullDataCell("Number", asNumeric(number)),
                new NonNullDataCell("Number String", asNumeric(numberStr)),
                new NonNullDataCell("Date", asLocalDate(localDate)),
                new NonNullDataCell("Date String", asLocalDate(localDateStr))
        );

        return new DataRow(data, data);
    }
}
