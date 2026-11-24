/**
 * @openapi
 * /unmappedPublishers:
 *   get:
 *     tags:
 *       - "Unmapped Publishers"
 *     summary: Retrieve unmapped publishers
 *     description: Returns a paginated list of unmapped publisher records for the authenticated client. Requires read access to catalogue.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *         description: Number of items per page
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *         description: Field to sort by
 *       - in: query
 *         name: orderDir
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction
 *       - in: query
 *         name: salesFileId
 *         schema:
 *           type: string
 *         description: Filter by a single sales file ID
 *       - in: query
 *         name: salesFileIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by multiple sales file IDs
 *       - in: query
 *         name: complete
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by completion status. Records where the complete field is absent are treated as incomplete.
 *       - in: query
 *         name: text
 *         schema:
 *           type: string
 *         description: Case-insensitive text search against the publisher name
 *     responses:
 *       200:
 *         description: Successfully retrieved unmapped publishers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unmappedPublishers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UnmappedPublisher'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       403:
 *         description: Forbidden, the user does not have sufficient rights
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *
 * /unmappedPublishers/map_to_existing:
 *   post:
 *     tags:
 *       - "Unmapped Publishers"
 *     summary: Map an unrecognised publisher name to an existing publisher
 *     description: |
 *       Resolves an unmapped publisher record by linking it to an existing Publisher document.
 *       The unrecognised name is added as an alias on the target publisher unless it is already
 *       present as an alias or primary name. Marks the UnmappedPublisher record as complete.
 *       Requires edit access to catalogue.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unmappedPublisherId
 *               - publisherId
 *             properties:
 *               unmappedPublisherId:
 *                 type: string
 *                 description: ID of the UnmappedPublisher record to resolve
 *                 example: "64a1f2b3c4d5e6f7a8b9c0d1"
 *               publisherId:
 *                 type: string
 *                 description: ID of the existing Publisher to map to
 *                 example: "64a1f2b3c4d5e6f7a8b9c0d2"
 *     responses:
 *       200:
 *         description: Publisher mapped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Publisher mapped successfully"
 *                 unmappedPublisher:
 *                   $ref: '#/components/schemas/UnmappedPublisher'
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *             example:
 *               message: "unmappedPublisherId and publisherId are required"
 *       403:
 *         description: Forbidden, the user does not have edit rights to catalogue
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *       404:
 *         description: UnmappedPublisher or target Publisher not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *             examples:
 *               unmappedNotFound:
 *                 summary: Unmapped publisher not found
 *                 value:
 *                   message: "Could not find UnmappedPublisher with the given ID"
 *               publisherNotFound:
 *                 summary: Target publisher not found
 *                 value:
 *                   message: "Could not find Publisher with the given ID"
 *       409:
 *         description: Alias conflict — the publisher name is already held as an alias or primary name by a different publisher
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *             example:
 *               message: "Error: 'Publisher 1' already has the alias 'Publisher 2'. Please select a different publisher or create a new one."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *
 * /unmappedPublishers/create_new:
 *   post:
 *     tags:
 *       - "Unmapped Publishers"
 *     summary: Create a new publisher from an unrecognised name
 *     description: |
 *       Creates a new Publisher document using the name from an UnmappedPublisher record, then
 *       marks that record as complete. Returns a 409 if a publisher with the same primary name
 *       or alias already exists for the client — in that case the user should map to the
 *       existing publisher instead. Requires edit access to catalogue.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unmappedPublisherId
 *             properties:
 *               unmappedPublisherId:
 *                 type: string
 *                 description: ID of the UnmappedPublisher record to resolve
 *                 example: "64a1f2b3c4d5e6f7a8b9c0d1"
 *     responses:
 *       200:
 *         description: Publisher created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Publisher created successfully"
 *                 publisher:
 *                   $ref: '#/components/schemas/Publisher'
 *                 unmappedPublisher:
 *                   $ref: '#/components/schemas/UnmappedPublisher'
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *             example:
 *               message: "unmappedPublisherId is required"
 *       403:
 *         description: Forbidden, the user does not have edit rights to catalogue
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *       404:
 *         description: UnmappedPublisher record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *             example:
 *               message: "Could not find UnmappedPublisher with the given ID"
 *       409:
 *         description: A publisher with this name or alias already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *             example:
 *               message: "A publisher named 'Publisher 1' already exists. Use the search box to map to it instead."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *
 * components:
 *   schemas:
 *     UnmappedPublisher:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the unmapped publisher record
 *           example: "64a1f2b3c4d5e6f7a8b9c0d1"
 *         clientId:
 *           type: string
 *           description: Client ID associated with this record
 *           example: "64a1f2b3c4d5e6f7a8b9c0d0"
 *         salesFileId:
 *           type: string
 *           description: ID of the sales file that introduced this unrecognised name
 *           example: "64a1f2b3c4d5e6f7a8b9c0d3"
 *         name:
 *           type: string
 *           description: The unrecognised publisher name from the sales file
 *           example: "Publisher 1"
 *         publisherId:
 *           type: string
 *           description: ID of the Publisher this record was mapped to, once resolved
 *           example: "64a1f2b3c4d5e6f7a8b9c0d2"
 *         complete:
 *           type: boolean
 *           description: Whether this record has been resolved (mapped or newly created)
 *           example: false
 *         count:
 *           type: integer
 *           description: Number of lines in the sales file that reference this publisher name
 *           example: 42
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Publisher:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the publisher
 *           example: "64a1f2b3c4d5e6f7a8b9c0d2"
 *         clientId:
 *           type: string
 *           description: Client ID associated with this publisher
 *         name:
 *           type: string
 *           description: Primary name of the publisher
 *           example: "Publisher 1"
 *         lowerCaseName:
 *           type: string
 *           description: Lowercase version of the primary name, used for uniqueness checks
 *           example: "publisher 1"
 *         aliases:
 *           type: array
 *           items:
 *             type: string
 *           description: Alternative names that resolve to this publisher
 *           example: ["Publisher 1 Alt", "Pub 1"]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ErrorMessage:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Human-readable description of the error
 */
