package com.curve.pojos.output.config;

import com.fasterxml.jackson.annotation.JsonCreator;

import javax.annotation.Nonnull;
import java.util.Objects;

public abstract class GCSOutputConfig extends OutputConfig {

    private final String bucketName;

    @JsonCreator
    public GCSOutputConfig(@Nonnull String type, @Nonnull String fileType, @Nonnull String bucketName) {
        super(type, fileType);
        this.bucketName = bucketName;
    }

    @Nonnull
    public String getBucketName() {
        return this.bucketName;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        if (!super.equals(o)) return false;
        GCSOutputConfig that = (GCSOutputConfig) o;
        return Objects.equals(bucketName, that.bucketName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), bucketName);
    }

    @Override
    public String toString() {
        return "GCSOutputConfig{" +
                "bucketName='" + bucketName + '\'' +
                "} " + super.toString();
    }
}
