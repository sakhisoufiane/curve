package com.curve.pojos.input.schemas;

import java.io.Serializable;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

public class InputColumnSchemas implements Serializable {

    private final List<InputColumnSchema<?>> inputColumnSchemas;
    private final List<Integer> indexSeparationLengths;

    public InputColumnSchemas(List<InputColumnSchema<?>> inputColumnSchemas) {
        this.inputColumnSchemas = Collections.unmodifiableList(inputColumnSchemas);

        this.indexSeparationLengths = inputColumnSchemas.stream()
                .map(InputColumnSchema::getCharacters)
                .toList();
    }

    public List<InputColumnSchema<?>> getInputColumnSchemas() {
        return inputColumnSchemas;
    }

    public List<Integer> getIndexSeparationLengths() {
        return indexSeparationLengths;
    }

    public InputColumnSchema<?> get(int index) {
        return inputColumnSchemas.get(index);
    }

    public int size() {
        return inputColumnSchemas.size();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        InputColumnSchemas that = (InputColumnSchemas) o;
        return Objects.equals(inputColumnSchemas, that.inputColumnSchemas) && Objects.equals(indexSeparationLengths, that.indexSeparationLengths);
    }

    @Override
    public int hashCode() {
        return Objects.hash(inputColumnSchemas, indexSeparationLengths);
    }

    @Override
    public String toString() {
        return "InputColumnSchemas{" +
                "inputColumnSchemas=" + inputColumnSchemas +
                ", indexSeparationLengths=" + indexSeparationLengths +
                '}';
    }
}
