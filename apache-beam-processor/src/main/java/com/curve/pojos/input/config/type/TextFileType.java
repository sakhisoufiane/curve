package com.curve.pojos.input.config.type;

import com.curve.exceptions.ValidationException;
import com.curve.file.read.FileTypeHandler;
import com.curve.file.read.TextFileTypeHandler;
import com.curve.pojos.input.config.CharacterEncoding;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.Objects;

public final class TextFileType extends AbstractTextFileType {

    private static final String TXT_DELIMITER_DEFAULT = "\t";
    public static final String TYPE = "TXT";

    private final boolean indexSeparated;

    public TextFileType(
            @Nonnull String delimiter,
            int startingRow,
            int startingColumn,
            @Nonnull CharacterEncoding encoding,
            boolean indexSeparated
    ) {
        super(delimiter, startingRow, startingColumn, encoding);
        this.indexSeparated = indexSeparated;
    }

    @JsonCreator
    public TextFileType(
            @JsonProperty("delimiter") @Nullable String delimiter,
            @JsonProperty("startingRow") int startingRow,
            @JsonProperty("startingColumn") int startingColumn,
            @JsonProperty("encoding") @Nullable String encoding,
            @JsonProperty("indexSeparated") boolean indexSeparated
    ) throws ValidationException {
        this(
                delimiter != null ? delimiter : TXT_DELIMITER_DEFAULT,
                startingRow,
                startingColumn,
                encoding != null ? CharacterEncoding.forName(encoding) : CharacterEncoding.UTF_8,
                indexSeparated
        );
    }

    @Nonnull
    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    public boolean isIndexSeparated() {
        return indexSeparated;
    }

    @Nonnull
    @Override
    public FileTypeHandler getFileTypeHandler() {
        return new TextFileTypeHandler(this);
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        if (!super.equals(o)) return false;
        TextFileType that = (TextFileType) o;
        return indexSeparated == that.indexSeparated;
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), indexSeparated);
    }

    @Override
    public String toString() {
        return "TextFileType{" +
                "indexSeparated=" + indexSeparated +
                "} " + super.toString();
    }
}
