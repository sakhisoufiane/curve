package com.curve.pojos.transformations.value;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;
import org.checkerframework.checker.units.qual.N;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;

import static com.curve.pojos.data.DataWrapper.Factory.*;

public class FixedValueProvider implements ValueProvider {

    private final DataWrapper<?> fixedValue;

    public FixedValueProvider(@Nullable Serializable fixedValue) {
        this.fixedValue = fixedValue != null ? fromSerializable(fixedValue) : null;
    }

    @Nullable
    @Override
    public DataWrapper<?> provide(@Nonnull DataRow dataRow) {
        return fixedValue;
    }

    @Override
    public String toString() {
        return "FixedValueProvider{" +
                "fixedValue=" + fixedValue +
                '}';
    }
}
