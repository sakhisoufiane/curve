package com.curve.pojos.cell;

import com.curve.pojos.data.DataWrapper;
import org.apache.beam.sdk.coders.DefaultCoder;
import org.apache.beam.sdk.extensions.kryo.KryoCoder;

import javax.annotation.Nullable;
import java.io.Serializable;

@DefaultCoder(KryoCoder.class)
public sealed interface DataCell extends Serializable permits NonNullDataCell, NullDataCell {
    @Nullable
    DataWrapper<?> getDataWrapper();
}
