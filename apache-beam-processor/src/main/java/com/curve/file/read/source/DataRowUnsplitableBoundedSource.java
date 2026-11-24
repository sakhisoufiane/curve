package com.curve.file.read.source;

import com.curve.pojos.cell.DataRow;
import org.apache.beam.sdk.coders.Coder;
import org.apache.beam.sdk.extensions.kryo.KryoCoder;

import javax.annotation.Nonnull;

/**
 * An unsplitable BoundedSource for reading DataRows
 */
public abstract class DataRowUnsplitableBoundedSource extends UnsplitableBoundedSource<DataRow> {

    @Override
    public @Nonnull Coder<DataRow> getOutputCoder() {
        return KryoCoder.of();
    }

}
