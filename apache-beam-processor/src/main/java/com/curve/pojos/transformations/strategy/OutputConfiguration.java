package com.curve.pojos.transformations.strategy;

import java.io.Serializable;

public record OutputConfiguration(String outputField, boolean replaceOutput) implements Serializable {
}
