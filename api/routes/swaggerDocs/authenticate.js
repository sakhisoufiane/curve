/**
 * @openapi
 * /authenticate:
 *   post:
 *     tags:
 *       - "Authenticate"
 *     summary: User Authentication
 *     description: Authenticate a user using email/password or API key/secret. Returns a JWT token for authenticated sessions.
 *     parameters:
 *       - in: query
 *         name: applicationToken
 *         schema:
 *           type: string
 *           example: 5PzXza7PdC
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                     example: user@example.com
 *                   password:
 *                     type: string
 *                     example: password123
 *                   validateOnly:
 *                     type: boolean
 *                     description: If true, only validates credentials without returning a token
 *               - type: object
 *                 properties:
 *                   apiKey:
 *                     type: string
 *                     example: 303c1f847b4f0fe4bb2159c4
 *                   apiSecretKey:
 *                     type: string
 *                     example: f79bf7d468db1d65hb64fbf8
 *     responses:
 *       200:
 *         description: Authentication successful. Returns a JWT token for standard auth or MFA token for multi-factor auth.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     multiFactorAuthentication:
 *                       type: boolean
 *                       example: true
 *                     token:
 *                       type: string
 *                       description: MFA token to be used with multi_factor endpoint
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     multiFactorAuthentication:
 *                       type: boolean
 *                       example: true
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *                     multiFactorAuthenticationType:
 *                       type: string
 *                       example: Authenticator App
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     userType:
 *                       type: string
 *                       enum: [payee, client, parent, internal]
 *                     adminType:
 *                       type: string
 *                       enum: [Admin, Standard]
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     clientName:
 *                       type: string
 *                       example: "Client Name"
 *                     currencySymbol:
 *                       type: string
 *                       example: "$"
 *                     clientType:
 *                       type: string
 *                     features:
 *                       type: object
 *                     passwordExpired:
 *                       type: boolean
 *       500:
 *         description: Internal server error or database connection issue.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Database not connected"
 *
 */
