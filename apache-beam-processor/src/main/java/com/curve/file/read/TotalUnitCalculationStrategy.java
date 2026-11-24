package com.curve.file.read;

import com.curve.file.read.iterator.TabularDataSupplier;
import com.curve.pojos.input.config.type.AbstractFileType;
import com.curve.pojos.transformations.value.ValueProvider;
import com.curve.util.parser.data.row.DataRowParser;
import com.curve.util.parser.line.LineSplitter;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.math.BigDecimal;

import static com.curve.pojos.data.DataWrapper.Factory.asNumeric;

/**
 * A strategy for calculating the total units of a column of data from a file
 */
public class TotalUnitCalculationStrategy {
    
    @Nonnull
    public <R, C> BigDecimal findTotalUnits(
            @Nonnull TabularDataSupplier<R> supplier,
            @Nonnull LineSplitter<R, C> splitter,
            @Nonnull DataRowParser<C> parser,
            @Nonnull ValueProvider valueProvider,
            @Nonnull AbstractFileType fileType
    ) throws IOException {
        
        BigDecimal totalUnits = BigDecimal.ZERO;
        try (var iterator = supplier.get()) {
            
            int rowCount = 0;
            
            while(iterator.hasNext()) {
                var line = iterator.next();
                
                if (rowCount++ < fileType.getStartingRow()) {
                    continue;
                }
                
                var splitLine = splitter.split(line);
                var dataRow = parser.parse(splitLine);
                var units = asNumeric(valueProvider.provide(dataRow));

                if (units != null) {
                    // TODO and what if it's non-numeric??
                    totalUnits = totalUnits.add(units.data());
                }
            }
        }

        return totalUnits;
    }
    
}
