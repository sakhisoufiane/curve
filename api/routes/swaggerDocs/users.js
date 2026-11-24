/**
 * @openapi
 * /users:
 *   get:
 *     tags:
 *       - "Users"
 *     summary: Retrieve a list of users
 *     description: Returns a paginated list of users with filtering options. Only accessible to users with appropriate permissions.
 *     parameters:
 *       - in: query
 *         name: text
 *         schema:
 *           type: string
 *         description: Search text to filter users by email or name
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
 *         description: Number of users per page
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
 *         description: Successfully retrieved list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
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
 *                   example: "Error, please try again"
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
 * /users/import:
 *   post:
 *     tags:
 *       - "Users"
 *     summary: Import users from Excel file
 *     description: Bulk import users from an Excel file. Only accessible to users with admin rights.
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
 *                 description: Excel file containing user data to import
 *     responses:
 *       200:
 *         description: Import process started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Users are importing, and a report will be sent to you shortly."
 *       400:
 *         description: Bad request, file is required
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
 *                   example: "Internal error, please try again"
 *
 * /users/export:
 *   post:
 *     tags:
 *       - "Users"
 *     summary: Export user data
 *     description: Exports user data based on provided filters and user IDs. Report will be sent via email.
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
 *                 description: Array of user IDs to export
 *               filter:
 *                 type: object
 *                 properties:
 *                   text:
 *                     type: string
 *                     description: Text filter for user search
 *     responses:
 *       200:
 *         description: Export process started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Your report will be sent to you via email shortly"
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
 * /users/{id}:
 *   get:
 *     tags:
 *       - "Users"
 *     summary: Retrieve a specific user
 *     description: Returns details for a specific user by ID. Only accessible to users with appropriate permissions.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Successfully retrieved user details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
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
 *                   example: "Could not find User with ID 123456789012"
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
 *       - "Users"
 *     summary: Update a user
 *     description: Updates a user's details. Various restrictions apply based on the user's permissions and relationship to the target user.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: User ID
 *               status:
 *                 type: string
 *                 enum: [active, inactive, pending]
 *               rights:
 *                 type: object
 *                 description: User rights for specific clients
 *               multiFactorAuthentication:
 *                 type: boolean
 *               multiFactorAuthenticationType:
 *                 type: string
 *                 enum: [app, email]
 *               newPassword:
 *                 type: string
 *               confirmNewPassword:
 *                 type: string
 *               currentPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: User successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request, validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Passwords do not match"
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
 *                   example: "Could not find User with ID 123456789012"
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
 *       - "Users"
 *     summary: Delete a user
 *     description: Deletes a user by ID. Users cannot delete themselves. Only accessible to users with appropriate permissions.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User successfully deleted"
 *       403:
 *         description: Forbidden, the user does not have sufficient rights or trying to delete self
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Action Denied"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
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
 * /users/{id}/clients:
 *   get:
 *     tags:
 *       - "Users"
 *     summary: Get user's associated clients
 *     description: Returns a list of clients associated with the user. Only accessible to internal users.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Successfully retrieved user's clients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: Client ID
 *                   name:
 *                     type: string
 *                     description: Client name
 *       403:
 *         description: Forbidden, only internal users can access this
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
 * /users/{id}/payees:
 *   get:
 *     tags:
 *       - "Users"
 *     summary: Get user's associated payees
 *     description: Returns a list of payees associated with the user. Filtered by client context.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Successfully retrieved user's payees
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: Payee ID
 *                   name:
 *                     type: string
 *                     description: Payee name
 *                   clientId:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
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
 * /users/{id}/set_client:
 *   put:
 *     tags:
 *       - "Users"
 *     summary: Set user's active client or payee role
 *     description: Sets the active client or payee role for the user and returns a new authentication token.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - roleId
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [client, payee]
 *                 description: Type of role to set
 *               roleId:
 *                 type: string
 *                 description: ID of the client or payee to set as active
 *     responses:
 *       200:
 *         description: Role successfully set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   description: New authentication token
 *                 userType:
 *                   type: string
 *                   enum: [client, payee]
 *                 email:
 *                   type: string
 *                 currency:
 *                   type: string
 *                 currencySymbol:
 *                   type: string
 *                 multiCurrencies:
 *                   type: array
 *                   items:
 *                     type: string
 *                 dateFormat:
 *                   type: string
 *                 clientName:
 *                   type: string
 *                 clientId:
 *                   type: string
 *                 clientType:
 *                   type: string
 *                 adminType:
 *                   type: string
 *                 features:
 *                   type: object
 *                 clientRights:
 *                   type: object
 *       403:
 *         description: Forbidden, role not allowed or user doesn't have access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Forbidden"
 *       404:
 *         description: User, client, or payee not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
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
 * /users/{id}/remove_client:
 *   put:
 *     tags:
 *       - "Users"
 *     summary: Remove client association from user
 *     description: Removes the active client and payee association from the user and returns a new authentication token.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Client association successfully removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 internal:
 *                   type: boolean
 *                 parentId:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: New authentication token
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Could not find User with ID 123456789012"
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
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the user
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         status:
 *           type: string
 *           enum: [active, inactive, pending]
 *           description: Current status of the user account
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the user's last login
 *         clientId:
 *           type: string
 *           description: Primary client ID associated with the user
 *         payeeId:
 *           type: string
 *           description: Primary payee ID associated with the user
 *         clientIds:
 *           type: array
 *           items:
 *             type: string
 *           description: List of client IDs the user has access to
 *         payeeIds:
 *           type: array
 *           items:
 *             type: string
 *           description: List of payee IDs the user has access to
 *         rights:
 *           type: object
 *           description: User permissions for different clients
 *           additionalProperties:
 *             type: object
 *             properties:
 *               catalogue:
 *                 type: string
 *                 enum: [none, read, write, admin]
 *               contracts:
 *                 type: string
 *                 enum: [none, read, write, admin]
 *               payees:
 *                 type: string
 *                 enum: [none, read, write, admin]
 *               sales:
 *                 type: string
 *                 enum: [none, read, write, admin]
 *               periods:
 *                 type: string
 *                 enum: [none, read, write, admin]
 *               statements:
 *                 type: string
 *                 enum: [none, read, write, admin]
 *               payments:
 *                 type: string
 *                 enum: [none, read, write, admin]
 *               users:
 *                 type: string
 *                 enum: [none, read, write, admin]
 *               analytics:
 *                 type: string
 *                 enum: [none, read, write, admin]
 *         parentId:
 *           type: string
 *           description: ID of the parent organization if applicable
 *         adminClientIds:
 *           type: array
 *           items:
 *             type: string
 *           description: List of client IDs the user has admin rights for
 *         multiFactorAuthentication:
 *           type: boolean
 *           description: Whether multi-factor authentication is enabled
 *         multiFactorAuthenticationType:
 *           type: string
 *           enum: [app, email]
 *           description: Type of multi-factor authentication
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the user was created
 *         notifications:
 *           type: object
 *           description: User notification preferences
 *         authenticationType:
 *           type: string
 *           enum: [local, sso]
 *           description: Authentication method used by the user
 *         sendings:
 *           type: array
 *           items:
 *             type: object
 *           description: Email sending preferences
 *         internal:
 *           type: boolean
 *           description: Whether the user is an internal system user
 */
