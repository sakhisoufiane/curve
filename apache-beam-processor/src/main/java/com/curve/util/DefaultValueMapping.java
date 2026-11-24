package com.curve.util;

import com.curve.pojos.DefaultValue;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.input.schemas.InputColumnSchemas;
import com.curve.pojos.input.schemas.NonNullInputColumnSchema;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.Serializable;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * A mapping of configured DefaultValues, to their value
 */
public class DefaultValueMapping implements Serializable {

    private final Map<DefaultValue, DataWrapper<?>> mappings;

    /**
     * A map of all the field names to their values. Updated as callers check for field name and mappings are found
     */
    private final Map<String, DataWrapper<?>> fieldNameToValue = Collections.synchronizedMap(new HashMap<>());

    /**
     * A map of all the field names not contained in the mappings.
     * Updated as callers check for field name and mappings are not found
     */
    private final Set<String> fieldNamesNotFound = Collections.synchronizedSet(new HashSet<>());

    public DefaultValueMapping(Map<DefaultValue, DataWrapper<?>> mappings) {
        this.mappings = Collections.synchronizedMap(mappings);
    }

    /**
     * Find the value associated with the field name. This operation is thread-safe.
     *
     * TODO coerce to the correct type based on the type in the DefaultValue
     *
     * @param name The field name
     * @return The value, or null if it is not found
     */
    @Nullable
    public DataWrapper<?> getByFieldName(@Nonnull String name) {
        // We keep a positive and negative cache here, as we expect this operation to be invoked frequently with the
        // same field names, and repeatedly creating entry sets to search for values is quite expensive.
        var knownField = fieldNameToValue.get(name);
        if (knownField != null) {
            return knownField;
        }

        if (fieldNamesNotFound.contains(name)) return null;

        var foundField = mappings.entrySet().stream()
                .filter((entry) -> entry.getKey().getField().equals(name))
                .findFirst()
                .map(Map.Entry::getValue)
                .orElse(null);

        if (foundField != null) {
            fieldNameToValue.put(name, foundField);
        } else {
            fieldNamesNotFound.add(name);
        }
        return foundField;
    }

    public Map<DefaultValue, DataWrapper<?>> getMissingDefaults(InputColumnSchemas inputColumnSchemas) {
        // Create a copy of all the mappings. We will filter this map and return it
        var rtn = new LinkedHashMap<>(mappings);

        // Gather all the default values by field name, so we know what keys to remove from the map
        var defaultsByFieldName = mappings.keySet().stream()
                .collect(Collectors.toMap(DefaultValue::getField, Function.identity()));

        // Iterate over all the input column schemas that have a field name
        inputColumnSchemas.getInputColumnSchemas().stream()
                .filter((schema) -> schema instanceof NonNullInputColumnSchema)
                .map((schema) -> (NonNullInputColumnSchema<?>) schema)
                .map(NonNullInputColumnSchema::getField)
                // Check the map for the field name of the schema. If it exists, remove it
                .forEach((fieldNameToRemove) -> {
                    DefaultValue defaultValueToRemove = defaultsByFieldName.get(fieldNameToRemove);
                    if (defaultValueToRemove != null) {
                        rtn.remove(defaultValueToRemove);
                    }
                });

        return rtn;
    }

}
