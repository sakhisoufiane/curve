package com.curve.pojos.input.config.type;

import com.curve.file.read.FileTypeHandler;
import com.curve.file.read.XLSBFileTypeHandler;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;

public final class XLSBFileType extends AbstractExcelFileType {

    public static final String TYPE = "XLSB";

    @JsonCreator
    public XLSBFileType(
            @JsonProperty("startingRow") int startingRow,
            @JsonProperty("startingColumn") int startingColumn,
            @JsonProperty("tab") int tab
    ) {
        super(startingRow, startingColumn, tab);
    }

    @Nonnull
    @Override
    public String getType() {
        return TYPE;
    }

    @Nonnull
    @Override
    public FileTypeHandler getFileTypeHandler() {
        return new XLSBFileTypeHandler(this);
    }
}
