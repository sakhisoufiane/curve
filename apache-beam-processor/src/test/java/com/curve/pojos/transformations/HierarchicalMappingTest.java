package com.curve.pojos.transformations;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.transformations.condition.simple.IsNotBlank;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.beam.sdk.testing.PAssert;
import org.apache.beam.sdk.testing.TestPipeline;
import org.apache.beam.sdk.transforms.Create;
import org.apache.beam.sdk.transforms.ParDo;
import org.junit.Rule;
import org.junit.Test;

import java.io.Serializable;
import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asString;

public class HierarchicalMappingTest implements Serializable {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Rule
    public final transient TestPipeline pipeline = TestPipeline.create();

    @Test
    public void testHierarchicalMappings() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Channel", asString("Physical")),
                new NonNullDataCell("Territory", asString("UK")),
                new NonNullDataCell("Cat No", asString("CATNO01"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", asString("CATNO01")),
                        new NonNullDataCell("Code", asString("physical_uk_CATNO01"))
                ),
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", asString("CATNO01"))
                )
        );

        var mappings = createSampleMappings();

        var toTest = new HierarchicalMapping(
                "calculation",
                null,
                "Cat No",
                null,
                null,
                "Code",
                false,
                mappings,
                List.of("Channel", "Territory"),
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
    public void testOverrideExisting() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Channel", asString("Physical")),
                new NonNullDataCell("Territory", asString("NL")),
                new NonNullDataCell("Cat No", asString("CATNO01"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("NL")),
                        new NonNullDataCell("Cat No", asString("physical_default_CATNO01"))
                ),
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("NL")),
                        new NonNullDataCell("Cat No", asString("CATNO01"))
                )
        );

        var mappings = createSampleMappings();

        var toTest = new HierarchicalMapping(
                "calculation",
                null,
                "Cat No",
                null,
                null,
                "Cat No",
                true,
                mappings,
                List.of("Channel", "Territory"),
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
    public void testNoReplacementIfDisabled() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Channel", asString("Physical")),
                new NonNullDataCell("Territory", asString("NL")),
                new NonNullDataCell("Cat No", asString("CATNO01"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("NL")),
                        new NonNullDataCell("Cat No", asString("CATNO01"))
                ),
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("NL")),
                        new NonNullDataCell("Cat No", asString("CATNO01"))
                )
        );

        var mappings = createSampleMappings();

        var toTest = new HierarchicalMapping(
                "calculation",
                null,
                "Cat No",
                null,
                null,
                "Cat No",
                false,
                mappings,
                List.of("Channel", "Territory"),
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
    public void testErrorCase() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Channel", asString("Physical")),
                new NonNullDataCell("Territory", asString("UK")),
                new NonNullDataCell("Cat No", asString("CATNO01"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", null)
                ),
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", asString("CATNO01"))
                )
        );

        var mappings = MAPPER.createObjectNode()
                .<ObjectNode>set("Physical", MAPPER.createObjectNode()
                        .<ObjectNode>set("UK", MAPPER.createObjectNode()
                                .<ObjectNode>set("CATNO01", MAPPER.createObjectNode()
                                        .put("sandwich", "cheese")
                                )
                                .put("CATNO02", "physical_uk_CATNO02")
                                .put("_default", "physical_uk_default_id")
                        )
                        .<ObjectNode>set("USA", MAPPER.createObjectNode()
                                .put("CATNO01", "physical_usa_CATNO01")
                                .put("CATNO02", "physical_usa_CATNO02")
                                .put("_default", "physical_usa_default_id")
                        )
                        .<ObjectNode>set("_default", MAPPER.createObjectNode()
                                .put("CATNO01", "physical_default_CATNO01")
                                .put("CATNO02", "physical_default_CATNO02")
                                .put("_default", "physical_default_default_id")
                        )
                )
                .<ObjectNode>set("Digital", MAPPER.createObjectNode()
                        .<ObjectNode>set("UK", MAPPER.createObjectNode()
                                .put("CATNO01", "digital_uk_CATNO01")
                                .put("CATNO02", "digital_uk_CATNO02")
                                .put("_default", "digital_uk_default_id")
                        )
                        .<ObjectNode>set("USA", MAPPER.createObjectNode()
                                .put("CATNO01", "digital_usa_CATNO01")
                                .put("CATNO02", "digital_usa_CATNO02")
                                .put("_default", "digital_usa_default_id")
                        )
                        .<ObjectNode>set("_default", MAPPER.createObjectNode()
                                .put("CATNO01", "digital_default_CATNO01")
                                .put("CATNO02", "digital_default_CATNO02")
                                .put("_default", "digital_default_default_id")
                        )
                )
                .<ObjectNode>set("_default", MAPPER.createObjectNode()
                        .<ObjectNode>set("UK", MAPPER.createObjectNode()
                                .put("CATNO01", "default_uk_CATNO01")
                                .put("CATNO02", "default_uk_CATNO02")
                                .put("_default", "default_uk_default_id")
                        )
                        .<ObjectNode>set("USA", MAPPER.createObjectNode()
                                .put("CATNO01", "default_usa_CATNO01")
                                .put("CATNO02", "default_usa_CATNO02")
                                .put("_default", "default_usa_default_id")
                        )
                        .<ObjectNode>set("_default", MAPPER.createObjectNode()
                                .put("CATNO01", "default_default_CATNO01")
                                .put("CATNO02", "default_default_CATNO02")
                                .put("_default", "default_default_default_id")
                        )
                );

        var toTest = new HierarchicalMapping(
                "calculation",
                null,
                "Cat No",
                null,
                null,
                "Cat No",
                true,
                mappings,
                List.of("Channel", "Territory"),
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
        var inputRow1 = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Channel", asString("Physical")),
                new NonNullDataCell("Territory", asString("UK")),
                new NonNullDataCell("Cat No", asString("ABC_CATNO01"))
        ));

        var inputRow2 = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Channel", asString("Physical")),
                new NonNullDataCell("Territory", asString("UK")),
                new NonNullDataCell("Cat No", asString("CATNABC_O01"))
        ));

        var expected1 = new DataRow(
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", asString("ABC_CATNO01")),
                        new NonNullDataCell("Code", asString("physical_uk_CATNO01"))
                ),
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", asString("ABC_CATNO01"))
                )
        );

        var expected2 = new DataRow(
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", asString("CATNABC_O01")),
                        new NonNullDataCell("Code", asString("physical_uk_default_id"))
                ),
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", asString("CATNABC_O01"))
                )
        );

        var mappings = createSampleMappings();

        var toTest = new HierarchicalMapping(
                "calculation",
                null,
                "Cat No",
                null,
                null,
                "Code",
                false,
                mappings,
                List.of("Channel", "Territory"),
                "^ABC_"
        );

        var result = pipeline
                .apply(Create.of(inputRow1, inputRow2))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected1, expected2);

        pipeline.run();
    }

    @Test
    public void testBlankRegex() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Channel", asString("Physical")),
                new NonNullDataCell("Territory", asString("UK")),
                new NonNullDataCell("Cat No", asString("CATNO01"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", asString("CATNO01")),
                        new NonNullDataCell("Code", asString("physical_uk_CATNO01"))
                ),
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", asString("CATNO01"))
                )
        );

        var mappings = createSampleMappings();

        var toTest = new HierarchicalMapping(
                "calculation",
                null,
                "Cat No",
                null,
                null,
                "Code",
                false,
                mappings,
                List.of("Channel", "Territory"),
                "   "
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
                "Code",
                null,
                null,
                null
        );

        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Channel", asString("Physical")),
                new NonNullDataCell("Territory", asString("UK")),
                new NonNullDataCell("Cat No", asString("CATNO01"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", asString("CATNO01"))
                ),
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", asString("CATNO01"))
                )
        );

        var mappings = createSampleMappings();

        var toTest = new HierarchicalMapping(
                "calculation",
                condition,
                "Cat No",
                null,
                null,
                "Code",
                true,
                mappings,
                List.of("Channel", "Territory"),
                "   "
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    @Test
    public void testNullInContextData() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Channel", asString("Physical")),
                new NonNullDataCell("Territory", null),
                new NonNullDataCell("Cat No", asString("CATNO01"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", null),
                        new NonNullDataCell("Cat No", asString("CATNO01")),
                        new NonNullDataCell("Code", asString("physical_default_CATNO01"))
                ),
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", null),
                        new NonNullDataCell("Cat No", asString("CATNO01"))
                )
        );

        var mappings = createSampleMappings();

        var toTest = new HierarchicalMapping(
                "calculation",
                null,
                "Cat No",
                null,
                null,
                "Code",
                false,
                mappings,
                List.of("Channel", "Territory"),
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
    public void testNullInInputData() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Channel", asString("Physical")),
                new NonNullDataCell("Territory", asString("UK")),
                new NonNullDataCell("Cat No", null)
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", null),
                        new NonNullDataCell("Code", asString("physical_uk_default_id"))
                ),
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("UK")),
                        new NonNullDataCell("Cat No", null)
                )
        );

        var mappings = createSampleMappings();

        var toTest = new HierarchicalMapping(
                "calculation",
                null,
                "Cat No",
                null,
                null,
                "Code",
                false,
                mappings,
                List.of("Channel", "Territory"),
                null
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    /**
     * In the event that no default exists for a node, walk back up the tree to find a default value that might contain
     * the key
     */
    @Test
    public void testRewalk() throws Exception {
        var inputRow = DataRow.Factory.createFromInputData(List.of(
                new NonNullDataCell("Channel", asString("Physical")),
                new NonNullDataCell("Territory", asString("NL")),
                new NonNullDataCell("Cat No", asString("CATNO01"))
        ));

        var expected = new DataRow(
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("NL")),
                        new NonNullDataCell("Cat No", asString("default_nl_CATNO01"))
                ),
                List.of(
                        new NonNullDataCell("Channel", asString("Physical")),
                        new NonNullDataCell("Territory", asString("NL")),
                        new NonNullDataCell("Cat No", asString("CATNO01"))
                )
        );

        var mappings = MAPPER.createObjectNode()
                .<ObjectNode>set("Physical", MAPPER.createObjectNode()
                        .<ObjectNode>set("UK", MAPPER.createObjectNode()
                                .put("CATNO01", "physical_uk_CATNO01")
                                .put("CATNO02", "physical_uk_CATNO02")
                                .put("_default", "physical_uk_default_id")
                        )
                        .<ObjectNode>set("USA", MAPPER.createObjectNode()
                                .put("CATNO01", "physical_usa_CATNO01")
                                .put("CATNO02", "physical_usa_CATNO02")
                                .put("_default", "physical_usa_default_id")
                        )
                )
                .<ObjectNode>set("Digital", MAPPER.createObjectNode()
                        .<ObjectNode>set("UK", MAPPER.createObjectNode()
                                .put("CATNO01", "digital_uk_CATNO01")
                                .put("CATNO02", "digital_uk_CATNO02")
                                .put("_default", "digital_uk_default_id")
                        )
                        .<ObjectNode>set("USA", MAPPER.createObjectNode()
                                .put("CATNO01", "digital_usa_CATNO01")
                                .put("CATNO02", "digital_usa_CATNO02")
                                .put("_default", "digital_usa_default_id")
                        )
                )
                .<ObjectNode>set("_default", MAPPER.createObjectNode()
                        .<ObjectNode>set("NL", MAPPER.createObjectNode()
                                .put("CATNO01", "default_nl_CATNO01")
                                .put("CATNO02", "default_nl_CATNO02")
                                .put("_default", "default_nl_default_id")
                        )
                        .<ObjectNode>set("_default", MAPPER.createObjectNode()
                                .put("CATNO01", "default_default_CATNO01")
                                .put("CATNO02", "default_default_CATNO02")
                                .put("_default", "default_default_default_id")
                        )
                );

        var toTest = new HierarchicalMapping(
                "calculation",
                null,
                "Cat No",
                null,
                null,
                "Cat No",
                true,
                mappings,
                List.of("Channel", "Territory"),
                null
        );

        var result = pipeline
                .apply(Create.of(inputRow))
                .apply(ParDo.of(toTest));

        PAssert.that(result)
                .containsInAnyOrder(expected);

        pipeline.run();
    }

    private static ObjectNode createSampleMappings() {
        return MAPPER.createObjectNode()
                .<ObjectNode>set("Physical", MAPPER.createObjectNode()
                        .<ObjectNode>set("UK", MAPPER.createObjectNode()
                                .put("CATNO01", "physical_uk_CATNO01")
                                .put("CATNO02", "physical_uk_CATNO02")
                                .put("_default", "physical_uk_default_id")
                        )
                        .<ObjectNode>set("USA", MAPPER.createObjectNode()
                                .put("CATNO01", "physical_usa_CATNO01")
                                .put("CATNO02", "physical_usa_CATNO02")
                                .put("_default", "physical_usa_default_id")
                        )
                        .<ObjectNode>set("_default", MAPPER.createObjectNode()
                                .put("CATNO01", "physical_default_CATNO01")
                                .put("CATNO02", "physical_default_CATNO02")
                                .put("_default", "physical_default_default_id")
                        )
                )
                .<ObjectNode>set("Digital", MAPPER.createObjectNode()
                        .<ObjectNode>set("UK", MAPPER.createObjectNode()
                                .put("CATNO01", "digital_uk_CATNO01")
                                .put("CATNO02", "digital_uk_CATNO02")
                                .put("_default", "digital_uk_default_id")
                        )
                        .<ObjectNode>set("USA", MAPPER.createObjectNode()
                                .put("CATNO01", "digital_usa_CATNO01")
                                .put("CATNO02", "digital_usa_CATNO02")
                                .put("_default", "digital_usa_default_id")
                        )
                        .<ObjectNode>set("_default", MAPPER.createObjectNode()
                                .put("CATNO01", "digital_default_CATNO01")
                                .put("CATNO02", "digital_default_CATNO02")
                                .put("_default", "digital_default_default_id")
                        )
                )
                .<ObjectNode>set("_default", MAPPER.createObjectNode()
                        .<ObjectNode>set("UK", MAPPER.createObjectNode()
                                .put("CATNO01", "default_uk_CATNO01")
                                .put("CATNO02", "default_uk_CATNO02")
                                .put("_default", "default_uk_default_id")
                        )
                        .<ObjectNode>set("USA", MAPPER.createObjectNode()
                                .put("CATNO01", "default_usa_CATNO01")
                                .put("CATNO02", "default_usa_CATNO02")
                                .put("_default", "default_usa_default_id")
                        )
                        .<ObjectNode>set("_default", MAPPER.createObjectNode()
                                .put("CATNO01", "default_default_CATNO01")
                                .put("CATNO02", "default_default_CATNO02")
                                .put("_default", "default_default_default_id")
                        )
                );
    }


}
