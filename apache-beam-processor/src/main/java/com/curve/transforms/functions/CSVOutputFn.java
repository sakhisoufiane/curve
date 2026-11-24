package com.curve.transforms.functions;

import com.curve.configuration.Configuration;
import com.curve.pojos.cell.DataCell;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.output.schemas.*;
import org.apache.beam.sdk.transforms.DoFn;

import javax.annotation.Nonnull;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class CSVOutputFn extends DoFn<DataRow, String> {

    private final Configuration configuration;

    public CSVOutputFn(Configuration configuration) {
        this.configuration = configuration;
    }

    @ProcessElement
    public void processElement(ProcessContext c) {
        DataRow dataRow = Objects.requireNonNull(c.element());
        List<OutputColumnSchema<?>> outputColumnSchemas = configuration.getOutputSchemas();

        ArrayList<String> line = new ArrayList<>();
        for (OutputColumnSchema<?> column : outputColumnSchemas) {
            DataCell dataCell = dataRow.getDataCellFromFieldName(column.getField());

            String data = dataCell != null ? getDataAsString(column, dataCell) : null;

            line.add(data != null ? data : "");
        }
        c.output(String.join(",", line));
    }

    private static String getDataAsString(@Nonnull OutputColumnSchema<?> column, @Nonnull DataCell dataCell) {
        switch (column) {
            case BooleanColumnSchema boolCol -> {
                var data = boolCol.coerceToType(dataCell);
                return data == null ? "" : String.valueOf(data);
            }
            case DateColumnSchema dateCol -> {
                var data = dateCol.coerceToType(dataCell);
                return data == null ? "" : dateCol.getFormatter().format(data);
            }
            case IntegerColumnSchema intCol -> {
                var data = intCol.coerceToType(dataCell);
                return data == null ? "" : String.valueOf(data);
            }
            case NumericOutputSchema numCol -> {
                var data = numCol.coerceToType(dataCell);
                return data == null ? "" : data.toPlainString();
            }
            case VarcharColumnSchema strCol -> {
                var data = strCol.coerceToType(dataCell);
                return data == null ? "" : data;
            }
        }
    }
}
