package com.curve.pojos.data;

import javax.annotation.Nonnull;

public record BooleanDataWrapper(@Nonnull Boolean data) implements DataWrapper<Boolean> {}
