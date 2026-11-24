package com.curve.pojos.transformations.condition;

import com.curve.pojos.cell.DataRow;

public class Always implements Condition {

    public static final Always INSTANCE = new Always();
    public static final String TYPE = "always";

    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    public boolean evaluate(DataRow dataRow) {
        return true;
    }
}
