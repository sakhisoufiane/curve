package com.curve.pojos.transformations.calculation;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.transformations.value.ValueProvider;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.util.Objects;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "calculationType", visible = true)
@JsonSubTypes({
        @JsonSubTypes.Type(value = Addition.class, name = "addition"),
        @JsonSubTypes.Type(value = Subtraction.class, name = "subtraction"),
        @JsonSubTypes.Type(value = Multiplication.class, name = "multiplication"),
        @JsonSubTypes.Type(value = Division.class, name = "division"),
        @JsonSubTypes.Type(value = Left.class, name = "left"),
        @JsonSubTypes.Type(value = Right.class, name = "right"),
        @JsonSubTypes.Type(value = Concatenation.class, name = "concatenation")
})
public abstract class Equation implements Serializable {

    private final String calculationType;
    private final String equationValueFieldName;
    private final Integer equationValueColumnIndex;
    private final Serializable equationFixedValue;

    private final ValueProvider valueProvider;

    public Equation(
            String calculationType,
            String equationValueFieldName,
            Integer equationValueColumnIndex,
            Serializable equationFixedValue
    ) throws ValidationException {
        this.calculationType = calculationType;
        this.equationValueFieldName = equationValueFieldName;
        this.equationValueColumnIndex = equationValueColumnIndex;
        this.equationFixedValue = equationFixedValue;

        this.valueProvider = ValueProvider.create(equationValueFieldName, equationValueColumnIndex, equationFixedValue);
    }

    @Nullable
    public abstract DataWrapper<?> calculate(@Nonnull DataRow dataRow, @Nullable DataWrapper<?> value);

    @Nonnull
    public String getCalculationType() {
        return this.calculationType;
    }

    @Nullable
    public String getEquationFieldName() {
        return equationValueFieldName;
    }

    @Nullable
    public Integer getEquationColumnIndex() {
        return equationValueColumnIndex;
    }

    @Nullable
    public Serializable getEquationFixedValue() {
        return equationFixedValue;
    }

    @Nullable
    public DataWrapper<?> findEquationValue(DataRow dataRow) {
        return valueProvider.provide(dataRow);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Equation equation = (Equation) o;
        return Objects.equals(calculationType, equation.calculationType) &&
                Objects.equals(equationValueFieldName, equation.equationValueFieldName) &&
                Objects.equals(equationValueColumnIndex, equation.equationValueColumnIndex) &&
                Objects.equals(equationFixedValue, equation.equationFixedValue);
    }

    @Override
    public int hashCode() {
        return Objects.hash(calculationType, equationValueFieldName, equationValueColumnIndex, equationFixedValue);
    }

    @Override
    public String toString() {
        return "Equation{" +
                "calculationType='" + calculationType + '\'' +
                ", equationValueFieldName='" + equationValueFieldName + '\'' +
                ", equationValueColumnIndex=" + equationValueColumnIndex +
                ", equationFixedValue=" + equationFixedValue +
                '}';
    }
}
