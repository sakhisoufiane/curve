package com.curve.pojos.transformations;

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
import java.util.List;
import java.util.Map;

import static com.curve.pojos.data.DataWrapper.Factory.asString;

public class SimpleMappingTest implements Serializable {

    @Rule
    public final transient TestPipeline pipeline = TestPipeline.create();

    @Test
    public void testSomething() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
            new NonNullDataCell("Territory", asString("UK"))
        ));

        var expected = new DataRow(
                List.of(
                    new NonNullDataCell("Territory", asString("UK")),
                    new NonNullDataCell("Mapped Territory", asString("GB"))
                ),
                List.of(
                    new NonNullDataCell("Territory", asString("UK"))
                )
        );

        var toTest = new SimpleMapping(
                "calculation",
                null,
                "Territory",
                null,
                null,
                "Mapped Territory",
                false,
                Map.of("UK", "GB"),
                null
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
                new NonNullDataCell("Territory", asString("UK"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Territory", asString("GB"))
                ),
                List.of(
                        new NonNullDataCell("Territory", asString("UK"))
                )
        );

        var toTest = new SimpleMapping(
                "calculation",
                null,
                "Territory",
                null,
                null,
                "Territory",
                true,
                Map.of("UK", "GB"),
                null
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
                new NonNullDataCell("Territory", asString("UK"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Territory", asString("UK"))
                ),
                List.of(
                        new NonNullDataCell("Territory", asString("UK"))
                )
        );

        var toTest = new SimpleMapping(
                "calculation",
                null,
                "Territory",
                null,
                null,
                "Territory",
                false,
                Map.of("UK", "GB"),
                null
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testRegexFiltering() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Territory", asString("UK012345"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Territory", asString("UK012345")),
                        new NonNullDataCell("Mapped Territory", asString("GB"))
                ),
                List.of(
                        new NonNullDataCell("Territory", asString("UK012345"))
                )
        );

        var toTest = new SimpleMapping(
                "calculation",
                null,
                "Territory",
                null,
                null,
                "Mapped Territory",
                false,
                Map.of("UK", "GB"),
                "[0-9]*"
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testBlankRegex() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Territory", asString("UK"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Mapped Territory", asString("GB"))
                ),
                List.of(
                        new NonNullDataCell("Territory", asString("UK"))
                )
        );

        var toTest = new SimpleMapping(
                "calculation",
                null,
                "Territory",
                null,
                null,
                "Mapped Territory",
                false,
                Map.of("UK", "GB"),
                "  "
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
                "Mapped Territory",
                null,
                null,
                null
        );

        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Territory", asString("UK"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Territory", asString("UK"))
                ),
                List.of(
                        new NonNullDataCell("Territory", asString("UK"))
                )
        );

        var toTest = new SimpleMapping(
                "calculation",
                condition,
                "Territory",
                null,
                null,
                "Mapped Territory",
                true,
                Map.of("UK", "GB"),
                "  "
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

        var toTest = new SimpleMapping(
                "calculation",
                null,
                "Territory",
                null,
                null,
                "Mapped Territory",
                false,
                Map.of("UK", "GB"),
                null
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }
}
