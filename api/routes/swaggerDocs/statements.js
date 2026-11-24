/**
 * @openapi
 * /statements:
 *   get:
 *     tags:
 *       - "Statements"
 *     summary: Retreive a list of Statements
 *     description: This route retrieves a list of Statements based on the provided filters.
 *     parameters:
 *       - in: query
 *         name: orderBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["name","grossAmount","netAmount","grossCosts","netCosts","date","status","updatedAt"]
 *           example: name
 *       - in: query
 *         name: orderDir
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["asc","desc"]
 *           example: asc
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: number
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: number
 *           example: 5
 *       - in: query
 *         name: text
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: periodId
 *         required: false
 *         schema:
 *           type: string
 *           example: 65083379af320e8ad13b380a
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["Mechanical","Standard"]
 *           example: Standard
 *       - in: query
 *         name: contractIds
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             example: 65083461fa8a484c48cd248b
 *       - in: query
 *         name: createdAfter
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2023-01-01"
 *         description: >
 *           Filters statements created **on or after** this date.
 *           The date is treated as beginning of day (00:00:00.000) in the server's timezone.
 *       - in: query
 *         name: createdBefore
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *           example: "2023-12-31"
 *         description: >
 *           Filters statements created **on or before** this date.
 *           The date is treated as end of day (23:59:59.999) in the server's timezone.
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of Statements, returns Statements along with metadata.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statements:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Statement'
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
 *         description: Forbidden, the user does not have sufficient rights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to retrieve the Statements.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *   post:
 *     tags:
 *       - "Statements"
 *     summary: Create a new Statement
 *     description: This route creates a new Statement with the provided data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               periodId:
 *                 type: string
 *               contractId:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Statement'
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
 *         description: Internal server error occurred while trying to create the Statement.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/periods:
 *   get:
 *     tags:
 *       - "Statements"
 *     summary: Retrieve periods for statements
 *     description: This route retrieves a list of periods available for the client.
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of periods.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 periods:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
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
 *         description: Internal server error occurred while trying to retrieve periods.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/send_many:
 *   post:
 *     tags:
 *       - "Statements"
 *     summary: Send multiple statements
 *     description: This route sends multiple statements based on provided IDs or filter criteria.
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
 *               filter:
 *                 type: object
 *     responses:
 *       200:
 *         description: Statements are being sent successfully.
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
 *         description: Period not found or no statements selected.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to send statements.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/publish_many:
 *   post:
 *     tags:
 *       - "Statements"
 *     summary: Publish multiple statements
 *     description: This route publishes multiple statements based on provided IDs or filter criteria.
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
 *               filter:
 *                 type: object
 *     responses:
 *       200:
 *         description: Statements are being published successfully.
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
 *         description: No statements selected.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to publish statements.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/unpublish_many:
 *   post:
 *     tags:
 *       - "Statements"
 *     summary: Unpublish multiple statements
 *     description: This route unpublishes multiple statements based on provided IDs or filter criteria.
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
 *               filter:
 *                 type: object
 *     responses:
 *       200:
 *         description: Statements are being unpublished successfully.
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
 *         description: No statements selected.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to unpublish statements.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/pay_many:
 *   post:
 *     tags:
 *       - "Statements"
 *     summary: Create payments for multiple statements
 *     description: This route creates payments for multiple statements based on provided IDs.
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
 *         description: Payments created successfully.
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
 *         description: No statements selected.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to create payments.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/{id}:
 *   get:
 *     tags:
 *       - "Statements"
 *     summary: Retrieve a specific Statement by ID
 *     description: This route retrieves a specific Statement by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 65084f6704c765610d573011
 *     responses:
 *       200:
 *         description: Successfully retrieved the Statement.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Statement'
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
 *         description: Statement not found, no Statement exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to retrieve the Statement.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *   put:
 *     tags:
 *       - "Statements"
 *     summary: Update a specific Statement by ID
 *     description: This route updates a specific Statement by its ID with the provided data.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 65084f6704c765610d573011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully updated the Statement.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Statement'
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
 *         description: Statement not found, no Statement exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to update the Statement.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *   delete:
 *     tags:
 *       - "Statements"
 *     summary: Delete a specific Statement by ID
 *     description: This route deletes a specific Statement by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 65084f6704c765610d573011
 *     responses:
 *       200:
 *         description: Successfully deleted the Statement.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Statement'
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
 *         description: Statement not found, no Statement exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to delete the Statement.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/{id}/detail:
 *   get:
 *     tags:
 *       - "Statements"
 *     summary: Retrieve analytics for a specific Statement
 *     description: >
 *       This route loads only the analytics data for a specific Statement. It retrieves a subset of the statement object,
 *       focused solely on the `analysis` field for performance and granularity.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: string
 *     responses:
 *       200:
 *         description: Successfully retrieved analytics for the Statement.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analytics:
 *                   type: object
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
 *         description: Statement not found, no Statement exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to retrieve the Statement analytics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/{id}/history:
 *   get:
 *     tags:
 *       - "Statements"
 *     summary: Retrieve history for a specific Statement
 *     description: This route retrieves the modification history for a specific Statement by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 65084f6704c765610d573011
 *     responses:
 *       200:
 *         description: Successfully retrieved the Statement history.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 modelHistory:
 *                   type: array
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
 *         description: Statement not found, no Statement exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to retrieve the Statement history.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/{id}/sales_files:
 *   get:
 *     tags:
 *       - "Statements"
 *     summary: Retrieve sales files for a specific Statement
 *     description: This route retrieves all sales files associated with a specific Statement by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 65084f6704c765610d573011
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: number
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: number
 *           example: 25
 *     responses:
 *       200:
 *         description: Successfully retrieved the Statement sales files.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 salesFiles:
 *                   type: array
 *                 meta:
 *                   type: object
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
 *         description: Statement not found, no Statement exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to retrieve the Statement sales files.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/{id}/costs:
 *   get:
 *     tags:
 *       - "Statements"
 *     summary: Retrieve costs for a specific Statement
 *     description: This route retrieves all costs associated with a specific Statement by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 65084f6704c765610d573011
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: number
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: number
 *           example: 25
 *     responses:
 *       200:
 *         description: Successfully retrieved the Statement costs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 costs:
 *                   type: array
 *                 meta:
 *                   type: object
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
 *         description: Statement not found, no Statement exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to retrieve the Statement costs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/{id}/set_published_status:
 *   put:
 *     tags:
 *       - "Statements"
 *     summary: Set the published status of a specific Statement
 *     description: This route updates the published status of a specific Statement by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 65084f6704c765610d573011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["Pending", "Published"]
 *     responses:
 *       200:
 *         description: Successfully updated the Statement published status.
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
 *         description: Statement not found, no Statement exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to update the Statement published status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/{id}/pay:
 *   post:
 *     tags:
 *       - "Statements"
 *     summary: Create payment for a specific Statement
 *     description: This route creates a payment for a specific Statement by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 65084f6704c765610d573011
 *     responses:
 *       200:
 *         description: Payment created successfully.
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
 *         description: Statement not found, no Statement exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to create payment.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/{id}/send:
 *   get:
 *     tags:
 *       - "Statements"
 *     summary: Send a specific Statement
 *     description: This route sends a specific Statement by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 65084f6704c765610d573011
 *     responses:
 *       200:
 *         description: Statement sent successfully.
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
 *         description: Statement not found, no Statement exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to send the Statement.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/{id}/calculate:
 *   post:
 *     tags:
 *       - "Statements"
 *     summary: Calculate a specific Statement
 *     description: This route calculates a specific Statement by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 65084f6704c765610d573011
 *     responses:
 *       200:
 *         description: Statement calculation started successfully.
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
 *         description: Statement not found, no Statement exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       409:
 *         description: Conflict - Period is being deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to calculate the Statement.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /statements/{id}/get_transactions:
 *   get:
 *     tags:
 *       - "Statements"
 *     summary: Get transactions for payee users
 *     description: This route retrieves transactions for payee users for a specific Statement.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: 65084f6704c765610d573011
 *     responses:
 *       200:
 *         description: Successfully retrieved transactions for payee users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
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
 *         description: Statement not found, no Statement exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to retrieve transactions.
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
 *     Statement:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         periodId:
 *           type: string
 *         contractId:
 *           type: string
 *         name:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         year:
 *           type: number
 *         accountingPeriod:
 *           type: string
 *         status:
 *           type: string
 *         openingBalance:
 *           type: number
 *         closingBalance:
 *           type: number
 *         units:
 *           type: number
 *         grossAmount:
 *           type: number
 *         netAmount:
 *           type: number
 *         grossCosts:
 *           type: number
 *         netCosts:
 *           type: number
 *         reservesWithheld:
 *           type: number
 *         reservesReleased:
 *           type: number
 *         withholdingTax:
 *           type: number
 *         netOutput:
 *           type: number
 *         lines:
 *           type: number
 *         allFilesZipPublicLink:
 *           type: string
 *           description: Public links issued on load, available for 10 mins
 *         salesCsvPublicLink:
 *           type: string
 *         costsCsvPublicLink:
 *           type: string
 *         pdfPublicLink:
 *           type: string
 *         statementOfAccountPublicLink:
 *           type: string
 *         selfBillingInvoicePublicLink:
 *           type: string
 *         feesInvoicePublicLink:
 *           type: string
 *         contractType:
 *           type: string
 *         analysis:
 *           type: object
 *           description: Headline precalculated analytics appear here
 *         selfBillingInvoiceNo:
 *           type: number
 *         feesInvoiceNo:
 *           type: number
 *         selfBillingTaxRate:
 *           type: number
 *         selfBillingTaxAmount:
 *           type: number
 *         feesInvoiceTaxRate:
 *           type: number
 *         feesInvoiceTaxAmount:
 *           type: number
 *         payments:
 *           type: number
 *         currency:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the statement was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the statement was last updated
 */
