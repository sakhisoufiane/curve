package com.curve.util.parser;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.text.ParsePosition;
import java.util.Locale;

/**
 * A utility class for parsing BigDecimals
 */
public class BigDecimalParseUtil {

    // Decimal formats are expensive to create, and should not be shared across threads.
    // To work around this, create a ThreadLocal containing the DecimalFormat to isolate it's use to the invoking thread.
    private static final ThreadLocal<DecimalFormat> FORMAT = ThreadLocal.withInitial(() -> {
        var format = new DecimalFormat("#,##0.###", DecimalFormatSymbols.getInstance(Locale.US));
        format.setParseBigDecimal(true);
        return format;
    });

    /**
     * Static class - Do not instantiate
     */
    private BigDecimalParseUtil() {}

    /**
     * Parse a string as a BigDecimal
     *
     * @param str The string to parse
     * @return The BigDecimal, or null if the string was not parsable as a number
     */
    public static BigDecimal parse(String str) {
        return (BigDecimal) FORMAT.get().parse(str, new ParsePosition(0));
    }
}
