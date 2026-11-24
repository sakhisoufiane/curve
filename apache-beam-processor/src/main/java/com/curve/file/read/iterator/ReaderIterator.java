package com.curve.file.read.iterator;

import java.io.IOException;
import java.util.NoSuchElementException;

/**
 * An iterator, which is permitted to throw IOExceptions when checking for a next value, and fetching that value
 * 
 * @see java.util.Iterator
 * @param <T> the type of elements returned from this iterator
 */
public interface ReaderIterator<T> {
    /**
     * Returns {@code true} if the iteration has more elements.
     * (In other words, returns {@code true} if {@link #next} would
     * return an element rather than throwing an exception.)
     *
     * @return {@code true} if the iteration has more elements
     */
    boolean hasNext() throws IOException;

    /**
     * Returns the next element in the iteration.
     *
     * @return the next element in the iteration
     * @throws NoSuchElementException if the iteration has no more elements
     */
    T next() throws IOException;
}
