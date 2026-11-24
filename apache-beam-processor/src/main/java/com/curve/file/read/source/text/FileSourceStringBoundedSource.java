package com.curve.file.read.source.text;

import com.curve.file.read.source.StartingRowAwareBoundedReader;
import com.curve.file.read.source.UnsplitableBoundedSource;
import com.curve.pojos.input.config.source.FileSource;
import com.curve.pojos.input.config.type.AbstractTextFileType;
import org.apache.beam.sdk.io.BoundedSource;
import org.apache.beam.sdk.options.PipelineOptions;

import javax.annotation.Nonnull;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.util.NoSuchElementException;

/**
 * Reads a file from the input stream of a FileSource, in an unsplitable fashion
 */
public class FileSourceStringBoundedSource extends UnsplitableBoundedSource<String> {
    private final FileSource fileSource;
    private final AbstractTextFileType fileType;

    public FileSourceStringBoundedSource(FileSource fileSource, AbstractTextFileType fileType) {
        this.fileSource = fileSource;
        this.fileType = fileType;
    }

    @Override
    public BoundedReader<String> createReader(@Nonnull PipelineOptions options) throws IOException {
        return new FileSourceStringBoundedReader(this, fileSource, fileType);
    }

    /**
     * Creates a Buffered reader for convenience in accessing the file.
     *
     * @param fileSource    Used to source the file to read
     * @param fileType      Holds information on how to read the file
     * @return The Buffered reader. Callers are responsible for closing the reader after use. Closing the reader will close the underlying InputStream
     */
    private static BufferedReader createInputReader(
            @Nonnull FileSource fileSource,
            @Nonnull AbstractTextFileType fileType
    ) throws IOException {
        Charset encoding = fileType.getEncoding().getCharset();
        return new BufferedReader(new InputStreamReader(fileSource.getInputStream(), encoding));
    }

    /**
     * A class for reading a File Source and producing rows as Strings
     */
    private static class FileSourceStringBoundedReader extends StartingRowAwareBoundedReader<String, AbstractTextFileType> {

        private final BoundedSource<String> source;
        private final FileSource fileSource;

        private BufferedReader reader;
        private String currentLine;

        public FileSourceStringBoundedReader(
                @Nonnull BoundedSource<String> source,
                @Nonnull FileSource fileSource,
                @Nonnull AbstractTextFileType fileType
        ) {
            super(fileType);
            this.source = source;
            this.fileSource = fileSource;
        }

        @Override
        public boolean start() throws IOException {
            this.reader = createInputReader(fileSource, fileType);
            return super.start();
        }

        @Override
        public boolean advance() throws IOException {
            currentLine = reader.readLine();
            return currentLine != null;
        }

        @Override
        public String getCurrent() throws NoSuchElementException {
            return currentLine;
        }

        @Override
        public void close() throws IOException {
            if (reader != null) {
                reader.close();
            }
        }

        @Override
        @Nonnull
        public BoundedSource<String> getCurrentSource() {
            return source;
        }
    }
}
