package com.curve.util.parser.line;

import javax.annotation.Nonnull;
import java.util.List;

/**
 * A line splitter, which splits a row of text based on fixed length columns.
 */
public class FixedIndexLineSplitter implements LineSplitter<String, String> {

    private final List<Integer> columnLengths;

    public FixedIndexLineSplitter(@Nonnull List<Integer> columnLengths) {
        this.columnLengths = columnLengths;
    }
    
    @Nonnull
    @Override
    public String[] split(@Nonnull String line) {
        String[] segments = new String[columnLengths.size()];

        int startingIndex = 0;
        for (int i = 0; i < columnLengths.size(); i++) {
            int segmentEndIndex = startingIndex + columnLengths.get(i);
            segments[i] = line.substring(startingIndex, segmentEndIndex).trim();
            startingIndex = segmentEndIndex;
        }
        return segments;
    }
}
