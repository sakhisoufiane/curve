package com.curve.pojos.input.config.type;

import java.util.Objects;

public sealed abstract class AbstractExcelFileType extends AbstractFileType permits XLSBFileType, XLSFileType, XLSXFileType {

    private final int tab;

    protected AbstractExcelFileType(int startingRow, int startingColumn, int tab) {
        super(startingRow, startingColumn);
        this.tab = tab;
    }

    public int getTab() {
        return tab;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        if (!super.equals(o)) return false;
        AbstractExcelFileType that = (AbstractExcelFileType) o;
        return tab == that.tab;
    }

    @Override
    public int hashCode() {
        return Objects.hash(super.hashCode(), tab);
    }

    @Override
    public String toString() {
        return "AbstractExcelFileType{" +
                "tab=" + tab +
                "} " + super.toString();
    }
}
