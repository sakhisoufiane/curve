package com.curve.pojos.transformations.value;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;

class FieldValueProvider implements ValueProvider {

    private final String fieldName;

    FieldValueProvider(@Nonnull String fieldName) {
        this.fieldName = fieldName;
    }

    @Nullable
    @Override
    public DataWrapper<?> provide(@Nonnull DataRow dataRow) {
        return dataRow.getDataWrapperFromField(fieldName);
    }

    @Override
    public String toString() {
        return "FieldValueProvider{" +
                "fieldName='" + fieldName + '\'' +
                '}';
    }
}
