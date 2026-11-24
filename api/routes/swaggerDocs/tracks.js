/**
 * @openapi
 * /tracks:
 *   get:
 *     tags:
 *       - "Tracks"
 *     summary: Retrieve a list of Tracks
 *     description: This route retrieves a list of Tracks based on the provided filters.
 *     parameters:
 *       - in: query
 *         name: text
 *         schema:
 *           type: string
 *         description: The text to be searched.
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         description: The page number for pagination, defaults to 1.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: The number of items to return per page, defaults to 25.
 *       - in: query
 *         name: orderBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["title", "version","artist","isrc","totalParticipation","createdAt","status", "projectId"]
 *           example: title
 *       - in: query
 *         name: orderDir
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["asc","desc"]
 *           example: asc
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of Tracks, returns Tracks along with metadata.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Track'
 *             example:
 *               tracks:
 *                 - _id: "string"
 *                   title: "string"
 *                   artist: "string"
 *                   isrc: "string"
 *                   totalParticipation: 100
 *                   valid: true
 *                   createdAt: "2023-09-13T10:01:03.344Z"
 *                   updatedAt: "2023-09-18T09:44:19.591Z"
 *                   payeesCount: 3
 *                   defaultReleaseId: "string (optional)"
 *                 - _id: "string"
 *                   title: "string"
 *                   artist: "string"
 *                   isrc: "string"
 *                   totalParticipation: 100
 *                   valid: true
 *                   createdAt: "2023-09-13T10:01:03.344Z"
 *                   updatedAt: "2023-09-18T09:44:19.591Z"
 *                   payeesCount: 3
 *                   defaultReleaseId: "string (optional)"
 *               meta:
 *                 currentPage: 1
 *                 totalPages: 2
 *                 total: 34
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
 *         description: Internal server error occurred while trying to retrieve the Tracks.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 *   post:
 *     tags:
 *       - "Tracks"
 *     summary: Create a new Track
 *     description: This route allows for the creation of a new Track.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               artist:
 *                 type: string
 *               title:
 *                 type: string
 *               isrc:
 *                 type: string
 *                 description: Required and should be unique
 *               salesReturnsRights:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     percentage:
 *                       type: number
 *                     contractId:
 *                       type: string
 *                       example: 69d982ele012eb422la9834l
 *     responses:
 *       200:
 *         description: Successfully created the Track.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Track'
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
 *         description: Internal server error occurred while trying to save the Track.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 *   delete:
 *     tags:
 *       - "Tracks"
 *     summary: Delete one or multiple Tracks
 *     description: This route allows for the deletion of one or multiple Tracks, specified by their IDs.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               type:
 *                 type: string
 *                 description: Deletion type, it can be 'multi'. Defaults to 'multi' if not specified.
 *     responses:
 *       200:
 *         description: Successfully deleted the Tracks, returns the result of the operation.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deletedCount:
 *                   type: integer
 *                   example: number
 *             example:
 *               deletedCount: number
 *       201:
 *         description: Indicates that some or all Tracks are attached to other data which needs to be deleted first, returns a message indicating the issue.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Forbidden, the user does not have sufficient rights to perform the deletion.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Not found, the specified Tracks could not be found, returns a message indicating the issue.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to delete the Tracks, returns a message indicating an internal error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /tracks/load-tracks-for-release:
 *   post:
 *     tags:
 *       - "Tracks"
 *     summary: Load Tracks for a specific Release
 *     description: This route loads tracks associated with a specific release ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - releaseId
 *             properties:
 *               releaseId:
 *                 type: string
 *                 description: ID of the release to load tracks for.
 *     responses:
 *       200:
 *         description: Tracks loaded successfully for the release.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tracks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Track'
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
 *         description: Internal server error occurred while loading tracks.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /tracks/export:
 *   post:
 *     tags:
 *       - "Tracks"
 *     summary: Export Tracks data
 *     description: This route exports track data to Excel or CSV format and sends it via email. The export is processed asynchronously.
 *     parameters:
 *       - in: query
 *         name: exportTemplateVersion
 *         schema:
 *           type: string
 *           default: v1
 *         description: The export template version to use.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of track IDs to export. If provided, only these tracks will be exported.
 *               filter:
 *                 type: object
 *                 description: Filter object to select tracks for export. Used when ids are not provided.
 *     responses:
 *       200:
 *         description: Export process started successfully. Email notification will be sent when complete.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Your report will be sent to you via email shortly"
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
 *
 * /tracks/raw-export:
 *   post:
 *     tags:
 *       - "Tracks"
 *     summary: Raw CSV Export of Tracks
 *     description: |
 *       Export tracks data to a raw CSV file. By default, the export is processed asynchronously
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
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of track IDs to export. If provided, only these tracks will be exported.
 *               filter:
 *                 type: object
 *                 description: Filter object to select tracks for export. Used when ids are not provided.
 *                 properties:
 *                   text:
 *                     type: string
 *                     description: Text search filter for title, artist, ISRC, etc.
 *                   createdAfter:
 *                     type: string
 *                     format: date
 *                     description: Filter for tracks created on or after this date. Date-only values use start of day UTC.
 *                     example: "2025-01-01"
 *                   createdBefore:
 *                     type: string
 *                     format: date
 *                     description: Filter for tracks created on or before this date. Date-only values use end of day UTC.
 *                     example: "2025-12-31"
 *                   updatedAfter:
 *                     type: string
 *                     format: date
 *                     description: Filter for tracks updated on or after this date. Date-only values use start of day UTC.
 *                     example: "2025-01-01"
 *                   updatedBefore:
 *                     type: string
 *                     format: date
 *                     description: Filter for tracks updated on or before this date. Date-only values use end of day UTC.
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
 *                       example: "https://s3.amazonaws.com/bucket/raw_exports/Client-tracks%20raw%20export%2020260120133708304.csv"
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
 * /tracks/create_many:
 *   post:
 *     tags:
 *       - "Tracks"
 *     summary: Create multiple Tracks
 *     description: This route creates multiple tracks in a single operation, returning arrays of successfully created and failed track indices.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tracks
 *             properties:
 *               tracks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     index:
 *                       type: integer
 *                       description: Index of the track in the array for tracking success/failure.
 *                     title:
 *                       type: string
 *                       description: Title of the track.
 *                     artist:
 *                       type: string
 *                       description: Artist of the track.
 *                     isrc:
 *                       type: string
 *                       description: ISRC code of the track.
 *                     unmappedTrackId:
 *                       type: string
 *                       description: Optional ID of unmapped track to link.
 *                 description: Array of track objects to create.
 *     responses:
 *       200:
 *         description: Bulk track creation completed. Returns arrays of successful and failed indices.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 created:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   description: Array of indices for successfully created tracks.
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   description: Array of indices for tracks that failed to create.
 *       500:
 *         description: Internal server error occurred while creating tracks.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /tracks/import:
 *   post:
 *     tags:
 *       - "Tracks"
 *     summary: Import Tracks from Excel file
 *     description: This route allows for bulk import of Tracks from an Excel file. The import is processed asynchronously and email notifications are sent about the import status.
 *     parameters:
 *       - in: query
 *         name: overwriteBlanks
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to overwrite blank fields during import.
 *       - in: query
 *         name: importTemplateVersion
 *         schema:
 *           type: string
 *           default: v1
 *         description: The import template version to use.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file containing track data to import.
 *     responses:
 *       200:
 *         description: Import process started successfully. Email notification will be sent when complete.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tracks are importing, and a report will be sent to you shortly."
 *       400:
 *         description: Bad request, file is required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Requires a file to be uploaded"]
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
 *         description: Internal server error occurred while processing the import.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /tracks/updateIsrc:
 *   post:
 *     tags:
 *       - "Tracks"
 *     summary: Update ISRC identifiers from file
 *     description: This route allows internal users to update ISRC identifiers for tracks from an uploaded file. The update is processed asynchronously.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File containing ISRC update data.
 *     responses:
 *       200:
 *         description: ISRC update process started successfully. Email notification will be sent when complete.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "We're updating the ISRC, a report will be sent to you shortly."
 *       400:
 *         description: Bad request, file is required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Requires a file to be uploaded"]
 *       403:
 *         description: Forbidden, only internal users can access this route.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while processing the ISRC update.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /tracks/add_bulk_aliases:
 *   post:
 *     tags:
 *       - "Tracks"
 *     summary: Add bulk aliases to multiple Tracks
 *     description: This route adds aliases to multiple tracks in a single operation, returning arrays of successfully updated and failed track IDs.
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
 *                 type: object
 *                 additionalProperties:
 *                   oneOf:
 *                     - type: string
 *                     - type: array
 *                       items:
 *                         type: string
 *                 description: Object mapping track IDs to aliases. Values can be a single alias string or an array of aliases.
 *                 example:
 *                   "60f1b2b3c4d5e6f7g8h9i0j1": "Alternative Title"
 *                   "60f1b2b3c4d5e6f7g8h9i0j2": ["Alt Title 1", "Alt Title 2"]
 *     responses:
 *       200:
 *         description: Bulk alias addition completed. Returns arrays of successful and failed track IDs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 succeeded:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Array of track IDs that were successfully updated.
 *                 failed:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Array of track IDs that failed to update.
 *       400:
 *         description: Bad request, aliases are required or tracks not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while adding aliases.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /tracks/{id}/history:
 *   get:
 *     tags:
 *       - "Tracks"
 *     summary: Retrieve Track history
 *     description: This route retrieves the modification history for a specific Track, showing all changes made over time.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the Track to retrieve history for.
 *     responses:
 *       200:
 *         description: Track history retrieved successfully.
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
 *                       _id:
 *                         type: string
 *                       ref:
 *                         type: string
 *                       ops:
 *                         type: array
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       author:
 *                         type: object
 *                         properties:
 *                           email:
 *                             type: string
 *       403:
 *         description: Forbidden, the user does not have sufficient rights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Track not found or no history available.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while retrieving Track history.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /tracks/{id}/releases:
 *   get:
 *     tags:
 *       - "Tracks"
 *     summary: Retrieve Releases for a Track
 *     description: This route retrieves all releases that contain the specified track.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the Track to retrieve releases for.
 *     responses:
 *       200:
 *         description: Track releases retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 releases:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       catNo:
 *                         type: string
 *                       barcode:
 *                         type: string
 *                       releaseDate:
 *                         type: string
 *                         format: date
 *                       trackIds:
 *                         type: array
 *                         items:
 *                           type: string
 *       403:
 *         description: Forbidden, the user does not have sufficient rights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Track not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while retrieving releases.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /tracks/{id}/add_alias:
 *   put:
 *     tags:
 *       - "Tracks"
 *     summary: Add alias to a Track
 *     description: This route adds one or more aliases to a specific Track.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the Track to add aliases to.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               alias:
 *                 type: string
 *                 description: Single alias to add to the track.
 *               aliases:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of aliases to add to the track.
 *     responses:
 *       200:
 *         description: Alias added successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Alias added"
 *       403:
 *         description: Forbidden, the user does not have sufficient rights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Track not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while adding alias.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /tracks/{id}:
 *   get:
 *     tags:
 *       - "Tracks"
 *     summary: Retrieve a specific Track by ID
 *     description: This route retrieves a specific Track by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           example: 62sq83v7e9864ke92e9824l
 *         description: The ID of the Track to retrieve.
 *     responses:
 *       200:
 *         description: Successfully retrieved the Track.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Track'
 *             example:
 *               _id: "59384p9ll0t92g4le3xla8"
 *               title: "Heroes - Live"
 *               artist: "David Bowie"
 *               isrc: "USRF3012345"
 *               fugaId: "12345"
 *               totalParticipation: 100
 *               valid: true
 *               createdAt: "2023-09-13T10:01:03.344Z"
 *               updatedAt: "2023-09-18T09:44:19.591Z"
 *               projectId: "12345"
 *               payeesCount: 3
 *               meta:
 *                 type: object
 *                 properties:
 *                   currentPage:
 *                     type: number
 *                   totalPages:
 *                     type: number
 *                   total:
 *                     type: number
 *       403:
 *         description: Forbidden, the user does not have sufficient rights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Could not find the Track with the given ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to retrieve the Track.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 *   put:
 *     tags:
 *       - "Tracks"
 *     summary: Update single Track
 *     description: This route finds and updates a specific Track by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           example: 62sq83v7e9864ke92e9824l
 *         required: true
 *         description: The ID of the Track to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               artist:
 *                 type: string
 *               title:
 *                 type: string
 *               isrc:
 *                 type: string
 *               salesReturnsRights:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     percentage:
 *                       type: number
 *                     contractId:
 *                       type: string
 *                       example: 69d982ele012eb422la9834l
 *     responses:
 *       200:
 *         description: Successfully updated the Track.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Track'
 *       403:
 *         description: Forbidden, the user does not have sufficient rights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Track not found, no Track exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to update the Track.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * components:
 *   schemas:
 *     Track:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         version:
 *           type: string
 *         artist:
 *           type: string
 *         foreignId:
 *           type: string
 *         isrc:
 *           type: string
 *           description: Required and should be unique
 *         fugaId:
 *           type: string
 *           description: The Fuga ID associated with the track
 *         label:
 *           type: string
 *         pLine:
 *           type: string
 *         salesReturnsRights:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               contractId:
 *                 type: string
 *               percentage:
 *                 type: number
 *         payeesCount:
 *           type: number
 *         releaseSpecificSalesReturnsRights:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               contractId:
 *                 type: string
 *               releaseId:
 *                 type: string
 *               percentage:
 *                 type: number
 *         costsRights:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               contractId:
 *                 type: string
 *               percentage:
 *                 type: number
 *         aliases:
 *           type: array
 *           items:
 *             type: string
 *           description: Used to match down any other identifiers in the sale ingestion process
 *         catalogueGroups:
 *           type: array
 *           items:
 *             type: string
 *         duration:
 *           type: number
 *         defaultReleaseId:
 *           type: number
 *         statutoryRate:
 *           type: number
 *         reportMechanicals:
 *           type: boolean
 *         releaseSpecificForeignIds:
 *           type: object
 *           properties:
 *             releaseId:
 *               type: string
 *         mechanicalLicenses:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               contractId:
 *                 type: string
 *               share:
 *                 type: number
 *               rate:
 *                 type: number
 */
