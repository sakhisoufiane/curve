package com.curve.transforms.functions;

import com.curve.configuration.Configuration;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.output.schemas.OutputColumnSchema;
import org.apache.beam.sdk.testing.PAssert;
import org.apache.beam.sdk.testing.TestPipeline;
import org.apache.beam.sdk.transforms.Create;
import org.apache.beam.sdk.transforms.ParDo;
import org.junit.Rule;
import org.junit.Test;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.*;
import static org.mockito.Mockito.*;

public class CSVOutputFnTest implements Serializable {

    private static final String TEST_FIELD_NAME = "someField";

    @Rule
    public transient final TestPipeline pipeline = TestPipeline.create();

    /*
     * Varchar tests - with no limit
     */
    @Test
    public void testOutputStringAsVarchar() {

        var dataRow = createFromOneCell(asString("Hello World!"));

        var schemas = createSchemaOfOneField("VARCHAR");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("Hello World!");

        pipeline.run();
    }

    @Test
    public void testOutputNumberAsVarchar() {

        var dataRow = createFromOneCell(asNumeric(new BigDecimal("1.23456")));

        var schemas = createSchemaOfOneField("VARCHAR");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("1.23456");

        pipeline.run();
    }

    @Test
    public void testOutputBooleanAsVarchar() {

        var dataRow = createFromOneCell(asBoolean(true));

        var schemas = createSchemaOfOneField("VARCHAR");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("true");

        pipeline.run();
    }

    @Test
    public void testOutputDateAsVarchar() {

        var dataRow = createFromOneCell(asLocalDate(LocalDate.of(2020, 1, 1)));

        var schemas = createSchemaOfOneField("VARCHAR", "YYYY-MM-DD");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("2020-01-01");

        pipeline.run();
    }


    @Test
    public void testOutputNullAsString() {

        var dataRow = createFromOneCell(null);

        var schemas = createSchemaOfOneField("VARCHAR");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("");

        pipeline.run();
    }
    /*
     * Varchar tests - with limit
     */
    @Test
    public void testOutputStringAsVarcharWithLimit() {

        var dataRow = createFromOneCell(asString("Hello World!"));

        var schemas = createSchemaOfOneField("VARCHAR(5)");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("Hello");

        pipeline.run();
    }

    @Test
    public void testOutputSmallStringAsVarcharWithLimit() {

        var dataRow = createFromOneCell(asString("Hello"));

        var schemas = createSchemaOfOneField("VARCHAR(10)");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("Hello");

        pipeline.run();
    }

    @Test
    public void testOutputNumberAsVarcharWithLimit() {

        var dataRow = createFromOneCell(asNumeric(new BigDecimal("1.23456")));

        var schemas = createSchemaOfOneField("VARCHAR(5)");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("1.234");

        pipeline.run();
    }

    @Test
    public void testOutputBooleanAsVarcharWithLimit() {

        var dataRow = createFromOneCell(asBoolean(true));

        var schemas = createSchemaOfOneField("VARCHAR(2)");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("tr");

        pipeline.run();
    }

    @Test
    public void testOutputDateAsVarcharWithLimit() {

        var dataRow = createFromOneCell(asLocalDate(LocalDate.of(2020, 1, 1)));

        var schemas = createSchemaOfOneField("VARCHAR(4)", "YYYY-MM-DD");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("2020");

        pipeline.run();
    }

    @Test
    public void testOutputNullAsVarcharWithLimit() {

        var dataRow = createFromOneCell(null);

        var schemas = createSchemaOfOneField("VARCHAR(5)");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("");

        pipeline.run();
    }
    
    /*
     * Integer
     */
    @Test
    public void testOutputStringAsInteger() {

        var dataRow = createFromOneCell(asString("12345"));

        var schemas = createSchemaOfOneField("INTEGER");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("12345");

        pipeline.run();
    }

    @Test
    public void testUnparsableOutputStringAsInteger() {

        var dataRow = createFromOneCell(asString("asdf"));

        var schemas = createSchemaOfOneField("INTEGER");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("");

        pipeline.run();
    }

    @Test
    public void testOutputNumberAsInteger() {

        var dataRow = createFromOneCell(asNumeric(new BigDecimal("1.23456")));

        var schemas = createSchemaOfOneField("INTEGER");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("1");

        pipeline.run();
    }

    @Test
    public void testOutputNullAsInteger() {

        var dataRow = createFromOneCell(null);

        var schemas = createSchemaOfOneField("INTEGER");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("");

        pipeline.run();
    }

    /*
     * Boolean tests
     */
    @Test
    public void testOutputStringAsBoolean() {

        var dataRow = createFromOneCell(asString("true"));

        var schemas = createSchemaOfOneField("BOOLEAN");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("true");

        pipeline.run();
    }

    @Test
    public void testOutputBooleanAsBoolean() {

        var dataRow = createFromOneCell(asBoolean(true));

        var schemas = createSchemaOfOneField("BOOLEAN");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("true");

        pipeline.run();
    }

