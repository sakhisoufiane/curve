package com.curve.file.read.iterator;

import java.io.Closeable;

/**
 * An interface which represents an iterator that can be closed after use. Typically used to wrap
 * some file reader implementation.
 */
public interface ClosableIterator<T> extends Closeable, ReaderIterator<T> {}
