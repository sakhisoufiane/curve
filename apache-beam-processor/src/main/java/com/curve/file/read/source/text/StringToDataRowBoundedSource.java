package com.curve.file.read.source.text;

import com.curve.pojos.cell.DataRow;
import com.curve.util.parser.data.row.DataRowParser;
import com.curve.util.parser.line.LineSplitter;
import org.apache.beam.sdk.coders.Coder;
import org.apache.beam.sdk.extensions.kryo.KryoCoder;
import org.apache.beam.sdk.io.BoundedSource;
import org.apache.beam.sdk.options.PipelineOptions;
import org.apache.beam.sdk.transforms.display.DisplayData;
import org.joda.time.Instant;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.IOException;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * Wraps a BoundedSource producing lines of a file as a String, and creates DataRows from those Strings
 */
public class StringToDataRowBoundedSource extends BoundedSource<DataRow> {

    @Nonnull
    private final BoundedSource<String> delegate;
    @Nonnull
    private final LineSplitter<String, String> splitter;
    @Nonnull
    private final DataRowParser<String> parser;

    public StringToDataRowBoundedSource(
            @Nonnull BoundedSource<String> delegate,
            @Nonnull LineSplitter<String, String> splitter, 
            @Nonnull DataRowParser<String> parser
    ) {
        this.delegate = delegate;
        this.splitter = splitter;
        this.parser = parser;
    }

    @Nonnull
    @Override
    public List<? extends BoundedSource<DataRow>> split(long desiredBundleSizeBytes, @Nonnull PipelineOptions options) throws Exception {
        return delegate.split(desiredBundleSizeBytes, options).stream()
                .map(delegate -> new StringToDataRowBoundedSource(delegate, splitter, parser))
                .collect(Collectors.toList());
    }

    @Override
    public long getEstimatedSizeBytes(@Nonnull PipelineOptions options) throws Exception {
        return delegate.getEstimatedSizeBytes(options);
    }

    @Override
    public BoundedReader<DataRow> createReader(@Nonnull PipelineOptions options) throws IOException {
        return new StringToDataRowBoundedReader(
                this,
                delegate.createReader(options),
                splitter, parser
        );
    }

    @Override
    public void validate() {
        delegate.validate();
    }

    @Override
    @Nonnull
    public Coder<DataRow> getOutputCoder() {
        return KryoCoder.of();
    }

    @Override
    public void populateDisplayData(DisplayData.Builder builder) {
        delegate.populateDisplayData(builder);
    }

    private static class StringToDataRowBoundedReader extends BoundedReader<DataRow> {

        private final BoundedReader<String> delegate;
        private final LineSplitter<String, String> splitter;
        private final DataRowParser<String> parser;

        private StringToDataRowBoundedSource source;
        private DataRow currentRow;

        public StringToDataRowBoundedReader(
                @Nonnull StringToDataRowBoundedSource source,
                @Nonnull BoundedReader<String> delegate,
                @Nonnull LineSplitter<String, String> splitter, 
                @Nonnull DataRowParser<String> parser
        ) {
            this.source = source;
            this.delegate = delegate;
            this.parser = parser;
            this.splitter = splitter;
        }

        @Override
        public Double getFractionConsumed() {
            return delegate.getFractionConsumed();
        }

        @Override
        public long getSplitPointsConsumed() {
            return delegate.getSplitPointsConsumed();
        }

        @Override
        public long getSplitPointsRemaining() {
            return delegate.getSplitPointsRemaining();
        }

        @Override
        @Nonnull
        public BoundedSource<DataRow> getCurrentSource() {
            return source;
        }

        @Override
        @Nullable
        public synchronized BoundedSource<DataRow> splitAtFraction(double fraction) {
            BoundedSource<String> residual = delegate.splitAtFraction(fraction);

            if (residual != null) {
                this.source = new StringToDataRowBoundedSource(delegate.getCurrentSource(), splitter, parser);
                return new StringToDataRowBoundedSource(residual, splitter, parser);
            } else {
                return null;
            }
        }

        @Override
        @Nonnull
        public Instant getCurrentTimestamp() throws NoSuchElementException {
            return delegate.getCurrentTimestamp();
        }

        @Override
        public boolean start() throws IOException {
            if (delegate.start()) {
                currentRow = parseCurrent();
                return true;
            } else {
                currentRow = null;
                return false;
            }
        }

        @Override
        public boolean advance() throws IOException {
            if (delegate.advance()) {
                currentRow = parseCurrent();
                return true;
            } else {
                currentRow = null;
                return false;
            }
        }

        @Nonnull
        @Override
        public DataRow getCurrent() throws NoSuchElementException {
            if (currentRow == null) {
                throw new NoSuchElementException();
            } else {
                return currentRow;
            }
        }
        
        @Override
        public void close() throws IOException {
            delegate.close();
        }

        private DataRow parseCurrent() throws IOException {
            String rowStr = delegate.getCurrent();
            if (rowStr != null) {
                String[] split = splitter.split(rowStr);
                return parser.parse(split);
            } else {
                return null;
            }
        }
    }
}
