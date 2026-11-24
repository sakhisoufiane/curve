package com.curve.pojos.transformations.strategy;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.transformations.strategy.input.InputValueProcessor;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.regex.Pattern;

import static com.curve.pojos.data.DataWrapper.Factory.asString;

public class SearchAndReplaceStrategy implements InputValueProcessor {
    private final Pattern pattern;
    private final String replacement;

    public SearchAndReplaceStrategy(String regex, String replacement) {
        this.pattern = Pattern.compile(regex);
        this.replacement = replacement;
    }

    @Nullable
    @Override
    public DataWrapper<?> process(@Nonnull DataRow dataRow, @Nullable DataWrapper<?> inputData) {
        var inputDataWrapper = asString(inputData);
        if (inputDataWrapper == null) return null;
        
        var input = inputDataWrapper.data();
        var result = pattern.matcher(input).replaceAll(replacement);
        
        return asString(result);
    }
}
