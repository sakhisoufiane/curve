// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// https://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or https://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.

package com.curve;

import com.fasterxml.jackson.core.JsonProcessingException;
import org.apache.beam.sdk.testing.TestPipeline;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;

@RunWith(JUnit4.class)
public class AppTest {
	@Rule
	public final TestPipeline pipeline = TestPipeline.create();

	@Test
	public void appToStringsCorrectly() throws JsonProcessingException {
		// TODO: Update test, as now output is file options dependent

//		int numOfRows = 5;
//		int numOfCells = 3;
//		DataRow[] dataRows = new DataRow[numOfRows];
//
//		for (int i = 0; i < dataRows.length; i++) {
//			dataRows[i] = createDummyDataRow(numOfCells);
//		}
//
//		List<DataRow> dataRowList = Arrays.asList(dataRows);
//		ArrayList<String> expectedOutput = new ArrayList<>();
//		for (DataRow dataRow : dataRowList) {
//			expectedOutput.add(dataRow.toString());
//		}
//
//
//		PCollection<DataRow> input = pipeline.apply(Create.of(dataRowList));
//
//		PCollection<String> output = App.toStringDataRows(input);
//
//		PAssert.that(output)
//				.containsInAnyOrder(expectedOutput);
//
//		pipeline.run();
	}

//	private DataRow createDummyDataRow(int length) {
//		ArrayList<DataCell> dataCells = new ArrayList<>();
//		for(int i = 0; i < length; i++) {
//			dataCells.add(new NonNullDataCell("Channel", SchemaTypes.STRING, ("Test " + i)));
//		}
//		return DataRow.Factory.createFromInputData(dataCells);
//	}
}
