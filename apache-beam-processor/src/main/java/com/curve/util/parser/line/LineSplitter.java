package com.curve.util.parser.line;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.io.Serializable;

/**
 * An object that splits a line of data into it's constituent parts
 * 
 * @param <I> The input type that represents the row of data
 * @param <O> The type of object once split
 */
public interface LineSplitter<I, O> extends Serializable {
    @Nonnull
    O[] split(@Nonnull I line) throws IOException;
}
