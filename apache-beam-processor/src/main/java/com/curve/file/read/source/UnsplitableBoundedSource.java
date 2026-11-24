package com.curve.file.read.source;

import org.apache.beam.sdk.io.BoundedSource;
import org.apache.beam.sdk.options.PipelineOptions;

import javax.annotation.Nonnull;
import java.io.Serializable;
import java.util.List;

/**
 * A Bounded source that doesn't know anything about it's true source. Split operations are not possible, and the source
 * size is unknown
 */
public abstract class UnsplitableBoundedSource<T extends Serializable> extends BoundedSource<T> {

    @Override
    @Nonnull
    public List<? extends BoundedSource<T>> split(long desiredBundleSizeBytes, @Nonnull PipelineOptions options) {
        return List.of(this);
    }

    @Override
    public long getEstimatedSizeBytes(@Nonnull PipelineOptions options) {
        return 0L;
    }
}
