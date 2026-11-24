package com.curve.pojos.data;

import javax.annotation.Nonnull;
import java.time.LocalDate;

public record LocalDateDataWrapper(@Nonnull LocalDate data) implements DataWrapper<LocalDate> {}
