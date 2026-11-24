package com.curve.pojos.transformations.calculation;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.transformations.condition.simple.IsNotBlank;
import org.apache.beam.sdk.testing.PAssert;
import org.apache.beam.sdk.testing.TestPipeline;
import org.apache.beam.sdk.transforms.Create;
import org.apache.beam.sdk.transforms.ParDo;
import org.junit.Rule;
import org.junit.Test;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asNumeric;
import static com.curve.pojos.data.DataWrapper.Factory.asString;

public class CalculationTest implements Serializable {

    @Rule
    public transient final TestPipeline pipeline = TestPipeline.create();

    @Test
    public void testAddition() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("1"))),
                new NonNullDataCell("someRightField", asNumeric(new BigDecimal("2")))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("1"))),
                        new NonNullDataCell("someRightField", asNumeric(new BigDecimal("2"))),
                        new NonNullDataCell("someNewField", asString("3")) // TODO is this what we want?
                ),
                List.of(
                        new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("1"))),
                        new NonNullDataCell("someRightField", asNumeric(new BigDecimal("2")))
                )
        );


        var toTest = new Calculation(
                "calculation",
                null,
                "someLeftField",
                null,
                null,
                "someNewField",
                false,
                List.of(new Addition(
                        "addition",
                        "someRightField",
                        null,
                        null
                ))
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testMultiplicationOnReplacementField() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("2"))),
                new NonNullDataCell("someRightField", asNumeric(new BigDecimal("3")))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("2"))),
                        new NonNullDataCell("someRightField", asString("6"))
                ),
                List.of(
                        new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("2"))),
                        new NonNullDataCell("someRightField", asNumeric(new BigDecimal("3")))
                )
        );


        var toTest = new Calculation(
                "calculation",
                null,
                "someLeftField",
                null,
                null,
                "someRightField",
                true,
                List.of(new Multiplication(
                        "multiplication",
                        "someRightField",
                        null,
                        null
                ))
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testDontReplaceValueIfConfigured() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("2"))),
                new NonNullDataCell("someRightField", asNumeric(new BigDecimal("3")))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("2"))),
                        new NonNullDataCell("someRightField", asNumeric(new BigDecimal("3")))
                ),
                List.of(
                        new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("2"))),
                        new NonNullDataCell("someRightField", asNumeric(new BigDecimal("3")))
                )
        );


        var toTest = new Calculation(
                "calculation",
                null,
                "someLeftField",
                null,
                null,
                "someRightField",
                false,
                List.of(new Multiplication(
                        "multiplication",
                        "someRightField",
                        null,
                        null
                ))
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testErrorCase() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("2"))),
                new NonNullDataCell("someRightField", asString("Sike, that's the wrong numba!"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("2"))),
                        new NonNullDataCell("someRightField", null)
                ),
                List.of(
                        new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("2"))),
                        new NonNullDataCell("someRightField", asString("Sike, that's the wrong numba!"))
                )
        );


        var toTest = new Calculation(
                "calculation",
                null,
                "someLeftField",
                null,
                null,
                "someRightField",
                true,
                List.of(new Multiplication(
                        "multiplication",
                        "someRightField",
                        null,
                        null
                ))
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testConditionDoesntMatch() throws Exception {
        var condition = new IsNotBlank(
                "isNotBlank",
                false,
                "someNewField",
                null,
                null,
                null
        );

        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("1"))),
                new NonNullDataCell("someRightField", asNumeric(new BigDecimal("2")))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("1"))),
                        new NonNullDataCell("someRightField", asNumeric(new BigDecimal("2")))
                ),
                List.of(
                        new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("1"))),
                        new NonNullDataCell("someRightField", asNumeric(new BigDecimal("2")))
                )
        );


        var toTest = new Calculation(
                "calculation",
                condition,
                "someLeftField",
                null,
                null,
                "someNewField",
                false,
                List.of(new Addition(
                        "addition",
                        "someRightField",
                        null,
                        null
                ))
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testNullInLeftField() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("someLeftField", null),
                new NonNullDataCell("someRightField", asNumeric(new BigDecimal("2")))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someLeftField", null),
                        new NonNullDataCell("someRightField", asNumeric(new BigDecimal("2"))),
                        new NonNullDataCell("someNewField", null)
                ),
                List.of(
                        new NonNullDataCell("someLeftField", null),
                        new NonNullDataCell("someRightField", asNumeric(new BigDecimal("2")))
                )
        );


        var toTest = new Calculation(
                "calculation",
                null,
                "someLeftField",
                null,
                null,
                "someNewField",
                false,
                List.of(new Addition(
                        "addition",
                        "someRightField",
                        null,
                        null
                ))
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testNullInRightField() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("1"))),
                new NonNullDataCell("someRightField", null)
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("1"))),
                        new NonNullDataCell("someRightField", null),
                        new NonNullDataCell("someNewField", null)
                ),
                List.of(
                        new NonNullDataCell("someLeftField", asNumeric(new BigDecimal("1"))),
                        new NonNullDataCell("someRightField", null)
                )
        );


        var toTest = new Calculation(
                "calculation",
                null,
                "someLeftField",
                null,
                null,
                "someNewField",
                false,
                List.of(new Addition(
                        "addition",
                        "someRightField",
                        null,
                        null
                ))
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }
}
