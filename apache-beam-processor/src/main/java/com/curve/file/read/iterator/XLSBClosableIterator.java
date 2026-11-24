package com.curve.file.read.iterator;

import com.curve.file.read.excel.XLSBFileReader;
import com.curve.pojos.input.config.source.FileSource;
import com.curve.pojos.input.config.type.AbstractExcelFileType;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.util.Iterator;
import java.util.List;

/**
 * A Closable Iterator for reading an XLSB file, and returning the rows in the Excel sheet. Each row is represented as
 * a list of strings, one string for each cell in the row.
 */
public class XLSBClosableIterator implements ClosableIterator<String[]> {

    private final Iterator<List<String>> rowIterator;

    public XLSBClosableIterator(
            @Nonnull FileSource fileSource, 
            @Nonnull AbstractExcelFileType fileType
    ) throws IOException {
        var rows = new XLSBFileReader().readFile(fileSource, fileType.getTab());
        this.rowIterator = rows.iterator();
    }

    @Override
    public void close() {
        // Nothing to close
    }

    @Override
    public boolean hasNext() {
        return rowIterator.hasNext();
    }

    @Override
    public String[] next() {
        return rowIterator.next().toArray(String[]::new);
    }
}
