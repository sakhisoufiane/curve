/**
 * @openapi
 * /detail:
 *   post:
 *     tags:
 *       - Analytics
 *     summary: Run analytics queries
 *     description: Executes analytics queries using provided filters and outputs for a user with a clientId or payeeId.
 *     parameters:
 *       - in: query
 *         name: companies
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Filter by an array of company IDs.
 *       - in: query
 *         name: contractIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Filter by an array of contract IDs.
 *       - in: query
 *         name: calculationTypes
 *         schema:
 *           type: string
 *         description: Filter by calculation types.
 *       - in: query
 *         name: contractCategories
 *         schema:
 *           type: string
 *         description: Filter by contract category.
 *       - in: query
 *         name: periodIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Filter by an array of period IDs.
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Filter by period string.
 *       - in: query
 *         name: salesFileIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Filter by an array of sales file IDs.
 *       - in: query
 *         name: catType
 *         schema:
 *           type: string
 *           enum: [Release, Track, Contract]
 *         description: Filter by catalogue type.
 *       - in: query
 *         name: targetPeriod
 *         schema:
 *           type: string
 *         description: Filter by target period ID.
 *       - in: query
 *         name: foreignId
 *         schema:
 *           type: string
 *         description: Filter by foreign ID.
 *       - in: query
 *         name: distributionChannels
 *         schema:
 *           type: string
 *           enum: [Digital, Physical, Performance, Licensing, Sync, Merchandise, Other]
 *         description: Filter by distribution channel.
 *       - in: query
 *         name: configurations
 *         schema:
 *           type: string
 *           enum: [CD, DVD, LP, '12"', '10"', '7"', Download, 'Premium Stream', 'Ad-Funded Stream', 'Video Premium Stream', 'Video Ad-Funded Stream', Ringtone, Performance, Sync, Other]
 *         description: Filter by configuration type.
 *       - in: query
 *         name: territories
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Filter by territory codes (e.g., US, UK).
 *       - in: query
 *         name: priceCategories
 *         schema:
 *           type: string
 *           enum: ['Full Price', 'Mid Price', 'Budget']
 *         description: Filter by price category.
 *       - in: query
 *         name: catalogueGroups
 *         schema:
 *           type: string
 *         description: Filter by catalogue group.
 *       - in: query
 *         name: releaseIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Filter by an array of release IDs.
 *       - in: query
 *         name: trackIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Filter by an array of track IDs.
 *       - in: query
 *         name: workIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Filter by an array of work IDs.
 *       - in: query
 *         name: saleDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by exact sale date (YYYY-MM-DD).
 *       - in: query
 *         name: transactionDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by exact transaction date (YYYY-MM-DD).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filter
 *               - outputs
 *             properties:
 *               filter:
 *                 type: array
 *                 description: Array of filter objects defining the analytics query.
 *                 items:
 *                   $ref: '#/components/schemas/FilterItem'
 *               comparison:
 *                 type: boolean
 *                 description: Optional boolean.
 *               outputs:
 *                 type: array
 *                 description: Array of output fields to return from the analytics query.
 *                 items:
 *                   $ref: '#/components/schemas/Outputs'
 *     responses:
 *       '200':
 *         description: Successfully retrieved analytics and optional comparison data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analytics:
 *                   type: array
 *                   items:
 *                     type: object
 *                 comparison:
 *                   type: array
 *                   items:
 *                     type: object
 *       '400':
 *         description: Bad request – missing required 'filter' or 'outputs'.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *             example:
 *               errors:
 *                 - "requires params 'filter' and 'outputs' to be supplied"
 *       '403':
 *         description: Forbidden – user is missing clientId or payeeId.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Forbidden"
 *       '500':
 *         description: Internal server error – analytics processing failed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Internal error, please try again"
 * components:
 *   schemas:
 *     FilterItem:
 *       type: object
 *       required:
 *         - key
 *         - value
 *       properties:
 *         key:
 *           type: string
 *           description: >
 *             Field to filter on. Depending on the key, the `value` should conform to a specific format or allowed set:
 *               - catType: 'Release' | 'Track' | 'Contract'
 *               - catalogueGroups: string
 *               - companies: array of IDs
 *               - configurations: one of ['CD', 'DVD', 'LP', '12"', '10"', '7"', 'Download', 'Premium Stream', 'Ad-Funded Stream', 'Video Premium Stream', 'Video Ad-Funded Stream', 'Ringtone', 'Performance', 'Sync', 'Other']
 *               - contractIds: array of IDs
 *               - distributionChannels: one of ['Digital', 'Physical', 'Performance', 'Licensing', 'Sync', 'Merchandise', 'Other']
 *               - periodIds: array of IDs
 *               - priceCategories: one of ['Full Price', 'Mid Price', 'Budget']
 *               - releaseDateEnd/releaseDateStart: object with { includeTracksWithRelease: boolean, releaseDate(Start|End): Date }
 *               - releaseIds: object with { includeTracksWithRelease: boolean, releaseIds: array of IDs }
 *               - saleDate(Start|End): Date
 *               - saleDateNumber/transactionDateNumber: number
 *               - saleDatePeriod/transactionDatePeriod: 'Months' | 'Days'
 *               - sources/subSources/trackLabel/catalogueTrackForeignId/catalogueGroups: string
 *               - trackIds: array of IDs
 *               - transactionDate(Start|End): Date
 *         enum:
 *           - catType
 *           - catalogueGroups
 *           - companies
 *           - configurations
 *           - contractCategories
 *           - contractIds
 *           - distributionChannels
 *           - periodIds
 *           - priceCategories
 *           - projectId
 *           - releaseDateEnd
 *           - releaseDateStart
 *           - catalogueReleaseForeignId
 *           - releaseLabel
 *           - includeTracksWithRelease
 *           - releaseIds
 *           - saleDateEnd
 *           - saleDateNumber
 *           - saleDatePeriod
 *           - saleDateStart
 *           - salesFileIds
 *           - sources
 *           - subSources
 *           - targetPeriod
 *           - territories
 *           - catalogueTrackForeignId
 *           - trackLabel
 *           - trackIds
 *           - transactionDateEnd
 *           - transactionDateNumber
 *           - transactionDatePeriod
 *           - transactionDateStart
 *         value:
 *           description: >
 *             Accepts string, number, boolean, or an array of strings.
 *             Complex fields may accept structured objects — see the `key` field for context-specific examples.
 *           oneOf:
 *             - type: string
 *             - type: number
 *             - type: boolean
 *             - type: array
 *               items:
 *                 type: string
 *             - type: object
 *       example:
 *         releaseIds:
 *           includeTracksWithRelease: true
 *           releaseIds:
 *             - "id"
 *     Outputs:
 *       type: object
 *       properties:
 *         outputs:
 *           type: array
 *           description: List of analytics data sections to include in the response
 *           items:
 *             type: string
 *             enum:
 *               - distributionChannels
 *               - configurations
 *               - territories
 *               - sources
 *               - subSources
 *               - catalogue
 *               - revenueOverTime
 *               - costs
 *               - topArtists
 *               - topLabels
 *               - averageStreamRates
 *               - contractBreakdown
 *       example:
 *         outputs:
 *           - distributionChannels
 *           - configurations
 *           - territories
 *           - sources
 *           - subSources
 *           - catalogue
 *           - revenueOverTime
 *           - costs
 *           - topArtists
 *           - topLabels
 *           - averageStreamRates
 *           - contractBreakdown
 */
