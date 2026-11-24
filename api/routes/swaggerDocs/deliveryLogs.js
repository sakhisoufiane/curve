/**
 * @openapi
 * /deliveryLogs:
 *   get:
 *     tags:
 *       - "Delivery Logs"
 *     summary: Retrieve delivery logs
 *     description: Returns delivery logs for tracking work deliveries. Requires read access to catalogue.
 *     responses:
 *       200:
 *         description: Successfully retrieved delivery logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DeliveryLog'
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
 *                   example: "Unfortunately we couldn't complete your request. Please try again, or contact the support team."
 *
 * components:
 *   schemas:
 *     DeliveryLog:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the delivery log
 *         clientId:
 *           type: string
 *           description: Client ID associated with the delivery log
 *         deliveryPartnerId:
 *           type: string
 *           description: Delivery partner ID associated with the delivery log
 *         workId:
 *           type: string
 *           description: Work ID associated with the delivery log
 *         log:
 *          type: array
 *          items:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               description: Unique identifier for the log entry
 *             status:
 *               type: string
 *             action:
 *               type: string
 *             messages:
 *               type: array
 *             date:
 *               type: string
 *               format: date-time
 *             deliveredWork:
 *              type: object
 *              properties:
 *                _id:
 *                  type: string
 *                  example: "67bed751da1eca866fb29ba5"
 *                clientId:
 *                  type: string
 *                  example: "64e8a4652dc5ac9aa6b5e3a9"
 *                workId:
 *                  type: string
 *                  example: "655367e2aa6e3de02cdc2bf4"
 *                deliveryPartnerId:
 *                  type: string
 *                  example: "66e289b59d98bad54b6f7a34"
 *                status:
 *                  type: string
 *                  example: "Delivered"
 *                deliveryDate:
 *                  type: string
 *                  format: date-time
 *                  example: "2025-02-26T08:56:49.000Z"
 *                messages:
 *                  type: array
 *                  items:
 *                    type: string
 *                  example: []
 *                userCreated:
 *                  type: boolean
 *                  example: true
 *                createdAt:
 *                  type: string
 *                  format: date-time
 *                  example: "2025-02-26T08:56:49.800Z"
 *                updatedAt:
 *                  type: string
 *                  format: date-time
 *                  example: "2025-02-26T08:56:49.800Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the delivery log was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the delivery log was last updated
 */
