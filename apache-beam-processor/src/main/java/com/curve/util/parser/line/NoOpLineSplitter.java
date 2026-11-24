package com.curve.util.parser.line;

import javax.annotation.Nonnull;
import java.io.IOException;

/**
 * A LineSplitter which simply returns what it is given.
 */
public class NoOpLineSplitter<T> implements LineSplitter<T[], T> {
    @Nonnull
    @Override
    public T[] split(@Nonnull T[] line) throws IOException {
        return line;
    }
}
