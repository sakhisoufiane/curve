package com.curve.configuration;

import org.apache.beam.sdk.extensions.gcp.options.GcpOptions;
import org.apache.beam.sdk.options.Default;
import org.apache.beam.sdk.options.Description;

public interface ProcessorOptions extends GcpOptions {
        @Description("The JSON valid string that contains the configuration required to process a sales ingestion")
        @Default.String("")
        String getIngestionConfiguration();
        void setIngestionConfiguration(String value);

        @Description("The string that contains the GCS location of the pipeline configuration.")
        @Default.String("")
        String getIngestionConfigurationUrl();
        void setIngestionConfigurationUrl(String value);
}
