package com.curve.transforms;

import com.curve.configuration.Configuration;
import com.curve.pojos.cell.DataRow;
import com.curve.transforms.functions.CSVOutputFn;
import com.curve.transforms.functions.JSONOutputFn;
import org.apache.beam.sdk.transforms.MapElements;
import org.apache.beam.sdk.transforms.PTransform;
import org.apache.beam.sdk.transforms.ParDo;
import org.apache.beam.sdk.transforms.SimpleFunction;
import org.apache.beam.sdk.values.PCollection;

import javax.annotation.Nonnull;

public class OutputTransformer extends PTransform<PCollection<DataRow>, PCollection<String>> {

    private final Configuration configuration;

    public OutputTransformer (Configuration configuration) {
        this.configuration = configuration;
    }

    @Nonnull
    @Override
    public PCollection<String> expand(@Nonnull PCollection<DataRow> input) {
        if (this.configuration.getOutputConfig().getFileType().equalsIgnoreCase("csv")) {
            return input.apply("Write output as CSV", ParDo.of(new CSVOutputFn(configuration)));
        } else if (this.configuration.getOutputConfig().getFileType().equalsIgnoreCase("json")){
            return input.apply("Write output as JSON", ParDo.of(new JSONOutputFn(configuration)));
        } else {
            return input.apply(
                MapElements.via(
                    new SimpleFunction<Object, String>() {
                        @Override
                        public String apply(Object o) {
                            return o.toString();
                        }
            }));
        }
    }
}
