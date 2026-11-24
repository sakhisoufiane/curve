package com.curve.pojos;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.cell.NonNullDataCell;
import org.apache.beam.repackaged.kryo.com.esotericsoftware.kryo.Kryo;
import org.apache.beam.repackaged.kryo.com.esotericsoftware.kryo.io.Input;
import org.apache.beam.repackaged.kryo.com.esotericsoftware.kryo.io.Output;
import org.apache.beam.repackaged.kryo.com.esotericsoftware.kryo.util.DefaultInstantiatorStrategy;
import org.apache.beam.repackaged.kryo.org.objenesis.strategy.StdInstantiatorStrategy;
import org.junit.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;

import static com.curve.pojos.data.DataWrapper.Factory.asString;
import static org.junit.Assert.assertEquals;

public class DataRowTest {

    /**
     * Verify that we can successfully serialize and de-serialize DataRows with Kryo
     */
    @Test
    public void testKryoSerialization() throws Exception {

        var dataCells = List.of(new NonNullDataCell("myField", asString("Hello world!")));

        var toTest = new DataRow(dataCells, dataCells);

        Kryo kryo = new Kryo();
        kryo.setRegistrationRequired(false);
        kryo.setInstantiatorStrategy(new DefaultInstantiatorStrategy(new StdInstantiatorStrategy()));
        kryo.register(DataRow.class);

        var baos = new ByteArrayOutputStream();

        Output output = new Output(baos);
        kryo.writeObject(output, toTest);
        output.close();

        var bais = new ByteArrayInputStream(baos.toByteArray());

        Input input = new Input(bais);
        DataRow newRow = kryo.readObject(input, DataRow.class);
        input.close();

        assertEquals(newRow, toTest);
    }
}
