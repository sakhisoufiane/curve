/**
 * @openapi
 * /territoryGroups:
 *   get:
 *     tags:
 *       - "Territory Groups"
 *     summary: Retrieve territory groups
 *     description: Returns a list of territory groups with pagination.
 *     parameters:
 *       - in: query
 *         name: text
 *         schema:
 *           type: string
 *         description: Filter on supplied text string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number to return
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *         description: Number of items to return per page
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *         description: Column to order by
 *       - in: query
 *         name: orderDir
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Order direction
 *     responses:
 *       200:
 *         description: Successfully retrieved territory groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 territoryGroups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TerritoryGroup'
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
 *       - "Territory Groups"
 *     summary: Create a territory group
 *     description: Creates a new territory group.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TerritoryGroupInput'
 *     responses:
 *       200:
 *         description: Successfully created territory group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TerritoryGroup'
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
 * /territoryGroups/{id}:
 *   get:
 *     tags:
 *       - "Territory Groups"
 *     summary: Retrieve a specific territory group
 *     description: Returns details for a specific territory group by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Territory group ID
 *     responses:
 *       200:
 *         description: Successfully retrieved territory group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TerritoryGroup'
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
 *         description: Territory group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find TerritoryGroup with ID {id}"
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
 *       - "Territory Groups"
 *     summary: Update a territory group
 *     description: Updates a territory group by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Territory group ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TerritoryGroupInput'
 *     responses:
 *       200:
 *         description: Successfully updated territory group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TerritoryGroup'
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
 *         description: Territory group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find TerritoryGroup with ID {id}"
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
 *       - "Territory Groups"
 *     summary: Delete a territory group
 *     description: Deletes a territory group by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Territory group ID
 *     responses:
 *       200:
 *         description: Successfully deleted territory group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TerritoryGroup'
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
 *         description: Territory group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find TerritoryGroup with ID {id}"
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
 * /territoryGroups/{id}/history:
 *   get:
 *     tags:
 *       - "Territory Groups"
 *     summary: Retrieve history for a territory group
 *     description: Returns the update history for a specific territory group.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Territory group ID
 *     responses:
 *       200:
 *         description: Successfully retrieved territory group history
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
 *                           properties:
 *                             op:
 *                               type: string
 *                             path:
 *                               type: string
 *                             value:
 *                               type: string
 *                       _id:
 *                         type: string
 *                       ref:
 *                         type: string
 *                       author:
 *                         type: object
 *                         nullable: true
 *                       timestamp:
 *                         type: string
 *                         format: date-time
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
 *         description: Territory group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find TerritoryGroup with ID {id}"
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
 *     TerritoryGroup:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the territory group
 *         name:
 *           type: string
 *           description: Name of the territory group
 *         clientId:
 *           type: string
 *           description: Client ID associated with the territory group
 *         territories:
 *           type: array
 *           items:
 *             type: string
 *           description: List of territories in the group
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the territory group was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the territory group was last updated
 *     TerritoryGroupInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the territory group
 *         territories:
 *           type: array
 *           items:
 *             type: string
 *           description: List of territories in the group
 *       required:
 *         - name
 *         - territories
 */
