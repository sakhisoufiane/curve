/**
 * @openapi
 * /transactions:
 *   get:
 *     tags:
 *       - "Transactions"
 *     summary: Retrieve a list of Transactions
 *     description: This route retrieves a list of Transactions based on the provided filters.
 *     parameters:
 *       - in: query
 *         name: text
 *         schema:
 *           type: string
 *         description: The text to be searched.
 *       - in: query
 *         name: contractId
 *         schema:
 *           type: string
 *         description: Specific contractId to return Transactions for.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           example: "Royalties"
 *         description: Filter transactions by type (e.g. "Royalties", "Advance", "Payment", "Other", "Period Transfer").
 *       - in: query
 *         name: userCreated
 *         schema:
 *           type: boolean
 *         description: Filter by whether the transaction was manually created by a user.
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
 *           enum: ["name","transactionCategories","createdAt"]
 *           example: name
 *         description: The field by which to sort the results.
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
 *         description: Filter transactions created on or after this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: createdBefore
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions created on or before this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: updatedAfter
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions updated on or after this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: updatedBefore
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions updated on or before this date (inclusive, YYYY-MM-DD format)
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of Transactions, returns Transactions along with metadata.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *             example:
 *               transactions:
 *                 - _id: "string"
 *                   clientId: "string"
 *                   contractId: "string"
 *                   name: "string"
 *                   type: "string"
 *                   date: "date"
 *                   amount: "number"
 *                   userCreated: "boolean"
 *                   createdAt: "date"
 *                   updatedAt: "date"
 *                   __v: "integer"
 *                   invoiceNo: "string | null"
 *                   isReserveWithholding: "boolean"
 *               meta:
 *                 currentPage: "integer"
 *                 totalPages: "integer"
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
 *         description: Internal server error occurred while trying to retrieve the Transaction.
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
 *       - "Transactions"
 *     summary: Create a new Transaction
 *     description: This route allows for the creation of a new Transaction.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractId
 *               - name
 *               - date
 *             properties:
 *               contractId:
 *                 type: string
 *                 description: ID of the contract associated with this transaction.
 *               name:
 *                 type: string
 *                 description: Name or label for the transaction.
 *               date:
 *                 type: string
 *                 format: date
 *                 description: The date the transaction occurred.
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Amount of the transaction (optional).
 *     responses:
 *       200:
 *         description: Successfully created the Transaction.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
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
 *         description: Internal server error occurred while trying to save the Transaction.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /transactions/validate:
 *   post:
 *     tags:
 *       - "Transactions"
 *     summary: Validate a Transaction against contract business rules
 *     description: This route validates transaction data against contract business rules, specifically checking for Profit Share contract balance issues.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractId
 *               - amount
 *               - type
 *             properties:
 *               contractId:
 *                 type: string
 *                 description: ID of the contract to validate against.
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: Amount of the transaction.
 *               type:
 *                 type: string
 *                 description: Type of the transaction.
 *               name:
 *                 type: string
 *                 description: Name or label for the transaction.
 *               date:
 *                 type: string
 *                 format: date
 *                 description: The date the transaction occurred.
 *     responses:
 *       200:
 *         description: Transaction validation passed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       201:
 *         description: Transaction validation failed with business rule error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "You are creating a payment to the artist when this account is negative. When a Profit Share is in a negative balance, everything is held at 100%, and you should categorise any payments or deductions from the artist as an Advance to ensure it is deducted from the artist's share."
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
 *         description: Internal server error occurred while validating the Transaction.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /transactions/import:
 *   post:
 *     tags:
 *       - "Transactions"
 *     summary: Import Transactions from Excel file
 *     description: This route allows for bulk import of Transactions from an Excel file. The import is processed asynchronously and email notifications are sent about the import status.
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
 *                 description: Excel file containing transaction data to import.
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
 *                   example: "Transactions are importing, and a report will be sent to you shortly."
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
 * /transactions/{id}:
 *   get:
 *     tags:
 *       - "Transactions"
 *     summary: Retrieve a specific Transaction by ID
 *     description: This route retrieves a specific Transaction by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           example: 5c9fe8d3921a4527b9b43773
 *         required: true
 *         description: The ID of the Transaction to retrieve.
 *     responses:
 *       200:
 *         description: Successfully retrieved the Transaction.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *             example:
 *               _id: "1a2b3c4d5e6f7g8h9i4j1k1l"
 *               clientId: "9j8h7g6f5d4s4z1s3c9d9x42"
 *               name: "Test Transaction"
 *               type: "Royalties"
 *               description: "Description of the transaction"
 *               date: "2023-02-20"
 *               amount: 123.45
 *               userCreated: true
 *               isReserveRelease: false
 *               isReserveWithholding: false
 *               isPayment: false
 *               invoiceNo: "ABC123"
 *               createdAt: "2023-02-20T15:13:52.345Z"
 *               updatedAt: "2023-03-03T11:02:51.751Z"
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
 *         description: Transaction not found, no Transaction exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to retrieve the Transaction.
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
 *       - "Transactions"
 *     summary: Update single Transaction
 *     description: This route finds and updates a specific Transaction by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           example: 5c9fe8d3921a4527b9b43773
 *         required: true
 *         description: The ID of the Transaction to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Publisher'
 *     responses:
 *       200:
 *         description: Successfully updated the Transaction.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
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
 *         description: Transaction not found, no Transaction exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to update the Transaction.
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
 *       - "Transactions"
 *     summary: Delete single Transaction
 *     description: This route allows for the deletion of one Transaction, specified by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           example: 5c9fe8d3921a4527b9b43773
 *         required: true
 *         description: The ID of the Transaction to delete.
 *     responses:
 *       200:
 *         description: Successfully deleted the Transaction, returns the result of the operation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       201:
 *         description: Indicates an internal error whilst attempting to delete the Transaction.
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
 *         description: Not found, the specified Transaction could not be found, returns a message indicating the issue.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to delete the Transaction, returns a message indicating an internal error.
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
 *     Transaction:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         clientId:
 *           type: string
 *           required: true
 *         name:
 *           type: string
 *           required: true
 *         contractId:
 *           type: string
 *           required: true
 *         statementId:
 *           type: string
 *         type:
 *           type: string
 *         description:
 *           type: string
 *         date:
 *           type: date
 *         amount:
 *           type: number
 *         userCreated:
 *           type: boolean
 *         isReserveRelease:
 *           type: boolean
 *         isReserveWithholding:
 *           type: boolean
 *         isPayment:
 *           type: boolean
 *         invoiceNo:
 *           type: string
 *         createdBy:
 *           type: string
 *           format: uuid
 *           description: User ID of the creator of the publisher record.
 *         lastModifiedBy:
 *           type: string
 *           format: uuid
 *           description: User ID of the last person who modified the publisher record.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the publisher was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the publisher was last updated.
 *       required:
 *         - name
 *         - contractId
 *         - clientId
 *
 * /transactions/raw-export:
 *   post:
 *     tags:
 *       - "Transactions"
 *     summary: Raw CSV Export of Transactions
 *     description: |
 *       Export transactions data to a raw CSV file. By default, the export is processed asynchronously
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
 *                 description: Filter object to select transactions for export.
 *                 properties:
 *                   text:
 *                     type: string
 *                     description: Text search filter for name, description.
 *                   contractId:
 *                     type: string
 *                     description: Filter by contract ID.
 *                   createdAfter:
 *                     type: string
 *                     format: date
 *                     description: Filter for transactions created on or after this date. Date-only values use start of day UTC.
 *                     example: "2025-01-01"
 *                   createdBefore:
 *                     type: string
 *                     format: date
 *                     description: Filter for transactions created on or before this date. Date-only values use end of day UTC.
 *                     example: "2025-12-31"
 *                   updatedAfter:
 *                     type: string
 *                     format: date
 *                     description: Filter for transactions updated on or after this date. Date-only values use start of day UTC.
 *                     example: "2025-01-01"
 *                   updatedBefore:
 *                     type: string
 *                     format: date
 *                     description: Filter for transactions updated on or before this date. Date-only values use end of day UTC.
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
 *                       example: "https://s3.amazonaws.com/bucket/raw_exports/Client-transactions%20raw%20export%2020260120133708304.csv"
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
