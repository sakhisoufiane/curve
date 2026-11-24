package com.curve.pojos.input.config.source;

import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;

public final class URLFileSource implements FileSource {

    public static final String TYPE = "URL";

    private final String url;

    public URLFileSource(@JsonProperty(value = "url", required = true) @Nonnull String url) {
        this.url = url;
    }

    @Nonnull
    @Override
    public String getType() {
        return TYPE;
    }

    @Nonnull
    public String getUrl() {
        return url;
    }

    @Nonnull
    @Override
    public InputStream getInputStream() throws IOException {
        URL inputURL = new URL(this.url);
        return inputURL.openStream();
    }
}
