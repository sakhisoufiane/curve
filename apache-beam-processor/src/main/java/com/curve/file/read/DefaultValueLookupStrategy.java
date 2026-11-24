package com.curve.file.read;

import com.curve.file.read.iterator.TabularDataSupplier;
import com.curve.pojos.DefaultValue;
import com.curve.pojos.data.DataWrapper;
import com.curve.util.DefaultValueMapping;
import com.curve.util.parser.data.wrapper.DataWrapperParser;
import com.curve.util.parser.line.LineSplitter;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * This strategy defers to iteratorSupplier to get the file contents, in order to look up target cells.
 * </b>
 * iteratorSupplier provides an iterator, which provides a list of strings. Each string in the list represents a 
 * cell value.
 */
public class DefaultValueLookupStrategy {

    @Nonnull
    public <R, C> DefaultValueMapping extractDefaultValuesFromFile(
            @Nonnull TabularDataSupplier<R> supplier,
            @Nonnull LineSplitter<R, C> splitter,
            @Nonnull DataWrapperParser<C> dataParser,
            @Nonnull List<DefaultValue> defaultValues
    ) throws IOException {
        Map<DefaultValue, DataWrapper<?>> rtn = new HashMap<>(defaultValues.size());

        // Populate the map with any fixed values
        defaultValues.stream()
                .filter(dv -> dv.getValue() != null)
                .forEach(dv -> rtn.put(dv, dv.coerceFromValue()));

        // Find the first and last rows to find from the target cells
        var firstRow = defaultValues.stream()
                .map(DefaultValue::getLocation)
                .filter(Objects::nonNull)
                .mapToInt(DefaultValue.Cell::row)
                .min();

        var lastRow = defaultValues.stream()
                .map(DefaultValue::getLocation)
                .filter(Objects::nonNull)
                .mapToInt(DefaultValue.Cell::row)
                .max();

        // If we couldn't find any rows, then we are dealing with an empty file - There are no target cells to find
        if (firstRow.isEmpty() || lastRow.isEmpty()) return new DefaultValueMapping(rtn);

        try (var iterator = supplier.get()) {

            // Go over each row before the last row in the target cells
            for (int rowNumber = 0; rowNumber <= lastRow.getAsInt() && iterator.hasNext(); rowNumber++) {
                var row = iterator.next();

                // Skip this row if it's before the first row of target cells to find
                if (rowNumber < firstRow.getAsInt()) continue;

                var splitRow = splitter.split(row);

                // Check to see if each row and column lines up with a target cell
                for (int columnNumber = 0; columnNumber < splitRow.length; columnNumber++) {
                    for (DefaultValue cell : defaultValues) {
                        // If a cell is found, add it to the map
                        if (cell.getLocation() != null &&
                                cell.getLocation().row() == rowNumber &&
                                cell.getLocation().column() == columnNumber) {
                            var parsed = dataParser.parse(cell.getInputTypeInformation(), splitRow[columnNumber]);
                            rtn.put(cell, parsed);
                        }
                    }
                }
            }
        }

        return new DefaultValueMapping(rtn);
    }
    
    
}
