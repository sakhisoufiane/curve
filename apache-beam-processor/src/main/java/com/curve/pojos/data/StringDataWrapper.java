package com.curve.pojos.data;

import javax.annotation.Nonnull;

public record StringDataWrapper(@Nonnull String data) implements DataWrapper<String> {}
