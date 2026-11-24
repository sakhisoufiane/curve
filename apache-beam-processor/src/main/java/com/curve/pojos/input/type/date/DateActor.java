package com.curve.pojos.input.type.date;

public interface DateActor {
    String modify(String input);
    
    class Split implements DateActor {
        @Override
        public String modify(String input) {
            return input.substring(0, input.length() / 2);
        }
    }
}
