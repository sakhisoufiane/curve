package com.curve.configuration;

import com.curve.App;
import com.curve.pojos.data.StringDataWrapper;
import com.curve.pojos.input.config.CharacterEncoding;
import com.curve.pojos.input.config.source.GCSFileSource;
import com.curve.pojos.input.config.source.URLFileSource;
import com.curve.pojos.input.config.type.*;
import com.curve.pojos.input.schemas.DateInputColumnSchema;
import com.curve.pojos.input.schemas.InputColumnSchema;
import com.curve.pojos.input.schemas.NonNullInputColumnSchema;
import com.curve.pojos.output.config.UnshardedGCSOutputConfig;
import com.curve.pojos.output.schemas.DateColumnSchema;
import com.curve.pojos.output.schemas.OutputColumnSchema;
import com.curve.pojos.transformations.*;
import com.curve.pojos.transformations.calculation.Calculation;
import com.curve.pojos.transformations.calculation.Equation;
import com.curve.pojos.transformations.condition.group.Or;
import com.curve.pojos.transformations.condition.simple.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.assertj.core.api.InstanceOfAssertFactories;
import org.junit.Test;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.io.Serializable;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Predicate;

import static com.curve.pojos.data.DataWrapper.Factory.asString;
import static net.javacrumbs.jsonunit.assertj.JsonAssertions.assertThatJson;
import static net.javacrumbs.jsonunit.jsonpath.JsonPathAdapter.inPath;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.entry;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;

public class ConfigurationTest {

