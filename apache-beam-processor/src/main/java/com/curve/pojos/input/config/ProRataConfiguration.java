package com.curve.pojos.input.config;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.transformations.value.ValueProvider;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Objects;

public class ProRataConfiguration implements Serializable {

    @Nonnull
    private final BigDecimal totalAmount;
    @Nullable
    private final Long totalUnits;
    @Nonnull
    private final String outputFieldName;
    @Nullable
    private final String unitFieldName;
    @Nullable
    private final Integer unitColumnIndex;
    @Nullable
    private final Serializable unitFixedValue;

    @JsonCreator
    public ProRataConfiguration(
            @JsonProperty(value = "totalAmount", required = true) @Nonnull String totalAmount,
            @JsonProperty("totalUnits") @Nullable String totalUnits,
            @JsonProperty(value = "outputFieldName", required = true) @Nonnull String outputFieldName,
            @JsonProperty("unitFieldName") @Nullable String unitFieldName, 
            @JsonProperty("unitColumnIndex") @Nullable Integer unitColumnIndex, 
            @JsonProperty("unitFixedValue") @Nullable Serializable unitFixedValue
    ) {
        this.totalAmount = new BigDecimal(totalAmount);
        this.totalUnits = totalUnits != null ? Long.valueOf(totalUnits) : null;
        this.outputFieldName = outputFieldName;
        this.unitFieldName = unitFieldName;
        this.unitColumnIndex = unitColumnIndex;
        this.unitFixedValue = unitFixedValue;
    }

    @Nonnull
    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    @Nullable
    public Long getTotalUnits() {
        return totalUnits;
    }
    
    @Nonnull
    public String getOutputFieldName() {
        return outputFieldName;
    }

    @Nullable
    public String getUnitFieldName() {
        return unitFieldName;
    }

    @Nullable
    public Integer getUnitColumnIndex() {
        return unitColumnIndex;
    }

    @Nullable
    public Serializable getUnitFixedValue() {
        return unitFixedValue;
    }

    @Nonnull
    public ValueProvider getUnitValueProvider() throws ValidationException {
        return ValueProvider.create(unitFieldName, unitColumnIndex, unitFixedValue);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ProRataConfiguration that = (ProRataConfiguration) o;
        return Objects.equals(totalAmount, that.totalAmount) && 
                Objects.equals(totalUnits, that.totalUnits) && 
                Objects.equals(outputFieldName, that.outputFieldName) && 
                Objects.equals(unitFieldName, that.unitFieldName) && 
                Objects.equals(unitColumnIndex, that.unitColumnIndex) && 
                Objects.equals(unitFixedValue, that.unitFixedValue);
    }

    @Override
    public int hashCode() {
        return Objects.hash(totalAmount, totalUnits, outputFieldName, unitFieldName, unitColumnIndex, unitFixedValue);
    }

    @Override
    public String toString() {
        return "ProRataConfiguration{" +
                "totalAmount=" + totalAmount +
                ", totalUnits=" + totalUnits +
                ", outputFieldName='" + outputFieldName + '\'' +
                ", unitFieldName='" + unitFieldName + '\'' +
                ", unitColumnIndex=" + unitColumnIndex +
                ", unitFixedValue=" + unitFixedValue +
                '}';
    }
}
