package com.curve.pojos;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.input.type.*;
import com.curve.util.parser.data.wrapper.StringDataWrapperParser;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.util.Objects;
import java.util.regex.Pattern;

import static com.curve.pojos.data.DataWrapper.Factory.*;

/**
 * Represents a user-configured default value.
 *
 * Default values should always have a field name that we are setting in the data, the dataType of that data, and either:
 * * A value, which is the value to set the field to if it is null
 * * A location, which represents a cell in the data we need to look up to find the default value
 */
public class DefaultValue implements Serializable {

    private static final ObjectMapper OBJECT_MAPPER = JsonMapper.builder()
            .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_VALUES)
            .build();
    
    private static final Pattern CELL_LOCATION = Pattern.compile("(?<=\\D)(?=\\d)|(?<=\\d)(?=\\D)");

    private final String field;
    private final InputTypeInformation inputTypeInformation;
    private final Cell location;
    private final Serializable value;

    // TODO - This probably shouldn't belong here
    private final StringDataWrapperParser stringDataWrapperParser = new StringDataWrapperParser();
    
    @JsonCreator
    public DefaultValue(
            @JsonProperty(value = "field", required = true) String field,
            @JsonProperty(value = "dataType", required = true) String dataType,
            @JsonProperty(value = "location") String location,
            @JsonProperty(value = "value") Serializable value,
            @JsonProperty(value = "dateFormat") String dateFormat
    ) throws ValidationException {
        this.field = field;

        var node = OBJECT_MAPPER.createObjectNode()
                .put("type", dataType);

        if (dataType.equalsIgnoreCase("Date")) {
            node.put("dateFormat", dateFormat);
        }

        // TODO find a better way to do this
        this.inputTypeInformation = OBJECT_MAPPER.convertValue(
                node,
                InputTypeInformation.class
        );

        if (location != null) {
            this.location = createCellFromLocationString(location);
            this.value = null;
        } else if (value != null) {
            this.location = null;
            this.value = value;
        } else {
            throw new ValidationException("Either a location or a value must be specified for a default value");
        }
    }

    /**
     * @return The name of the field to default
     */
    @Nonnull
    public String getField() {
        return this.field;
    }

    /**
     * @return The information about the type of this default value
     */
    @Nonnull
    public InputTypeInformation getInputTypeInformation() {
        return this.inputTypeInformation;
    }

    /**
     * @return The cell to look up in the file to find the default value. If null, then a fixed value is set
     */
    @Nullable
    public Cell getLocation() {
        return location;
    }

    /**
     * @return The value. If null, then a cell location has been set to look up
     */
    @Nullable
    public Serializable getValue() {
        return value;
    }

    @Nonnull
    private static Cell createCellFromLocationString(String location) {
        String[] cellLocationParts = CELL_LOCATION.split(location);

        // TODO throw better error if cell location is malformed

        String letters = cellLocationParts[0];
        String numbers = cellLocationParts[1];

        int lettersValue = 0;
        for (char ch : letters.toUpperCase().toCharArray()) {
            lettersValue = lettersValue * 26 + (ch - 'A');
        }

        return new Cell(
                Integer.parseInt(numbers) - 1,
                lettersValue
        );
    }
    
    // TODO wtf
    @Nullable
    public DataWrapper<?> coerceFromValue() {
        var stringy = asString(fromSerializable(value));
        return stringy != null ? coerceFromString(stringy.data()) : null;
    }
    
    @Nullable
    public DataWrapper<?> coerceFromString(@Nullable String str) {
        return stringDataWrapperParser.parse(inputTypeInformation, str);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        DefaultValue that = (DefaultValue) o;
        return Objects.equals(field, that.field) &&
                Objects.equals(inputTypeInformation, that.inputTypeInformation) &&
                Objects.equals(location, that.location) &&
                Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(field, inputTypeInformation, location, value);
    }

    @Override
    public String toString() {
        return "DefaultValue{" +
                "field='" + field + '\'' +
                ", inputTypeInformation='" + inputTypeInformation + '\'' +
                ", location=" + location +
                ", value=" + value +
                '}';
    }

    public record Cell(int row, int column) implements Serializable {}
}
