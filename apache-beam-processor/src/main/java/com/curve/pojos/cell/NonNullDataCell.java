package com.curve.pojos.cell;

import com.curve.pojos.data.DataWrapper;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.Objects;

public final class NonNullDataCell implements DataCell {
    private final String field;

    private final DataWrapper<?> data;

    public NonNullDataCell(@Nonnull String field, @Nullable DataWrapper<?> data) {
        this.field = field;
        this.data = data;
    }

    public NonNullDataCell(@Nonnull NonNullDataCell original) {
        this.field = original.getField();
        this.data = original.getDataWrapper();
    }

    @Nonnull
    public String getField() {
        return this.field;
    }

    @Nullable
    public DataWrapper<?> getDataWrapper() {
        return this.data;
    }

    @Override
    public boolean equals(final Object o) {
        if (this == o) return true;
        if (null == o || this.getClass() != o.getClass()) return false;
        final NonNullDataCell dataCell = (NonNullDataCell) o;
        return Objects.equals(this.field, dataCell.field) &&
                Objects.equals(this.data, dataCell.data);
    }

    @Override
    public int hashCode() {
        return Objects.hash(this.field, this.data);
    }

    @Override
    public String toString() {
        return "NonNullDataCell{" +
                "field='" + field + '\'' +
                ", data=" + data +
                '}';
    }
}
