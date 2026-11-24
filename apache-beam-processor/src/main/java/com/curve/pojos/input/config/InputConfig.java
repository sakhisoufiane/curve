package com.curve.pojos.input.config;

import com.curve.pojos.DefaultValue;
import com.curve.pojos.input.config.source.FileSource;
import com.curve.pojos.input.config.type.FileType;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.util.*;

public class InputConfig implements Serializable {

    @Nonnull
    private final FileType fileType;
    @Nonnull
    private final FileSource fileSource;
    @Nonnull
    private final List<DefaultValue> defaultValues;
    @Nullable
    private final ProRataConfiguration proRata;

    @JsonCreator
    public InputConfig(
        @JsonProperty(value = "fileType", required = true) @Nonnull FileType fileType,
        @JsonProperty(value = "fileSource", required = true) @Nonnull FileSource fileSource,
        @JsonProperty(value = "defaultValues") @Nullable List<DefaultValue> defaultValues,
        @JsonProperty(value = "proRata") @Nullable ProRataConfiguration proRata
    ) {
        this.fileType = fileType;
        this.fileSource = fileSource;
        this.defaultValues = defaultValues != null ? defaultValues : Collections.emptyList();
        this.proRata = proRata;
    }

    @Nonnull
    public FileType getFileType() {
        return fileType;
    }

    @Nonnull
    public FileSource getFileSource() {
        return fileSource;
    }

    @Nonnull
    public List<DefaultValue> getDefaultValues() {
        return this.defaultValues;
    }

    @Nullable
    public ProRataConfiguration getProRata() {
        return proRata;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        InputConfig that = (InputConfig) o;
        return Objects.equals(fileType, that.fileType) &&
                Objects.equals(fileSource, that.fileSource) &&
                Objects.equals(defaultValues, that.defaultValues) &&
                Objects.equals(proRata, that.proRata);
    }

    @Override
    public int hashCode() {
        return Objects.hash(fileType, fileSource, defaultValues, proRata);
    }

    @Override
    public String toString() {
        return "InputConfig{" +
                "fileType=" + fileType +
                ", fileSource=" + fileSource +
                ", defaultValues=" + defaultValues +
                ", proRata=" + proRata +
                '}';
    }
}
