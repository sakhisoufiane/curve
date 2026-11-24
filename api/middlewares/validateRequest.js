const { z } = require('zod');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { clientSchema, clientPutQuerySchema } = require('../models/client.schema');

/** Validates a route `:id` param as a 24-character MongoDB ObjectId hex string. */
const objectIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid Request'),
});

/**
 * Registry of Zod schemas keyed by 'METHOD /route/path'.
 * Add new entries here as more routes adopt schema validation.
 *
 * @type {Record<string, { params?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, body?: import('zod').ZodTypeAny }>}
 */
const ROUTE_SCHEMAS = {
  'PUT /clients/:id': {
    params: objectIdSchema,
    query: clientPutQuerySchema,
    body: clientSchema,
  },
};

/**
 * Returns Express middleware that validates `req.params`, `req.query`, and/or `req.body` against
 * the schemas registered under `key` in {@link ROUTE_SCHEMAS}.
 *
 * On success: attaches `req.validatedParams`, `req.validatedQuery`, and `req.validatedBody`,
 * then calls `next()`.
 *
 * On params failure: responds 400 with `{ message: 'Invalid Request' }`.
 * On query/body failure: responds 400 with `{ message: 'Validation error', errors: [{ field, message }] }`.
 *
 * @param {keyof typeof ROUTE_SCHEMAS} key - An entry key from ROUTE_SCHEMAS, e.g. `'PUT /clients/:id'`.
 * @returns {import('express').RequestHandler}
 */
const validateRequest = (key) => (req, res, next) => {
  const schemas = ROUTE_SCHEMAS[key];
  if (!schemas) return next();

  if (schemas.params) {
    const result = schemas.params.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid Request' });
    }
    req.validatedParams = result.data;
  }

  if (schemas.query) {
    const result = schemas.query.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        message: `Validation error: ${result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      });
    }
    req.validatedQuery = result.data;
  }

  if (schemas.body) {
    const result = schemas.body.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: `Validation error: ${result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      });
    }
    req.validatedBody = result.data;
  }

  return next();
};

module.exports = { ROUTE_SCHEMAS, validateRequest };
