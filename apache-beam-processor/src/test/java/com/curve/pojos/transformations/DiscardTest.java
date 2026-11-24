package com.curve.pojos.transformations;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.transformations.condition.simple.Equals;
import org.apache.beam.sdk.testing.PAssert;
import org.apache.beam.sdk.testing.TestPipeline;
import org.apache.beam.sdk.transforms.Create;
import org.apache.beam.sdk.transforms.ParDo;
import org.junit.Rule;
import org.junit.Test;

import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asString;

public class DiscardTest {
    @Rule
    public final transient TestPipeline pipeline = TestPipeline.create();

    @Test
    public void testDiscard() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Territory", asString("UK"))
        ));

        var toTest = new Discard(
                "discard",
                new Equals(
                        "equals",
                        false,
                        "Territory",
                        null,
                        null,
                        "UK"
                )
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .empty();

        pipeline.run();
    }

    @Test
    public void testConditionDoesntMatch() throws Exception {

        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Territory", asString("UK"))
        ));

        var toTest = new Discard(
                "discard",
                new Equals(
                        "equals",
                        false,
                        "Territory",
                        null,
                        null,
                        "USA"
                )
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(inputRow);

        pipeline.run();
    }
}