    private static final String INPUT = "input";
    private static final String INPUT_SCHEMA = "input-schema";
    private static final String TRANSFORMATIONS = "transformations";
    private static final String OUTPUT = "output";
    private static final String OUTPUT_SCHEMA = "output-schema";

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    public void testSerialization() throws Exception {
        App.ConfigurationFactory configurationFactory = new App.ConfigurationFactory();
        var result = configurationFactory.createConfiguration(loadProcessorOptions("sample"));

        assertThat(result.getInputConfig()).satisfies(inputConfig -> {
            assertThat(inputConfig.getFileSource()).isInstanceOfSatisfying(GCSFileSource.class, gcsFileSource -> {
                assertThat(gcsFileSource.getInputFileBucketLocation()).isEqualTo("apache-beam-test-sam");
                assertThat(gcsFileSource.getInputFileName()).isEqualTo("simpleMappingTest.tsv");
            });

            assertThat(inputConfig.getFileType()).isInstanceOfSatisfying(TextFileType.class, fileTypeInfo -> {
                assertThat(fileTypeInfo.getDelimiter()).isEqualTo(";");
                assertThat(fileTypeInfo.getStartingRow()).isEqualTo(1);
                assertThat(fileTypeInfo.getStartingColumn()).isEqualTo(2);
                assertThat(fileTypeInfo.getEncoding()).isEqualTo(CharacterEncoding.UTF_8);
                assertThat(fileTypeInfo.isIndexSeparated()).isTrue();
            });

            assertThat(inputConfig.getDefaultValues()).hasSize(1).first().satisfies(defaultValue -> {
                assertThat(defaultValue.getLocation().row()).isEqualTo(1);
                assertThat(defaultValue.getLocation().column()).isEqualTo(9);
                assertThat(defaultValue.getField()).isEqualTo("Some Field");
                assertThat(defaultValue.getInputTypeInformation().getType()).isEqualTo("STRING");
            });
        });


        assertThat(result.getInputColumnSchemas().getInputColumnSchemas())
                .hasSize(9)
                .satisfies(schemas -> {
                    assertThat(schemas.get(0)).matches(new InputSchemaPredicate("Territory", "STRING"));
                    assertThat(schemas.get(1)).matches(new InputSchemaPredicate("Channel", "STRING"));
                    assertThat(schemas.get(2)).matches(new InputSchemaPredicate("Net Amount", "NUMBER"));
                    assertThat(schemas.get(3)).matches(new InputSchemaPredicate("Enabled", "BOOLEAN"));
                    assertThat(schemas.get(4)).matches(new InputSchemaPredicate("SaleDate", "DATE", "DD-MMM-YYYY"));
                    assertThat(schemas.get(5)).matches(new InputSchemaPredicate("Money", "NUMBER COMMA SEPARATED"));
                    assertThat(schemas.get(6)).matches(new InputSchemaPredicate("Two DP", "NUMBER 2 DECIMAL PLACES"));
                    assertThat(schemas.get(7)).matches(new InputSchemaPredicate("Five DP", "NUMBER 5 DECIMAL PLACES"));
                    assertThat(schemas.get(8)).matches(new InputSchemaPredicate("Territory2", "STRING", 5));
                });


        assertThat(result.getTransformations()).hasSize(7).satisfies(transformations -> {
            assertThat(transformations).element(0).isInstanceOfSatisfying(SimpleMapping.class, simpleMapping -> {
                assertThat(simpleMapping.getType()).isEqualTo("SimpleMapping");
                assertThat(simpleMapping.isReplaceOutputValue()).isEqualTo(true);
                assertThat(simpleMapping.getInputValueFieldName()).isEqualTo("Territory");
                assertThat(simpleMapping.getInputValueColumnIndex()).isNull();
                assertThat(simpleMapping.getInputFixedValue()).isNull();
                assertThat(simpleMapping.getOutputField()).isEqualTo("outputTerritory");
                assertThat(simpleMapping.getRegex()).isEqualTo("[0-9]+");

                assertThat(simpleMapping.getMappings()).hasSize(1)
                        .contains(entry("UK", "GB"));

                assertThat(simpleMapping.getCondition()).isInstanceOfSatisfying(Or.class, condition -> {
                    assertThat(condition.getType()).isEqualToIgnoringCase(Or.TYPE);
                    assertThat(condition.isNot()).isFalse();
                    assertThat(condition.getConditions()).hasSize(10).satisfies(conditions -> {
                        assertThat(conditions.get(0))
                                .asInstanceOf(InstanceOfAssertFactories.type(Contains.class))
                                .matches(
                                        ConditionPredicate.fromField(
                                                "contains",
                                                false,
                                                "Territory",
                                                "UK"
                                        )
                                );
                        assertThat(conditions.get(1))
                                .asInstanceOf(InstanceOfAssertFactories.type(DoesNotContain.class))
                                .matches(
                                        ConditionPredicate.fromField(
                                                "doesNotContain",
                                                true,
                                                "Territory",
                                                "US"
                                        )
                                );
                        assertThat(conditions.get(2))
                                .asInstanceOf(InstanceOfAssertFactories.type(Equals.class))
                                .matches(
                                        ConditionPredicate.fromField(
                                                "equals",
                                                false,
                                                "Channel",
                                                "Digital"
                                        )
                                );
                        assertThat(conditions.get(3))
                                .asInstanceOf(InstanceOfAssertFactories.type(GreaterThan.class))
                                .matches(
                                        ConditionPredicate.fromField(
                                                "greaterThan",
                                                true,
                                                "Money",
                                                "1.23"
                                        )
                                );
                        assertThat(conditions.get(4))
                                .asInstanceOf(InstanceOfAssertFactories.type(GreaterThanOrEqualTo.class))
                                .matches(
                                        ConditionPredicate.fromField(
                                                "greaterThanOrEqualTo",
                                                false,
                                                "Two DP",
                                                "4.56"
                                        )
                                );
                        assertThat(conditions.get(5))
                                .asInstanceOf(InstanceOfAssertFactories.type(IsBlank.class))
                                .matches(
                                        ConditionPredicate.fromField(
                                                "isBlank",
                                                false,
                                                "Territory2"
                                        )
                                );
                        assertThat(conditions.get(6))
                                .asInstanceOf(InstanceOfAssertFactories.type(IsNotBlank.class))
                                .matches(
                                        ConditionPredicate.fromColumn(
                                                "isNotBlank",
                                                false,
                                                0
                                        )
                                );
                        assertThat(conditions.get(7))
                                .asInstanceOf(InstanceOfAssertFactories.type(LessThan.class))
                                .matches(
                                        ConditionPredicate.fromField(
                                                "lessThan",
                                                false,
                                                "Money",
                                                "12.34"
                                        )
                                );
                        assertThat(conditions.get(8))
                                .asInstanceOf(InstanceOfAssertFactories.type(LessThanOrEqualTo.class))
                                .matches(
                                        ConditionPredicate.fromField(
                                                "lessThanOrEqualTo",
                                                false,
                                                "Two DP",
                                                "45.567"
                                        )
                                );
                        assertThat(conditions.get(9))
                                .asInstanceOf(InstanceOfAssertFactories.type(NotEquals.class))
                                .matches(
                                        ConditionPredicate.fromField(
                                                "notEquals",
                                                false,
                                                "Channel",
                                                "Analog"
                                        )
                                );
                    });
                });
            });

            assertThat(transformations).element(1).isInstanceOfSatisfying(HierarchicalMapping.class, mapping -> {
                assertThat(mapping.getType()).isEqualTo("HierarchicalMapping");
                assertThat(mapping.getCondition()).isNull();
                assertThat(mapping.getInputValueFieldName()).isNull();
                assertThat(mapping.getInputValueColumnIndex()).isEqualTo(1);
                assertThat(mapping.getInputFixedValue()).isNull();
                assertThat(mapping.getOutputField()).isEqualTo("outputTerritory");
                assertThat(mapping.isReplaceOutputValue()).isTrue();

                assertThat(mapping.getContext()).containsExactly("Channel", "Territory");

                assertThatJson(mapping.getMappings()).satisfies(mappings -> {
                    assertThatJson(inPath(mappings, "$.Physical")).isObject().satisfies(physical -> {
                        assertThatJson(inPath(physical, "$.UK")).isObject().containsOnly(
                                entry("CATNO01", "physical_uk_CATNO01"),
                                entry("CATNO02", "physical_uk_CATNO02"),
                                entry("_default", "physical_uk_default_id")
                        );

                        assertThatJson(inPath(physical, "$.USA")).isObject().containsOnly(
                                entry("CATNO01", "physical_usa_CATNO01"),
                                entry("CATNO02", "physical_usa_CATNO02"),
                                entry("_default", "physical_usa_default_id")
                        );

                        assertThatJson(inPath(physical, "$._default")).isObject().containsOnly(
                                entry("CATNO01", "physical_default_CATNO01"),
                                entry("CATNO02", "physical_default_CATNO02"),
                                entry("_default", "physical_default_default_id")
                        );
                    });

                    assertThatJson(inPath(mappings, "$.Digital")).isObject().satisfies(digital -> {
                        assertThatJson(inPath(digital, "$.UK")).isObject().containsOnly(
                                entry("CATNO01", "digital_uk_CATNO01"),
                                entry("CATNO02", "digital_uk_CATNO02"),
                                entry("_default", "digital_uk_default_id")
                        );

                        assertThatJson(inPath(digital, "$.USA")).isObject().containsOnly(
                                entry("CATNO01", "digital_usa_CATNO01"),
                                entry("CATNO02", "digital_usa_CATNO02"),
                                entry("_default", "digital_usa_default_id")
                        );

                        assertThatJson(inPath(digital, "$._default")).isObject().containsOnly(
                                entry("CATNO01", "digital_default_CATNO01"),
                                entry("CATNO02", "digital_default_CATNO02"),
                                entry("_default", "digital_default_default_id")
                        );
                    });

                    assertThatJson(inPath(mappings, "$._default")).isObject().satisfies(def -> {
                        assertThatJson(inPath(def, "$.UK")).isObject().containsOnly(
                                entry("CATNO01", "default_uk_CATNO01"),
                                entry("CATNO02", "default_uk_CATNO02"),
                                entry("_default", "default_uk_default_id")
                        );

                        assertThatJson(inPath(def, "$.USA")).isObject().containsOnly(
                                entry("CATNO01", "default_usa_CATNO01"),
                                entry("CATNO02", "default_usa_CATNO02"),
                                entry("_default", "default_usa_default_id")
                        );

                        assertThatJson(inPath(def, "$._default")).isObject().containsOnly(
                                entry("CATNO01", "default_default_CATNO01"),
                                entry("CATNO02", "default_default_CATNO02"),
                                entry("_default", "default_default_default_id")
                        );
                    });
                });
            });

            assertThat(transformations).element(2).isInstanceOfSatisfying(Calculation.class, calculation -> {
                assertThat(calculation.getType()).isEqualTo("Calculation");
                assertThat(calculation.isReplaceOutputValue()).isEqualTo(false);
                assertThat(calculation.getInputValueFieldName()).isNull();
                assertThat(calculation.getInputValueColumnIndex()).isNull();
                assertThat(calculation.getInputFixedValue()).isEqualTo("Hello!");
                assertThat(calculation.getOutputField()).isEqualTo("outputTerritory");

                assertThat(calculation.getCondition()).isNull();

                assertThat(calculation.getEquations()).hasSize(7).satisfies(equations -> {
                    assertThat(equations.get(0)).matches(
                            EquationPredicate.fromField(
                                    "addition",
                                    "Money"
                            )
                    );
                    assertThat(equations.get(1)).matches(
                            EquationPredicate.fromField(
                                    "subtraction",
                                    "Two DP"
                            )
                    );
                    assertThat(equations.get(2)).matches(
                            EquationPredicate.fromField(
                                    "multiplication",
                                    "Five DP"
                            )
                    );
                    assertThat(equations.get(3)).matches(
                            EquationPredicate.fromColumn(
                                    "division",
                                    5
                            )
                    );
                    assertThat(equations.get(4)).matches(
                            EquationPredicate.fromField(
                                    "left",
                                    "Money"
                            )
                    );
                    assertThat(equations.get(5)).matches(
                            EquationPredicate.fromField(
                                    "right",
                                    "Money"
                            )
                    );
                    assertThat(equations.get(6)).matches(
                            EquationPredicate.fromField(
                                    "concatenation",
                                    "SaleDate"
                            )
                    );
                });
            });

            assertThat(transformations).element(3).isInstanceOfSatisfying(SwitchDefault.class, switchDefault -> {
                assertThat(switchDefault.getType()).isEqualTo("SwitchDefault");
                assertThat(switchDefault.getOutputField()).isEqualTo("catType");
                assertThat(switchDefault.isReplaceOutputValue()).isEqualTo(true);

                assertThat(switchDefault.getDefaultValue()).isNotNull().isEqualTo("Release");

                assertThat(switchDefault.getMappings()).isNotNull().hasSize(2).satisfies(mappings -> {
                    assertThat(mappings.get(0)).satisfies(mapping -> {
                        assertThat(mapping.getCondition()).isInstanceOfSatisfying(IsNotBlank.class, condition -> {
                            assertThat(condition.getType()).isEqualTo("IsNotBlank");
                            assertThat(condition.getLeftValueFieldName()).isEqualTo("outputTerritory");
                            assertThat(condition.getLeftValueColumnIndex()).isNull();
                            assertThat(condition.getLeftFixedValue()).isNull();
                            assertThat(condition.getRightValue()).isNull();
                        });

                        assertThat(mapping.getValue()).isNotNull().satisfies(valueWrapper -> {
                            assertThat(valueWrapper.data()).isEqualTo("Track");
                        });
                    });

                    assertThat(mappings.get(1)).satisfies(mapping -> {
                        assertThat(mapping.getCondition()).isInstanceOfSatisfying(Equals.class, condition -> {
                            assertThat(condition.getType()).isEqualTo("equals");
                            assertThat(condition.getLeftValueFieldName()).isEqualTo("Territory");
                            assertThat(condition.getLeftValueColumnIndex()).isNull();
                            assertThat(condition.getLeftFixedValue()).isNull();
                            assertThat(condition.getRightValue()).isNotNull().satisfies(rightValueWrapper -> {
                                assertThat(rightValueWrapper.data()).isEqualTo("UK");
                            });
                        });

                        assertThat(mapping.getValue()).isNotNull().satisfies(valueWrapper -> {
                            assertThat(valueWrapper.data()).isEqualTo("Work");
                        });
                    });
                });
            });
            
            assertThat(transformations).element(4).isInstanceOfSatisfying(Copy.class, copy -> {
                assertThat(copy.getType()).isEqualTo("copy");
                assertThat(copy.isReplaceOutputValue()).isEqualTo(true);
                assertThat(copy.getInputValueFieldName()).isNull();
                assertThat(copy.getInputValueColumnIndex()).isNull();
                assertThat(copy.getInputFixedValue()).isEqualTo("Release");
                assertThat(copy.getOutputField()).isEqualTo("catType");
            });

            assertThat(transformations).element(5).isInstanceOfSatisfying(Discard.class, copy -> {
                assertThat(copy.getType()).isEqualTo("discard");
                assertThat(copy.getCondition()).isInstanceOfSatisfying(Equals.class, condition -> {
                    assertThat(condition.getType()).isEqualTo("equals");
                    assertThat(condition.getLeftValueFieldName()).isEqualTo("Territory");
                    assertThat(condition.getLeftValueColumnIndex()).isNull();
                    assertThat(condition.getLeftFixedValue()).isNull();
                    assertThat(condition.getRightValue()).isEqualTo(asString("USA"));
                });
            });

            assertThat(transformations).element(6).isInstanceOfSatisfying(SearchAndReplace.class, searchAndReplace -> {
                assertThat(searchAndReplace.getType()).isEqualTo("searchAndReplace");
                assertThat(searchAndReplace.getCondition()).isNull();
                assertThat(searchAndReplace.getInputValueFieldName()).isNull();
                assertThat(searchAndReplace.getInputValueColumnIndex()).isEqualTo(1);
                assertThat(searchAndReplace.getInputFixedValue()).isNull();
                assertThat(searchAndReplace.getOutputField()).isEqualTo("outputTerritory");
                assertThat(searchAndReplace.isReplaceOutputValue()).isFalse();
                assertThat(searchAndReplace.getRegex()).isEqualTo("[0-9]+");
                assertThat(searchAndReplace.getReplacement()).isEqualTo("A");
            });
        });


        assertThat(result.getOutputConfig()).isInstanceOfSatisfying(UnshardedGCSOutputConfig.class, outputConfig -> {
            assertThat(outputConfig.getType()).isEqualTo("Unsharded GCS");
            assertThat(outputConfig.getFileType()).isEqualTo("csv");
            assertThat(outputConfig.getBucketName()).isEqualTo("gs://apache-beam-test-sam/sam-output-test-bucket");
            assertThat(outputConfig.getFileName()).isEqualTo("simpleMappingTestOutput");
        });


        assertThat(result.getOutputSchemas()).hasSize(8).satisfies(schemas -> {
            assertThat(schemas.get(0)).matches(new OutputSchemaPredicate("outputTerritory", "VARCHAR"));
            assertThat(schemas.get(1)).matches(new OutputSchemaPredicate("Territory", "VARCHAR"));
            assertThat(schemas.get(2)).matches(new OutputSchemaPredicate("Channel", "VARCHAR"));
            assertThat(schemas.get(3)).matches(new OutputSchemaPredicate("SaleDate", "DATE", "DD/MM/YYYY"));
            assertThat(schemas.get(4)).matches(new OutputSchemaPredicate("Net Amount", "NUMERIC"));
            assertThat(schemas.get(5)).matches(new OutputSchemaPredicate("Five DP", "NUMERIC"));
            assertThat(schemas.get(6)).matches(new OutputSchemaPredicate("Channel", "VARCHAR(5)"));
            assertThat(schemas.get(7)).matches(new OutputSchemaPredicate("Five DP", "NUMERIC(7)"));
        });
    }

