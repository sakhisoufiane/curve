package com.curve.pojos.output.config;

import com.curve.configuration.Configuration;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.apache.beam.sdk.io.TextIO;
import org.apache.beam.sdk.values.PCollection;

import javax.annotation.Nonnull;
import java.util.Objects;

public class ShardedGCSOutputConfig extends GCSOutputConfig {
    @Nonnull
    private final String fileNamePrefix;

    @JsonCreator
    public ShardedGCSOutputConfig(
            @JsonProperty(value = "type", required = true) @Nonnull String type,
            @JsonProperty(value = "fileType", required = true) @Nonnull String fileType,
            @JsonProperty(value = "bucketName", required = true) @Nonnull String bucketName,
            @JsonProperty(value = "fileNamePrefix", required = true) @Nonnull String fileNamePrefix
    ) {
        super(type, fileType, bucketName);
        this.fileNamePrefix = fileNamePrefix;
    }

    @Override
    public void outputData(PCollection<String> data, Configuration configuration) {
        data.apply(TextIO.write()
                .to(getBucketName() + "/" + fileNamePrefix)
                .withSuffix("." + getFileType()));
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        if (!super.equals(o)) return false;
        ShardedGCSOutputConfig that = (ShardedGCSOutputConfig) o;
        return Objects.equals(fileNamePrefix, that.fileNamePrefix);
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), fileNamePrefix);
    }

    @Override
    public String toString() {
        return "ShardedGCSOutputConfig{" +
                "fileNamePrefix='" + fileNamePrefix + '\'' +
                "} " + super.toString();
    }
}
