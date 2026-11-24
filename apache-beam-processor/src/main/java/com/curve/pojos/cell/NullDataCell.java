package com.curve.pojos.cell;

import com.curve.pojos.data.DataWrapper;

import javax.annotation.Nullable;

public final class NullDataCell implements DataCell {

    public static final NullDataCell INSTANCE = new NullDataCell();

    @Nullable
    @Override
    public DataWrapper<?> getDataWrapper() {
        return null;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        return o != null && getClass() == o.getClass();
    }

    @Override
    public int hashCode() {
        return 0;
    }

    @Override
    public String toString() {
        return "NullDataCell{}";
    }
}
