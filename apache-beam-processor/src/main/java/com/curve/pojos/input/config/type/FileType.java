package com.curve.pojos.input.config.type;

import com.curve.file.read.FileTypeHandler;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import javax.annotation.Nonnull;
import java.io.Serializable;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = TextFileType.class, name = TextFileType.TYPE),
        @JsonSubTypes.Type(value = CSVFileType.class, name = CSVFileType.TYPE),
        @JsonSubTypes.Type(value = XLSFileType.class, name = XLSFileType.TYPE),
        @JsonSubTypes.Type(value = XLSXFileType.class, name = XLSXFileType.TYPE),
        @JsonSubTypes.Type(value = XLSBFileType.class, name = XLSBFileType.TYPE),
})
public sealed interface FileType extends Serializable permits AbstractFileType {

    @Nonnull
    String getType();

    @Nonnull
    FileTypeHandler getFileTypeHandler();

}
