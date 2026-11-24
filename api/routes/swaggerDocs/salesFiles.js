/**
* @openapi
* /salesFiles:
*   get:
*     tags:
*       - "Sales Files"
*     summary: Retrieve a list of Sales Files
*     description: This route retrieves a list of Sales Files based on the provided filters.
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
*           enum: ["name","invoiceNo","targetPeriod","salesAccountName","homeCurrencyGrossAmount","homeCurrencyNetAmount","invalidLines"]
*           example: name
*       - in: query
*         name: orderDir
*         required: false
*         schema:
*           type: string
*           enum: ["asc","desc"]
*           example: asc
*       - in: query
*         name: createdAfter
*         schema:
*           type: string
*           format: date
*         description: Filter sales files created on or after this date (inclusive, YYYY-MM-DD format)
*       - in: query
*         name: createdBefore
*         schema:
*           type: string
*           format: date
*         description: Filter sales files created on or before this date (inclusive, YYYY-MM-DD format)
*       - in: query
*         name: updatedAfter
*         schema:
*           type: string
*           format: date
*         description: Filter sales files updated on or after this date (inclusive, YYYY-MM-DD format)
*       - in: query
*         name: updatedBefore
*         schema:
*           type: string
*           format: date
*         description: Filter sales files updated on or before this date (inclusive, YYYY-MM-DD format)
*     responses:
*       200:
*         description: Successfully retrieved the list of Sales Files, returns Sales Files along with metadata.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 data:
*                   type: array
*                   items:
*                     $ref: '#/components/schemas/Sales File'
*             example:
*               salesFiles:
*                 - _id: string
*                   clientId: string
*                   name: string
*                   reportedStatus: string
*                   archived: boolean
*                   viewed: boolean
*                   status: string
*                   file: string
*                   salesAccountName: string
*                   salesTemplateId: string
*                   salesTemplateName: string
*                   homeCurrencyGrossAmount: number
*                   homeCurrencyNetAmount: number
*                   invalidLines: number
*                   lines: number
*                   netAmount: number
*                   units: number
*                   valid: boolean
*                   validationLines: number
*                   validationNetAmount: number
*                   validationUnits: number
*                   publicLink: string
*                   reportedLines: number
*                   duplicateSalesFileId: string
*                 - _id: string
*                   clientId: string
*                   name: string
*                   reportedStatus: string
*                   archived: boolean
*                   viewed: boolean
*                   status: string
*                   file: string
*                   publicLink: string
*               meta:
*                 currentPage: number
*                 totalPages: number
*                 total: number
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
*         description: Internal server error occurred while trying to retrieve the Sales Files.
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
*       - "Sales Files"
*     summary: Create a new Sales File
*     description: This route allows for the creation of a new Sales File.
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               name:
*                 type: string
*     responses:
*       200:
*         description: Successfully created the Sales File.
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Sales File'
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
*         description: Internal server error occurred while trying to save the Sales File.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/{id}:
*   get:
*     tags:
*       - "Sales Files"
*     summary: Retrieve a specific Sales File by ID
*     description: This route retrieves a specific Sales File by its ID.
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*           example: 5a913x3446af4g2v252gss5h
*         required: true
*         description: The ID of the Sales File to retrieve.
*     responses:
*       200:
*         description: Successfully retrieved the Sales File.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 data:
*                   type: array
*                   items:
*                     $ref: '#/components/schemas/Sales File'
*             example:
*               _id: "64c7a492z9af4d1923e910fg"
*               clientId: "62la0894f0984749746clk02c"
*               name: "20230731_Jun2023_fullreport_uk_square_peg_records_US"
*               reportedStatus: "Unreported"
*               archived: false
*               viewed: true
*               status: "Complete"
*               file: "salesFiles/64c7a492z9af4d1923e910fg/20230731_Jun2023_fullreport_uk_square_peg_records_US.xls"
*               salesAccountName: "Orch"
*               salesTemplateId: "64c7a492z9af4d1923e910fg"
*               salesTemplateName: "Orchard - Working"
*               homeCurrencyGrossAmount: 0
*               homeCurrencyNetAmount: 81.32437400000008
*               invalidLines: 1821
*               lines: 1821
*               netAmount: 81.32437399999999
*               units: 11727
*               valid: false
*               validationLines: 1821
*               validationNetAmount: 81.32437399999999
*               validationUnits: 11727
*               reportedLines: 1821
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
*       500:
*         description: Internal server error occurred while trying to retrieve the Sales File.
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
*       - "Sales Files"
*     summary: Update single Sales File
*     description: This route finds and updates a specific Sales File by its ID.
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*           example: 5a913x3446af4g2v252gss5h
*         required: true
*         description: The ID of the Sales File to update.
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               name:
*                 type: string
*     responses:
*       200:
*         description: Successfully updated the Sales File.
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Sales File'
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
*         description: Sales File not found, no Sales File exists with the specified ID.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*       500:
*         description: Internal server error occurred while trying to update the Sales File.
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
*       - "Sales Files"
*     summary: Delete single Sales File
*     description: This route allows for the deletion of one Sales File, specified by ID.
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*           example: 5a913x3446af4g2v252gss5h
*         required: true
*         description: The ID of the Sales File to delete.
*     responses:
*       200:
*         description: Successfully deleted the Sales File, returns the result of the operation.
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/Sales File'
*       201:
*         description: Indicates an internal error whilst attempting to delete the Sales File.
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
*         description: Not found, the specified Sales File could not be found, returns a message indicating the issue.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*       405:
*         description: Locked for processing. Could not delete the specified Sales File as it is currently being ingested.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*       500:
*         description: Internal server error occurred while trying to delete the Sales File, returns a message indicating an internal error.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/bulk:
*   delete:
*     tags:
*       - "Sales Files"
*     summary: Delete multiple Sales Files
*     description: This route allows for the deletion of multiple Sales Files, specified by their IDs.
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
*     responses:
*       200:
*         description: Successfully deleted the Sales Files, returns the result of the operation.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*             example:
*               message: "Selected Sales Files are being deleted. You will be notified when it has completed."
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
*         description: Not found, the specified Sales Files could not be found, returns a message indicating the issue.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*       405:
*         description: Locked for processing. Could not delete the specified Sales Files as they are currently being ingested.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*       500:
*         description: Internal server error occurred while trying to delete the Sales Files, returns a message indicating an internal error.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/bulk_edit:
*   get:
*     tags:
*       - "Sales Files"
*     summary: Fetch data needed for bulk editing specified sales files
*     description: This route retrieves data needed for bulk editing of specified Sales Files.
*     parameters:
*       - in: query
*         name: ids
*         schema:
*           type: array
*           items:
*             type: string
*         description: Array of Sales File IDs to retrieve bulk edit data for.
*     responses:
*       200:
*         description: Successfully retrieved bulk edit data for Sales Files.
*         content:
*           application/json:
*             schema:
*               type: array
*               items:
*                 $ref: '#/components/schemas/Sales File'
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
*         description: Internal server error occurred while retrieving bulk edit data.
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
*       - "Sales Files"
*     summary: Bulk edit multiple Sales Files
*     description: This route allows for bulk editing of multiple Sales Files with specified updates.
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - updates
*             properties:
*               updates:
*                 type: object
*                 required:
*                   - ids
*                 properties:
*                   ids:
*                     type: array
*                     items:
*                       type: string
*                     description: Array of Sales File IDs to update.
*     responses:
*       200:
*         description: Successfully updated Sales Files.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Sales files updated"
*       400:
*         description: Bad request, missing required fields.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
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
*         description: Internal server error occurred while updating Sales Files.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/filter_options:
*   get:
*     tags:
*       - "Sales Files"
*     summary: Retrieve filter options for Sales Files
*     description: This route retrieves available filter options for Sales Files.
*     responses:
*       200:
*         description: Successfully retrieved filter options.
*         content:
*           application/json:
*             schema:
*               type: object
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
*         description: Internal server error occurred while retrieving filter options.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/export:
*   post:
*     tags:
*       - "Sales Files"
*     summary: Export multiple Sales Files
*     description: This route allows for exporting multiple Sales Files. The export is processed and sent via email.
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
*                 description: Array of Sales File IDs to export.
*               filter:
*                 type: object
*                 description: Filter criteria for export if IDs are not provided.
*     responses:
*       200:
*         description: Export process started successfully.
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
*
* /salesFiles/archive_many:
*   get:
*     tags:
*       - "Sales Files"
*     summary: Archive multiple Sales Files
*     description: This route allows for archiving multiple Sales Files specified by their IDs.
*     parameters:
*       - in: query
*         name: ids
*         required: true
*         schema:
*           type: array
*           items:
*             type: string
*         description: Array of Sales File IDs to archive.
*     responses:
*       200:
*         description: Successfully archived Sales Files.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Sale files successfully archived."
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
*         description: Internal server error occurred while archiving Sales Files.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/unarchive_many:
*   get:
*     tags:
*       - "Sales Files"
*     summary: Unarchive multiple Sales Files
*     description: This route allows for unarchiving multiple Sales Files specified by their IDs.
*     parameters:
*       - in: query
*         name: ids
*         required: true
*         schema:
*           type: array
*           items:
*             type: string
*         description: Array of Sales File IDs to unarchive.
*     responses:
*       200:
*         description: Successfully unarchived Sales Files.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Sale files successfully unarchived."
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
*         description: Internal server error occurred while unarchiving Sales Files.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/bulk_ingest:
*   post:
*     tags:
*       - "Sales Files"
*     summary: Trigger bulk ingestion for multiple Sales Files
*     description: This route triggers the ingestion process for multiple Sales Files.
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
*                 description: Array of Sales File IDs to ingest.
*     responses:
*       200:
*         description: Bulk ingestion triggered successfully.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Bulk ingestion of sales files triggered"
*       201:
*         description: Error occurred during bulk ingestion.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
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
*         description: Internal server error occurred during bulk ingestion.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/bulk_revalidate:
*   post:
*     tags:
*       - "Sales Files"
*     summary: Trigger bulk revalidation for multiple Sales Files
*     description: This route triggers the revalidation process for multiple Sales Files.
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
*                 description: Array of Sales File IDs to revalidate.
*     responses:
*       200:
*         description: Bulk revalidation triggered successfully.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "Bulk revalidation of sales files triggered"
*       201:
*         description: Error occurred during bulk revalidation.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
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
*         description: Internal server error occurred during bulk revalidation.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/{id}/history:
*   get:
*     tags:
*       - "Sales Files"
*     summary: Get history for Sales File
*     description: This route retrieves the modification history for a specific Sales File.
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*           example: 5a913x3446af4g2v252gss5h
*         required: true
*         description: The ID of the Sales File to retrieve history for.
*     responses:
*       200:
*         description: Successfully retrieved Sales File history.
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
*                       ops:
*                         type: array
*                         items:
*                           type: object
*                       _id:
*                         type: string
*                       ref:
*                         type: string
*                       author:
*                         type: string
*                       timestamp:
*                         type: string
*                         format: date-time
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
*         description: Sales File not found.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*       500:
*         description: Internal server error occurred while retrieving Sales File history.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/{id}/upload_complete:
*   put:
*     tags:
*       - "Sales Files"
*     summary: Complete Sales File upload and optionally trigger ingestion
*     description: This route completes the upload process for a Sales File and optionally triggers ingestion.
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*           example: 5a913x3446af4g2v252gss5h
*         required: true
*         description: The ID of the Sales File.
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - key
*             properties:
*               key:
*                 type: string
*                 description: Path to S3 upload destination.
*               ingest:
*                 type: boolean
*                 description: Whether to trigger ingestion after upload completion.
*     responses:
*       200:
*         description: Upload completed successfully.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 type:
*                   type: string
*                   enum: ["Complete", "Processing"]
*                 message:
*                   type: string
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
*         description: Sales File not found.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*       500:
*         description: Internal server error occurred while completing upload.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/{id}/additional_upload_complete:
*   put:
*     tags:
*       - "Sales Files"
*     summary: Complete Financial File upload
*     description: This route completes the upload process for a Financial File associated with a Sales File.
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*           example: 5a913x3446af4g2v252gss5h
*         required: true
*         description: The ID of the Sales File.
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - key
*             properties:
*               key:
*                 type: string
*                 description: Path to S3 upload destination for the financial file.
*     responses:
*       200:
*         description: Financial file upload completed successfully.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 type:
*                   type: string
*                   example: "Complete"
*                 message:
*                   type: string
*                   example: "The file is successfully uploaded"
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
*         description: Sales File not found.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*       500:
*         description: Internal server error occurred while completing upload.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/{id}/revalidate:
*   post:
*     tags:
*       - "Sales Files"
*     summary: Trigger revalidation for a Sales File
*     description: This route triggers the revalidation process for a specific Sales File.
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*           example: 5a913x3446af4g2v252gss5h
*         required: true
*         description: The ID of the Sales File to revalidate.
*     responses:
*       200:
*         description: Revalidation triggered successfully.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "File sent for revalidation"
*       201:
*         description: Revalidation already in progress.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
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
*         description: Sales File not found.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*       500:
*         description: Internal server error occurred during revalidation.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/{id}/process_financial_file:
*   post:
*     tags:
*       - "Sales Files"
*     summary: Process Financial File for a Sales File
*     description: This route processes the financial file associated with a Sales File.
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*           example: 5a913x3446af4g2v252gss5h
*         required: true
*         description: The ID of the Sales File.
*     responses:
*       200:
*         description: Financial file processed successfully.
*         content:
*           application/json:
*             schema:
*               type: object
*       400:
*         description: Bad request, missing Sales File ID or Financial File.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
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
*         description: Internal server error occurred while processing financial file.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*
* /salesFiles/{id}/ingest:
*   post:
*     tags:
*       - "Sales Files"
*     summary: Triggers ingestion process for a Sales File
*     description: This route triggers the ingestion process for a specific Sales File by ID.
*     parameters:
*       - in: path
*         name: id
*         schema:
*           type: string
*           example: 5a913x3446af4g2v252gss5h
*         required: true
*         description: The ID of the Sales File to ingest.
*     responses:
*       200:
*         description: Ingestion triggered successfully.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*                   example: "File sent for ingestion"
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
*         description: Sales File not found.
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 message:
*                   type: string
*       500:
*         description: Internal server error occurred while triggering ingestion.
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
*     Sales File:
*       type: object
*       properties:
*         name:
*           type: string
*         invoiceNo:
*           type: string
*         targetPeriod:
*           type: string
*         fileType:
*           type: string
*           description: Defaults to Standard
*         salesAccountName:
*           type: string
*         salesTemplateName:
*           type: string
*         salesTemplateId:
*           type: string
*         status:
*           type: string
*           description: Defaults to Setup
*         file:
*           type: string
*           format: binary
*           description: Pass the file here in the upload
*         exampleLines:
*           type: array
*           items:
*             type: string
*           description: Is an array of example lines from the file
*         overwriteFields:
*           type: object
*           description: Used to overwrite specific values in the ingestion
*           properties:
*             source:
*               type: string
*             subSource:
*               type: string
*             originalTerritory:
*               type: string
*             originalDistributionChannel:
*               type: string
*             originalConfiguration:
*               type: string
*             originalPriceCategory:
*               type: string
*             originalCurrency:
*               type: string
*             saleDate:
*               type: string
*               format: date-time
*             transactionDate:
*               type: string
*               format: date-time
*             multiplier:
*               type: number
*             overwriteConfigWithCatalogue:
*               type: boolean
*             overwriteDistributionChannelWithCatalogue:
*               type: boolean
*             overwritePriceCategoryWithCatalogue:
*               type: boolean
*         units:
*           type: number
*         validationUnits:
*           type: number
*         netAmount:
*           type: number
*         grossAmount:
*           type: number
*         validationNetAmount:
*           type: number
*         homeCurrencyNetAmount:
*           type: number
*         homeCurrencyGrossAmount:
*           type: number
*         lines:
*           type: number
*         validationLines:
*           type: number
*         valid:
*           type: boolean
*         invalidLines:
*           type: number
*         invalidFields:
*           type: object
*           properties:
*             distributionChannels:
*               type: array
*               items:
*                 type: string
*             configurations:
*               type: array
*               items:
*                 type: string
*             priceCategories:
*               type: array
*               items:
*                 type: string
*             territories:
*               type: array
*               items:
*                 type: string
*             sources:
*               type: array
*               items:
*                 type: string
*             subSources:
*               type: array
*               items:
*                 type: string
*             currencies:
*               type: array
*               items:
*                 type: string
*             releases:
*               type: array
*               items:
*                 type: string
*             tracks:
*               type: array
*               items:
*                 type: string
*             contracts:
*               type: array
*               items:
*                 type: string
*             works:
*               type: array
*               items:
*                 type: string
*         usedReleaseIds:
*           type: array
*           items:
*             type: string
*         usedTrackIds:
*           type: array
*           items:
*             type: string
*         usedWorkIds:
*           type: array
*           items:
*             type: string
*         reportedStatus:
*           type: string
*         reportedLines:
*           type: number
*         proRataAmount:
*           type: number
*         exchangeRates:
*           type: array
*           items:
*             type: string
*         archived:
*           type: object
*           properties:
*             type:
*               type: boolean
*             default:
*               type: boolean
*
* /salesFiles/raw-export:
*   post:
*     tags:
*       - "Sales Files"
*     summary: Raw CSV Export of Sales Files
*     description: |
*       Export sales files data to a raw CSV file. By default, the export is processed asynchronously
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
*                 description: Filter object to select sales files for export.
*                 properties:
*                   text:
*                     type: string
*                     description: Text search filter for name, targetPeriod, salesAccountName, invoiceNo.
*                   targetPeriod:
*                     type: string
*                     description: Filter by target period.
*                   reportedStatus:
*                     type: string
*                     description: Filter by reported status.
*                   archived:
*                     type: boolean
*                     description: Filter by archived status.
*                   createdAfter:
*                     type: string
*                     format: date
*                     description: Filter for sales files created on or after this date. Date-only values use start of day UTC.
*                     example: "2025-01-01"
*                   createdBefore:
*                     type: string
*                     format: date
*                     description: Filter for sales files created on or before this date. Date-only values use end of day UTC.
*                     example: "2025-12-31"
*                   updatedAfter:
*                     type: string
*                     format: date
*                     description: Filter for sales files updated on or after this date. Date-only values use start of day UTC.
*                     example: "2025-01-01"
*                   updatedBefore:
*                     type: string
*                     format: date
*                     description: Filter for sales files updated on or before this date. Date-only values use end of day UTC.
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
*                       example: "https://s3.amazonaws.com/bucket/raw_exports/Client-salesfiles%20raw%20export%2020260120133708304.csv"
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
