package com.curve.pojos.output.config;

import com.curve.configuration.Configuration;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import org.apache.beam.sdk.values.PCollection;

import javax.annotation.Nonnull;
import java.io.Serializable;
import java.util.Objects;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type", visible = true)
@JsonSubTypes({
        @JsonSubTypes.Type(value = UnshardedGCSOutputConfig.class, name = "Unsharded GCS"),
        @JsonSubTypes.Type(value = ShardedGCSOutputConfig.class, name = "Sharded GCS")
})
public abstract class OutputConfig implements Serializable {

    @Nonnull
    private final String type;
    @Nonnull
    private final String fileType;

    public OutputConfig(@Nonnull String type, @Nonnull String fileType) {
        this.type = type;
        this.fileType = fileType;
    }

    public abstract void outputData(PCollection<String> data, Configuration configuration);

    @Nonnull
    public String getType() {
        return this.type;
    }

    @Nonnull
    public String getFileType() {
        return this.fileType;
    }

    @Override
    public boolean equals(final Object o) {
        if (this == o) return true;
        if (null == o || this.getClass() != o.getClass()) return false;
        final OutputConfig that = (OutputConfig) o;
        return Objects.equals(this.type, that.type) && Objects.equals(this.fileType, that.fileType);
    }

    @Override
    public int hashCode() {
        return Objects.hash(this.type, this.fileType);
    }

    @Override
    public String toString() {
        return "OutputConfig{" +
                "type='" + type + '\'' +
                ", fileType='" + fileType + '\'' +
                '}';
    }
}
