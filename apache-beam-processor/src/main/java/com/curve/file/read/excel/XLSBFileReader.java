package com.curve.file.read.excel;

import com.curve.exceptions.CannotAccessSheetException;
import com.curve.pojos.input.config.source.FileSource;
import org.apache.poi.openxml4j.exceptions.OpenXML4JException;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.xssf.binary.XSSFBSharedStringsTable;
import org.apache.poi.xssf.binary.XSSFBSheetHandler;
import org.apache.poi.xssf.binary.XSSFBStylesTable;
import org.apache.poi.xssf.eventusermodel.XSSFBReader;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler;
import org.apache.poi.xssf.usermodel.XSSFComment;
import org.xml.sax.SAXException;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;

/**
 * A class for reading rows and cells from XLSB formatted files
 */
public class XLSBFileReader {

    private static final Locale LOCALE = new Locale("en", "US");

    /**
     * Read an XLSB formatted file, and output the cells.
     *
     * @param fileSource For retrieving the file from a customizable source
     * @param tab The tab (sheet) to read from the file
     * @return  A list of rows, each row represented as a list of cell values
     */
    public List<List<String>> readFile(FileSource fileSource, int tab) throws IOException {
        try (OPCPackage pkg = OPCPackage.open(fileSource.getInputStream())) {
            XSSFBReader reader = new XSSFBReader(pkg);
            XSSFBSharedStringsTable sst = new XSSFBSharedStringsTable(pkg);
            XSSFBStylesTable xssfbStylesTable = reader.getXSSFBStylesTable();

            SheetContentsHandler sheetContentsHandler = new SheetContentsHandler();

            XSSFBSheetHandler sheetHandler = new XSSFBSheetHandler(
                    findSheet(reader.getSheetsData(), tab),
                    xssfbStylesTable,
                    null,
                    sst,
                    sheetContentsHandler,
                    new DataFormatter(LOCALE),
                    false
            );
            sheetHandler.parse();

            return sheetContentsHandler.getRows();
        } catch (OpenXML4JException | SAXException e) {
            throw new IOException("Exception occurred processing XLSB formatted file", e);
        }
    }

    private static InputStream findSheet(Iterator<InputStream> data, int tab) throws IOException {
        InputStream inputStream = null;
        for (int i = 0; i <= tab; i++) {
            if (!data.hasNext()) {
                throw new CannotAccessSheetException(tab, i);
            }

            inputStream = data.next();

            if (i == tab) inputStream.close();
        }

        return inputStream;
    }

    /**
     * A custom sheet contents handler. Unlike the default, this detects if a null cell was skipped over,
     * and adds it to the output list.
     */
    private static class SheetContentsHandler implements XSSFSheetXMLHandler.SheetContentsHandler {

        private final List<List<String>> rows = new ArrayList<>();
        private List<String> cells;
        private int lastEncounteredColumn = -1;

        @Override
        public void startRow(int rowNum) {
            cells = new ArrayList<>();
            lastEncounteredColumn = -1;
        }

        @Override
        public void endRow(int rowNum) {
            rows.add(cells);
        }

        @Override
        public void cell(String cellReference, String formattedValue, XSSFComment comment) {
            var parsedCellReference = new CellReference(cellReference);
            addMissingCells(parsedCellReference);
            cells.add(formattedValue);
            lastEncounteredColumn = parsedCellReference.getCol();
        }

        /**
         * Determines whether a column was skipped when processing cells, and adds null values for skipped cells
         *
         * @param cellReference The reference to the cell currently being processed
         */
        private void addMissingCells(CellReference cellReference) {
            var distance = cellReference.getCol() - lastEncounteredColumn;

            for (int i = distance; i > 1; i--) {
                cells.add("");
            }
        }

        public List<List<String>> getRows() {
            return rows;
        }
    }
}

