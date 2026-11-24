package com.curve.pojos.transformations;

import com.curve.pojos.cell.DataRow;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;

@FunctionalInterface
public interface DataRowTransformer extends Serializable {
    @Nullable
    DataRow transform(@Nonnull DataRow dataRow);
}
