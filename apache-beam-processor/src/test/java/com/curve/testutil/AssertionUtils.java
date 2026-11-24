package com.curve.testutil;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class AssertionUtils {

    private AssertionUtils() {
        // Do not instantiate
    }

    public static void assertTrueIfNotInverted(boolean actual, boolean inverted) {
        if (inverted) {
            assertFalse(actual);
        } else {
            assertTrue(actual);
        }
    }

    public static void assertFalseIfNotInverted(boolean actual, boolean inverted) {
        if (inverted) {
            assertTrue(actual);
        } else {
            assertFalse(actual);
        }
    }

}
