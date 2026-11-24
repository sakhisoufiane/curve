package com.curve.pojos.transformations.value;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;

/**
 * A ValueProvider extracts a value from a given row. Implementations may opt to instead to return fixed values
 * provided from a constructor
 */
@FunctionalInterface
public interface ValueProvider extends Serializable {

    @Nullable
    DataWrapper<?> provide(@Nonnull DataRow dataRow);

    /**
     * Creates a ValueProvider from either a fieldName (which is used to look up data from the DataRow), a column index
     * (which is used to fetch the data from the original input column from the file) or from a fixedValue (which is
     * then directly provided)
     *
     * @param fieldName     The field name to look up from the data row
     * @param columnIndex   The column index to look up from the original data of the data row
     * @param fixedValue    A fixed value to return from the value provider
     * @return  The ValueProvider
     * @throws ValidationException  If no fieldName, columnIndex or fixedValue is provided
     */
    @Nonnull
    static ValueProvider create(
            @Nullable String fieldName,
            @Nullable Integer columnIndex,
            @Nullable Serializable fixedValue
    ) throws ValidationException {
        if (fieldName != null) {
            return new FieldValueProvider(fieldName);
        } else if (columnIndex != null) {
            return new ColumnValueProvider(columnIndex);
        } else if (fixedValue != null) {
            return new FixedValueProvider(fixedValue);
        }
        throw new ValidationException("A field name, column index or fixed value must be provided");
    }
}
