package com.curve.pojos.input.config;

import com.curve.exceptions.ValidationException;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

public enum CharacterEncoding {
    UTF_8(
            "UTF-8",
            StandardCharsets.UTF_8
    ),
    UTF_16(
            "UTF-16",
            StandardCharsets.UTF_16
    );

    private final String configurationName;
    private final Charset charset;

    CharacterEncoding(String configurationName, Charset charset) {
        this.configurationName = configurationName;
        this.charset = charset;
    }

    public String getConfigurationName() {
        return configurationName;
    }

    public Charset getCharset() {
        return charset;
    }

    /**
     * Find the Character encoding for the given name from the configuration
     *
     * @param name The name of the given character encoding from the configuration
     * @return The found CharacterEncoding
     * @throws ValidationException The character encoding could not be found
     */
    public static CharacterEncoding forName(String name) throws ValidationException {
        for (CharacterEncoding value : values()) {
            if (value.configurationName.equalsIgnoreCase(name)) {
                return value;
            }
        }
        throw new UnknownCharacterEncodingException(name);
    }

    private static class UnknownCharacterEncodingException extends ValidationException {

        public UnknownCharacterEncodingException(String configurationName) {
            super("Unsupported character encoding: " + configurationName);
        }
    }
}