    /**
     * Test that a correct URL configuration object is deserialized.
     */
    @Test
    public void testUrlSerialization() throws Exception {
        App.ConfigurationFactory configurationFactory = new App.ConfigurationFactory();
        var result = configurationFactory.createConfiguration(loadProcessorOptions("url-input"));

        assertThat(result.getInputConfig()).satisfies(inputConfig -> {

            assertThat(inputConfig.getFileSource()).isInstanceOfSatisfying(URLFileSource.class, urlFileSource ->
                    assertThat(urlFileSource.getUrl()).isEqualTo("https://www.freetxtfilesfordownload.com/hello.txt"));

            assertThat(inputConfig.getFileType()).isInstanceOfSatisfying(TextFileType.class, textFileType -> {
                assertThat(textFileType.getDelimiter()).isEqualTo(";");
                assertThat(textFileType.getStartingRow()).isEqualTo(1);
                assertThat(textFileType.getStartingColumn()).isEqualTo(2);
                assertThat(textFileType.getEncoding()).isEqualTo(CharacterEncoding.UTF_8);
                assertThat(textFileType.isIndexSeparated()).isTrue();
            });

            assertThat(inputConfig.getDefaultValues()).hasSize(1).first().satisfies(defaultValue -> {
                assertThat(defaultValue.getLocation().row()).isEqualTo(1);
                assertThat(defaultValue.getLocation().column()).isEqualTo(9);
                assertThat(defaultValue.getField()).isEqualTo("Some Field");
                assertThat(defaultValue.getInputTypeInformation().getType()).isEqualTo("STRING");
            });

        });
    }

