package com.curve;

import com.curve.configuration.Configuration;
import com.curve.configuration.ProcessorOptions;
import com.curve.exceptions.ValidationException;
import com.curve.pojos.cell.DataRow;
import com.curve.pojos.input.config.InputConfig;
import com.curve.pojos.input.config.source.GCSFileSource;
import com.curve.pojos.transformations.Copy;
import com.curve.pojos.transformations.Transformation;
import com.curve.transforms.OutputTransformer;
import com.curve.transforms.TransformationApplier;
import com.curve.util.DefaultValueMapping;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationConfig;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.beam.sdk.Pipeline;
import org.apache.beam.sdk.options.PipelineOptionsFactory;
import org.apache.beam.sdk.values.PCollection;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

public class App {

    public static void main(String[] args) throws IOException, ValidationException {
        PipelineOptionsFactory.register(ProcessorOptions.class);
        ProcessorOptions options = PipelineOptionsFactory.fromArgs(args).withValidation().as(ProcessorOptions.class);
        run(options);
    }

    public static void run(ProcessorOptions options) throws IOException, ValidationException {
        var pipeline = Pipeline.create(options);

        // Parse file opening rules from our beam options.
        ConfigurationFactory configurationFactory = new ConfigurationFactory();
        Configuration givenConfiguration = configurationFactory.createConfiguration(options);

        InputConfig inputConfig = givenConfiguration.getInputConfig();

        var fileTypeHandler = inputConfig.getFileType().getFileTypeHandler();
        var defaultValues = fileTypeHandler.extractDefaultValuesFromFile(
                inputConfig.getFileSource(),
                inputConfig.getDefaultValues()
        );

        List<Transformation> newTransformations = new ArrayList<>();
        Transformation proRataTranformation = calculateProRata(givenConfiguration, defaultValues);
        if (proRataTranformation != null) newTransformations.add(proRataTranformation);
        newTransformations.addAll(givenConfiguration.getTransformations());

        Configuration newConfiguration = new Configuration(
                givenConfiguration.getInputConfig(),
                givenConfiguration.getInputColumnSchemas().getInputColumnSchemas(),
                newTransformations,
                givenConfiguration.getOutputConfig(),
                givenConfiguration.getOutputSchemas()
        );

        PCollection<DataRow> inputRows = pipeline.begin()
                .apply("Read input file", fileTypeHandler.createRowReader(
                        newConfiguration.getInputConfig().getFileSource(),
                        newConfiguration.getInputColumnSchemas(),
                        defaultValues
                ));

        PCollection<DataRow> postTransformRows = applyTransformations(inputRows, newConfiguration);
        PCollection<String> dataRowsStrings = convertDataRows(postTransformRows, newConfiguration);

        givenConfiguration.getOutputConfig().outputData(dataRowsStrings, newConfiguration);

        pipeline.run();
    }

   

    private static PCollection<DataRow> applyTransformations(PCollection<DataRow> inputRows, Configuration configuration) {
        return inputRows.apply("Apply transformations", new TransformationApplier(configuration));
    }

    public static PCollection<String> convertDataRows(PCollection<DataRow> dataRows, Configuration configuration) {
        return dataRows.apply("Write output to file", new OutputTransformer(configuration));
    }

    /**
     * Creates a transformation which will emit the per-unit amount to a given column in the data row, based on
     * the configured pro-rata total and total unit amount. If no total unit amount is given, this will be calculated
     * from the file.
     * 
     * @param givenConfiguration
     * @param defaultValues
     * @return
     * @throws IOException
     * @throws ValidationException
     */
    private static Transformation calculateProRata(
            Configuration givenConfiguration,
            DefaultValueMapping defaultValues
    ) throws IOException, ValidationException {
        var proRataConfig = givenConfiguration.getInputConfig().getProRata();
        if (proRataConfig != null) {
            var totalAmount = proRataConfig.getTotalAmount();
            var totalUnits = proRataConfig.getTotalUnits();

            if (totalUnits == null) {
                var inputConfig = givenConfiguration.getInputConfig();
                var fileTypeHandler = inputConfig.getFileType().getFileTypeHandler();
                
                totalUnits = fileTypeHandler.getTotalUnits(
                        inputConfig.getFileSource(),
                        givenConfiguration.getInputColumnSchemas(),
                        proRataConfig.getUnitValueProvider(),
                        defaultValues
                ).longValue();
            }

            // Do no transform if we found no units
            if (totalUnits == 0) return null;

            var unitPrice = totalAmount.divide(
                    new BigDecimal(totalUnits),
                    new MathContext(17, RoundingMode.HALF_UP)
            );

            return new Copy(
                    "copy",
                    null,
                    null,
                    null,
                    unitPrice,
                    proRataConfig.getOutputFieldName(),
                    false
            );
        }
        return null;
    }
    
    public static class ConfigurationFactory {

        private static final ObjectMapper MAPPER = new ObjectMapper();

        static {
            DeserializationConfig deserializationConfig = MAPPER.getDeserializationConfig()
                    .with(MapperFeature.ACCEPT_CASE_INSENSITIVE_VALUES, true);
            MAPPER.setConfig(deserializationConfig);
        }

        public Configuration createConfiguration(ProcessorOptions options) throws IOException, ValidationException {
            if (!options.getIngestionConfigurationUrl().isBlank()) {
                return createConfigurationFromUrl(options.getIngestionConfigurationUrl());
            } else if (!options.getIngestionConfiguration().isBlank()) {
                return createConfigurationFromIngestionConfiguration(options.getIngestionConfiguration());
            } else {
                throw new ValidationException("Expected a valid configuration but found none.");
            }
        }

        private Configuration createConfigurationFromUrl(String url) throws ValidationException, IOException {
            GCSFileSource gcsFileSource = new GCSFileSource(url);
            return MAPPER.readValue(gcsFileSource.getInputStream(), Configuration.class);
        }

        private Configuration createConfigurationFromIngestionConfiguration(String ingestionConfiguration) throws JsonProcessingException {
            return MAPPER.readValue(ingestionConfiguration, Configuration.class);
        }
    }
}
