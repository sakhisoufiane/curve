package com.curve.pojos.input.config.type;

import com.curve.file.read.FileTypeHandler;
import com.curve.file.read.XLSFileTypeHandler;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;

public final class XLSXFileType extends AbstractExcelFileType {

    public static final String TYPE = "XLSX";

    public XLSXFileType(
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
        return new XLSFileTypeHandler(this);
    }
}
