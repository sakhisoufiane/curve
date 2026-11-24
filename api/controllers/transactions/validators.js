const { z } = require('zod');

const TRANSACTION_AMOUNT_VALIDATION_MSG = 'Amount field is not a valid number. You can use digits (0-9), a decimal point (.), and a minus sign (-) for negative numbers.';

const transactionParamsSchema = z.object({
  amount: z.preprocess(
    (val) => (val == null || val === '' ? NaN : val),
    z.coerce.number(TRANSACTION_AMOUNT_VALIDATION_MSG).finite(TRANSACTION_AMOUNT_VALIDATION_MSG).optional(),
  ),
});

module.exports = { transactionParamsSchema };
