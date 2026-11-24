const { z } = require('zod');

const csvTrackRowSchema = z.object({
  ID: z.string().min(1, 'ID is required'),
}).loose(); // Allow additional optional fields (payee columns, etc)

module.exports = { csvTrackRowSchema };
