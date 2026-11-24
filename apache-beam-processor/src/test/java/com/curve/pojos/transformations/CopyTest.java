package com.curve.pojos.transformations;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.transformations.condition.simple.IsBlank;
import com.curve.pojos.transformations.condition.simple.IsNotBlank;
import org.apache.beam.sdk.testing.PAssert;
import org.apache.beam.sdk.testing.TestPipeline;
import org.apache.beam.sdk.transforms.Create;
import org.apache.beam.sdk.transforms.ParDo;
import org.junit.Rule;
import org.junit.Test;

import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asString;

public class CopyTest {
    @Rule
    public final transient TestPipeline pipeline = TestPipeline.create();

    @Test
    public void testCopy() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Territory", asString("UK"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Mapped Territory", asString("UK"))
                ),
                List.of(
                        new NonNullDataCell("Territory", asString("UK"))
                )
        );

        var toTest = new Copy(
                "copy",
                null,
                "Territory",
                null,
                null,
                "Mapped Territory",
                false
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testReplacement() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Territory", asString("UK")),
                new NonNullDataCell("Mapped Territory", asString("USA"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Mapped Territory", asString("UK"))
                ),
                List.of(
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Mapped Territory", asString("USA"))
                )
        );

        var toTest = new Copy(
                "copy",
                null,
                "Territory",
                null,
                null,
                "Mapped Territory",
                true
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testReplacementDisabled() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Territory", asString("UK")),
                new NonNullDataCell("Mapped Territory", asString("USA"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Mapped Territory", asString("USA"))
                ),
                List.of(
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Mapped Territory", asString("USA"))
                )
        );

        var toTest = new Copy(
                "copy",
                null,
                "Territory",
                null,
                null,
                "Territory",
                false
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

        var condition = new IsBlank(
                "isBlank",
                false,
                "Mapped Territory",
                null,
                null,
                null
        );

        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Territory", asString("UK")),
                new NonNullDataCell("Mapped Territory", asString("USA"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Mapped Territory", asString("USA"))
                ),
                List.of(
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Mapped Territory", asString("USA"))
                )
        );

        var toTest = new Copy(
                "copy",
                condition,
                "Territory",
                null,
                null,
                "Mapped Territory",
                true
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testNullInput() throws Exception {

        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Territory", null)
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Territory", null),
                        new NonNullDataCell("Mapped Territory", null)
                ),
                List.of(
                        new NonNullDataCell("Territory", null)
                )
        );

        var toTest = new Copy(
                "copy",
                null,
                "Territory",
                null,
                null,
                "Mapped Territory",
                false
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }
}
