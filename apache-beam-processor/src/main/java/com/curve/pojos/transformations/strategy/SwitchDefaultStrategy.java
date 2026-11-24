package com.curve.pojos.transformations.strategy;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.transformations.SwitchMapping;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.util.Collections;
import java.util.List;

/**
 * SwitchDefaultStrategy is a strategy for generating new values. It takes a list of mappings, which are conditions and
 * an associated value. Each condition is checked in order, and when a matching condition is met, the associated value
 * is emitted. If no condition is met, the default value is returned.
 */
public class SwitchDefaultStrategy implements NewValueGenerator {
    @Nonnull
    private final List<SwitchMapping> mappings;
    @Nullable
    private final DataWrapper<?> defaultValue;

    public SwitchDefaultStrategy(
            @Nullable List<SwitchMapping> mappings,
            @Nullable Serializable defaultValue
    ) {
        this.mappings = mappings != null ? mappings : Collections.emptyList();
        this.defaultValue = defaultValue != null ? DataWrapper.Factory.fromSerializable(defaultValue) : null;
    }

    @Override
    @Nullable
    public DataWrapper<?> generate(@Nonnull DataRow dataRow) {
        for (SwitchMapping mapping : mappings) {
            if (mapping.getCondition().evaluate(dataRow)) {
                return mapping.getValue();
            }
        }
        return defaultValue;
    }

}
