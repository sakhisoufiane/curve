package com.curve.util.parser.data.row;

import com.curve.pojos.cell.DataCell;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.cell.NullDataCell;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.input.config.type.AbstractFileType;
import com.curve.pojos.input.schemas.InputColumnSchema;
import com.curve.pojos.input.schemas.InputColumnSchemas;
import com.curve.pojos.input.schemas.NonNullInputColumnSchema;
import com.curve.pojos.input.schemas.NullInputColumnSchema;
import com.curve.util.DefaultValueMapping;
import com.curve.util.parser.data.wrapper.DataWrapperParser;

import javax.annotation.Nonnull;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class DataRowParser<T> implements Serializable {

    private final AbstractFileType fileType;
    private final InputColumnSchemas inputColumnSchemas;
    private final DefaultValueMapping defaultValueMapping;
    private final List<? extends DataCell> missingDefaults;
    private final DataWrapperParser<T> dataWrapperParser;

    public DataRowParser(
            @Nonnull AbstractFileType fileType,
            @Nonnull InputColumnSchemas inputColumnSchemas,
            @Nonnull DefaultValueMapping defaultValueMapping,
            @Nonnull DataWrapperParser<T> dataWrapperParser
    ) {
        this.fileType = fileType;
        this.inputColumnSchemas = inputColumnSchemas;
        this.defaultValueMapping = defaultValueMapping;
        this.dataWrapperParser = dataWrapperParser;

        // If we have a default value that is not present in the input column schemas,
        // we should append the data to each row
        this.missingDefaults = defaultValueMapping.getMissingDefaults(inputColumnSchemas).entrySet().stream()
                .map((entry) -> new NonNullDataCell(
                        entry.getKey().getField(),
                        entry.getValue()
                ))
                .toList();
    }

    @Nonnull
    public DataRow parse(@Nonnull T[] input) {
        ArrayList<DataCell> dataCells = new ArrayList<>();

        // While we start reading the row from the starting column, inputSchema is not offset, hence ii = 0;
        for (int i = fileType.getStartingColumn(), ii = 0; i < input.length && ii < inputColumnSchemas.size(); i++, ii++) {
            dataCells.add(
                    createCell(
                            inputColumnSchemas.get(ii), 
                            input[i]
                    )
            );
        }

        dataCells.addAll(missingDefaults);

        return DataRow.Factory.createFromInputData(dataCells);
    }
    
    private DataCell createCell(InputColumnSchema<?> inputColumnSchema, T input) {
        switch (inputColumnSchema) {
            case NonNullInputColumnSchema<?> nonNullCase -> {
                DataWrapper<?> parsed = dataWrapperParser.parse(nonNullCase.getTypeInformation(), input);

                if (parsed == null) {
                    parsed = defaultValueMapping.getByFieldName(nonNullCase.getField());
                }

                return new NonNullDataCell(
                        nonNullCase.getField(),
                        parsed
                );
            }
            case NullInputColumnSchema nullCase -> {
                return NullDataCell.INSTANCE;
            }
        }
    }

}
