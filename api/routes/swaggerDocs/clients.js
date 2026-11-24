/**
 * @openapi
 * /clients:
 *   get:
 *     tags:
 *       - "Clients"
 *     summary: Retrieve all clients
 *     description: Returns a paginated list of clients. Only accessible to parent, internal, or monitoring users.
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
 *         description: Search text to filter by name
 *     responses:
 *       200:
 *         description: Successfully retrieved clients
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clients:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Client'
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
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find User"
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
 * /clients/{id}:
 *   get:
 *     tags:
 *       - "Clients"
 *     summary: Retrieve a specific client
 *     description: Returns details for a specific client by ID. Access is restricted based on user permissions.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Successfully retrieved client
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
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
 *         description: Client not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Client with ID 123456789012"
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
 *       - "Clients"
 *     summary: Update a client
 *     description: Updates a client's details. Access is restricted based on user permissions.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClientInput'
 *     responses:
 *       200:
 *         description: Successfully updated client
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
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
 *         description: Client not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Client with ID 123456789012"
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
 * /clients/{id}/sync_fuga_catalogue:
 *   get:
 *     tags:
 *       - "Clients"
 *     summary: Sync Fuga catalogue for a client
 *     description: Initiates a Fuga catalogue synchronization task for the specified client. Requires Edit access to catalogue. Only one sync task can run at a time per client.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *       - in: query
 *         name: userEmail
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email address of the user initiating the sync
 *     responses:
 *       200:
 *         description: Sync task successfully created and queued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad request - userEmail parameter is missing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User email parameter missing."
 *       403:
 *         description: Forbidden - user does not have Edit catalogue rights or access to this client
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Forbidden"
 *       404:
 *         description: Client not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Client with ID 123456789012"
 *       500:
 *         description: Internal server error or sync task already running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "This task is already running - please wait until it has completed before running again"
 *
 * components:
 *   schemas:
 *     Client:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the client
 *         parentId:
 *           type: string
 *           description: Parent organization ID if applicable
 *         payeeIds:
 *           type: array
 *           items:
 *             type: string
 *           description: List of payee IDs associated with the client
 *         name:
 *           type: string
 *           description: Name of the client
 *         paymentTier:
 *           type: string
 *           enum: [free, basic, premium, enterprise]
 *           description: Payment tier of the client
 *         companyName:
 *           type: string
 *           description: Company name
 *         address:
 *           type: string
 *           description: Company address
 *         phone:
 *           type: string
 *           description: Contact phone number
 *         ipiNo:
 *           type: string
 *           description: IPI number
 *         cwrPartyName:
 *           type: string
 *           description: CWR party name
 *         cwrPartyId:
 *           type: string
 *           description: CWR party ID
 *         autoApproveWorks:
 *           type: boolean
 *           description: Whether works are automatically approved
 *         salesDatabaseTable:
 *           type: string
 *           description: BigQuery table for sales data
 *         periodSalesDatabaseTable:
 *           type: string
 *           description: BigQuery table for period sales data
 *         periodCostsDatabaseTable:
 *           type: string
 *           description: BigQuery table for period costs data
 *         statementDesign:
 *           type: string
 *           description: Statement design template
 *         homeCurrency:
 *           type: string
 *           description: Home currency code
 *         currencySymbol:
 *           type: string
 *           description: Currency symbol
 *         currency2:
 *           type: string
 *           description: Secondary currency code
 *         currency3:
 *           type: string
 *           description: Tertiary currency code
 *         currency4:
 *           type: string
 *           description: Quaternary currency code
 *         logo:
 *           type: string
 *           description: URL to client logo
 *         publicLogo:
 *           type: string
 *           description: URL to client public logo
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the client was created
 *         features:
 *           type: object
 *           description: Enabled features for the client
 *         qaClient:
 *           type: boolean
 *           description: Whether this is a QA client
 *     ClientInput:
 *       type: object
 *       required:
 *         - name
 *         - homeCurrency
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the client
 *         parentId:
 *           type: string
 *           description: Parent organization ID if applicable
 *         paymentTier:
 *           type: string
 *           enum: [free, basic, premium, enterprise]
 *           description: Payment tier of the client
 *         companyName:
 *           type: string
 *           description: Company name
 *         address:
 *           type: string
 *           description: Company address
 *         phone:
 *           type: string
 *           description: Contact phone number
 *         ipiNo:
 *           type: string
 *           description: IPI number
 *         cwrPartyName:
 *           type: string
 *           description: CWR party name
 *         cwrPartyId:
 *           type: string
 *           description: CWR party ID
 *         autoApproveWorks:
 *           type: boolean
 *           description: Whether works are automatically approved
 *         homeCurrency:
 *           type: string
 *           description: Home currency code
 *         currency2:
 *           type: string
 *           description: Secondary currency code
 *         currency3:
 *           type: string
 *           description: Tertiary currency code
 *         currency4:
 *           type: string
 *           description: Quaternary currency code
 *         features:
 *           type: object
 *           description: Enabled features for the client
 *         qaClient:
 *           type: boolean
 *           description: Whether this is a QA client
 */
