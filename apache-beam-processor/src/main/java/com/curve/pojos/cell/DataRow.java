package com.curve.pojos.cell;

import com.curve.pojos.data.DataWrapper;
import org.apache.beam.sdk.coders.DefaultCoder;
import org.apache.beam.sdk.extensions.kryo.KryoCoder;

import javax.annotation.Nullable;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@DefaultCoder(KryoCoder.class)
public class DataRow implements Serializable {

    private final List<? extends DataCell> data;

    private final List<? extends DataCell> originalData;

    public DataRow(List<? extends DataCell> data, List<? extends DataCell> originalData) {
        // TODO should ideally be unmodifiable, required for Kryo
        this.data = data;
        this.originalData = originalData;
    }

    public DataCell get(int index) {
        return data.get(index);
    }

    public int size() {
        return data.size();
    }

    public List<? extends DataCell> getData() {
        return data;
    }

    public List<? extends DataCell> getOriginalData() {
        return originalData;
    }

    @Override
    public boolean equals(final Object o) {
        if (this == o) return true;
        if (null == o || this.getClass() != o.getClass()) return false;
        final DataRow dataRow = (DataRow) o;
        return Objects.equals(this.data, dataRow.data);
    }

    @Override
    public int hashCode() {
        return Objects.hash(this.data);
    }

    @Override
    public String toString() {
        return "DataRow{" +
                "data=" + data +
                '}';
    }

    /**
     * Find the Data Cell by the given field name
     *
     * @param field The field name to find
     * @return The DataCell. Null if the field could not be found
     */
    @Nullable
    public DataCell getDataCellFromFieldName(String field) {
        for (DataCell cell : this.data) {
            if (cell instanceof NonNullDataCell nndc && nndc.getField().equals(field)) {
                return cell;
            }
        }
        return null;
    }

    /**
     * Look up the wrapper of some Data Cell by the given field name, and return the wrapper
     *
     * @param field The field name to find
     * @return The wrapper from the cell. Null if the field could not be found.
     */
    @Nullable
    public DataWrapper<?> getDataWrapperFromField(String field) {
        var dataCell = getDataCellFromFieldName(field);
        return dataCell != null ? dataCell.getDataWrapper() : null;
    }

    public static class Factory {
        public static DataRow createFromInputData(List<DataCell> originalData) {
            return new DataRow(originalData, originalData);
        }

        public static DataRow createFromExistingRowWithNewCell(DataRow dataRow, DataCell newCell) {
            List<DataCell> newCells = new ArrayList<>(dataRow.data);
            newCells.add(newCell);
            return new DataRow(newCells, dataRow.originalData);
        }

        public static DataRow createFromExistingRowWithReplacementCell(DataRow dataRow, DataCell originalCell, DataCell newCell) {
            List<DataCell> newCells = new ArrayList<>(dataRow.data);

            var index = newCells.indexOf(originalCell);
            newCells.remove(index);
            newCells.add(index, newCell);

            return new DataRow(newCells, dataRow.originalData);
        }
    }
}
