package com.curve.pojos.data;

import javax.annotation.Nonnull;
import java.math.BigDecimal;

public record NumericDataWrapper(@Nonnull BigDecimal data) implements DataWrapper<BigDecimal> {

    // Custom equals method, that allows BigDecimal data to be equal if they compare equally
    // (contained data does not need the same scale and precision)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        NumericDataWrapper that = (NumericDataWrapper) o;
        return data.compareTo(that.data) == 0;
    }
}
