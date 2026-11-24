package com.curve.pojos.input.config.source;

import javax.annotation.Nonnull;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Creates a source for a file stored locally. Usually used for testing purposes
 */
public final class LocalFileSource implements TextIOSupportedFileSource {

    private final String path;

    public LocalFileSource(String path) {
        this.path = path;
    }

    @Override
    public String getTextIOURL() {
        return path;
    }

    @Nonnull
    @Override
    public String getType() {
        return "Local";
    }

    @Nonnull
    @Override
    public InputStream getInputStream() throws IOException {
        return new FileInputStream(path);
    }
}
