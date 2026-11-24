package com.curve.util.parser.datarow;

import com.curve.pojos.cell.NonNullDataCell;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.input.config.type.AbstractFileType;
import com.curve.pojos.input.config.type.TextFileType;
import com.curve.pojos.input.schemas.InputColumnSchema;
import com.curve.pojos.input.schemas.InputColumnSchemas;
import com.curve.util.DefaultValueMapping;
import com.curve.util.SchemaTypes;
import com.curve.util.parser.data.row.DataRowParser;
import com.curve.util.parser.data.wrapper.StringDataWrapperParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

public class SplitStringDataRowParserTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @ParameterizedTest
    @CsvSource(delimiter = '|', useHeadersInDisplayName = true, textBlock = """
                    Input         | Schema Type               | Expected Class        | Expected Value
                    Hello         | STRING                    | java.lang.String      | Hello
                    1234          | NUMBER                    | java.math.BigDecimal  | 1234
                    1234,56       | NUMBER COMMA SEPARATED    | java.math.BigDecimal  | 1234.56
                    78.90         | NUMBER 2 DECIMAL PLACES   | java.math.BigDecimal  | 78.90
                    23.45678      | NUMBER 5 DECIMAL PLACES   | java.math.BigDecimal  | 23.45678
                    true          | BOOLEAN                   | java.lang.Boolean     | true
            """)
    public void testStringMapping(String input, String schemaType, String expectedClass, String expectedValue) throws Exception {

        String[] lineArray = new String[]{input};

        var toTest = new DataRowParser<>(
                mockFileType(),
                mockInputColumnSchemas("myField", schemaType),
                new DefaultValueMapping(Collections.emptyMap()),
                new StringDataWrapperParser()
        );

        assertThat(toTest.parse(lineArray).getData())
                .hasSize(1)
                .first().isInstanceOfSatisfying(NonNullDataCell.class, nonNullDataCell -> {
                    assertThat(nonNullDataCell.getField()).isEqualTo("myField");
                    assertThat(nonNullDataCell.getDataWrapper()).isNotNull().extracting(DataWrapper::data).satisfies(data -> {
                        assertThat(data.getClass().getName()).isEqualTo(expectedClass);
                        assertThat(data.toString()).isEqualTo(expectedValue);
                    });
                });
    }

    @Test
    public void testTextMappingForEmptyCase() throws Exception {
        String columnType = SchemaTypes.STRING;

        String[] row = new String[]{""};

        var toTest = new DataRowParser<>(
                mockFileType(),
                mockInputColumnSchemas("myField", columnType),
                new DefaultValueMapping(Collections.emptyMap()),
                new StringDataWrapperParser()
        );

        assertThat(toTest.parse(row).getData())
                .hasSize(1)
                .first().isInstanceOfSatisfying(NonNullDataCell.class, nonNullDataCell -> {
                    assertThat(nonNullDataCell.getField()).isEqualTo("myField");
                    assertThat(nonNullDataCell.getDataWrapper()).isNull();
                });
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', useHeadersInDisplayName = true, textBlock = """
                   Date Format | Input Date                                     | Expected output
                   DD/MM/YYYY  | 15/11/1988                                     | 1988-11-15
                   MM/DD/YYYY  | 11/15/1988                                     | 1988-11-15
                   DD-MM-YYYY  | 15-11-1988                                     | 1988-11-15
                   DD-MMM-YYYY | 15-may-1988                                    | 1988-05-15
                   DD-MMM-YYYY | 15-May-1988                                    | 1988-05-15
                   DD-MMM-YYYY | 15-MAY-1988                                    | 1988-05-15
                   MM-DD-YYYY  | 11-15-1988                                     | 1988-11-15
                   YYYY/MM/DD  | 1988/11/15                                     | 1988-11-15
                   YYYY/DD/MM  | 1988/15/11                                     | 1988-11-15
                   YYYY-MM-DD  | 1988-11-15                                     | 1988-11-15
                   YYYY-DD-MM  | 1988-15-11                                     | 1988-11-15
                   YYYYMM      | 198811                                         | 1988-11-01
                   MMYY        | 1102                                           | 2002-11-01
                   MM_YYYY     | 11_2002                                        | 2002-11-01
                   MMYYMMYY    | 06200920                                       | 2020-06-01
                   YYMM        | 0211                                           | 2002-11-01
                   YYMMYYMM    | 20062009                                       | 2020-06-01
                   YYYY_H      | 2023_1                                         | 2023-01-01
                   YYYY_H      | 2023_2                                         | 2023-07-01
                   YYYYH       | 20231                                          | 2023-01-01
                   YYYYH       | 20232                                          | 2023-07-01
                   YYYY_Q      | 2023_1                                         | 2023-01-01
                   YYYY_Q      | 2023_4                                         | 2023-10-01
                   YYYYQ       | 20231                                          | 2023-01-01
                   YYYYQ       | 20234                                          | 2023-10-01
                   YYYY_MM     | 2022_04                                        | 2022-04-01
                   YYYYMM      | 202204                                         | 2022-04-01
                   MMM YY      | May 22                                         | 2022-05-01
                   Default     | 2022                                           | 2022-01-01
                   Default     | 2022-02                                        | 2022-02-01
                   Default     | 2022-02-02                                     | 2022-02-02
                   Default     | 2022-02-02T02                                  | 2022-02-02
                   Default     | 2022-02-02T02:02                               | 2022-02-02
                   Default     | 2022-02-02T02:02:02                            | 2022-02-02
                   Default     | 2022-02-02T02:02:02Z                           | 2022-02-02
                   Default     | 2022-02-02T02:02:02+01:00                      | 2022-02-02
                   Default     | 2022-02-02T02:02:02+01:00[Europe/London]       | 2022-02-02
                   Default     | 2022-02-02T02:02:02.555Z                       | 2022-02-02
                   Default     | 2022-02-02T02:02:02.555+01:00                  | 2022-02-02
                   Default     | 2022-02-02T02:02:02.555+01:00[Europe/London]   | 2022-02-02
                   Default     | 2022-02-02T02:02:02.55555Z                     | 2022-02-02
                   Default     | 2022-02-02T02:02:02.55555+01:00                | 2022-02-02
                   Default     | 2022-02-02T02:02:02.55555+01:00[Europe/London] | 2022-02-02
            """)
    public void testDateFormatting(String dateFormat, String input, String expectedValue) throws Exception {

        String[] lineArray = new String[]{input};

        var toTest = new DataRowParser<>(
                mockFileType(),
                mockInputColumnSchemas("myField", "DATE", dateFormat),
                new DefaultValueMapping(Collections.emptyMap()),
                new StringDataWrapperParser()
        );

        assertThat(toTest.parse(lineArray).getData())
                .hasSize(1)
                .first().isInstanceOfSatisfying(NonNullDataCell.class, nonNullDataCell -> {
                    assertThat(nonNullDataCell.getField()).isEqualTo("myField");
                    assertThat(nonNullDataCell.getDataWrapper()).isNotNull().extracting(DataWrapper::data).satisfies(data -> {
                        assertThat(data.getClass()).isEqualTo(LocalDate.class);
                        assertThat(data.toString()).isEqualTo(expectedValue);
                    });
                });
    }

    /*
     * Utility
     */

    private AbstractFileType mockFileType() {
        var fileTypeInfo = mock(TextFileType.class);
        doReturn(0).when(fileTypeInfo).getStartingColumn();
        return fileTypeInfo;
    }

    private InputColumnSchemas mockInputColumnSchemas(String columnField, String columnType, String dateFormat) throws JsonProcessingException {
        var objectNode = MAPPER.createObjectNode()
                .put("field", columnField)
                .put("type", columnType);

        if (dateFormat != null) {
            objectNode.put("dateFormat", dateFormat);
        }

        var schema = MAPPER.treeToValue(objectNode, InputColumnSchema.class);
        return new InputColumnSchemas(List.of(schema));
    }

    private InputColumnSchemas mockInputColumnSchemas(String columnField, String columnType) throws JsonProcessingException {
        return mockInputColumnSchemas(columnField, columnType, null);
    }
}
