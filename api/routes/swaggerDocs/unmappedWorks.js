/**
 * @openapi
 * /unmappedWorks:
 *   get:
 *     tags:
 *       - "Unmapped Works"
 *     summary: Retrieve all unmapped works
 *     description: Returns a paginated list of unmapped works. Requires read access to catalogue.
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
 *         name: createdAfter
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter unmapped works created on or after this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: createdBefore
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter unmapped works created on or before this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: updatedAfter
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter unmapped works updated on or after this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: updatedBefore
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter unmapped works updated on or before this date (inclusive, YYYY-MM-DD format)
 *     responses:
 *       200:
 *         description: Successfully retrieved unmapped works
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unmappedWorks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AggregateUnmappedWork'
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
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Forbidden"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal error, please try again"
 *   put:
 *     tags:
 *       - "Unmapped Works"
 *     summary: Update unmapped works
 *     description: Updates multiple unmapped works. Requires edit access to catalogue.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of unmapped work IDs to update
 *     responses:
 *       200:
 *         description: Successfully updated unmapped works
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AggregateUnmappedWork'
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
 *       404:
 *         description: Unmapped works not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find associated Unmapped Works"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal error, please try again"
 *
 * /unmappedWorks/add_bulk_aliases:
 *   post:
 *     tags:
 *       - "Unmapped Works"
 *     summary: Add bulk aliases to unmapped works
 *     description: Adds aliases to multiple unmapped works. Requires edit access to catalogue.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - aliases
 *             properties:
 *               aliases:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of aliases to add
 *     responses:
 *       200:
 *         description: Successfully added aliases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Completed Adding Aliases to Works"
 *       400:
 *         description: Bad request, missing aliases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Aliases are required to be passed"
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal error, please try again"
 *
 * /unmappedWorks/create_works:
 *   post:
 *     tags:
 *       - "Unmapped Works"
 *     summary: Create works from unmapped works
 *     description: Creates multiple works from unmapped works. Requires edit access to catalogue.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - works
 *             properties:
 *               works:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of unmapped works to convert to works
 *     responses:
 *       200:
 *         description: Successfully created works
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 created:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: IDs of successfully created works
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: IDs of works that failed to create
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unfortunately we couldn't complete your request. Please try again, or contact the support team."
 *
 * /unmappedWorks/{id}:
 *   get:
 *     tags:
 *       - "Unmapped Works"
 *     summary: Retrieve a specific unmapped work
 *     description: Returns details for a specific unmapped work by ID. Requires read access to catalogue.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unmapped work ID
 *     responses:
 *       200:
 *         description: Successfully retrieved unmapped work
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnmappedWork'
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
 *       404:
 *         description: Unmapped work not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find UnmappedWork with ID 123456789012"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal error, please try again"
 *
 * /unmappedWorks/{id}/history:
 *   get:
 *     tags:
 *       - "Unmapped Works"
 *     summary: Retrieve history for an unmapped work
 *     description: Returns the modification history for a specific unmapped work.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unmapped work ID
 *     responses:
 *       200:
 *         description: Successfully retrieved unmapped work history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 modelHistory:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       author:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           email:
 *                             type: string
 *                       ops:
 *                         type: array
 *                         items:
 *                           type: object
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
 *       404:
 *         description: Unmapped work not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find UnmappedWork with ID 123456789012"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal error, please try again"
 *
 * components:
 *   schemas:
 *     UnmappedWork:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the unmapped work
 *         clientId:
 *           type: string
 *           description: Client ID associated with the unmapped work
 *         title:
 *           type: string
 *           description: Title of the unmapped work
 *         composer:
 *           type: string
 *           description: Composer of the unmapped work
 *         foreignId:
 *           type: string
 *           description: Foreign identifier for the unmapped work
 *         identifier:
 *           type: string
 *           description: Identifier for the unmapped work
 *         source:
 *           type: string
 *           description: Source of the unmapped work
 *         iswc:
 *           type: string
 *           description: International Standard Musical Work Code
 *         tunecode:
 *           type: string
 *           description: Tunecode for the unmapped work
 *         workId:
 *           type: string
 *           description: ID of the associated work if mapped
 *         complete:
 *           type: boolean
 *           description: Whether the unmapped work has been processed
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the unmapped work was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the unmapped work was last updated
 *     AggregateUnmappedWork:
 *       type: object
 *       properties:
 *         _id:
 *           type: object
 *           properties:
 *             identifier:
 *               type: string
 *               description: Identifier for the unmapped work
 *             iswc:
 *               type: string
 *               description: ISWC of the unmapped work
 *             tunecode:
 *               type: string
 *               description: Tunecode of the unmapped work
 *             songcode:
 *               type: string
 *               description: Songcode of the unmapped work
 *             source:
 *               type: string
 *               description: Source of the unmapped work
 *             title:
 *               type: string
 *               description: Title of the unmapped work
 *           description: Composite key identifying the grouped unmapped works
 *         title:
 *           type: string
 *           description: Title of the first unmapped work in the group
 *         ids:
 *           type: array
 *           items:
 *             type: string
 *           description: IDs of all unmapped works in this group
 *         iswc:
 *           type: array
 *           items:
 *             type: string
 *           description: ISWCs of all unmapped works in this group
 *         tunecode:
 *           type: array
 *           items:
 *             type: string
 *           description: Tunecodes of all unmapped works in this group
 *         songcode:
 *           type: array
 *           items:
 *             type: string
 *           description: Songcodes of all unmapped works in this group
 *         party1:
 *           type: array
 *           items:
 *             type: string
 *           description: Party 1 values from all unmapped works in this group
 *         party2:
 *           type: array
 *           items:
 *             type: string
 *           description: Party 2 values from all unmapped works in this group
 *         party3:
 *           type: array
 *           items:
 *             type: string
 *           description: Party 3 values from all unmapped works in this group
 *         workId:
 *           type: array
 *           items:
 *             type: string
 *           description: Work IDs if any unmapped works in the group are mapped
 *         netValue:
 *           type: number
 *           description: Sum of net amounts for all unmapped works in this group
 *         salesFileId:
 *           type: string
 *           description: Sales file ID of the first unmapped work in the group
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the first unmapped work in the group was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the first unmapped work in the group was last updated
 *
 * /unmappedWorks/raw-export:
 *   post:
 *     tags:
 *       - "Unmapped Works"
 *     summary: Raw CSV Export of Unmapped Works
 *     description: |
 *       Export unmapped works data to a raw CSV file. By default, the export is processed asynchronously
 *       and a notification email is sent when complete. When sync=true, the request waits for
 *       the export to complete and returns the download URL directly in the response.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sync:
 *                 type: boolean
 *                 default: false
 *                 description: |
 *                   If true, waits for export to complete and returns download URL directly.
 *                   If false (default), sends notification email when export is ready.
 *               filter:
 *                 type: object
 *                 description: Filter object to select unmapped works for export.
 *                 properties:
 *                   text:
 *                     type: string
 *                     description: Text search filter for title, tunecode, iswc, identifier, party1, party2, party3.
 *                   source:
 *                     type: string
 *                     description: Filter by source.
 *                   complete:
 *                     type: string
 *                     description: Filter by complete status (true/false).
 *                   createdAfter:
 *                     type: string
 *                     format: date
 *                     description: Filter for unmapped works created on or after this date. Date-only values use start of day UTC.
 *                     example: "2025-01-01"
 *                   createdBefore:
 *                     type: string
 *                     format: date
 *                     description: Filter for unmapped works created on or before this date. Date-only values use end of day UTC.
 *                     example: "2025-12-31"
 *                   updatedAfter:
 *                     type: string
 *                     format: date
 *                     description: Filter for unmapped works updated on or after this date. Date-only values use start of day UTC.
 *                     example: "2025-01-01"
 *                   updatedBefore:
 *                     type: string
 *                     format: date
 *                     description: Filter for unmapped works updated on or before this date. Date-only values use end of day UTC.
 *                     example: "2025-12-31"
 *     responses:
 *       200:
 *         description: |
 *           When sync=false (default): Export process started successfully, email notification will be sent.
 *           When sync=true: Export completed, returns download URL (expires in 24 hours).
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Your report will be sent to you via email shortly"
 *                   description: Response when sync=false (default)
 *                 - type: object
 *                   properties:
 *                     csvPublicLink:
 *                       type: string
 *                       format: uri
 *                       example: "https://s3.amazonaws.com/bucket/raw_exports/Client-unmappedworks%20raw%20export%2020260120133708304.csv"
 *                   description: Response when sync=true
 *       403:
 *         description: Forbidden, the user does not have sufficient rights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while processing the export.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 *                   description: Error details (only returned when sync=true)
 */
