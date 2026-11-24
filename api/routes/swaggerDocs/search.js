/**
 * @openapi
 * /search:
 *   get:
 *     tags:
 *       - "Search"
 *     summary: Search across multiple resources
 *     description: Performs a text search across releases, tracks, works, and contracts. Requires a client ID and no payee ID.
 *     parameters:
 *       - in: query
 *         name: text
 *         schema:
 *           type: string
 *         description: Text to search for across multiple resources
 *     responses:
 *       200:
 *         description: Successfully retrieved search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 releases:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Release'
 *                   description: Matching releases (limited to 4)
 *                 tracks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Track'
 *                   description: Matching tracks (limited to 4)
 *                 works:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Work'
 *                   description: Matching works (limited to 4)
 *                 contracts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contract'
 *                   description: Matching contracts (limited to 4)
 *       403:
 *         description: Forbidden, the user does not have sufficient rights
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Forbidden"
 */
