package com.curve.pojos.transformations;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.transformations.condition.simple.Equals;
import com.curve.pojos.transformations.condition.simple.IsBlank;
import com.curve.pojos.transformations.condition.simple.IsNotBlank;
import org.apache.beam.sdk.testing.PAssert;
import org.apache.beam.sdk.testing.TestPipeline;
import org.apache.beam.sdk.transforms.Create;
import org.apache.beam.sdk.transforms.ParDo;
import org.junit.Rule;
import org.junit.Test;

import java.io.Serializable;
import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asString;

public class SwitchDefaultTest implements Serializable {

    @Rule
    public final transient TestPipeline pipeline = TestPipeline.create();

    @Test
    public void testMatchingCondition() throws Exception {

        var condition1 = new Equals(
                "equals",
                false,
                "someField",
                null,
                null,
                "not the value"
        );

        var condition2 = new Equals(
                "equals",
                false,
                "someField",
                null,
                null,
                "is the value"
        );

        var condition3 = new IsNotBlank(
                "isNotBlank",
                false,
                "someField",
                null,
                null,
                null
        );

        List<SwitchMapping> mappings = List.of(
                new SwitchMapping(condition1, "Condition 1"),
                new SwitchMapping(condition2, "Condition 2"),
                new SwitchMapping(condition3, "Condition 3")
        );

        var defaultValue = "Some default";

        List<NonNullDataCell> incomingData = List.of(new NonNullDataCell("someField", asString("is the value")));
        var incomingDataRow = new DataRow(incomingData, incomingData);

        var toTest = new SwitchDefault(
                "switchDefault",
                null,
                "someOutputField",
                false,
                mappings,
                defaultValue
        );

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someField", asString("is the value")),
                        new NonNullDataCell("someOutputField", asString("Condition 2"))
                ),
                List.of(
                        new NonNullDataCell("someField", asString("is the value"))
                )
        );

        var result = pipeline
                .apply(Create.of(incomingDataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testDefault() throws Exception {

        var condition1 = new Equals(
                "equals",
                false,
                "someField",
                null,
                null,
                "not the value"
        );

        var condition2 = new Equals(
                "equals",
                false,
                "someField",
                null,
                null,
                "is the value"
        );

        var condition3 = new IsBlank(
                "isBlank",
                false,
                "someField",
                null,
                null,
                null
        );

        List<SwitchMapping> mappings = List.of(
                new SwitchMapping(condition1, "Condition 1"),
                new SwitchMapping(condition2, "Condition 2"),
                new SwitchMapping(condition3, "Condition 3")
        );

        var defaultValue = "Some default";

        List<NonNullDataCell> incomingData = List.of(new NonNullDataCell("someField", asString("totally different value")));
        var incomingDataRow = new DataRow(incomingData, incomingData);

        var toTest = new SwitchDefault(
                "switchDefault",
                null,
                "someOutputField",
                false,
                mappings,
                defaultValue
        );

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someField", asString("totally different value")),
                        new NonNullDataCell("someOutputField", asString("Some default"))
                ),
                List.of(
                        new NonNullDataCell("someField", asString("totally different value"))
                )
        );

        var result = pipeline
                .apply(Create.of(incomingDataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testEmptyMappings() throws Exception {

        var defaultValue = "Some default";

        List<NonNullDataCell> incomingData = List.of(new NonNullDataCell("someField", asString("some value")));
        var incomingDataRow = new DataRow(incomingData, incomingData);

        var toTest = new SwitchDefault(
                "switchDefault",
                null,
                "someOutputField",
                false,
                null,
                defaultValue
        );

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someField", asString("some value")),
                        new NonNullDataCell("someOutputField", asString("Some default"))
                ),
                List.of(
                        new NonNullDataCell("someField", asString("some value"))
                )
        );

        var result = pipeline
                .apply(Create.of(incomingDataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testEmptyDefault() throws Exception {

        var condition1 = new Equals(
                "equals",
                false,
                "someField",
                null,
                null,
                "not the value"
        );

        var condition2 = new Equals(
                "equals",
                false,
                "someField",
                null,
                null,
                "is the value"
        );

        var condition3 = new IsBlank(
                "isBlank",
                false,
                "someField",
                null,
                null,
                null
        );

        List<SwitchMapping> mappings = List.of(
                new SwitchMapping(condition1, "Condition 1"),
                new SwitchMapping(condition2, "Condition 2"),
                new SwitchMapping(condition3, "Condition 3")
        );

        List<NonNullDataCell> incomingData = List.of(new NonNullDataCell("someField", asString("totally different value")));
        var incomingDataRow = new DataRow(incomingData, incomingData);

        var toTest = new SwitchDefault(
                "switchDefault",
                null,
                "someOutputField",
                false,
                mappings,
                null
        );

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someField", asString("totally different value")),
                        new NonNullDataCell("someOutputField", null)
                ),
                List.of(
                        new NonNullDataCell("someField", asString("totally different value"))
                )
        );

        var result = pipeline
                .apply(Create.of(incomingDataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testNoReplaceOnExisting() throws Exception {

        var condition1 = new Equals(
                "equals",
                false,
                "someField",
                null,
                null,
                "not the value"
        );

        var condition2 = new Equals(
                "equals",
                false,
                "someField",
                null,
                null,
                "is the value"
        );

        var condition3 = new IsNotBlank(
                "isNotBlank",
                false,
                "someField",
                null,
                null,
                null
        );

        List<SwitchMapping> mappings = List.of(
                new SwitchMapping(condition1, "Condition 1"),
                new SwitchMapping(condition2, "Condition 2"),
                new SwitchMapping(condition3, "Condition 3")
        );

        var defaultValue = "Some default";

        List<NonNullDataCell> incomingData = List.of(new NonNullDataCell("someField", asString("is the value")));
        var incomingDataRow = new DataRow(incomingData, incomingData);

        var toTest = new SwitchDefault(
                "switchDefault",
                null,
                "someField",
                false,
                mappings,
                defaultValue
        );

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someField", asString("is the value"))
                ),
                List.of(
                        new NonNullDataCell("someField", asString("is the value"))
                )
        );

        var result = pipeline
                .apply(Create.of(incomingDataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testReplaceOnExisting() throws Exception {

        var condition1 = new Equals(
                "equals",
                false,
                "someField",
                null,
                null,
                "not the value"
        );

        var condition2 = new Equals(
                "equals",
                false,
                "someField",
                null,
                null,
                "is the value"
        );

        var condition3 = new IsNotBlank(
                "isNotBlank",
                false,
                "someField",
                null,
                null,
                null
        );

        List<SwitchMapping> mappings = List.of(
                new SwitchMapping(condition1, "Condition 1"),
                new SwitchMapping(condition2, "Condition 2"),
                new SwitchMapping(condition3, "Condition 3")
        );

        var defaultValue = "Some default";

        List<NonNullDataCell> incomingData = List.of(new NonNullDataCell("someField", asString("is the value")));
        var incomingDataRow = new DataRow(incomingData, incomingData);

        var toTest = new SwitchDefault(
                "switchDefault",
                null,
                "someField",
                true,
                mappings,
                defaultValue
        );

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someField", asString("Condition 2"))
                ),
                List.of(
                        new NonNullDataCell("someField", asString("is the value"))
                )
        );

        var result = pipeline
                .apply(Create.of(incomingDataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testNullInput() throws Exception {

        var condition1 = new Equals(
                "equals",
                false,
                "someField",
                null,
                null,
                "not the value"
        );

        var condition2 = new Equals(
                "equals",
                false,
                "someField",
                null,
                null,
                "is the value"
        );

        var condition3 = new IsNotBlank(
                "isNotBlank",
                false,
                "someField",
                null,
                null,
                null
        );

        List<SwitchMapping> mappings = List.of(
                new SwitchMapping(condition1, "Condition 1"),
                new SwitchMapping(condition2, "Condition 2"),
                new SwitchMapping(condition3, "Condition 3")
        );

        List<NonNullDataCell> incomingData = List.of(new NonNullDataCell("someField", null));
        var incomingDataRow = new DataRow(incomingData, incomingData);

        var toTest = new SwitchDefault(
                "switchDefault",
                null,
                "someOutputField",
                false,
                mappings,
                null
        );

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("someField", null),
                        new NonNullDataCell("someOutputField", null)
                ),
                List.of(
                        new NonNullDataCell("someField", null)
                )
        );

        var result = pipeline
                .apply(Create.of(incomingDataRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }
}
