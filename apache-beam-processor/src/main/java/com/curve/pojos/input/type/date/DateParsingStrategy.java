package com.curve.pojos.input.type.date;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.util.Locale;

interface DateParsingStrategy {
    @Nullable
    LocalDate parseDate(@Nonnull String date);
    
    class Format implements DateParsingStrategy {
        private static final Logger LOGGER = LoggerFactory.getLogger(DateParsingStrategy.class);
        
        private final DateTimeFormatter formatter;
        private final DateActor actor;

        public Format(String format) {
            this.formatter = new DateTimeFormatterBuilder()
                    .parseCaseInsensitive()
                    .appendPattern(format)
                    .toFormatter(Locale.US);
            this.actor = null;
        }

        public Format(DateTimeFormatter formatter) {
            this.formatter = formatter;
            this.actor = null;
        }

        public Format(String format, DateActor actor) {
            this.formatter = DateTimeFormatter.ofPattern(format);
            this.actor = actor;
        }

        public Format(DateTimeFormatter formatter, DateActor actor) {
            this.formatter = formatter;
            this.actor = actor;
        }

        @Override
        @Nullable
        public LocalDate parseDate(@Nonnull String date) {
            if (actor != null) {
                date = actor.modify(date);
            }
            try {
                return LocalDate.parse(date, formatter);
            } catch (DateTimeParseException e) {
                // TODO test this
                LOGGER.error("Failed to parse date {} with formatter {}", date, formatter, e);
                return null;
            }
        }
    }

    class HalfYear implements DateParsingStrategy {

        private static final Logger LOGGER = LoggerFactory.getLogger(HalfYear.class);
        
        private final int idx;

        public HalfYear(int idx) {
            this.idx = idx;
        }

        @Override
        @Nullable
        public LocalDate parseDate(@Nonnull String date) {
            if (date.length() <= idx) {
                // TODO test this
                LOGGER.error("Input date: {} is shorter than expected half-year index: {}", date, idx);
                return null;
            }
            
            int yearHalf = Character.getNumericValue(date.charAt(idx));
            // Not ideal, we are hard coding that the year will always be the first four character, fragile.
            String yearString = date.substring(0, 4);
            int year = Integer.parseInt(yearString);
            int month = (yearHalf * 6) - 5; // H1 = 1, H2 = 7
            return LocalDate.of(year, month, 1);
        }
    }
}
