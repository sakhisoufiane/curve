package com.curve.transforms.functions;

import com.curve.configuration.Configuration;
import com.curve.pojos.cell.DataCell;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.output.schemas.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.beam.sdk.transforms.DoFn;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.List;
import java.util.Objects;

import static com.fasterxml.jackson.core.JsonGenerator.Feature.WRITE_BIGDECIMAL_AS_PLAIN;

public class JSONOutputFn extends DoFn<DataRow, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(WRITE_BIGDECIMAL_AS_PLAIN);

    private final Configuration configuration;

    public JSONOutputFn(Configuration configuration) {
        this.configuration = configuration;
    }

    @ProcessElement
    public void processElement(ProcessContext c) throws JsonProcessingException {
        DataRow dataRow = Objects.requireNonNull(c.element());
        List<OutputColumnSchema<?>> outputColumnSchemas = configuration.getOutputSchemas();

        ObjectNode jsonObject = MAPPER.createObjectNode();
        for (OutputColumnSchema<?> column : outputColumnSchemas) {
            var dataCell = dataRow.getDataCellFromFieldName(column.getField());
            insertCellIntoOutput(dataCell, column, jsonObject);
        }

        c.output(MAPPER.writeValueAsString(jsonObject));
    }

    private void insertCellIntoOutput(
            @Nullable DataCell dataCell,
            @Nonnull OutputColumnSchema<?> column,
            @Nonnull ObjectNode jsonObject
    ) {
        var field = column.getField();
        var dataWrapper = dataCell != null ? dataCell.getDataWrapper(): null;

        switch (column) {
            case BooleanColumnSchema boolCol -> {
                var data = boolCol.coerceToType(dataWrapper);
                jsonObject.put(field, data);
            }
            case DateColumnSchema dateCol -> {
                var data = dateCol.coerceToType(dataWrapper);
                var formatted = data == null ? null : dateCol.getFormatter().format(data);
                jsonObject.put(field, formatted);
            }
            case IntegerColumnSchema intCol -> {
                var data = intCol.coerceToType(dataWrapper);
                jsonObject.put(field, data);
            }
            case NumericOutputSchema numCol -> {
                var data = numCol.coerceToType(dataWrapper);
                jsonObject.put(field, data);
            }
            case VarcharColumnSchema strCol -> {
                var data = strCol.coerceToType(dataWrapper);
                jsonObject.put(field, data);
            }
        }
    }
}
