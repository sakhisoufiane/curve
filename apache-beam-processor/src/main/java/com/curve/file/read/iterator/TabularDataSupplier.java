package com.curve.file.read.iterator;

import java.io.IOException;

/**
 * Provides a ClosableIterator, which contain tabular data to process.
 * @param <T> The type of data that is provided from the ClosableIterator
 */
@FunctionalInterface
public interface TabularDataSupplier<T> {
    ClosableIterator<T> get() throws IOException;
}
