package com.curve.pojos.input.config.type;

import com.curve.pojos.input.config.CharacterEncoding;

import javax.annotation.Nonnull;
import java.util.Objects;

public sealed abstract class AbstractTextFileType extends AbstractFileType permits CSVFileType, TextFileType {

    @Nonnull
    private final String delimiter;
    @Nonnull
    private final CharacterEncoding encoding;

    public AbstractTextFileType(
            @Nonnull String delimiter,
            int startingRow,
            int startingColumn,
            @Nonnull CharacterEncoding encoding
    ) {
        super(startingRow, startingColumn);
        this.delimiter = delimiter;
        this.encoding = encoding;
    }

    @Nonnull
    public String getDelimiter() {
        return delimiter;
    }

    @Nonnull
    public CharacterEncoding getEncoding() {
        return encoding;
    }

    public abstract boolean isIndexSeparated();

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        if (!super.equals(o)) return false;
        AbstractTextFileType that = (AbstractTextFileType) o;
        return Objects.equals(delimiter, that.delimiter) && encoding == that.encoding;
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), delimiter, encoding);
    }

    @Override
    public String toString() {
        return "AbstractTextFileType{" +
                "delimiter='" + delimiter + '\'' +
                ", encoding=" + encoding +
                "} " + super.toString();
    }
}