    /**
     * Test that a correct URL configuration object is deserialized even if there is bad casing for the source
     * type field.
     */
    @Test
    public void testUrlCaseInsensitivitySerialization() throws Exception {
        var map = new HashMap<String, String>();
        map.put(INPUT, "input-case-insensitive-test.json");

        App.ConfigurationFactory configurationFactory = new App.ConfigurationFactory();
        var result = configurationFactory.createConfiguration(loadProcessorOptions("url-input", map));

        assertThat(result.getInputConfig()).satisfies(inputConfig -> {

            assertThat(inputConfig.getFileSource()).isInstanceOfSatisfying(URLFileSource.class, urlFileSource ->
                    assertThat(urlFileSource.getUrl()).isEqualTo("https://www.freetxtfilesfordownload.com/hello.txt"));

            assertThat(inputConfig.getFileType()).isInstanceOfSatisfying(TextFileType.class, fileTypeInfo -> {
                assertThat(fileTypeInfo.getDelimiter()).isEqualTo(";");
                assertThat(fileTypeInfo.getStartingRow()).isEqualTo(1);
                assertThat(fileTypeInfo.getStartingColumn()).isEqualTo(2);
                assertThat(fileTypeInfo.getEncoding()).isEqualTo(CharacterEncoding.UTF_8);
                assertThat(fileTypeInfo.isIndexSeparated()).isTrue();
            });

            assertThat(inputConfig.getDefaultValues()).hasSize(1).first().satisfies(defaultValue -> {
                assertThat(defaultValue.getLocation().row()).isEqualTo(1);
                assertThat(defaultValue.getLocation().column()).isEqualTo(9);
                assertThat(defaultValue.getField()).isEqualTo("Some Field");
                assertThat(defaultValue.getInputTypeInformation().getType()).isEqualTo("STRING");
            });
        });
    }

