package com.curve.util.parser.data.wrapper;

import com.curve.pojos.data.*;
import com.curve.pojos.input.type.*;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;

import java.math.BigDecimal;
import java.util.function.Function;

import static com.curve.pojos.data.DataWrapper.Factory.*;

public class PoiDataWrapperParser implements DataWrapperParser<Cell> {

    private final StringDataWrapperParser stringDataWrapperParser = new StringDataWrapperParser();

    @Nullable
    @Override
    public BooleanDataWrapper parse(@Nonnull BooleanInputTypeInformation inputTypeInformation, @Nonnull Cell input) {
        if (input.getCellType() == CellType.BOOLEAN) {
            return asBoolean(input.getBooleanCellValue());
        } else {
            return stringDataWrapperParser.parse(inputTypeInformation, input.getStringCellValue());
        }
    }

    @Nullable
    @Override
    public LocalDateDataWrapper parse(@Nonnull DateInputTypeInformation inputTypeInformation, @Nonnull Cell input) {
        if (input.getCellType() == CellType.NUMERIC) {
            return asLocalDate(input.getLocalDateTimeCellValue().toLocalDate());
        } else {
            return stringDataWrapperParser.parse(inputTypeInformation, input.getStringCellValue());
        }
    }

    @Nullable
    @Override
    public DataWrapper<?> parse(@Nonnull NullInputTypeInformation inputTypeInformation, @Nonnull Cell input) {
        return null;
    }

    @Nullable
    @Override
    public NumericDataWrapper parse(@Nonnull Number2DPInputTypeInformation inputTypeInformation, @Nonnull Cell input) {
        return getPoiNumericOr(
                input,
                (str) -> stringDataWrapperParser.parse(inputTypeInformation, str)
        );
    }

    @Nullable
    @Override
    public NumericDataWrapper parse(@Nonnull Number5DPInputTypeInformation inputTypeInformation, @Nonnull Cell input) {
        return getPoiNumericOr(
                input,
                (str) -> stringDataWrapperParser.parse(inputTypeInformation, str)
        );
    }

    @Nullable
    @Override
    public NumericDataWrapper parse(@Nonnull NumberCommaSeparatedInputTypeInformation inputTypeInformation, @Nonnull Cell input) {
        return getPoiNumericOr(
                input,
                (str) -> stringDataWrapperParser.parse(inputTypeInformation, str)
        );
    }

    @Nullable
    @Override
    public NumericDataWrapper parse(@Nonnull NumberInputTypeInformation inputTypeInformation, @Nonnull Cell input) {
        return getPoiNumericOr(
                input,
                (str) -> stringDataWrapperParser.parse(inputTypeInformation, str)
        );
    }

    @Nullable
    @Override
    public StringDataWrapper parse(@Nonnull StringInputTypeInformation inputTypeInformation, @Nonnull Cell input) {
        return stringDataWrapperParser.parse(inputTypeInformation, input.getStringCellValue());
    }

    @Nullable
    private NumericDataWrapper getPoiNumericOr(
            @Nonnull Cell cell,
            @Nonnull Function<String, NumericDataWrapper> function
    ) {
        if (cell.getCellType() == CellType.NUMERIC) {
            return asNumeric(BigDecimal.valueOf(cell.getNumericCellValue()));
        } else {
            return function.apply(cell.getStringCellValue());
        }
    }
}
