package com.curve.pojos.input.config.type;

import java.util.Objects;

public sealed abstract class AbstractFileType implements FileType permits AbstractExcelFileType, AbstractTextFileType {

    private final int startingRow;
    private final int startingColumn;

    protected AbstractFileType(int startingRow, int startingColumn) {
        this.startingRow = startingRow;
        this.startingColumn = startingColumn;
    }

    public int getStartingRow() {
        return startingRow;
    }

    public int getStartingColumn() {
        return startingColumn;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AbstractFileType that = (AbstractFileType) o;
        return startingRow == that.startingRow && startingColumn == that.startingColumn;
    }

    @Override
    public int hashCode() {
        return Objects.hash(startingRow, startingColumn);
    }

    @Override
    public String toString() {
        return "AbstractFileType{" +
                "startingRow=" + startingRow +
                ", startingColumn=" + startingColumn +
                '}';
    }
}
