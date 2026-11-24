package com.curve.pojos.transformations.strategy.input;

import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.data.DataWrapper;
import com.curve.pojos.transformations.value.FixedValueProvider;
import com.curve.pojos.transformations.value.ValueProvider;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.curve.pojos.data.DataWrapper.Factory.asString;

/**
 * The HierarchicalMappingStrategy is a strategy for performing HierarhicalMappings. It takes the given mappings and
 * context, and finds the mapped value from the DataRow and the final value given.
 */
public class HierarchicalMappingStrategy implements InputValueProcessor {
    private static final Logger LOGGER = LoggerFactory.getLogger(HierarchicalMappingStrategy.class);
    
    @Nonnull
    private final JsonNode mappings;
    @Nonnull
    private final List<ValueProvider> contextProviders;
    @Nullable
    private final Pattern regexPattern;

    @JsonCreator
    public HierarchicalMappingStrategy(
            @Nonnull JsonNode mappings,
            @Nonnull List<String> context,
            @Nullable String regex
    ) throws ValidationException {
        this.mappings = mappings;

        this.contextProviders = createContextProviders(context);

        if (regex != null) {
            regex = regex.trim();
            this.regexPattern = !regex.isEmpty() ? Pattern.compile(regex) : null;
        } else {
            this.regexPattern = null;
        }
    }

    @Nullable
    @Override
    public DataWrapper<?> process(@Nonnull DataRow dataRow, @Nullable DataWrapper<?> dataWrapper) {
        /* A hierarchical mapping typically looks up a field name from a DataRow, and uses the value contained
         * in that cell as a key to look up in the mapping we've been provided. This list of field names is the "context"
         *
         * The edge-case is that, for the last element, we don't use the "context", but instead use an input value,
         * which is provided for us here with the parameter "dataWrapper".
         *
         * To begin, we set up a list of ValueProviders, which contains the logic for getting the data depending on what
         * depth we are searching at.
         */
        List<ValueProvider> treePath = new ArrayList<>(contextProviders);
        treePath.add(createValueProviderFromLastValue(dataWrapper));

        try {
            String value = findValueFromTree(dataRow, treePath, mappings);
            // TODO - better data type handling
            return asString(value);
        } catch (MappingException e) {
            LOGGER.error(e.getMessage(), e);
            return null;
        }
    }

    @Nullable
    private String findValueFromTree(
            DataRow dataRow,
            List<ValueProvider> treePath, 
            JsonNode tree
    ) throws MappingException {
        return findValueFromNode(dataRow, tree, treePath, 0);
    }

    @Nullable
    private String findValueFromNode(
            DataRow dataRow, 
            @Nullable JsonNode node, 
            List<ValueProvider> treePath, 
            int currentDepth
    ) throws MappingException {
        if (node == null) {
            // Check if we've been passed a null "next node", and return null if this is the case
            return null;
        } else if (currentDepth == treePath.size() && node.isValueNode()) {
            // If we are at the end of the tree, then return the value. It's possible this is not a text node
            // if the mappings or context array has been misconfigured
            return node.asText();
        } else if (currentDepth < treePath.size() && !node.isValueNode()) {
            // Get the value from the DataRow for this level
            var fieldValueProvider = treePath.get(currentDepth);
            var fieldValueWrapper = asString(fieldValueProvider.provide(dataRow));
            var fieldValue = fieldValueWrapper != null ? fieldValueWrapper.data() : null;
            
            // Get the child node from the mapping, corresponding to this value from the DataRow
            JsonNode nextNode = node.get(fieldValue);
            
            // Recurse down the tree with the next node
            var foundValue = findValueFromNode(dataRow, nextNode, treePath, currentDepth + 1);
            if (foundValue != null) {
                // If we found a value down the tree, then return it up the tree (to complete the recursion)
                return foundValue;
            } else {
                // If a value for the next node is not found, then check to see if the default branch contains a value
                nextNode = node.get("_default");
                return findValueFromNode(dataRow, nextNode, treePath, currentDepth + 1);
            }
        } 

        // This can only happen if the mappings don't correctly correspond to the context
        throw new MappingException(dataRow, treePath, mappings, currentDepth);
    }

    @Nonnull
    private String filterRegexCharacters(@Nonnull String lookupKey) {
        if (this.regexPattern == null) {
            return lookupKey;
        }
        Matcher matcher = regexPattern.matcher(lookupKey);
        return matcher.replaceAll("");
    }

    /**
     * Create a list of ValueProviders, who's job will be to look up fields in the DataRow to find values, based on
     * the field names present in the context list.
     *
     * @param context A list of field names to look up to know what to map
     * @return A list of ValueProviders, who will provide the values of the named fields
     * @throws ValidationException If one of the context values is null
     */
    private List<ValueProvider> createContextProviders(List<String> context) throws ValidationException {
        var rtn = new ArrayList<ValueProvider>();
        for (String element : context) {
            rtn.add(ValueProvider.create(element, null, null));
        }
        return rtn;
    }

    /**
     * Create a ValueProvider to give the name of the last field to look up, based on the
     * DataWrapper.
     *
     * @param lastValue The last value in the mapping chain.
     * @return A ValueProvider that provides that value
     */
    private ValueProvider createValueProviderFromLastValue(DataWrapper<?> lastValue) {
        var stringified = asString(lastValue);
        var filtered = stringified != null ? filterRegexCharacters(stringified.data()) : null;
        return new FixedValueProvider(filtered);
    }
    
    private static class MappingException extends Exception {
        public MappingException(DataRow dataRow, List<ValueProvider> treePath, JsonNode mappings, int currentDepth) {
            super(
                    "Hierarchical Mapping failed at depth: " + currentDepth + 
                            " for dataRow: " + dataRow + 
                            " and path: " + treePath + 
                            " and mappings: " + mappings, 
                    null, 
                    false, 
                    false
            );
        }
    }
}
