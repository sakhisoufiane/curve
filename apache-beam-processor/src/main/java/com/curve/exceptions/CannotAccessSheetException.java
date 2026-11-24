package com.curve.exceptions;

import java.io.IOException;

public class CannotAccessSheetException extends IOException {

    public CannotAccessSheetException(int desiredSheet, int totalSheets) {
        super("Could not access sheet index: " + desiredSheet + " as workbook only contains: " + totalSheets + " sheets");
    }
}