    /**
     * Validate the fields expected to get a default value do so
     */
    @Test
    public void testDefaultingBehaviour() throws Exception {
        App.ConfigurationFactory configurationFactory = new App.ConfigurationFactory();
        var result = configurationFactory.createConfiguration(loadProcessorOptions("using-defaults"));

        assertThat(result.getInputConfig()).satisfies(inputConfig -> {
            assertThat(inputConfig.getFileType()).isInstanceOfSatisfying(TextFileType.class, textFileType -> {
                assertThat(textFileType.getDelimiter()).isEqualTo("\t");
                assertThat(textFileType.isIndexSeparated()).isFalse();
            });

            assertThat(inputConfig.getDefaultValues()).isNotNull().isEmpty();
        });

        assertThat(result.getTransformations()).hasSize(3).satisfies(transformations -> {
            assertThat(transformations).element(0).isInstanceOfSatisfying(SimpleMapping.class, simpleMapping -> {
                assertThat(simpleMapping.isReplaceOutputValue()).isFalse();
                assertThat(simpleMapping.getCondition()).isNull();
            });
            assertThat(transformations).element(1).isInstanceOfSatisfying(HierarchicalMapping.class, simpleMapping -> {
                assertThat(simpleMapping.isReplaceOutputValue()).isFalse();
                assertThat(simpleMapping.getCondition()).isNull();
            });

            assertThat(transformations).element(2).isInstanceOfSatisfying(Calculation.class, simpleMapping -> {
                assertThat(simpleMapping.isReplaceOutputValue()).isFalse();
                assertThat(simpleMapping.getCondition()).isNull();
            });
        });
    }

