package com.curve.pojos.input.type.date;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.Locale;
import java.util.Objects;

import static java.time.temporal.ChronoField.*;
import static java.time.temporal.IsoFields.DAY_OF_QUARTER;
import static java.time.temporal.IsoFields.QUARTER_OF_YEAR;

// TODO comments everywhere
public enum DateFormatEnum {
    UK_STYLE(
            "DD/MM/YYYY",
            new DateParsingStrategy.Format("dd/MM/yyyy")
    ),
    US_STYLE_WITH_SLASHES(
            "MM/DD/YYYY",
            new DateParsingStrategy.Format("MM/dd/yyyy")
    ),
    NL_STYLE(
            "DD-MM-YYYY",
            new DateParsingStrategy.Format("dd-MM-yyyy")
    ),
    NL_STYLE_WITH_SHORT_MONTH(
            "DD-MMM-YYYY",
            new DateParsingStrategy.Format("dd-MMM-yyyy")
    ),
    US_STYLE(
            "MM-DD-YYYY",
            new DateParsingStrategy.Format("MM-dd-yyyy")
    ),
    YEAR_MONTH_DAY_WITH_SLASHES(
            "YYYY/MM/DD",
            new DateParsingStrategy.Format("yyyy/MM/dd")
    ),
    YEAR_DAY_MONTH_WITH_SLASHES(
            "YYYY/DD/MM",
            new DateParsingStrategy.Format("yyyy/dd/MM")
    ),
    ISO_DATE(
            "YYYY-MM-DD",
            new DateParsingStrategy.Format(DateTimeFormatter.ISO_DATE)
    ),
    YEAR_DAY_MONTH(
            "YYYY-DD-MM",
            new DateParsingStrategy.Format("yyyy-dd-MM")
    ),
    YEAR_MONTH(
            "YYYYMM",
            new DateParsingStrategy.Format(
                    new DateTimeFormatterBuilder()
                            .appendPattern("yyyyMM")
                            .parseDefaulting(DAY_OF_MONTH, 1)
                            .toFormatter(Locale.US)
            )
    ),
    MONTH_SHORT_YEAR(
            "MMYY",
            new DateParsingStrategy.Format(
                    new DateTimeFormatterBuilder()
                            .appendPattern("MMyy")
                            .parseDefaulting(DAY_OF_MONTH, 1)
                            .toFormatter(Locale.US)
            )
    ),
    MONTH_YEAR_WITH_UNDERSCORE(
            "MM_YYYY",
            new DateParsingStrategy.Format(
                    new DateTimeFormatterBuilder()
                            .appendPattern("MM_yyyy")
                            .parseDefaulting(DAY_OF_MONTH, 1)
                            .toFormatter(Locale.US)
            )
    ),
    MONTH_YEAR_RANGE(
            "MMYYMMYY",
            new DateParsingStrategy.Format(
                    new DateTimeFormatterBuilder()
                            .appendPattern("MMyy")
                            .parseDefaulting(DAY_OF_MONTH, 1)
                            .toFormatter(Locale.US),
                    new DateActor.Split())
    ),
    SHORT_YEAR_MONTH(
            "YYMM",
            new DateParsingStrategy.Format(
                    new DateTimeFormatterBuilder()
                            .appendPattern("yyMM")
                            .parseDefaulting(DAY_OF_MONTH, 1)
                            .toFormatter(Locale.US)
            )
    ),
    YEAR_MONTH_RANGE(
            "YYMMYYMM",
            new DateParsingStrategy.Format(
                    new DateTimeFormatterBuilder()
                            .appendPattern("yyMM")
                            .parseDefaulting(DAY_OF_MONTH, 1)
                            .toFormatter(Locale.US),
                    new DateActor.Split())
    ),
    YEAR_HALF_WITH_UNDERSCORE(
            "YYYY_H",
            new DateParsingStrategy.HalfYear(5)
    ),
    YEAR_HALF(
            "YYYYH",
            new DateParsingStrategy.HalfYear(4)
    ),
    YEAR_QUARTER_WITH_UNDERSCORE(
            "YYYY_Q",
            new DateParsingStrategy.Format(
                    new DateTimeFormatterBuilder()
                            .appendPattern("yyyy_q")
                            .parseDefaulting(DAY_OF_QUARTER, 1)
                            .toFormatter(Locale.US)
            )
    ),
    YEAR_QUARTER(
            "YYYYQ",
            new DateParsingStrategy.Format(
                    new DateTimeFormatterBuilder()
                            .appendValue(YEAR, 4)
                            .appendValue(QUARTER_OF_YEAR, 1)
                            .parseDefaulting(DAY_OF_QUARTER, 1)
                            .toFormatter(Locale.US)
            )
    ),
    YEAR_MONTH_WITH_UNDERSCORE(
            "YYYY_MM",
            new DateParsingStrategy.Format(
                    new DateTimeFormatterBuilder()
                            .appendPattern("yyyy_MM")
                            .parseDefaulting(DAY_OF_MONTH, 1)
                            .toFormatter(Locale.US)
            )
    ),
    MONTH_SHORT_NAME_YEAR_WITH_SPACE(
            "MMM YY",
            new DateParsingStrategy.Format(
                    new DateTimeFormatterBuilder()
                            .appendPattern("MMM yy")
                            .parseDefaulting(DAY_OF_MONTH, 1)
                            .toFormatter(Locale.US)
            )
    ),
    ISO_DATE_TIME(
            "ISO Date Time",
            new DateParsingStrategy.Format(DateTimeFormatter.ISO_DATE_TIME)
    ),
    DEFAULT(
            "Default",
            new DateParsingStrategy.Format(
                    // Impersonates the behaviour of Javascript's Date constructor for ISO 8601 date handling
                    new DateTimeFormatterBuilder()
                            .appendOptional(DateTimeFormatter.ISO_DATE)
                            .appendOptional(
                                    new DateTimeFormatterBuilder()
                                            .appendPattern("yyyy-MM")
                                            .parseDefaulting(DAY_OF_MONTH, 1)
                                            .toFormatter(Locale.US)
                            )
                            .appendOptional(
                                    new DateTimeFormatterBuilder()
                                            .appendPattern("yyyy")
                                            .parseDefaulting(MONTH_OF_YEAR, 1)
                                            .parseDefaulting(DAY_OF_MONTH, 1)
                                            .toFormatter(Locale.US)
                            )
                            .optionalStart()
                            .appendLiteral('T')
                            .appendValue(HOUR_OF_DAY, 2)

                            .optionalStart()
                            .appendLiteral(':')
                            .appendValue(MINUTE_OF_HOUR, 2)

                            .optionalStart()
                            .appendLiteral(':')
                            .appendValue(SECOND_OF_MINUTE, 2)

                            .optionalStart()
                            .appendFraction(NANO_OF_SECOND, 0, 9, true)

                            .optionalStart()
                            .appendOffsetId()

                            .optionalStart()
                            .appendLiteral('[')
                            .parseCaseSensitive()
                            .appendZoneRegionId()
                            .appendLiteral(']')
                            .toFormatter(Locale.US)
            )
    );

    private final String name;
    private final DateParsingStrategy dateParsingStrategy;

    DateFormatEnum(String name, DateParsingStrategy dateParsingStrategy) {
        this.name = name;
        this.dateParsingStrategy = dateParsingStrategy;
    }

    public String getName() {
        return name;
    }

    @Nullable
    public LocalDate parseDate(@Nonnull String date) {
        return dateParsingStrategy.parseDate(date);
    }

    @Nullable
    public static DateFormatEnum fromName(@Nonnull String name) {
        for (DateFormatEnum value : values()) {
            if (Objects.equals(value.name, name)) {
                return value;
            }
        }
        return null;
    }
}
