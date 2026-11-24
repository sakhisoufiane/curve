package com.curve.pojos.transformations.value;

import com.curve.pojos.cell.DataCell;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.List;

class ColumnValueProvider implements ValueProvider {
    private final int index;

    ColumnValueProvider(int columnIndex) {
        this.index = columnIndex;
    }

    @Nullable
    @Override
    public DataWrapper<?> provide(@Nonnull DataRow dataRow) {
        List<? extends DataCell> originalData = dataRow.getOriginalData();
        return originalData.get(index).getDataWrapper();
    }

    @Override
    public String toString() {
        return "ColumnValueProvider{" +
                "index=" + index +
                '}';
    }
}
