package com.curve.pojos.transformations.strategy.input;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;
import com.fasterxml.jackson.annotation.JsonCreator;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;

import java.util.Collections;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.curve.pojos.data.DataWrapper.Factory.asString;

/**
 * A strategy for executing Simple Mappings. It takes a list of mappings, and tries to map the incoming input data
 * to a mapped value
 */
public class SimpleMappingStrategy implements InputValueProcessor {

    @Nonnull
    private final Map<String, String> mappings;
    @Nullable
    private final Pattern regexPattern;

    @JsonCreator
    public SimpleMappingStrategy(
            @Nonnull Map<String, String> mappings,
            @Nullable String regex
    ) {
        this.mappings = Collections.unmodifiableMap(mappings);

        if (regex != null) {
            regex = regex.trim();
            this.regexPattern = !regex.isEmpty() ? Pattern.compile(regex) : null;
        } else {
            this.regexPattern = null;
        }
    }

    @Nullable
    @Override
    public DataWrapper<?> process(@Nonnull DataRow dataRow, @Nullable DataWrapper<?> inputData) {
        var asString = asString(inputData);
        if (asString == null) return null;

        // If the mapping has a value there, change to value.
        var lookupKey = filterRegexCharacters(asString.data());
        String mappedValue = mappings.get(lookupKey);

        return asString(mappedValue);
    }

    @Nonnull
    private String filterRegexCharacters(@Nonnull String lookupKey) {
        if (this.regexPattern == null) {
            return lookupKey;
        }
        Matcher matcher = regexPattern.matcher(lookupKey);
        return matcher.replaceAll("");
    }

}