    /**
     * Validate we map the correct value and location in a DefaultValue
     */
    @Test
    public void testDefaultValueMappingBehaviourWithFixedValues() throws Exception {
        App.ConfigurationFactory configurationFactory = new App.ConfigurationFactory();
        var result = configurationFactory.createConfiguration(loadProcessorOptions("sample", Map.of(INPUT, "input-with-defaults.json")));

        assertThat(result.getInputConfig().getDefaultValues()).satisfies(defaultValues -> {
            assertThat(defaultValues.get(0)).satisfies(firstDefaultValue -> {
                assertThat(firstDefaultValue.getField()).isEqualTo("Some Field");
                assertThat(firstDefaultValue.getInputTypeInformation().getType()).isEqualTo("STRING");
                assertThat(firstDefaultValue.getLocation()).isNotNull().satisfies(location -> {
                    assertThat(location.row()).isEqualTo(1);
                    assertThat(location.column()).isEqualTo(9);
                });
                assertThat(firstDefaultValue.getValue()).isNull();
            });
            assertThat(defaultValues.get(1)).satisfies(secondDefaultValue -> {
                assertThat(secondDefaultValue.getField()).isEqualTo("Some other field");
                assertThat(secondDefaultValue.getInputTypeInformation().getType()).isEqualTo("STRING");
                assertThat(secondDefaultValue.getLocation()).isNull();
                assertThat(secondDefaultValue.getValue()).isEqualTo("Hello there!");
            });
        });
    }

    /*
     * File Type Input Config cases
     */

    @Test
    public void testCsvInputConfig() throws Exception {
        App.ConfigurationFactory configurationFactory = new App.ConfigurationFactory();
        var result = configurationFactory.createConfiguration(loadProcessorOptions("sample", Map.of(INPUT, "input-csv.json")));

        assertThat(result.getInputConfig()).satisfies(inputConfig ->
                assertThat(inputConfig.getFileType()).isInstanceOfSatisfying(CSVFileType.class, csvFileType -> {
                    assertThat(csvFileType.getDelimiter()).isEqualTo(":");
                    assertThat(csvFileType.getStartingRow()).isEqualTo(4);
                    assertThat(csvFileType.getStartingColumn()).isEqualTo(3);
                    assertThat(csvFileType.getEncoding()).isEqualTo(CharacterEncoding.UTF_8);
                    assertThat(csvFileType.isIndexSeparated()).isFalse();
                }));
    }

    @Test
    public void testXlsInputConfig() throws Exception {
        App.ConfigurationFactory configurationFactory = new App.ConfigurationFactory();
        var result = configurationFactory.createConfiguration(loadProcessorOptions("sample", Map.of(INPUT, "input-xls.json")));

        assertThat(result.getInputConfig()).satisfies(inputConfig ->
                assertThat(inputConfig.getFileType()).isInstanceOfSatisfying(XLSFileType.class, csvFileType -> {
                    assertThat(csvFileType.getStartingRow()).isEqualTo(12);
                    assertThat(csvFileType.getStartingColumn()).isEqualTo(15);
                    assertThat(csvFileType.getTab()).isEqualTo(1);
                }));
    }

    @Test
    public void testXlsxInputConfig() throws Exception {
        App.ConfigurationFactory configurationFactory = new App.ConfigurationFactory();
        var result = configurationFactory.createConfiguration(loadProcessorOptions("sample", Map.of(INPUT, "input-xlsx.json")));

        assertThat(result.getInputConfig()).satisfies(inputConfig ->
                assertThat(inputConfig.getFileType()).isInstanceOfSatisfying(XLSXFileType.class, csvFileType -> {
                    assertThat(csvFileType.getStartingRow()).isEqualTo(100);
                    assertThat(csvFileType.getStartingColumn()).isEqualTo(130);
                    assertThat(csvFileType.getTab()).isEqualTo(2);
                }));
    }

