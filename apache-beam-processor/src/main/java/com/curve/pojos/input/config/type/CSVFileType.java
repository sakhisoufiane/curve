package com.curve.pojos.input.config.type;

import com.curve.exceptions.ValidationException;
import com.curve.file.read.FileTypeHandler;
import com.curve.file.read.TextFileTypeHandler;
import com.curve.pojos.input.config.CharacterEncoding;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;

public final class CSVFileType extends AbstractTextFileType {

    private static final String CSV_DELIMITER_DEFAULT = ",";
    public static final String TYPE = "CSV";

    public CSVFileType(
            @Nonnull String delimiter,
            int startingRow,
            int startingColumn,
            @Nonnull CharacterEncoding encoding
    ) {
        super(delimiter, startingRow, startingColumn, encoding);
    }

    @JsonCreator
    public CSVFileType(
            @JsonProperty("delimiter") @Nullable String delimiter,
            @JsonProperty("startingRow") int startingRow,
            @JsonProperty("startingColumn") int startingColumn,
            @JsonProperty("encoding") @Nullable String encoding
    ) throws ValidationException {
        this(
                delimiter != null ? delimiter : CSV_DELIMITER_DEFAULT,
                startingRow,
                startingColumn,
                encoding != null ? CharacterEncoding.forName(encoding) : CharacterEncoding.UTF_8
        );
    }

    @Nonnull
    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    public boolean isIndexSeparated() {
        return false;
    }

    @Nonnull
    @Override
    public FileTypeHandler getFileTypeHandler() {
        return new TextFileTypeHandler(this);
    }
}
