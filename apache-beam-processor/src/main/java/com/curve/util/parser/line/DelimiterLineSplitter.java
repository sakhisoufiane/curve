package com.curve.util.parser.line;

import javax.annotation.Nonnull;
import java.util.regex.Pattern;

/**
 * Splits a line of text on a given delimiter
 */
public class DelimiterLineSplitter implements LineSplitter<String, String> {

    private final Pattern pattern;

    public DelimiterLineSplitter(@Nonnull String delimiter) {
        this.pattern = Pattern.compile(Pattern.quote(delimiter));
    }

    @Override
    @Nonnull
    public String[] split(@Nonnull String line) {
        return pattern.split(line);
    }
}