    @Test
    public void testXlsbInputConfig() throws Exception {
        App.ConfigurationFactory configurationFactory = new App.ConfigurationFactory();
        var result = configurationFactory.createConfiguration(loadProcessorOptions("sample", Map.of(INPUT, "input-xlsb.json")));

        assertThat(result.getInputConfig()).satisfies(inputConfig ->
                assertThat(inputConfig.getFileType()).isInstanceOfSatisfying(XLSBFileType.class, csvFileType -> {
                    assertThat(csvFileType.getStartingRow()).isEqualTo(42);
                    assertThat(csvFileType.getStartingColumn()).isEqualTo(53);
                    assertThat(csvFileType.getTab()).isEqualTo(3);
                }));
    }

    /**
     * Validate the default separator for CSV is comma
     */
    @Test
    public void testSeparatorDefaultingForCSV() throws Exception {
        App.ConfigurationFactory configurationFactory = new App.ConfigurationFactory();
        var result = configurationFactory.createConfiguration(loadProcessorOptions("using-defaults", Map.of(INPUT, "input-csv.json")));

        assertThat(result.getInputConfig().getFileType()).isInstanceOfSatisfying(CSVFileType.class, textFileType ->
                assertThat(textFileType.getDelimiter()).isEqualTo(","));
    }

    private ProcessorOptions loadProcessorOptions(String folder) throws IOException {
        var processorOptions = mock(ProcessorOptions.class);
        var configurationNode = MAPPER.createObjectNode();

        configurationNode.set("inputConfig", MAPPER.readTree(load(folder, "input.json")));
        configurationNode.set("inputSchema", MAPPER.readTree(load(folder, "input-schema.json")));
        configurationNode.set("transformations", MAPPER.readTree(load(folder, "transformations.json")));
        configurationNode.set("outputConfig", MAPPER.readTree(load(folder, "output.json")));
        configurationNode.set("outputSchema", MAPPER.readTree(load(folder, "output-schema.json")));

        doReturn(configurationNode.toString()).when(processorOptions).getIngestionConfiguration();
        doReturn("").when(processorOptions).getIngestionConfigurationUrl();
        return processorOptions;
    }

    private ProcessorOptions loadProcessorOptions(String folder, Map<String, String> fileNames) throws IOException {
        var processorOptions = mock(ProcessorOptions.class);
        var configurationNode = MAPPER.createObjectNode();

        // Find what parts of the configuration we want to load.
        String inputConfig = fileNames.get(INPUT) != null ? fileNames.get(INPUT) : "input.json";
        String inputSchema = fileNames.get(INPUT_SCHEMA) != null ? fileNames.get(INPUT_SCHEMA) : "input-schema.json";
        String transformations = fileNames.get(TRANSFORMATIONS) != null ? fileNames.get(TRANSFORMATIONS) : "transformations.json";
        String outputConfig = fileNames.get(OUTPUT) != null ? fileNames.get(OUTPUT) : "output.json";
        String outputSchema = fileNames.get(OUTPUT_SCHEMA) != null ? fileNames.get(OUTPUT_SCHEMA) : "output-schema.json";

        configurationNode.set("inputConfig", MAPPER.readTree(load(folder, inputConfig)));
        configurationNode.set("inputSchema", MAPPER.readTree(load(folder, inputSchema)));
        configurationNode.set("transformations", MAPPER.readTree(load(folder, transformations)));
        configurationNode.set("outputConfig", MAPPER.readTree(load(folder, outputConfig)));
        configurationNode.set("outputSchema", MAPPER.readTree(load(folder, outputSchema)));

        doReturn(configurationNode.toString()).when(processorOptions).getIngestionConfiguration();
        doReturn("").when(processorOptions).getIngestionConfigurationUrl();
        return processorOptions;
    }

