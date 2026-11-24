/**
 * @openapi
 * /contractTermGroups:
 *   get:
 *     tags:
 *       - "Contract Term Groups"
 *     summary: Retrieve contract term groups
 *     description: Returns a paginated list of contract term groups. Requires read access to contracts.
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
 *         description: Text to search for in contract term group name
 *     responses:
 *       200:
 *         description: Successfully retrieved contract term groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contractTermGroups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ContractTermGroup'
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
 *       - "Contract Term Groups"
 *     summary: Create a contract term group
 *     description: Creates a new contract term group. Requires write access to contracts.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContractTermGroupInput'
 *     responses:
 *       200:
 *         description: Successfully created contract term group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContractTermGroup'
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
 * /contractTermGroups/{id}:
 *   get:
 *     tags:
 *       - "Contract Term Groups"
 *     summary: Retrieve a specific contract term group
 *     description: Returns details for a specific contract term group by ID. Requires read access to contracts.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract term group ID
 *     responses:
 *       200:
 *         description: Successfully retrieved contract term group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContractTermGroup'
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
 *         description: Contract term group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find ContractTermGroup with ID 123456789012"
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
 *       - "Contract Term Groups"
 *     summary: Update a contract term group
 *     description: Updates a contract term group by ID. Requires write access to contracts.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract term group ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContractTermGroupInput'
 *     responses:
 *       200:
 *         description: Successfully updated contract term group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContractTermGroup'
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
 *         description: Contract term group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find ContractTermGroup with ID 123456789012"
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
 *       - "Contract Term Groups"
 *     summary: Delete a contract term group
 *     description: Deletes a contract term group by ID. Requires write access to contracts.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract term group ID
 *     responses:
 *       200:
 *         description: Successfully deleted contract term group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContractTermGroup'
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
 *         description: Contract term group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find ContractTermGroup with ID 123456789012"
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
 * /contractTermGroups/{id}/history:
 *   get:
 *     tags:
 *       - "Contract Term Groups"
 *     summary: Retrieve contract term group history
 *     description: Returns the modification history for a specific contract term group. Requires write access to contracts.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contract term group ID
 *     responses:
 *       200:
 *         description: Successfully retrieved contract term group history
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
 *         description: Contract term group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find ContractTermGroup with ID 123456789012"
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
 *     ContractTermGroup:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the contract term group
 *         name:
 *           type: string
 *           description: Name of the contract term group
 *         clientId:
 *           type: string
 *           description: Client ID associated with the contract term group
 *         salesTerms:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               rate:
 *                 type: number
 *               type:
 *                 type: string
 *               currency:
 *                 type: string
 *           description: Sales terms configuration
 *         costTerms:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               rate:
 *                 type: number
 *               type:
 *                 type: string
 *               currency:
 *                 type: string
 *           description: Cost terms configuration
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the contract term group was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the contract term group was last updated
 *     ContractTermGroupInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the contract term group
 *         salesTerms:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               rate:
 *                 type: number
 *               type:
 *                 type: string
 *               currency:
 *                 type: string
 *           description: Sales terms configuration
 *         costTerms:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               rate:
 *                 type: number
 *               type:
 *                 type: string
 *               currency:
 *                 type: string
 *           description: Cost terms configuration
 */
