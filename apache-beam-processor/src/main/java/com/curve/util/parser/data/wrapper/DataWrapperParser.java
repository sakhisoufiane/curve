package com.curve.util.parser.data.wrapper;

import com.curve.pojos.data.*;
import com.curve.pojos.input.type.*;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;

public interface DataWrapperParser<I> extends Serializable {

    @Nullable
    default DataWrapper<?> parse(@Nonnull InputTypeInformation inputTypeInformation, @Nullable I input) {
        if (input == null) return null;

        return switch (inputTypeInformation) {
            case BooleanInputTypeInformation boolIti -> parse(boolIti, input);
            case DateInputTypeInformation dateIti -> parse(dateIti, input);
            case NullInputTypeInformation nullIti -> parse(nullIti, input);
            case Number2DPInputTypeInformation n2dpIti -> parse(n2dpIti, input);
            case Number5DPInputTypeInformation n5dpIti -> parse(n5dpIti, input);
            case NumberCommaSeparatedInputTypeInformation ncsIti -> parse(ncsIti, input);
            case NumberInputTypeInformation nIti -> parse(nIti, input);
            case StringInputTypeInformation strIti -> parse(strIti, input);
        };
    }
    
    @Nullable
    BooleanDataWrapper parse(@Nonnull BooleanInputTypeInformation inputTypeInformation, @Nonnull I input);
    
    @Nullable
    LocalDateDataWrapper parse(@Nonnull DateInputTypeInformation inputTypeInformation, @Nonnull I input);
    
    @Nullable 
    DataWrapper<?> parse(@Nonnull NullInputTypeInformation inputTypeInformation, @Nonnull I input);
    
    @Nullable
    NumericDataWrapper parse(@Nonnull Number2DPInputTypeInformation inputTypeInformation, @Nonnull I input);
    
    @Nullable
    NumericDataWrapper parse(@Nonnull Number5DPInputTypeInformation inputTypeInformation, @Nonnull I input);
    
    @Nullable
    NumericDataWrapper parse(@Nonnull NumberCommaSeparatedInputTypeInformation inputTypeInformation, @Nonnull I input);
    
    @Nullable
    NumericDataWrapper parse(@Nonnull NumberInputTypeInformation inputTypeInformation, @Nonnull I input);
    
    @Nullable
    StringDataWrapper parse(@Nonnull StringInputTypeInformation inputTypeInformation, @Nonnull I input);
}
