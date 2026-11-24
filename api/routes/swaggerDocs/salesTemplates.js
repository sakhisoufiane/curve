/**
 * @openapi
 * /salesTemplates:
 *   get:
 *     tags:
 *       - "Sales Templates"
 *     summary: Retrieve sales templates
 *     description: Returns a list of sales templates with pagination.
 *     parameters:
 *       - in: query
 *         name: text
 *         schema:
 *           type: string
 *         description: Filter on supplied text string
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter on Sales Template source, e.g. "Apple"
 *       - in: query
 *         name: createdAfter
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Return only Sales Templates created after this date
 *       - in: query
 *         name: createdBefore
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Return only Sales Templates created before this date
 *       - in: query
 *         name: archived
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: Filter on archived/unarchived Templates
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
 *         description: Successfully retrieved sales templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 salesTemplates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SalesTemplate'
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
 *       - "Sales Templates"
 *     summary: Create a sales template
 *     description: Creates a new sales template.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SalesTemplateInput'
 *     responses:
 *       200:
 *         description: Successfully created sales template
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesTemplate'
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
 * /salesTemplates/archive_many:
 *   get:
 *     tags:
 *       - "Sales Templates"
 *     summary: Archive multiple sales templates
 *     description: Archives or unarchives multiple sales templates by IDs.
 *     parameters:
 *       - in: query
 *         name: ids
 *         required: true
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Array of sales template IDs to archive
 *       - in: query
 *         name: archived
 *         schema:
 *           type: boolean
 *         description: Whether to archive (true) or unarchive (false) the templates
 *     responses:
 *       200:
 *         description: Successfully archived sales templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sale templates successfully archived."
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
 *
 * /salesTemplates/create_from_library_template/{libraryTemplateId}:
 *   post:
 *     tags:
 *       - "Sales Templates"
 *     summary: Create sales template from library template
 *     description: Creates a new sales template based on an existing library template.
 *     parameters:
 *       - in: path
 *         name: libraryTemplateId
 *         required: true
 *         schema:
 *           type: string
 *         description: Library template ID
 *     responses:
 *       200:
 *         description: Successfully created sales template from library template
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesTemplate'
 *       400:
 *         description: Bad request, library template ID is missing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Requires a Library Template ID"
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
 *         description: Library template not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Library Template with ID {libraryTemplateId}"
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
 * /salesTemplates/{id}:
 *   get:
 *     tags:
 *       - "Sales Templates"
 *     summary: Retrieve a specific sales template
 *     description: Returns details for a specific sales template by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sales template ID
 *     responses:
 *       200:
 *         description: Successfully retrieved sales template
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesTemplate'
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
 *         description: Sales template not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find SalesTemplate with ID {id}"
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
 *       - "Sales Templates"
 *     summary: Update a sales template
 *     description: Updates a sales template by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sales template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SalesTemplateInput'
 *     responses:
 *       200:
 *         description: Successfully updated sales template
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesTemplate'
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
 *   delete:
 *     tags:
 *       - "Sales Templates"
 *     summary: Delete a sales template
 *     description: Deletes a sales template by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sales template ID
 *     responses:
 *       200:
 *         description: Successfully deleted sales template
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesTemplate'
 *       201:
 *         description: Sales template could not be deleted as it is in use
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sales Template could not be deleted as it is in use on a sales file"
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
 *         description: Sales template not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Sales Template with ID {id}"
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
 * /salesTemplates/{id}/history:
 *   get:
 *     tags:
 *       - "Sales Templates"
 *     summary: Retrieve history for a sales template
 *     description: Returns the update history for a specific sales template.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sales template ID
 *     responses:
 *       200:
 *         description: Successfully retrieved sales template history
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
 *         description: Sales template not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find SalesTemplate with ID {id}"
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
 * /salesTemplates/{id}/add_to_library:
 *   post:
 *     tags:
 *       - "Sales Templates"
 *     summary: Create library template from sales template
 *     description: Creates a new library template based on an existing sales template.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sales template ID
 *     responses:
 *       200:
 *         description: Successfully created library template from sales template
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LibraryTemplate'
 *       400:
 *         description: Bad request, sales template ID is missing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Requires a Sales Template ID"
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
 *         description: Sales template not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Sales Template with ID {id}"
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
 * /salesTemplates/{id}/upload_complete:
 *   put:
 *     tags:
 *       - "Sales Templates"
 *     summary: Add uploaded sales file path to sales template
 *     description: Adds the path of an uploaded sales file to a sales template and extracts example lines.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sales template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *                 description: Path to S3 upload destination
 *             required:
 *               - key
 *     responses:
 *       200:
 *         description: Successfully added file path to sales template
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalesTemplate'
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
 *         description: Sales template not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Sales Template with ID {id}"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error mapping template to sales file. Sales File is saved but may not be matched to the template"
 *
 * components:
 *   schemas:
 *     SalesTemplate:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the sales template
 *         name:
 *           type: string
 *           description: Name of the sales template
 *         clientId:
 *           type: string
 *           description: Client ID associated with the sales template
 *         source:
 *           type: string
 *           description: Source of the sales template, e.g. "Apple"
 *         archived:
 *           type: boolean
 *           description: Whether the sales template is archived
 *         file:
 *           type: string
 *           description: Path to the template file in S3
 *         startingLine:
 *           type: number
 *           description: Line number where data starts in the file
 *         delimiter:
 *           type: string
 *           description: Delimiter used in the file
 *         encoding:
 *           type: string
 *           nullable: true
 *           description: Encoding used in the file
 *         exampleLines:
 *           type: array
 *           items:
 *             type: string
 *           description: Example lines extracted from the file
 *         createdBy:
 *           type: string
 *           description: ID of the user who created the template
 *         lastModifiedBy:
 *           type: string
 *           description: ID of the user who last modified the template
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the template was created
 *     SalesTemplateInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the sales template
 *         source:
 *           type: string
 *           description: Source of the sales template, e.g. "Apple"
 *         archived:
 *           type: boolean
 *           description: Whether the sales template is archived
 *         startingLine:
 *           type: number
 *           description: Line number where data starts in the file
 *         delimiter:
 *           type: string
 *           description: Delimiter used in the file
 *         encoding:
 *           type: string
 *           nullable: true
 *           description: Encoding used in the file
 *       required:
 *         - name
 *     LibraryTemplate:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the library template
 *         name:
 *           type: string
 *           description: Name of the library template
 *         source:
 *           type: string
 *           description: Source of the library template
 *         published:
 *           type: boolean
 *           description: Whether the library template is published
 *         file:
 *           type: string
 *           description: Path to the template file in S3
 *         startingLine:
 *           type: number
 *           description: Line number where data starts in the file
 *         delimiter:
 *           type: string
 *           description: Delimiter used in the file
 *         exampleLines:
 *           type: array
 *           items:
 *             type: string
 *           description: Example lines extracted from the file
 *         createdBy:
 *           type: string
 *           description: ID of the user who created the template
 *         lastModifiedBy:
 *           type: string
 *           description: ID of the user who last modified the template
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the template was created
 */
