package com.curve.pojos.output.config;

import com.curve.configuration.Configuration;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.apache.beam.sdk.io.TextIO;
import org.apache.beam.sdk.values.PCollection;

import javax.annotation.Nonnull;
import java.util.Objects;

public class UnshardedGCSOutputConfig extends GCSOutputConfig {
    @Nonnull
    private final String fileName;

    @JsonCreator
    public UnshardedGCSOutputConfig(
            @JsonProperty(value = "type", required = true) @Nonnull String type,
            @JsonProperty(value = "fileType", required = true) @Nonnull String fileType,
            @JsonProperty(value = "bucketName", required = true) @Nonnull String bucketName,
            @JsonProperty(value = "fileName", required = true) @Nonnull String fileName
    ) {
        super(type, fileType, bucketName);
        this.fileName = fileName;
    }

    @Nonnull
    public String getFileName() {
        return fileName;
    }

    @Override
    public void outputData(PCollection<String> data, Configuration configuration) {
        data.apply(TextIO.write()
                .to(getBucketName() + "/" + fileName)
                .withoutSharding()
                .withSuffix("." + getFileType()));
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        if (!super.equals(o)) return false;
        UnshardedGCSOutputConfig that = (UnshardedGCSOutputConfig) o;
        return Objects.equals(fileName, that.fileName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), fileName);
    }

    @Override
    public String toString() {
        return "UnshardedGCSOutputConfig{" +
                "fileName='" + fileName + '\'' +
                "} " + super.toString();
    }
}
