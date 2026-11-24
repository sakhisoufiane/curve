package com.curve.configuration;

import com.curve.pojos.input.config.InputConfig;
import com.curve.pojos.input.schemas.InputColumnSchema;
import com.curve.pojos.input.schemas.InputColumnSchemas;
import com.curve.pojos.output.config.OutputConfig;
import com.curve.pojos.output.schemas.OutputColumnSchema;
import com.curve.pojos.transformations.Transformation;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationConfig;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.Serializable;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

public class Configuration implements Serializable {

    private final InputConfig inputConfig;
    private final InputColumnSchemas inputColumnSchemas;
    private final List<Transformation> transformations;
    private final OutputConfig outputConfig;
    private final List<OutputColumnSchema<?>> outputColumnSchemas;

    @JsonCreator
    public Configuration(@JsonProperty(value = "inputConfig", required = true) InputConfig inputConfig,
                         @JsonProperty(value = "inputSchema", required = true) List<InputColumnSchema<?>> inputColumnSchemas,
                         @JsonProperty(value = "transformations", required = true) List<Transformation> transformations,
                         @JsonProperty(value = "outputConfig", required = true) OutputConfig outputConfig,
                         @JsonProperty(value = "outputSchema", required = true) List<OutputColumnSchema<?>> outputColumnSchemas) {
        this.inputConfig = inputConfig;
        this.inputColumnSchemas = new InputColumnSchemas(inputColumnSchemas);
        this.transformations = transformations;
        this.outputConfig = outputConfig;
        this.outputColumnSchemas = outputColumnSchemas;
    }

    public InputConfig getInputConfig() {
        return this.inputConfig;
    }

    public InputColumnSchemas getInputColumnSchemas() {
        return this.inputColumnSchemas;
    }

    public List<Transformation> getTransformations() {
        return this.transformations;
    }

    public OutputConfig getOutputConfig() {
        return this.outputConfig;
    }

    public List<OutputColumnSchema<?>> getOutputSchemas() {
        return this.outputColumnSchemas;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Configuration that = (Configuration) o;
        return Objects.equals(inputConfig, that.inputConfig) && Objects.equals(inputColumnSchemas, that.inputColumnSchemas) && Objects.equals(transformations, that.transformations) && Objects.equals(outputConfig, that.outputConfig) && Objects.equals(outputColumnSchemas, that.outputColumnSchemas);
    }

    @Override
    public int hashCode() {
        return Objects.hash(inputConfig, inputColumnSchemas, transformations, outputConfig, outputColumnSchemas);
    }

    @Override
    public String toString() {
        return "Configuration{" +
                "inputConfig=" + inputConfig +
                ", inputColumnSchemas=" + inputColumnSchemas +
                ", transformations=" + transformations +
                ", outputConfig=" + outputConfig +
                ", outputColumnSchemas=" + outputColumnSchemas +
                '}';
    }
}
