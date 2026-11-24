/**
 * @openapi
 * /spotify/search:
 *   get:
 *     tags:
 *       - "Spotify"
 *     summary: Search Spotify
 *     description: Searches Spotify for tracks, albums, artists, or labels matching the provided search terms.
 *     parameters:
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: General search term
 *       - in: query
 *         name: album
 *         schema:
 *           type: string
 *         description: Album name to search for
 *       - in: query
 *         name: artist
 *         schema:
 *           type: string
 *         description: Artist name to search for
 *       - in: query
 *         name: label
 *         schema:
 *           type: string
 *         description: Label name to search for
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [track, album, artist, label]
 *         description: Type of entity to search for
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
 *     responses:
 *       200:
 *         description: Successfully retrieved search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                       artists:
 *                         type: array
 *                         items:
 *                           type: string
 *                       album:
 *                         type: string
 *                       label:
 *                         type: string
 *                       isrc:
 *                         type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     total:
 *                       type: integer
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
 * /spotify/import:
 *   post:
 *     tags:
 *       - "Spotify"
 *     summary: Import Spotify data
 *     description: Imports data from Spotify into the system. Requires a valid client ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     artists:
 *                       type: array
 *                       items:
 *                         type: string
 *                     album:
 *                       type: string
 *                     label:
 *                       type: string
 *                     isrc:
 *                       type: string
 *               searchTerm:
 *                 type: string
 *                 description: General search term used for the original search
 *               album:
 *                 type: string
 *                 description: Album name used for the original search
 *               artist:
 *                 type: string
 *                 description: Artist name used for the original search
 *               label:
 *                 type: string
 *                 description: Label name used for the original search
 *               type:
 *                 type: string
 *                 enum: [track, album, artist, label]
 *                 description: Type of entity used for the original search
 *               updateExistingItems:
 *                 type: boolean
 *                 description: Whether to update existing items or create new ones
 *     responses:
 *       200:
 *         description: Successfully initiated import
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: string
 *                   example: "Ok"
 *       403:
 *         description: Forbidden, the user does not have a valid client ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Forbidden"
 */