    private String load(String folder, String fileName) throws IOException {
        String filePath = "/configuration/" + folder + "/" + fileName;
        try (var fileStream = ConfigurationTest.class.getResourceAsStream(filePath)) {
            if (fileStream == null) throw new IOException("No file found at path: " + filePath);
            return new String(fileStream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static class InputSchemaPredicate implements Predicate<InputColumnSchema<?>> {

        private final String field;
        private final String type;
        private final int characters;
        private final String dateFormat;

        public InputSchemaPredicate(@Nonnull String field, @Nonnull String type, int characters, String dateFormat) {
            this.field = field;
            this.type = type;
            this.characters = characters;
            this.dateFormat = dateFormat;
        }

        public InputSchemaPredicate(@Nonnull String field, @Nonnull String type) {
            this(field, type, 0, null);
        }

        public InputSchemaPredicate(@Nonnull String field, @Nonnull String type, int characters) {
            this(field, type, characters, null);
        }

        public InputSchemaPredicate(@Nonnull String field, @Nonnull String type, String dateFormat) {
            this(field, type, 0, dateFormat);
        }

        @Override
        public boolean test(InputColumnSchema value) {

            boolean fieldCheck = true;
            if (value instanceof NonNullInputColumnSchema<?> nonNullDataCell) {
                fieldCheck = nonNullDataCell.getField().equals(field);
            }

            boolean dateCheck = true;
            if (value instanceof DateInputColumnSchema dateIcs) {
                dateCheck = Objects.equals(dateFormat, dateIcs.getTypeInformation().getDateFormat());
            }

            return fieldCheck
                    && type.equalsIgnoreCase(value.getTypeInformation().getType())
                    && Objects.equals(value.getCharacters(), characters)
                    && dateCheck;
        }
    }

    private static class OutputSchemaPredicate implements Predicate<OutputColumnSchema<?>> {

        private final String field;
        private final String type;
        private final String dateFormat;

        public OutputSchemaPredicate(String field, String type, String dateFormat) {
            this.field = field;
            this.type = type;
            this.dateFormat = dateFormat;
        }

        public OutputSchemaPredicate(String field, String type) {
            this(field, type, null);
        }

        @Override
        public boolean test(OutputColumnSchema value) {
            // If the output column schema is for dates, validate that the dates match
            boolean dateFormatsMatch = true;
            if (value instanceof DateColumnSchema dateColumn) {
                dateFormatsMatch = Objects.equals(dateColumn.getDateFormat(), dateFormat);
            }

            return Objects.equals(value.getField(), field)
                    && Objects.equals(value.getType(), type)
                    && dateFormatsMatch;
        }
    }

    private static class ConditionPredicate implements Predicate<AbstractCondition> {

        private final String type;
        private final boolean not;
        private final String leftValueFieldName;
        private final Integer leftValueColumnIndex;
        private final Object leftFixedValue;
        private final StringDataWrapper rightValue;

        public ConditionPredicate(
                String type,
                boolean not,
                String leftValueFieldName,
                Integer leftValueColumnIndex,
                Serializable leftFixedValue,
                String rightValue
        ) {
            this.type = type;
            this.not = not;
            this.leftValueFieldName = leftValueFieldName;
            this.leftValueColumnIndex = leftValueColumnIndex;
            this.leftFixedValue = leftFixedValue;
            this.rightValue = asString(rightValue);
        }

        @Override
        public boolean test(AbstractCondition value) {
            return Objects.equals(value.getType(), type)
                    && value.isNot() == not
                    && Objects.equals(value.getLeftValueFieldName(), leftValueFieldName)
                    && Objects.equals(value.getLeftValueColumnIndex(), leftValueColumnIndex)
                    && Objects.equals(value.getLeftFixedValue(), leftFixedValue)
                    && Objects.equals(value.getRightValue(), rightValue);
        }

        public static ConditionPredicate fromField(String calculationType, boolean not, String fieldName, String rightValue) {
            return new ConditionPredicate(calculationType, not, fieldName, null, null, rightValue);
        }

        public static ConditionPredicate fromField(String calculationType, boolean not, String fieldName) {
            return fromField(calculationType, not, fieldName, null);
        }

        public static ConditionPredicate fromColumn(String calculationType, boolean not, Integer columnIndex, String rightValue) {
            return new ConditionPredicate(calculationType, not, null, columnIndex, null, rightValue);
        }

        public static ConditionPredicate fromColumn(String calculationType, boolean not, Integer columnIndex) {
            return fromColumn(calculationType, not, columnIndex, null);
        }

        public static ConditionPredicate fromFixed(String calculationType, boolean not, Serializable value, String rightValue) {
            return new ConditionPredicate(calculationType, not, null, null, value, rightValue);
        }

        public static ConditionPredicate fromFixed(String calculationType, boolean not, Serializable value) {
            return fromFixed(calculationType, not, value, null);
        }
    }

    private static class EquationPredicate implements Predicate<Equation> {

        private final String calculationType;
        private final String equationValueFieldName;
        private final Integer equationValueColumnIndex;
        private final Serializable equationFixedValue;

        public EquationPredicate(
                String calculationType,
                String equationValueFieldName,
                Integer equationValueColumnIndex,
                Serializable equationFixedValue
        ) {
            this.calculationType = calculationType;
            this.equationValueFieldName = equationValueFieldName;
            this.equationValueColumnIndex = equationValueColumnIndex;
            this.equationFixedValue = equationFixedValue;
        }

        @Override
        public boolean test(Equation value) {
            return Objects.equals(value.getCalculationType(), calculationType)
                    && Objects.equals(value.getEquationFieldName(), equationValueFieldName)
                    && Objects.equals(value.getEquationColumnIndex(), equationValueColumnIndex)
                    && Objects.equals(value.getEquationFixedValue(), equationFixedValue);
        }

        public static EquationPredicate fromField(String calculationType, String fieldName) {
            return new EquationPredicate(calculationType, fieldName, null, null);
        }

        public static EquationPredicate fromColumn(String calculationType, Integer columnIndex) {
            return new EquationPredicate(calculationType, null, columnIndex, null);
        }

        public static EquationPredicate fromFixed(String calculationType, Serializable value) {
            return new EquationPredicate(calculationType, null, null, value);
        }
    }
}