    @Test
    public void testOutputNumberAsBoolean() {

        var dataRow = createFromOneCell(asNumeric(new BigDecimal("1")));

        var schemas = createSchemaOfOneField("BOOLEAN");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("true");

        pipeline.run();
    }

    @Test
    public void testStringOfOneAsBoolean() {

        var dataRow = createFromOneCell(asString("1"));

        var schemas = createSchemaOfOneField("BOOLEAN");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("true");

        pipeline.run();
    }

    @Test
    public void testOutputNullAsBoolean() {

        var dataRow = createFromOneCell(null);

        var schemas = createSchemaOfOneField("BOOLEAN");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("");

        pipeline.run();
    }

    /*
     * Date tests
     */
    @Test
    public void testOutputDateAsDate() {

        var dataRow = createFromOneCell(asLocalDate(LocalDate.of(2020, 1, 1)));

        var schemas = createSchemaOfOneField("DATE", "DD-MM-YYYY");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("01-01-2020");

        pipeline.run();
    }

    @Test
    public void testOutputNullAsDate() {

        var dataRow = createFromOneCell(null);

        var schemas = createSchemaOfOneField("DATE", "DD-MM-YYYY");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("");

        pipeline.run();
    }

    /*
     * Numeric tests - with no limit
     */
    @Test
    public void testOutputStringAsNumeric() {

        var dataRow = createFromOneCell(asString("1.2345"));

        var schemas = createSchemaOfOneField("NUMERIC");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("1.2345");

        pipeline.run();
    }

    @Test
    public void testOutputNumberAsNumeric() {

        var dataRow = createFromOneCell(asNumeric(new BigDecimal("1.23456")));

        var schemas = createSchemaOfOneField("NUMERIC");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("1.23456");

        pipeline.run();
    }

    @Test
    public void testOutputNullAsNumeric() {

        var dataRow = createFromOneCell(null);

        var schemas = createSchemaOfOneField("NUMERIC");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("");

        pipeline.run();
    }

    /*
     * Numeric tests - with precision and scale
     */
    @Test
    public void testOutputStringAsNumericWithPrecisionAndScale() {

        var dataRow = createFromOneCell(asString("100.2345"));

        var schemas = createSchemaOfOneField("NUMERIC(5, 2)");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("100.23");

        pipeline.run();
    }

    @Test
    public void testOutputNumberAsNumericWithPrecisionAndScale() {

        var dataRow = createFromOneCell(asNumeric(new BigDecimal("1.23456")));

        var schemas = createSchemaOfOneField("NUMERIC(5,4)");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("1.2346");

        pipeline.run();
    }

    @Test
    public void testOutputNullAsNumericWithPrecisionAndScale() {

        var dataRow = createFromOneCell(null);

        var schemas = createSchemaOfOneField("NUMERIC(5,4)");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("");

        pipeline.run();
    }

    /*
     * Numeric tests - with precision
     */
    @Test
    public void testOutputStringAsNumericWithPrecision() {

        var dataRow = createFromOneCell(asString("100.2345"));

        var schemas = createSchemaOfOneField("NUMERIC(5)");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("100");

        pipeline.run();
    }

    @Test
    public void testOutputNumberAsNumericWithPrecision() {

        var dataRow = createFromOneCell(asNumeric(new BigDecimal("1.23456")));

        var schemas = createSchemaOfOneField("NUMERIC(5)");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("1");

        pipeline.run();
    }

    @Test
    public void testOutputLongStringAsNumericWithPrecision() {

        var dataRow = createFromOneCell(asString("1234567"));

        var schemas = createSchemaOfOneField("NUMERIC(5)");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("");

        pipeline.run();
    }

    @Test
    public void testOutputNullAsNumericWithPrecision() {

        var dataRow = createFromOneCell(null);

        var schemas = createSchemaOfOneField("NUMERIC(5)");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("");

        pipeline.run();
    }

    @Test
    public void testOutputUnknownFieldName() {

        var dataRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Some Field Name We Don't Recognise", asString("Hello"))
        ));

        var schemas = createSchemaOfOneField("VARCHAR");

        CSVOutputFn toTest = new CSVOutputFn(mockConfiguration(schemas));

        var output = pipeline.apply(Create.of(dataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(output)
                .containsInAnyOrder("");

        pipeline.run();
    }

    private DataRow createFromOneCell(DataWrapper<?> value) {
        return DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell(TEST_FIELD_NAME, value)
        ));
    }

    private static List<? super OutputColumnSchema<?>> createSchemaOfOneField(String type) {
        return createSchemaOfOneField(type, null);
    }

    private static List<? super OutputColumnSchema<?>> createSchemaOfOneField(String type, String dateFormat) {
        var outputColumnSchema = new OutputColumnSchema.Builder()
                .withField(TEST_FIELD_NAME)
                .withType(type)
                .withDateFormat(dateFormat)
                .build();

        return List.of(outputColumnSchema);
    }

    private Configuration mockConfiguration(List<? super OutputColumnSchema<?>> schema) {
        var rtn = mock(Configuration.class, withSettings().serializable());
        doReturn(schema).when(rtn).getOutputSchemas();
        return rtn;
    }
}
