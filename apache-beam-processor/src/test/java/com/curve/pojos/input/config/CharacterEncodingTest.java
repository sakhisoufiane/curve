package com.curve.pojos.input.config;

import com.curve.exceptions.ValidationException;
import org.junit.Assert;
import org.junit.Test;

import java.util.List;

import static org.junit.Assert.assertEquals;

public class CharacterEncodingTest {

    @Test
    public void findUTF8Encoding() throws Exception {

        for (String encodingStr : List.of("UTF-8", "utf-8")) {
            var result = CharacterEncoding.forName(encodingStr);
            assertEquals(
                    "Finding character encoding for string: " + encodingStr,
                    CharacterEncoding.UTF_8,
                    result
            );
        }
    }

    @Test
    public void findUTF16Encoding() throws Exception {
        for (String encodingStr : List.of("UTF-16", "utf-16")) {
            var result = CharacterEncoding.forName(encodingStr);
            assertEquals(
                    "Finding character encoding for string: " + encodingStr,
                    CharacterEncoding.UTF_16,
                    result
            );
        }
    }

    @Test
    public void findUnknownEncoding() {
        try {
            // Validation Exception should be thrown here
            var result = CharacterEncoding.forName("some-unknown-format");
            Assert.fail();
        } catch (ValidationException e) {

        }
    }
}