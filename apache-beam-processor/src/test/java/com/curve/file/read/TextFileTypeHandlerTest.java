package com.curve.file.read;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.DefaultValue;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.cell.NullDataCell;
import com.curve.pojos.input.config.CharacterEncoding;
import com.curve.pojos.input.config.source.FileSource;
import com.curve.pojos.input.config.source.LocalFileSource;
import com.curve.pojos.input.config.type.CSVFileType;
import com.curve.pojos.input.config.type.TextFileType;
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
import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

public class TextFileTypeHandlerTest implements Serializable {

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

        var toTest = new TextFileTypeHandler(createTextFileType(CharacterEncoding.UTF_8, 1, false));

        var actual = toTest.extractDefaultValuesFromFile(
                createFileSource("/data/tsv/target-cell-test-data.txt"),
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

    @Test
    public void testExtractDefaultValuesFromUTF16FormattedFile() throws Exception {
        // Grab the test data. There are target cells:
        //     M1 (Which is the default value for column A - Territory) - Value is "UK"
        //     N3 (Which is the default value for column B - Channel) - Value is "Analog"
        DefaultValue target1 = createTargetCell("Territory", "String", "M1");
        DefaultValue target2 = createTargetCell("Channel", "String", "N3");
        DefaultValue fixed1 = createFixedDefault("Some field", "String", "Some value");
        DefaultValue fixed2 = createFixedDefault("Some other field", "Boolean", true);

        var toTest = new TextFileTypeHandler(createTextFileType(CharacterEncoding.UTF_16, 1, false));

        var actual = toTest.extractDefaultValuesFromFile(
                createFileSource("/data/tsv/utf-16-test.txt"),
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
        var toTest = new TextFileTypeHandler(createTextFileType(CharacterEncoding.UTF_8, 1, false));

        var actual = toTest.extractDefaultValuesFromFile(
                createFileSource("/data/tsv/target-cell-test-data.txt"),
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

        var toTest = new TextFileTypeHandler(createTextFileType(CharacterEncoding.UTF_8, 1, false));

        var actual = toTest.extractDefaultValuesFromFile(
                createFileSource("/data/tsv/target-cell-test-data.txt"),
                List.of(fixed1, fixed2)
        );

        assertThat(actual.getByFieldName("Some field")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo("Some value");
        assertThat(actual.getByFieldName("Some other field")).isNotNull()
                .extracting(DataWrapper::data).isEqualTo(true);
    }

    @Test
    public void testExtractDefaultValuesFromCSVFile() throws Exception {
        // Grab the test data. There are target cells:
        //     M1 (Which is the default value for column A - Territory) - Value is "UK"
        //     N3 (Which is the default value for column B - Channel) - Value is "Analog"
        DefaultValue target1 = createTargetCell("Territory", "String", "M1");
        DefaultValue target2 = createTargetCell("Channel", "String", "N3");
        DefaultValue fixed1 = createFixedDefault("Some field", "String", "Some value");
        DefaultValue fixed2 = createFixedDefault("Some other field", "Boolean", true);

        var toTest = new TextFileTypeHandler(createCSVFileType(CharacterEncoding.UTF_8, 1));

        var actual = toTest.extractDefaultValuesFromFile(
                createFileSource("/data/csv/target-cell-test-data.csv"),
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

    @Test
    public void testExtractDefaultValuesFromUTF16FormattedCSVFile() throws Exception {
        // Grab the test data. There are target cells:
        //     M1 (Which is the default value for column A - Territory) - Value is "UK"
        //     N3 (Which is the default value for column B - Channel) - Value is "Analog"
        DefaultValue target1 = createTargetCell("Territory", "String", "M1");
        DefaultValue target2 = createTargetCell("Channel", "String", "N3");
        DefaultValue fixed1 = createFixedDefault("Some field", "String", "Some value");
        DefaultValue fixed2 = createFixedDefault("Some other field", "Boolean", true);

        var toTest = new TextFileTypeHandler(createCSVFileType(CharacterEncoding.UTF_16, 1));

        var actual = toTest.extractDefaultValuesFromFile(
                createFileSource("/data/csv/utf-16-test.csv"),
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

    @Test
    public void testReadFile() throws Exception {
        var toTest = new TextFileTypeHandler(createTextFileType(CharacterEncoding.UTF_8, 1, false));

        var reader = toTest.createRowReader(
                createFileSource("/data/tsv/target-cell-test-data.txt"),
                createInputColumnSchemas(),
                new DefaultValueMapping(new LinkedHashMap<>() {{
                    put(createTargetCell("Territory", "String", "J1"), asString("UK"));
                    put(createTargetCell("Channel", "String", "K2"), asString("Analog"));
                    put(createFixedDefault("Some field", "String", "Some value"), asString("Some value"));
                    put(createFixedDefault("Some other field", "Boolean", Boolean.TRUE), asBoolean(true));
                }}
                ));

        var result = pipeline
                .apply(reader);

        PAssert.that(result)
                .containsInAnyOrder(
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.31"), "Harry Styles", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.56"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "1", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Yoko Ono", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.57"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "2", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Cher Lloyd", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.58"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "3", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Yoko Ono", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.59"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "4", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Ricky Martin", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.60"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "5", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Thalia", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.61"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "6", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Lenny Kravitz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.62"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "7", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Mac Miller", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.63"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "8", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "John Legend", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.64"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "9", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Daddy Yankee", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.65"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "10", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Siwon Choi", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.66"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "11", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Trey Songz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.67"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "12", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "iamdiddy", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.68"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "13", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "T.I., One Direction, Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.69"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "14", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "will.i.am", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.70"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "15", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Queen Latifah", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.71"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "16", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Rev Run", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.72"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "17", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Agnes Monica", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.73"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "18", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.74"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "19", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Nick Jonas, Jaden Smith, Adam Levine", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.75"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "20", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Mariah Carey", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.76"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "21", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Usher, Lady Gaga", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.77"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "22", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Selena Gomez, Ne-Yo", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.78"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "23", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "Kelly Clarkson, Lily Allen", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.79"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "24", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "David Guetta", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.80"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "25", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Ne-Yo", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.81"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "26", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Kanye West", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.82"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "27", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "J. Cole, Agnes Monica", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.83"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "28", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Sherina Munaf", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.84"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "29", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "Jessie J, Alejandro Sanz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.85"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "30", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Enrique Iglesias", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.86"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "31", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "50cent, Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.87"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "32", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "joe jonas", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.88"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "33", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Britney Spears", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.89"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "34", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Rev Run", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.90"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "35", "Some value", true),
                        createDataRowAssertion("USA", "Analog", new BigDecimal("12.45"), "Britney Spears, Kelly Clarkson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.91"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "36", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Lil Wayne WEEZY F", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.92"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "37", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Juan Luis Guerra, Vidi Aldiano", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.93"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "38", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Calle 13, Jason Mraz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.94"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "39", "Some value", true),
                        createDataRowAssertion("USA", "Analog", new BigDecimal("12.45"), "Lily Allen", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.95"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "40", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Jonas Brothers", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.96"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "41", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Alejandro Sanz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.97"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "42", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "50cent, Mary J. Blige, Sandy Leah", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.98"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "43", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Soulja Boy", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.99"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "44", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Lenny Kravitz, John Legend", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.00"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "45", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Marshall Mathers", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.01"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "46", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Katy Perry", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.02"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "47", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Luan Santana", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.03"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "48", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Pitbull", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.04"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "49", "Some value", true)
                );

        pipeline.run();
    }

    @Test
    public void testReadUTF16File() throws Exception {
        var toTest = new TextFileTypeHandler(createTextFileType(CharacterEncoding.UTF_16, 1, false));

        var reader = toTest.createRowReader(
                createFileSource("/data/tsv/utf-16-test.txt"),
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
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.31"), "Harry Styles", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.56"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "1", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Yoko Ono", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.57"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "2", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Cher Lloyd", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.58"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "3", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Yoko Ono", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.59"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "4", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Ricky Martin", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.60"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "5", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Thalia", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.61"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "6", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Lenny Kravitz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.62"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "7", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Mac Miller", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.63"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "8", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "John Legend", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.64"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "9", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Daddy Yankee", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.65"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "10", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Siwon Choi", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.66"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "11", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Trey Songz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.67"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "12", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "iamdiddy", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.68"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "13", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "T.I., One Direction, Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.69"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "14", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "will.i.am", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.70"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "15", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Queen Latifah", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.71"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "16", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Rev Run", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.72"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "17", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Agnes Monica", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.73"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "18", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.74"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "19", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Nick Jonas, Jaden Smith, Adam Levine", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.75"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "20", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Mariah Carey", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.76"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "21", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Usher, Lady Gaga", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.77"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "22", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Selena Gomez, Ne-Yo", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.78"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "23", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "Kelly Clarkson, Lily Allen", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.79"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "24", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "David Guetta", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.80"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "25", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Ne-Yo", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.81"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "26", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Kanye West", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.82"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "27", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "J. Cole, Agnes Monica", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.83"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "28", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Sherina Munaf", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.84"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "29", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "Jessie J, Alejandro Sanz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.85"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "30", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Enrique Iglesias", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.86"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "31", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "50cent, Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.87"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "32", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "joe jonas", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.88"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "33", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Britney Spears", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.89"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "34", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Rev Run", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.90"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "35", "Some value", true),
                        createDataRowAssertion("USA", "Analog", new BigDecimal("12.45"), "Britney Spears, Kelly Clarkson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.91"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "36", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Lil Wayne WEEZY F", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.92"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "37", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Juan Luis Guerra, Vidi Aldiano", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.93"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "38", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Calle 13, Jason Mraz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.94"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "39", "Some value", true),
                        createDataRowAssertion("USA", "Analog", new BigDecimal("12.45"), "Lily Allen", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.95"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "40", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Jonas Brothers", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.96"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "41", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Alejandro Sanz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.97"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "42", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "50cent, Mary J. Blige, Sandy Leah", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.98"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "43", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Soulja Boy", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.99"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "44", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Lenny Kravitz, John Legend", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.00"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "45", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Marshall Mathers", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.01"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "46", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Katy Perry", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.02"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "47", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Luan Santana", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.03"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "48", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Pitbull", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.04"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "49", "Some value", true)
                );

        pipeline.run();
    }

    @Test
    public void testReadIndexSeparatedFile() throws Exception {
        var toTest = new TextFileTypeHandler(createTextFileType(CharacterEncoding.UTF_8, 0, true));

        var reader = toTest.createRowReader(
                createFileSource("/data/tsv/index-separated.txt"),
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
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.31"), "Harry Styles", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.56"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "1", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Yoko Ono", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.57"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "2", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Cher Lloyd", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.58"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "3", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Yoko Ono", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.59"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "4", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Ricky Martin", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.60"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "5", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Thalia", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.61"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "6", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Lenny Kravitz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.62"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "7", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Mac Miller", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.63"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "8", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "John Legend", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.64"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "9", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Daddy Yankee", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.65"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "10", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Siwon Choi", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.66"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "11", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Trey Songz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.67"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "12", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "iamdiddy", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.68"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "13", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "T.I., One Direction, Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.69"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "14", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "will.i.am", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.70"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "15", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Queen Latifah", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.71"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "16", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Rev Run", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.72"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "17", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Agnes Monica", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.73"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "18", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.74"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "19", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Nick Jonas, Jaden Smith, Adam Levine", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.75"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "20", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Mariah Carey", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.76"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "21", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Usher, Lady Gaga", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.77"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "22", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Selena Gomez, Ne-Yo", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.78"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "23", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "Kelly Clarkson, Lily Allen", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.79"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "24", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "David Guetta", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.80"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "25", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Ne-Yo", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.81"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "26", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Kanye West", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.82"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "27", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "J. Cole, Agnes Monica", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.83"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "28", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Sherina Munaf", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.84"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "29", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "Jessie J, Alejandro Sanz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.85"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "30", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Enrique Iglesias", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.86"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "31", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "50cent, Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.87"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "32", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "joe jonas", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.88"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "33", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Britney Spears", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.89"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "34", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Rev Run", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.90"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "35", "Some value", true),
                        createDataRowAssertion("USA", "Analog", new BigDecimal("12.45"), "Britney Spears, Kelly Clarkson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.91"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "36", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Lil Wayne WEEZY F", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.92"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "37", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Juan Luis Guerra, Vidi Aldiano", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.93"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "38", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Calle 13, Jason Mraz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.94"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "39", "Some value", true),
                        createDataRowAssertion("USA", "Analog", new BigDecimal("12.45"), "Lily Allen", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.95"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "40", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Jonas Brothers", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.96"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "41", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Alejandro Sanz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.97"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "42", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "50cent, Mary J. Blige, Sandy Leah", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.98"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "43", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Soulja Boy", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.99"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "44", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Lenny Kravitz, John Legend", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.00"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "45", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Marshall Mathers", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.01"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "46", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Katy Perry", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.02"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "47", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Luan Santana", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.03"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "48", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Pitbull", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.04"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "49", "Some value", true)
                );

        pipeline.run();
    }

    @Test
    public void testReadCSVFile() throws Exception {
        var toTest = new TextFileTypeHandler(createCSVFileType(CharacterEncoding.UTF_8, 1));

        var reader = toTest.createRowReader(
                createFileSource("/data/csv/target-cell-test-data.csv"),
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
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.31"), "Harry Styles", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.56"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "1", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Yoko Ono", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.57"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "2", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Cher Lloyd", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.58"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "3", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Yoko Ono", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.59"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "4", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Ricky Martin", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.60"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "5", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Thalia", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.61"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "6", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Lenny Kravitz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.62"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "7", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Mac Miller", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.63"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "8", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "John Legend", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.64"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "9", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Daddy Yankee", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.65"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "10", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Siwon Choi", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.66"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "11", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Trey Songz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.67"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "12", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "iamdiddy", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.68"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "13", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "T.I., One Direction, Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.69"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "14", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "will.i.am", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.70"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "15", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Queen Latifah", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.71"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "16", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Rev Run", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.72"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "17", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Agnes Monica", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.73"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "18", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.74"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "19", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Nick Jonas, Jaden Smith, Adam Levine", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.75"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "20", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Mariah Carey", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.76"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "21", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Usher, Lady Gaga", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.77"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "22", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Selena Gomez, Ne-Yo", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.78"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "23", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "Kelly Clarkson, Lily Allen", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.79"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "24", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "David Guetta", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.80"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "25", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Ne-Yo", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.81"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "26", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Kanye West", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.82"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "27", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "J. Cole, Agnes Monica", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.83"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "28", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Sherina Munaf", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.84"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "29", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "Jessie J, Alejandro Sanz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.85"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "30", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Enrique Iglesias", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.86"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "31", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "50cent, Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.87"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "32", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "joe jonas", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.88"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "33", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Britney Spears", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.89"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "34", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Rev Run", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.90"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "35", "Some value", true),
                        createDataRowAssertion("USA", "Analog", new BigDecimal("12.45"), "Britney Spears, Kelly Clarkson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.91"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "36", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Lil Wayne WEEZY F", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.92"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "37", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Juan Luis Guerra, Vidi Aldiano", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.93"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "38", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Calle 13, Jason Mraz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.94"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "39", "Some value", true),
                        createDataRowAssertion("USA", "Analog", new BigDecimal("12.45"), "Lily Allen", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.95"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "40", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Jonas Brothers", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.96"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "41", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Alejandro Sanz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.97"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "42", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "50cent, Mary J. Blige, Sandy Leah", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.98"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "43", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Soulja Boy", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.99"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "44", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Lenny Kravitz, John Legend", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.00"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "45", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Marshall Mathers", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.01"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "46", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Katy Perry", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.02"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "47", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Luan Santana", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.03"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "48", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Pitbull", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.04"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "49", "Some value", true)
                );

        pipeline.run();
    }

    @Test
    public void testReadUTF16CSVFile() throws Exception {
        var toTest = new TextFileTypeHandler(createCSVFileType(CharacterEncoding.UTF_16, 1));

        var reader = toTest.createRowReader(
                createFileSource("/data/csv/utf-16-test.csv"),
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
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.31"), "Harry Styles", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.56"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "1", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Yoko Ono", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.57"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "2", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Cher Lloyd", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.58"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "3", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Yoko Ono", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.59"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "4", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Ricky Martin", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.60"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "5", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Thalia", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.61"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "6", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Lenny Kravitz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.62"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "7", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Mac Miller", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.63"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "8", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "John Legend", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.64"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "9", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Daddy Yankee", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.65"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "10", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Siwon Choi", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.66"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "11", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Trey Songz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.67"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "12", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "iamdiddy", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.68"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "13", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "T.I., One Direction, Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.69"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "14", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "will.i.am", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.70"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "15", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Queen Latifah", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.71"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "16", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Rev Run", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.72"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "17", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Agnes Monica", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.73"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "18", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.74"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "19", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Nick Jonas, Jaden Smith, Adam Levine", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.75"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "20", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Mariah Carey", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.76"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "21", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Usher, Lady Gaga", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.77"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "22", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Selena Gomez, Ne-Yo", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.78"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "23", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "Kelly Clarkson, Lily Allen", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.79"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "24", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "David Guetta", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.80"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "25", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Ne-Yo", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.81"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "26", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Kanye West", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.82"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "27", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "J. Cole, Agnes Monica", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.83"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "28", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Sherina Munaf", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.84"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "29", "Some value", true),
                        createDataRowAssertion("UK", "Analog", new BigDecimal("12.45"), "Jessie J, Alejandro Sanz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.85"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "30", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "Enrique Iglesias", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.86"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "31", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "50cent, Cody Simpson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.87"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "32", "Some value", true),
                        createDataRowAssertion("UK", "Digital", new BigDecimal("12.45"), "joe jonas", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.88"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "33", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Britney Spears", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.89"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "34", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Rev Run", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.90"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "35", "Some value", true),
                        createDataRowAssertion("USA", "Analog", new BigDecimal("12.45"), "Britney Spears, Kelly Clarkson", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.91"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "36", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Lil Wayne WEEZY F", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.92"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "37", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Juan Luis Guerra, Vidi Aldiano", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.93"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "38", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Calle 13, Jason Mraz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.94"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "39", "Some value", true),
                        createDataRowAssertion("USA", "Analog", new BigDecimal("12.45"), "Lily Allen", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.95"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "40", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Jonas Brothers", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.96"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "41", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Alejandro Sanz", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.97"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "42", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "50cent, Mary J. Blige, Sandy Leah", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.98"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "43", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Soulja Boy", true, LocalDate.of(2023, 6, 17), new BigDecimal("1234.99"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "44", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Lenny Kravitz, John Legend", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.00"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "45", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Marshall Mathers", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.01"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "46", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Katy Perry", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.02"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "47", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Luan Santana", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.03"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "48", "Some value", true),
                        createDataRowAssertion("USA", "Digital", new BigDecimal("12.45"), "Pitbull", true, LocalDate.of(2023, 6, 17), new BigDecimal("1235.04"), new BigDecimal("12.36"), new BigDecimal("65.32489"), "49", "Some value", true)
                );

        pipeline.run();
    }

    @Test
    public void testTotalUnitCalculation() throws Exception {
        var toTest = new TextFileTypeHandler(createTextFileType(CharacterEncoding.UTF_8, 1, false));

        var totalUnits = toTest.getTotalUnits(
                createFileSource("/data/tsv/pro-rata.txt"),
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

    private TextFileType createTextFileType(
            CharacterEncoding characterEncoding,
            int startingColumn,
            boolean indexSeparated
    ) {
        return new TextFileType(
                "\t",
                1,
                startingColumn,
                characterEncoding,
                indexSeparated
        );
    }

    private CSVFileType createCSVFileType(CharacterEncoding characterEncoding, int startingColumn) {
        return new CSVFileType(
                ",",
                1,
                startingColumn,
                characterEncoding
        );
    }

    private static FileSource createFileSource(String resourcePath) {
        var url = TextFileTypeHandlerTest.class.getResource(resourcePath);
        if (url == null) throw new RuntimeException("Could not find file at resource path: " + resourcePath);
        return new LocalFileSource(url.getPath());
    }

    private InputColumnSchemas createInputColumnSchemas() throws ValidationException {
        return new InputColumnSchemas(List.of(
                new StringInputColumnSchema("Territory", 3),
                new StringInputColumnSchema("Channel", 7),
                new NumberInputColumnSchema("Net Amount", 5),
                new NullInputColumnSchema(5),
                new StringInputColumnSchema("Artist", 40),
                new BooleanInputColumnSchema("Enabled", 5),
                new DateInputColumnSchema("SaleDate", 11, "DD-MMM-YYYY"),
                new NumberCommaSeparatedInputColumnSchema("Money", 7),
                new Number2DPInputColumnSchema("Two DP", 5),
                new Number5DPInputColumnSchema("Five DP", 10),
                new StringInputColumnSchema("Territory2", 3)
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
}
