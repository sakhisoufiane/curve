package com.curve.file.read.iterator;

import com.curve.pojos.input.config.source.FileSource;
import com.curve.pojos.input.config.type.AbstractExcelFileType;
import com.monitorjbl.xlsx.StreamingReader;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Workbook;

import javax.annotation.Nonnull;
import java.io.IOException;
import java.util.Iterator;
import java.util.function.Consumer;

/**
 * A Closable Iterator for reading an Excel Workbook with the POI library, and returning the rows in the Excel sheet.
 */
public class PoiClosableIterator implements ClosableIterator<Row> {
    private static final int BUFFER_SIZE = 4096;
    private static final int ROW_SIZE = 100;
    
    private final Workbook workbook;
    private final Iterator<Row> rowIterator;

    public PoiClosableIterator(
            @Nonnull FileSource fileSource, 
            @Nonnull AbstractExcelFileType fileType
    ) throws IOException {
        this.workbook = StreamingReader.builder()
                .rowCacheSize(ROW_SIZE)
                .bufferSize(BUFFER_SIZE)
                .open(fileSource.getInputStream());
        
        this.rowIterator = workbook.getSheetAt(fileType.getTab()).rowIterator();
    }

    @Override
    public void close() throws IOException {
        if (this.workbook != null) {
            this.workbook.close();
        }
    }

    @Override
    public boolean hasNext() {
        return rowIterator.hasNext();
    }

    @Override
    public Row next() {
        return rowIterator.next();
    }
}
