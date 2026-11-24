package com.curve.pojos.transformations.condition.group;

import com.curve.pojos.cell.DataRow;
import com.curve.pojos.transformations.condition.Condition;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Collections;
import java.util.List;

import static com.curve.testutil.AssertionUtils.assertFalseIfNotInverted;
import static com.curve.testutil.AssertionUtils.assertTrueIfNotInverted;

public class AndTest {

    @ParameterizedTest
    @ValueSource(booleans= {false, true})
    void testTwoFalseOneTrue(boolean inverted) {

        List<Condition> conditions = List.of(
                mockCondition(false),
                mockCondition(true),
                mockCondition(false)
        );

        var toTest = new And("and", inverted, conditions);
        var result = toTest.evaluate(new DataRow(Collections.emptyList(), Collections.emptyList()));
        assertFalseIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans= {false, true})
    void testThreeFalse(boolean inverted) {

        List<Condition> conditions = List.of(
                mockCondition(false),
                mockCondition(false),
                mockCondition(false)
        );

        var toTest = new And("and", inverted, conditions);
        var result = toTest.evaluate(new DataRow(Collections.emptyList(), Collections.emptyList()));
        assertFalseIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans= {false, true})
    void testThreeTrue(boolean inverted) {

        List<Condition> conditions = List.of(
                mockCondition(true),
                mockCondition(true),
                mockCondition(true)
        );

        var toTest = new And("and", inverted, conditions);
        var result = toTest.evaluate(new DataRow(Collections.emptyList(), Collections.emptyList()));
        assertTrueIfNotInverted(result, inverted);
    }

    @ParameterizedTest
    @ValueSource(booleans= {false, true})
    void testEmpty(boolean inverted) {

        List<Condition> conditions = List.of(
        );

        var toTest = new And("and", inverted, conditions);
        var result = toTest.evaluate(new DataRow(Collections.emptyList(), Collections.emptyList()));
        assertTrueIfNotInverted(result, inverted);
    }

    private Condition mockCondition(boolean result) {
        return new Condition() {
            @Override
            public String getType() {
                return "mock";
            }

            @Override
            public boolean evaluate(DataRow dataRow) {
                return result;
            }
        };
    }
}
