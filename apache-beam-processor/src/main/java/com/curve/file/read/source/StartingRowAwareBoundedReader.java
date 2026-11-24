package com.curve.file.read.source;

import com.curve.pojos.input.config.type.AbstractFileType;
import org.apache.beam.sdk.io.BoundedSource;

import java.io.IOException;

/**
 * A reader implementation that advances the reader to the first row defined in the InputConfiguration before reading begins
 *
 * @param <T>
 */
public abstract class StartingRowAwareBoundedReader<T, F extends AbstractFileType>
        extends BoundedSource.BoundedReader<T> {

    protected final F fileType;

    protected StartingRowAwareBoundedReader(F fileType) {
        this.fileType = fileType;
    }

    @Override
    public boolean start() throws IOException {
        // Scroll forward to the first row in the config
        var startingRow = fileType.getStartingRow();

        for (int i = 0; i < startingRow; i++) {
            var advanced = advance();
            // If we failed to advance (presumably because the sheet is smaller than the configured starting row)
            // stop scrolling and return false
            if (!advanced) return false;
        }

        return advance();
    }
}
