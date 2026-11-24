/**
 * @openapi
 * /companies:
 *   get:
 *     tags:
 *       - "Companies"
 *     summary: Retrieve companies
 *     description: Returns a paginated list of companies. Requires read access to contracts.
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
 *         description: Text to search for in company name
 *       - in: query
 *         name: createdAfter
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter companies created on or after this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: createdBefore
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter companies created on or before this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: updatedAfter
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter companies updated on or after this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: updatedBefore
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter companies updated on or before this date (inclusive, YYYY-MM-DD format)
 *     responses:
 *       200:
 *         description: Successfully retrieved companies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 companies:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Company'
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
 *       - "Companies"
 *     summary: Create a company
 *     description: Creates a new company. Requires write access to contracts.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompanyInput'
 *     responses:
 *       200:
 *         description: Successfully created company
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
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
 * /companies/{id}:
 *   get:
 *     tags:
 *       - "Companies"
 *     summary: Retrieve a specific company
 *     description: Returns details for a specific company by ID. Requires read access to contracts.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Successfully retrieved company
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
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
 *         description: Company not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Company with ID 123456789012"
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
 *       - "Companies"
 *     summary: Update a company
 *     description: Updates a company by ID. Requires write access to contracts.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompanyInput'
 *     responses:
 *       200:
 *         description: Successfully updated company
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
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
 *         description: Company not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Company with ID 123456789012"
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
 *       - "Companies"
 *     summary: Delete a company
 *     description: Deletes a company by ID. Requires write access to contracts.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Successfully deleted company
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
 *       403:
 *         description: Forbidden, the user does not have sufficient rights or company is associated with contracts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Company is associated with contracts, so cannot be deleted. Remove the company from the contracts and try again."
 *       404:
 *         description: Company not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Company with ID 123456789012"
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
 * /companies/{id}/history:
 *   get:
 *     tags:
 *       - "Companies"
 *     summary: Retrieve company history
 *     description: Returns the modification history for a specific company. Requires read access to contracts.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Successfully retrieved company history
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
 *         description: Company not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find Company with ID 123456789012"
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
 * /companies/{id}/upload:
 *   post:
 *     tags:
 *       - "Companies"
 *     summary: Upload company logo
 *     description: Uploads a logo file for a specific company. Requires write access to contracts.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Logo image file
 *     responses:
 *       200:
 *         description: Successfully uploaded company logo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Company'
 *       400:
 *         description: Bad request, missing file
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
 *                   example: "There was an error uploading the file, please try again"
 *
 * components:
 *   schemas:
 *     Company:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the company
 *         name:
 *           type: string
 *           description: Name of the company
 *         clientId:
 *           type: string
 *           description: Client ID associated with the company
 *         address:
 *           type: string
 *           description: Company address
 *         city:
 *           type: string
 *           description: Company city
 *         state:
 *           type: string
 *           description: Company state/province
 *         country:
 *           type: string
 *           description: Company country
 *         postcode:
 *           type: string
 *           description: Company postal/zip code
 *         phone:
 *           type: string
 *           description: Company phone number
 *         email:
 *           type: string
 *           description: Company email address
 *         website:
 *           type: string
 *           description: Company website URL
 *         logo:
 *           type: string
 *           description: S3 key for company logo
 *         publicLogo:
 *           type: string
 *           description: Public URL for company logo
 *         statementDesign:
 *           type: object
 *           description: Statement design configuration
 *         salesReturnsRights:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               contractId:
 *                 type: string
 *           description: Sales returns rights configuration
 *         costsRights:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               contractId:
 *                 type: string
 *           description: Costs rights configuration
 *         createdBy:
 *           type: string
 *           description: User ID who created the company
 *         lastModifiedBy:
 *           type: string
 *           description: User ID who last modified the company
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the company was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the company was last updated
 *     CompanyInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the company
 *         address:
 *           type: string
 *           description: Company address
 *         city:
 *           type: string
 *           description: Company city
 *         state:
 *           type: string
 *           description: Company state/province
 *         country:
 *           type: string
 *           description: Company country
 *         postcode:
 *           type: string
 *           description: Company postal/zip code
 *         phone:
 *           type: string
 *           description: Company phone number
 *         email:
 *           type: string
 *           description: Company email address
 *         website:
 *           type: string
 *           description: Company website URL
 *         statementDesign:
 *           type: object
 *           description: Statement design configuration
 *         salesReturnsRights:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               contractId:
 *                 type: string
 *           description: Sales returns rights configuration
 *         costsRights:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               contractId:
 *                 type: string
 *           description: Costs rights configuration
 */
