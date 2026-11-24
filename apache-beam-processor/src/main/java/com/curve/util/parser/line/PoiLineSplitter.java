package com.curve.util.parser.line;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;

import javax.annotation.Nonnull;
import java.io.IOException;

/**
 * A line splitter, which accepts Apache POI Rows, and splits them into arrays of POI Cells
 */
public class PoiLineSplitter implements LineSplitter<Row, Cell> {
    @Nonnull
    @Override
    public Cell[] split(@Nonnull Row line) throws IOException {
        var rtn = new Cell[line.getLastCellNum()];
        
        // NB: Iterating over row with "Cell c : row" removes any empty cells which we need.
        for (int i = 0; i < line.getLastCellNum(); i++) {
            rtn[i] = line.getCell(i, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        }
        
        return rtn;
    }
}
