package com.curve.pojos.input.config.source;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.io.InputStream;
import java.io.Serializable;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = GCSFileSource.class, name = GCSFileSource.TYPE),
        @JsonSubTypes.Type(value = URLFileSource.class, name = URLFileSource.TYPE)
})
public sealed interface FileSource extends Serializable permits TextIOSupportedFileSource, URLFileSource {
    @Nonnull
    String getType();

    /**
     * Returns an InputStream from where the input data can be read from.
     * Caller is responsible for closing the stream.
     *
     * @return The stream containing the input data to process
     */
    @Nonnull
    InputStream getInputStream() throws IOException;
}
