/**
 * @openapi
 * /accountingPeriods:
 *   get:
 *     tags:
 *       - "Accounting Periods"
 *     summary: Retrieve accounting periods
 *     description: Returns a paginated list of accounting periods. Requires read access to periods.
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
 *         name: text
 *         schema:
 *           type: string
 *         description: Text to search for in accounting period name
 *     responses:
 *       200:
 *         description: Successfully retrieved accounting periods
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accountingPeriods:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AccountingPeriod'
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
 *   post:
 *     tags:
 *       - "Accounting Periods"
 *     summary: Create an accounting period
 *     description: Creates a new accounting period. Requires write access to periods.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountingPeriodInput'
 *     responses:
 *       200:
 *         description: Successfully created accounting period
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountingPeriod'
 *       201:
 *         description: Error creating accounting period
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
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
 * /accountingPeriods/{id}:
 *   get:
 *     tags:
 *       - "Accounting Periods"
 *     summary: Retrieve a specific accounting period
 *     description: Returns details for a specific accounting period by ID. Requires read access to periods.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Accounting period ID
 *     responses:
 *       200:
 *         description: Successfully retrieved accounting period
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountingPeriod'
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
 *         description: Accounting period not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find AccountingPeriod with ID 123456789012"
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
 *       - "Accounting Periods"
 *     summary: Update an accounting period
 *     description: Updates an accounting period by ID. Requires write access to periods.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Accounting period ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AccountingPeriodInput'
 *     responses:
 *       200:
 *         description: Successfully updated accounting period
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountingPeriod'
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
 *         description: Accounting period not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Accounting Period with ID 123456789012"
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
 *   delete:
 *     tags:
 *       - "Accounting Periods"
 *     summary: Delete an accounting period
 *     description: Deletes an accounting period by ID. Requires write access to periods.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Accounting period ID
 *     responses:
 *       200:
 *         description: Successfully deleted accounting period
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountingPeriod'
 *       403:
 *         description: Forbidden, the user does not have sufficient rights or period is processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "You can't delete an Accounting Period that is processing. Wait for it to complete calculating before trying again."
 *       404:
 *         description: Accounting period not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Accounting Period with ID 123456789012"
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
 * /accountingPeriods/{id}/history:
 *   get:
 *     tags:
 *       - "Accounting Periods"
 *     summary: Retrieve accounting period history
 *     description: Returns the modification history for a specific accounting period. Requires read access to periods.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Accounting period ID
 *     responses:
 *       200:
 *         description: Successfully retrieved accounting period history
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
 *         description: Accounting period not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Accounting Period with ID 123456789012"
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
 * /accountingPeriods/{id}/sales_files:
 *   get:
 *     tags:
 *       - "Accounting Periods"
 *     summary: Retrieve sales files for an accounting period
 *     description: Returns a paginated list of sales files associated with a specific accounting period. Requires read access to periods.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Accounting period ID
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
 *     responses:
 *       200:
 *         description: Successfully retrieved sales files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 salesFiles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SalesFile'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
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
 *       404:
 *         description: Accounting period not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find AccountingPeriod with ID 123456789012"
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
 * /accountingPeriods/{id}/unincluded_sales_files:
 *   get:
 *     tags:
 *       - "Accounting Periods"
 *     summary: Retrieve unincluded sales files for an accounting period
 *     description: Returns a paginated list of sales files not associated with a specific accounting period. Requires read access to periods.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Accounting period ID
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
 *     responses:
 *       200:
 *         description: Successfully retrieved unincluded sales files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 salesFiles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SalesFile'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
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
 *       404:
 *         description: Accounting period not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find AccountingPeriod with ID 123456789012"
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
 * /accountingPeriods/{id}/include_all_sales_files:
 *   get:
 *     tags:
 *       - "Accounting Periods"
 *     summary: Include all sales files in an accounting period
 *     description: Adds all available sales files to a specific accounting period. Requires read access to periods.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Accounting period ID
 *     responses:
 *       200:
 *         description: Successfully included all sales files
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountingPeriod'
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
 *         description: Accounting period not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find AccountingPeriod with ID 123456789012"
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
 * /accountingPeriods/{id}/include_filtered_sales_files:
 *   get:
 *     tags:
 *       - "Accounting Periods"
 *     summary: Include filtered sales files in an accounting period
 *     description: Adds sales files matching filter criteria to a specific accounting period. Requires read access to periods.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Accounting period ID
 *     responses:
 *       200:
 *         description: Successfully included filtered sales files
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountingPeriod'
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
 *         description: Accounting period not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find AccountingPeriod with ID 123456789012"
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
 * /accountingPeriods/{id}/include_selected_sales_files:
 *   get:
 *     tags:
 *       - "Accounting Periods"
 *     summary: Include selected sales files in an accounting period
 *     description: Adds specific sales files to a specific accounting period. Requires read access to periods.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Accounting period ID
 *       - in: query
 *         name: salesFileIds
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Array of sales file IDs to include
 *     responses:
 *       200:
 *         description: Successfully included selected sales files
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountingPeriod'
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
 *         description: Accounting period not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find AccountingPeriod with ID 123456789012"
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
 * /accountingPeriods/{id}/remove_selected_sales_files:
 *   get:
 *     tags:
 *       - "Accounting Periods"
 *     summary: Remove selected sales files from an accounting period
 *     description: Removes specific sales files from a specific accounting period. Requires read access to periods.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Accounting period ID
 *       - in: query
 *         name: salesFileIds
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Array of sales file IDs to remove
 *     responses:
 *       200:
 *         description: Successfully removed selected sales files
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountingPeriod'
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
 *         description: Accounting period not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find AccountingPeriod with ID 123456789012"
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
 * /accountingPeriods/{id}/calculate:
 *   post:
 *     tags:
 *       - "Accounting Periods"
 *     summary: Calculate an accounting period
 *     description: Initiates calculation for a specific accounting period. Requires write access to periods.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Accounting period ID
 *     responses:
 *       200:
 *         description: Successfully initiated calculation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "AccountingPeriod sent for calculation"
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
 *         description: Accounting period not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find AccountingPeriod with ID 123456789012"
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
 *     AccountingPeriod:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the accounting period
 *         name:
 *           type: string
 *           description: Name of the accounting period
 *         clientId:
 *           type: string
 *           description: Client ID associated with the accounting period
 *         startDate:
 *           type: string
 *           format: date
 *           description: Start date of the accounting period
 *         endDate:
 *           type: string
 *           format: date
 *           description: End date of the accounting period
 *         status:
 *           type: string
 *           enum: [Draft, Processing, Calculated, Error]
 *           description: Current status of the accounting period
 *         locked:
 *           type: boolean
 *           description: Whether the accounting period is locked
 *         salesFilesIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of sales file IDs included in the accounting period
 *         deliveries:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               deliveryId:
 *                 type: string
 *               deliveryType:
 *                 type: string
 *               status:
 *                 type: string
 *           description: Array of deliveries associated with the accounting period
 *         createdBy:
 *           type: string
 *           description: User ID who created the accounting period
 *         lastModifiedBy:
 *           type: string
 *           description: User ID who last modified the accounting period
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the accounting period was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the accounting period was last updated
 *     AccountingPeriodInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the accounting period
 *         startDate:
 *           type: string
 *           format: date
 *           description: Start date of the accounting period
 *         endDate:
 *           type: string
 *           format: date
 *           description: End date of the accounting period
 *         locked:
 *           type: boolean
 *           description: Whether the accounting period is locked
 *         salesFilesIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of sales file IDs to include in the accounting period
 *     SalesFile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the sales file
 *         clientId:
 *           type: string
 *           description: Client ID associated with the sales file
 *         name:
 *           type: string
 *           description: Name of the sales file
 *         invoiceNo:
 *           type: string
 *           description: Invoice number associated with the sales file
 *         targetPeriod:
 *           type: string
 *           description: Target period for the sales file
 *         salesAccountName:
 *           type: string
 *           description: Name of the sales account
 *         salesTemplateName:
 *           type: string
 *           description: Name of the sales template used
 *         salesTemplateId:
 *           type: string
 *           description: ID of the sales template used
 *         status:
 *           type: string
 *           description: Status of the sales file
 *         file:
 *           type: string
 *           description: File path or identifier
 *         publicLink:
 *           type: string
 *           description: Public link to the sales file
 *         units:
 *           type: number
 *           description: Number of units in the sales file
 *         validationUnits:
 *           type: number
 *           description: Number of validated units
 *         netAmount:
 *           type: number
 *           description: Net amount in the sales file
 *         grossAmount:
 *           type: number
 *           description: Gross amount in the sales file
 *         validationNetAmount:
 *           type: number
 *           description: Validated net amount
 *         homeCurrencyNetAmount:
 *           type: number
 *           description: Net amount in home currency
 *         homeCurrencyGrossAmount:
 *           type: number
 *           description: Gross amount in home currency
 *         viewed:
 *           type: boolean
 *           description: Whether the sales file has been viewed
 *         lines:
 *           type: number
 *           description: Number of lines in the sales file
 *         validationLines:
 *           type: number
 *           description: Number of validated lines
 *         valid:
 *           type: boolean
 *           description: Whether the sales file is valid
 *         invalidLines:
 *           type: number
 *           description: Number of invalid lines
 *         reportedStatus:
 *           type: string
 *           description: Reported status of the sales file
 *         reportedLines:
 *           type: number
 *           description: Number of reported lines
 */
