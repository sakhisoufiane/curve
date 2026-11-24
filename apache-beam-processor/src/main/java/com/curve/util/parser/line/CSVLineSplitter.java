package com.curve.util.parser.line;

import com.opencsv.CSVParser;
import com.opencsv.CSVParserBuilder;

import javax.annotation.Nonnull;
import java.io.IOException;


public class CSVLineSplitter implements LineSplitter<String, String> {

    private final char delimiter;
    private CSVParser parser;
    
    public CSVLineSplitter(@Nonnull String delimiter) {
        if (delimiter.length() > 1) {
            // TODO change to ValidationException and perform earlier
            // TODO update docs with this validation and check with Marco if this is an issue
            throw new RuntimeException("CSV only supports single character delimiters"); 
        }
        this.delimiter = delimiter.charAt(0); 
        
    }

    @Nonnull
    @Override
    public String[] split(@Nonnull String line) throws IOException {
        return getParser().parseLine(line);
    }

    private CSVParser getParser() {
        // Parser is marked as transient (as it is not serializable). Initialize it if it is null
        if (parser == null) {
            parser = new CSVParserBuilder()
                    .withSeparator(delimiter)
                    .build();
        }
        return parser;
    }
}
