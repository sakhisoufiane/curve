/**
 * @openapi
 * /unmappedReleases:
 *   get:
 *     tags:
 *       - "Unmapped Releases"
 *     summary: Retrieve all unmapped releases
 *     description: Returns a paginated list of unmapped releases. Requires read access to catalogue.
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
 *           default: 100
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
 *         name: text
 *         schema:
 *           type: string
 *         description: Search text to filter by title, barcode, catNo, or version
 *       - in: query
 *         name: salesFileIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by sales file IDs
 *       - in: query
 *         name: complete
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by completion status
 *       - in: query
 *         name: createdAfter
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter unmapped releases created on or after this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: createdBefore
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter unmapped releases created on or before this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: updatedAfter
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter unmapped releases updated on or after this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: updatedBefore
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter unmapped releases updated on or before this date (inclusive, YYYY-MM-DD format)
 *     responses:
 *       200:
 *         description: Successfully retrieved unmapped releases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unmappedReleases:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UnmappedRelease'
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
 *
 * /unmappedReleases/create_releases:
 *   post:
 *     tags:
 *       - "Unmapped Releases"
 *     summary: Create releases from unmapped releases
 *     description: Creates multiple releases from unmapped releases. Requires edit access to catalogue.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - releases
 *             properties:
 *               releases:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of unmapped releases to convert to releases
 *     responses:
 *       200:
 *         description: Successfully created releases
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 created:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: IDs of successfully created releases
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: IDs of releases that failed to create
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
 * /unmappedReleases/{id}:
 *   get:
 *     tags:
 *       - "Unmapped Releases"
 *     summary: Retrieve a specific unmapped release
 *     description: Returns details for a specific unmapped release by ID. Requires read access to catalogue.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unmapped release ID
 *     responses:
 *       200:
 *         description: Successfully retrieved unmapped release
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnmappedRelease'
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
 *         description: Unmapped release not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find UnmappedRelease with ID 123456789012"
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
 *       - "Unmapped Releases"
 *     summary: Update an unmapped release
 *     description: Updates an unmapped release's details. Requires write access to catalogue.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unmapped release ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnmappedReleaseInput'
 *     responses:
 *       200:
 *         description: Successfully updated unmapped release
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnmappedRelease'
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
 *         description: Unmapped release not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find UnmappedRelease with ID 123456789012"
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
 * /unmappedReleases/{id}/history:
 *   get:
 *     tags:
 *       - "Unmapped Releases"
 *     summary: Retrieve history for an unmapped release
 *     description: Returns the modification history for a specific unmapped release.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unmapped release ID
 *     responses:
 *       200:
 *         description: Successfully retrieved unmapped release history
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
 *         description: Unmapped release not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find UnmappedRelease with ID 123456789012"
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
 *     UnmappedRelease:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the unmapped release
 *         clientId:
 *           type: string
 *           description: Client ID associated with the unmapped release
 *         title:
 *           type: string
 *           description: Title of the unmapped release
 *         barcode:
 *           type: string
 *           description: Barcode of the release
 *         catNo:
 *           type: string
 *           description: Catalogue number of the release
 *         version:
 *           type: string
 *           description: Version of the release
 *         salesFileId:
 *           type: string
 *           description: ID of the sales file that contains this unmapped release
 *         releaseId:
 *           type: string
 *           description: ID of the associated release if mapped
 *         complete:
 *           type: boolean
 *           description: Whether the unmapped release has been processed
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the unmapped release was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the unmapped release was last updated
 *
 * /unmappedReleases/raw-export:
 *   post:
 *     tags:
 *       - "Unmapped Releases"
 *     summary: Raw CSV Export of Unmapped Releases
 *     description: |
 *       Export unmapped releases data to a raw CSV file. By default, the export is processed asynchronously
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
 *                 description: Filter object to select unmapped releases for export.
 *                 properties:
 *                   text:
 *                     type: string
 *                     description: Text search filter for title, barcode, catNo, or version.
 *                   salesFileIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Filter by sales file IDs.
 *                   complete:
 *                     type: string
 *                     description: Filter by complete status (true/false).
 *                   createdAfter:
 *                     type: string
 *                     format: date
 *                     description: Filter for unmapped releases created on or after this date. Date-only values use start of day UTC.
 *                     example: "2025-01-01"
 *                   createdBefore:
 *                     type: string
 *                     format: date
 *                     description: Filter for unmapped releases created on or before this date. Date-only values use end of day UTC.
 *                     example: "2025-12-31"
 *                   updatedAfter:
 *                     type: string
 *                     format: date
 *                     description: Filter for unmapped releases updated on or after this date. Date-only values use start of day UTC.
 *                     example: "2025-01-01"
 *                   updatedBefore:
 *                     type: string
 *                     format: date
 *                     description: Filter for unmapped releases updated on or before this date. Date-only values use end of day UTC.
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
 *                       example: "https://s3.amazonaws.com/bucket/raw_exports/Client-unmappedreleases%20raw%20export%2020260120133708304.csv"
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
 *
 *     UnmappedReleaseInput:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the unmapped release
 *         barcode:
 *           type: string
 *           description: Barcode of the release
 *         catNo:
 *           type: string
 *           description: Catalogue number of the release
 *         version:
 *           type: string
 *           description: Version of the release
 *         releaseId:
 *           type: string
 *           description: ID of the associated release if mapped
 *         complete:
 *           type: boolean
 *           description: Whether the unmapped release has been processed
 */
