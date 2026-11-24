package com.curve.pojos.transformations.strategy;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;

/**
 * Given a DataRow, execute a function that generates a new value to be used
 */
@FunctionalInterface
public interface NewValueGenerator extends Serializable {
    @Nullable
    DataWrapper<?> generate(@Nonnull DataRow dataRow);
}
