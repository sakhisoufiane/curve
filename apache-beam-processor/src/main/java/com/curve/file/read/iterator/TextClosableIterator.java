package com.curve.file.read.iterator;

import com.curve.pojos.input.config.source.FileSource;
import com.curve.pojos.input.config.type.AbstractTextFileType;

import javax.annotation.Nonnull;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

/**
 * A Closable Iterator for reading a Text file, and returning the rows in the Excel sheet.
 */
public class TextClosableIterator implements ClosableIterator<String> {

    private final BufferedReader inputReader;
    private String currentLine;

    public TextClosableIterator(
            @Nonnull FileSource fileSource,
            @Nonnull AbstractTextFileType fileType
    ) throws IOException {
        this.inputReader = new BufferedReader(new InputStreamReader(
                fileSource.getInputStream(),
                fileType.getEncoding().getCharset()
        ));
    }

    @Override
    public void close() throws IOException {
        if (this.inputReader != null) {
            this.inputReader.close();
        }
    }

    @Override
    public boolean hasNext() throws IOException {
        currentLine = inputReader.readLine();
        return currentLine != null;
    }

    @Override
    public String next() {
        return currentLine;
    }
}
