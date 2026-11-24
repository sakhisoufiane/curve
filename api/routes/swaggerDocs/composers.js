/**
 * @openapi
 * /composers:
 *   get:
 *     tags:
 *       - Composers
 *     summary: Retrieve a list of composers
 *     description: Retrieve composers based on provided filters and pagination settings.
 *     parameters:
 *       - in: query
 *         name: page
 *         type: integer
 *         default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         type: integer
 *         default: 25
 *         description: Number of items per page.
 *       - in: query
 *         name: orderBy
 *         type: string
 *         enum: [name, createdAt, updatedAt]
 *         description: Field to sort by.
 *       - in: query
 *         name: orderDir
 *         type: string
 *         enum: [asc, desc]
 *         description: Sorting direction.
 *       - in: query
 *         name: text
 *         type: string
 *         description: Search term for composer names.
 *       - in: query
 *         name: createdAfter
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter composers created on or after this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: createdBefore
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter composers created on or before this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: updatedAfter
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter composers updated on or after this date (inclusive, YYYY-MM-DD format)
 *       - in: query
 *         name: updatedBefore
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter composers updated on or before this date (inclusive, YYYY-MM-DD format)
 *     responses:
 *       200:
 *         description: Retrieves a list of composers
 *         schema:
 *           type: object
 *           properties:
 *             composers:
 *               type: array
 *               items:
 *                 $ref: '#/definitions/Composer'
 *             meta:
 *               type: object
 *               properties:
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 total:
 *                   type: integer
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Composer'
 *             examples:
 *               composer:
 *                 summary: Example list of composers
 *                 value:
 *                   composers:
 *                     - _id: "composer_id_1"
 *                       name: "Composer Name"
 *                       linkedContracts: []
 *                       createdAt: "2024-01-01T00:00:00.000Z"
 *                       updatedAt: "2024-01-01T00:00:00.000Z"
 *                       cae: "00000000000"
 *                     - _id: "composer_id_2"
 *                       name: "Composer Name - Copy"
 *                       linkedContracts: []
 *                       createdAt: "2024-01-01T00:00:00.000Z"
 *                       updatedAt: "2024-01-01T00:00:00.000Z"
 *                       cae: "00000000000"
 *                     - _id: "composer_id_3"
 *                       name: "New Composer"
 *                       linkedContracts: []
 *                       createdAt: "2024-01-01T00:00:00.000Z"
 *                       updatedAt: "2024-01-01T00:00:00.000Z"
 *                       cae: "00000000000"
 *                   meta:
 *                     currentPage: 1
 *                     totalPages: 1
 *                     total: 3
 *       403:
 *         description: Forbidden, the user does not have sufficient rights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to retrieve the Composer.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *   post:
 *     tags:
 *       - Composers
 *     summary: Create a new composer
 *     description: Add a new composer to the catalogue.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Composer'
 *     responses:
 *       200:
 *         description: Composer successfully created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *       400:
 *         description: Bad request. The request was badly formatted or had an error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Forbidden, the user does not have sufficient rights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to create the Composer.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 * /composers/{id}:
 *   get:
 *     tags:
 *       - Composers
 *     summary: Retrieve a specific composer by ID
 *     description: Get details of a specific composer by their unique identifier.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the composer to retrieve.
 *     responses:
 *       200:
 *         description: Composer details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Composer'
 *             examples:
 *               composer:
 *                 summary: Example composer
 *                 value:
 *                   clientId: "12345abc"
 *                   foreignId: "exampleForeignID"
 *                   partyNo: 123
 *                   name: "John Doe"
 *                   cae: "123456789"
 *                   controlled: true
 *                   createdBy: "5f50c31f12e34b42a7a7b4c3"
 *                   lastModifiedBy: "5f50c31f12e34b42a7a7b4c4"
 *                   createdAt: "2021-09-01T10:00:00Z"
 *                   updatedAt: "2021-09-02T15:00:00Z"
 *       403:
 *         description: Forbidden, the user does not have sufficient rights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Composer not found, no Composer exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to retrieve the Composer.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *   put:
 *     tags:
 *       - Composers
 *     summary: Update a specific composer
 *     description: Update the details of a specific composer by their unique identifier.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the composer to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Composer'
 *     responses:
 *       200:
 *         description: Composer details updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Composer'
 *       403:
 *         description: Forbidden, the user does not have sufficient rights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Composer not found, no Composer exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to retrieve the Composer.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *   delete:
 *     tags:
 *       - Composers
 *     summary: Delete a specific composer
 *     description: Delete a specific composer by their unique identifier.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the composer to delete.
 *     responses:
 *       200:
 *         description: Composer deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Forbidden, the user does not have sufficient rights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Composer not found, no Composer exists with the specified ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while trying to retrieve the Composer.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *
 * /composers/raw-export:
 *   post:
 *     tags:
 *       - "Composers"
 *     summary: Raw CSV Export of Composers
 *     description: |
 *       Export composers data to a raw CSV file. By default, the export is processed asynchronously
 *       and a notification email is sent when complete. When sync=true, the request waits for
 *       the export to complete and returns the download URL directly in the response.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sync:
 *                 type: boolean
 *                 default: false
 *                 description: |
 *                   If true, waits for export to complete and returns download URL directly.
 *                   If false (default), sends notification email when export is ready.
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of composer IDs to export. If provided, only these composers will be exported.
 *               filter:
 *                 type: object
 *                 description: Filter object to select composers for export. Used when ids are not provided.
 *                 properties:
 *                   text:
 *                     type: string
 *                     description: Text search filter for name or interested party ID.
 *                   createdAfter:
 *                     type: string
 *                     format: date
 *                     description: Filter for composers created on or after this date. Date-only values use start of day UTC.
 *                     example: "2025-01-01"
 *                   createdBefore:
 *                     type: string
 *                     format: date
 *                     description: Filter for composers created on or before this date. Date-only values use end of day UTC.
 *                     example: "2025-12-31"
 *                   updatedAfter:
 *                     type: string
 *                     format: date
 *                     description: Filter for composers updated on or after this date. Date-only values use start of day UTC.
 *                     example: "2025-01-01"
 *                   updatedBefore:
 *                     type: string
 *                     format: date
 *                     description: Filter for composers updated on or before this date. Date-only values use end of day UTC.
 *                     example: "2025-12-31"
 *     responses:
 *       200:
 *         description: |
 *           When sync=false (default): Export process started successfully, email notification will be sent.
 *           When sync=true: Export completed, returns download URL (expires in 24 hours).
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Your report will be sent to you via email shortly"
 *                   description: Response when sync=false (default)
 *                 - type: object
 *                   properties:
 *                     csvPublicLink:
 *                       type: string
 *                       format: uri
 *                       example: "https://s3.amazonaws.com/bucket/raw_exports/Client-composers%20raw%20export%2020260120133708304.csv"
 *                   description: Response when sync=true
 *       403:
 *         description: Forbidden, the user does not have sufficient rights.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error occurred while processing the export.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 *                   description: Error details (only returned when sync=true)
 *
 * components:
 *   schemas:
 *     Composer:
 *       type: object
 *       properties:
 *         clientId:
 *           type: string
 *         foreignId:
 *           type: string
 *           description: A foreign identifier for the composer.
 *         partyNo:
 *           type: number
 *           description: Auto-assigned on creation.
 *         name:
 *           type: string
 *           description: The name of the composer.
 *           required: true
 *         lowerCaseName:
 *           type: string
 *           description: Auto-generated on save.
 *         firstName:
 *           type: string
 *         middleNames:
 *           type: string
 *         surname:
 *           type: string
 *         cae:
 *           type: string
 *           description: CAE or IPI number of the composer.
 *         caeWithoutLeadingZeros:
 *           type: string
 *           description: CAE or IPI number of the composer without leading zeros.
 *         mainPro:
 *           type: string
 *           enum: ['PRS', 'ASCAP', 'BMI', 'SOCAN', 'AACIMH', 'ABRAC', 'ABRAMUS', 'ACAM', 'ACCESS', 'ACDAM', 'ACEMLA', 'ACUM', 'ADAGP', 'ADAVIS', 'ADDAF', 'AEPI', 'AGADU', 'AGAYC', 'AKKA/LAA', 'AKM', 'ALBAUTOR', 'ALCS', 'AMAR', 'AMCOS', 'AMPAL', 'AMRA', 'AMUS', 'ANACIM', 'APA', 'APDAYC', 'APG-JAPAN', 'APRA', 'APSAV', 'ARGENTORES', 'ARMAUTHOR', 'ARS', 'ARTISJUS', 'ASDAC', 'ASSIM', 'ATIDA', 'ATN', 'AUSTRO-MECHANA', 'AUTODIA', 'AUTORARTE', 'AUTVIS', 'AWA', 'AWGACS', 'BACKOFFICE', 'BBDA', 'BCDA', 'BEELDRECHT', 'BGDA', 'BILD-KUNST', 'BMDA', 'BNDA', 'BONO', 'BSDA', 'BUBEDRA', 'BUCUDA', 'BUMA', 'BUMDA', 'BURAFO', 'BURIDA', 'BUS', 'BUTODRA', 'CAL', 'CAPAC', 'CAPASSO', 'CASH', 'CCL', 'CHA', 'CMRRA', 'COMPASS', 'COPY-DAN BILLEDKUNST', 'COPYRO', 'COSCAP', 'COSGA', 'COSOMA', 'COSOTA', 'COTT', 'CPSN', 'CREAIMAGEN', 'CSCS', 'DACS', 'DALRO', 'DGA', 'DILIA ', 'DIRECTORES', 'DIVA', 'DP', 'DPRS', 'DRCC', 'EAU', 'ECAD', 'FILMAUTOR', 'FILSCAP', 'FLIM JUS', 'FONOPERU', 'GEMA', 'GESAC', 'GESTOR', 'GMR', 'HAA', 'HARRY FOX', 'HDS-ZAMP', 'ECCO', 'EDEM', 'HUNGART', 'ICE', 'ICG', 'IMJV', 'IMRO', 'IPRS', 'JACAP', 'JASRAC', 'KAZAK', 'KCI', 'KODA', 'KOMCA', 'KOPIOSTO', 'KOSA', 'KUVASTO', 'KYRGYZPATENT', 'LAA', 'LATGA-A', 'LATINAUTOR', 'LATINNET', 'LIRA', 'LITA', 'LITERAR-MECHANA', 'LVG', 'MACP', 'MASA', 'MCPS', 'MCSC', 'MCSK', 'MCSN', 'MCT', 'MESAM', 'MINT', 'MISASIA', 'MLC', 'MRS', 'MSG', 'MUSICAUTOR', 'MUSICMARK', 'MUSIKEDITION', 'MUSIXMATCH', 'MUST', 'NASCAM', 'NCB', 'NMPA', 'NORD-DOC', 'NS', 'OMDA', 'ONDA', 'OSA', 'OTPDA', 'PAPPRI', 'PROCAN', 'PROLITTERIS', 'RAO', 'ROMS', 'RUPIS', 'SABAM', 'SABEM', 'SACD', 'SACEM', 'SACEMLUXEMBOURG', 'SACENC', 'SACERAU', 'SACK', 'SACM', 'SACVEN', 'SADA', 'SADAIC', 'SADEMBRA', 'SADH', 'SAIF', 'SAMPRA', 'SAMRO', 'SARRAL', 'SARTEC', 'SAS', 'SAYCE', 'SAYCO', 'SAZAS', 'SBACEM', 'SBAT', 'SCAM', 'SCD', 'SESAC', 'SESAM', 'SFF', 'SGA', 'SGACEDOM', 'SGAE', 'SGDL', 'SIAE', 'SICAM', 'SLPRS', 'SNAC', 'SOBODAYCOM', "SOCIETE DE L'IMAGE", 'SOCINADA', 'SOCINPRO', 'SODART', 'SODRAC', 'SOFAM', 'SOGEM', 'SOKOJ', 'SOMAAP', 'SOMAS', 'SONECA', 'SONGCODE', 'SOPE', 'SOZA', 'SPA', 'SPAC', 'SPACEMF', 'SPACQ', 'SPOTIFY', 'SQN', 'SSA', 'STEF', 'STEMRA', 'STIM', 'SUISA', 'SUISSIMAGE', 'SUOMEN KIRJAILIJALIITTO', 'TEATERAUTOR', 'TEOSTO', "THE AUTHOR'S REGISTRY INC.", 'THE SOCIETY OF AUTHORS', 'TONO', 'UACRR', 'UBC', 'UCMR-ADA', 'UCOSO', 'UFFICIO LEGALE', 'VAGA', 'VBK', 'VDFS', 'VEGAP', 'VEVAM', 'VG WORT', 'VISCOPY', 'WAMI', 'WGA', 'WGJ', 'WID CENTRE', 'YOUTUBE', 'ZAIKS', 'ZAMCOPS', 'ZAMP Association of Slovenia', 'ZAMP - Macédoine', 'ZAPA', 'ZIMRA', 'UNISON', 'KOSCAP']
 *         mainProIdentifier:
 *           type: string
 *           description: Identifier related to the Main PRO.
 *         mechanicalPro:
 *           type: string
 *           enum: ['PRS', 'ASCAP', 'BMI', 'SOCAN', 'AACIMH', 'ABRAC', 'ABRAMUS', 'ACAM', 'ACCESS', 'ACDAM', 'ACEMLA', 'ACUM', 'ADAGP', 'ADAVIS', 'ADDAF', 'AEPI', 'AGADU', 'AGAYC', 'AKKA/LAA', 'AKM', 'ALBAUTOR', 'ALCS', 'AMAR', 'AMCOS', 'AMPAL', 'AMRA', 'AMUS', 'ANACIM', 'APA', 'APDAYC', 'APG-JAPAN', 'APRA', 'APSAV', 'ARGENTORES', 'ARMAUTHOR', 'ARS', 'ARTISJUS', 'ASDAC', 'ASSIM', 'ATIDA', 'ATN', 'AUSTRO-MECHANA', 'AUTODIA', 'AUTORARTE', 'AUTVIS', 'AWA', 'AWGACS', 'BACKOFFICE', 'BBDA', 'BCDA', 'BEELDRECHT', 'BGDA', 'BILD-KUNST', 'BMDA', 'BNDA', 'BONO', 'BSDA', 'BUBEDRA', 'BUCUDA', 'BUMA', 'BUMDA', 'BURAFO', 'BURIDA', 'BUS', 'BUTODRA', 'CAL', 'CAPAC', 'CAPASSO', 'CASH', 'CCL', 'CHA', 'CMRRA', 'COMPASS', 'COPY-DAN BILLEDKUNST', 'COPYRO', 'COSCAP', 'COSGA', 'COSOMA', 'COSOTA', 'COTT', 'CPSN', 'CREAIMAGEN', 'CSCS', 'DACS', 'DALRO', 'DGA', 'DILIA ', 'DIRECTORES', 'DIVA', 'DP', 'DPRS', 'DRCC', 'EAU', 'ECAD', 'FILMAUTOR', 'FILSCAP', 'FLIM JUS', 'FONOPERU', 'GEMA', 'GESAC', 'GESTOR', 'GMR', 'HAA', 'HARRY FOX', 'HDS-ZAMP', 'ECCO', 'EDEM', 'HUNGART', 'ICE', 'ICG', 'IMJV', 'IMRO', 'IPRS', 'JACAP', 'JASRAC', 'KAZAK', 'KCI', 'KODA', 'KOMCA', 'KOPIOSTO', 'KOSA', 'KUVASTO', 'KYRGYZPATENT', 'LAA', 'LATGA-A', 'LATINAUTOR', 'LATINNET', 'LIRA', 'LITA', 'LITERAR-MECHANA', 'LVG', 'MACP', 'MASA', 'MCPS', 'MCSC', 'MCSK', 'MCSN', 'MCT', 'MESAM', 'MINT', 'MISASIA', 'MLC', 'MRS', 'MSG', 'MUSICAUTOR', 'MUSICMARK', 'MUSIKEDITION', 'MUSIXMATCH', 'MUST', 'NASCAM', 'NCB', 'NMPA', 'NORD-DOC', 'NS', 'OMDA', 'ONDA', 'OSA', 'OTPDA', 'PAPPRI', 'PROCAN', 'PROLITTERIS', 'RAO', 'ROMS', 'RUPIS', 'SABAM', 'SABEM', 'SACD', 'SACEM', 'SACEMLUXEMBOURG', 'SACENC', 'SACERAU', 'SACK', 'SACM', 'SACVEN', 'SADA', 'SADAIC', 'SADEMBRA', 'SADH', 'SAIF', 'SAMPRA', 'SAMRO', 'SARRAL', 'SARTEC', 'SAS', 'SAYCE', 'SAYCO', 'SAZAS', 'SBACEM', 'SBAT', 'SCAM', 'SCD', 'SESAC', 'SESAM', 'SFF', 'SGA', 'SGACEDOM', 'SGAE', 'SGDL', 'SIAE', 'SICAM', 'SLPRS', 'SNAC', 'SOBODAYCOM', "SOCIETE DE L'IMAGE", 'SOCINADA', 'SOCINPRO', 'SODART', 'SODRAC', 'SOFAM', 'SOGEM', 'SOKOJ', 'SOMAAP', 'SOMAS', 'SONECA', 'SONGCODE', 'SOPE', 'SOZA', 'SPA', 'SPAC', 'SPACEMF', 'SPACQ', 'SPOTIFY', 'SQN', 'SSA', 'STEF', 'STEMRA', 'STIM', 'SUISA', 'SUISSIMAGE', 'SUOMEN KIRJAILIJALIITTO', 'TEATERAUTOR', 'TEOSTO', "THE AUTHOR'S REGISTRY INC.", 'THE SOCIETY OF AUTHORS', 'TONO', 'UACRR', 'UBC', 'UCMR-ADA', 'UCOSO', 'UFFICIO LEGALE', 'VAGA', 'VBK', 'VDFS', 'VEGAP', 'VEVAM', 'VG WORT', 'VISCOPY', 'WAMI', 'WGA', 'WGJ', 'WID CENTRE', 'YOUTUBE', 'ZAIKS', 'ZAMCOPS', 'ZAMP Association of Slovenia', 'ZAMP - Macédoine', 'ZAPA', 'ZIMRA', 'UNISON', 'KOSCAP']
 *         mechanicalProIdentifier:
 *           type: string
 *           description: Identifier related to the Mechanical PRO.
 *         performancePro:
 *           type: string
 *           enum: ['PRS', 'ASCAP', 'BMI', 'SOCAN', 'AACIMH', 'ABRAC', 'ABRAMUS', 'ACAM', 'ACCESS', 'ACDAM', 'ACEMLA', 'ACUM', 'ADAGP', 'ADAVIS', 'ADDAF', 'AEPI', 'AGADU', 'AGAYC', 'AKKA/LAA', 'AKM', 'ALBAUTOR', 'ALCS', 'AMAR', 'AMCOS', 'AMPAL', 'AMRA', 'AMUS', 'ANACIM', 'APA', 'APDAYC', 'APG-JAPAN', 'APRA', 'APSAV', 'ARGENTORES', 'ARMAUTHOR', 'ARS', 'ARTISJUS', 'ASDAC', 'ASSIM', 'ATIDA', 'ATN', 'AUSTRO-MECHANA', 'AUTODIA', 'AUTORARTE', 'AUTVIS', 'AWA', 'AWGACS', 'BACKOFFICE', 'BBDA', 'BCDA', 'BEELDRECHT', 'BGDA', 'BILD-KUNST', 'BMDA', 'BNDA', 'BONO', 'BSDA', 'BUBEDRA', 'BUCUDA', 'BUMA', 'BUMDA', 'BURAFO', 'BURIDA', 'BUS', 'BUTODRA', 'CAL', 'CAPAC', 'CAPASSO', 'CASH', 'CCL', 'CHA', 'CMRRA', 'COMPASS', 'COPY-DAN BILLEDKUNST', 'COPYRO', 'COSCAP', 'COSGA', 'COSOMA', 'COSOTA', 'COTT', 'CPSN', 'CREAIMAGEN', 'CSCS', 'DACS', 'DALRO', 'DGA', 'DILIA ', 'DIRECTORES', 'DIVA', 'DP', 'DPRS', 'DRCC', 'EAU', 'ECAD', 'FILMAUTOR', 'FILSCAP', 'FLIM JUS', 'FONOPERU', 'GEMA', 'GESAC', 'GESTOR', 'GMR', 'HAA', 'HARRY FOX', 'HDS-ZAMP', 'ECCO', 'EDEM', 'HUNGART', 'ICE', 'ICG', 'IMJV', 'IMRO', 'IPRS', 'JACAP', 'JASRAC', 'KAZAK', 'KCI', 'KODA', 'KOMCA', 'KOPIOSTO', 'KOSA', 'KUVASTO', 'KYRGYZPATENT', 'LAA', 'LATGA-A', 'LATINAUTOR', 'LATINNET', 'LIRA', 'LITA', 'LITERAR-MECHANA', 'LVG', 'MACP', 'MASA', 'MCPS', 'MCSC', 'MCSK', 'MCSN', 'MCT', 'MESAM', 'MINT', 'MISASIA', 'MLC', 'MRS', 'MSG', 'MUSICAUTOR', 'MUSICMARK', 'MUSIKEDITION', 'MUSIXMATCH', 'MUST', 'NASCAM', 'NCB', 'NMPA', 'NORD-DOC', 'NS', 'OMDA', 'ONDA', 'OSA', 'OTPDA', 'PAPPRI', 'PROCAN', 'PROLITTERIS', 'RAO', 'ROMS', 'RUPIS', 'SABAM', 'SABEM', 'SACD', 'SACEM', 'SACEMLUXEMBOURG', 'SACENC', 'SACERAU', 'SACK', 'SACM', 'SACVEN', 'SADA', 'SADAIC', 'SADEMBRA', 'SADH', 'SAIF', 'SAMPRA', 'SAMRO', 'SARRAL', 'SARTEC', 'SAS', 'SAYCE', 'SAYCO', 'SAZAS', 'SBACEM', 'SBAT', 'SCAM', 'SCD', 'SESAC', 'SESAM', 'SFF', 'SGA', 'SGACEDOM', 'SGAE', 'SGDL', 'SIAE', 'SICAM', 'SLPRS', 'SNAC', 'SOBODAYCOM', "SOCIETE DE L'IMAGE", 'SOCINADA', 'SOCINPRO', 'SODART', 'SODRAC', 'SOFAM', 'SOGEM', 'SOKOJ', 'SOMAAP', 'SOMAS', 'SONECA', 'SONGCODE', 'SOPE', 'SOZA', 'SPA', 'SPAC', 'SPACEMF', 'SPACQ', 'SPOTIFY', 'SQN', 'SSA', 'STEF', 'STEMRA', 'STIM', 'SUISA', 'SUISSIMAGE', 'SUOMEN KIRJAILIJALIITTO', 'TEATERAUTOR', 'TEOSTO', "THE AUTHOR'S REGISTRY INC.", 'THE SOCIETY OF AUTHORS', 'TONO', 'UACRR', 'UBC', 'UCMR-ADA', 'UCOSO', 'UFFICIO LEGALE', 'VAGA', 'VBK', 'VDFS', 'VEGAP', 'VEVAM', 'VG WORT', 'VISCOPY', 'WAMI', 'WGA', 'WGJ', 'WID CENTRE', 'YOUTUBE', 'ZAIKS', 'ZAMCOPS', 'ZAMP Association of Slovenia', 'ZAMP - Macédoine', 'ZAPA', 'ZIMRA', 'UNISON', 'KOSCAP']
 *         performanceProIdentifier:
 *           type: string
 *           description: Identifier related to the Performance PRO.
 *         syncPro:
 *           type: string
 *           enum: ['PRS', 'ASCAP', 'BMI', 'SOCAN', 'AACIMH', 'ABRAC', 'ABRAMUS', 'ACAM', 'ACCESS', 'ACDAM', 'ACEMLA', 'ACUM', 'ADAGP', 'ADAVIS', 'ADDAF', 'AEPI', 'AGADU', 'AGAYC', 'AKKA/LAA', 'AKM', 'ALBAUTOR', 'ALCS', 'AMAR', 'AMCOS', 'AMPAL', 'AMRA', 'AMUS', 'ANACIM', 'APA', 'APDAYC', 'APG-JAPAN', 'APRA', 'APSAV', 'ARGENTORES', 'ARMAUTHOR', 'ARS', 'ARTISJUS', 'ASDAC', 'ASSIM', 'ATIDA', 'ATN', 'AUSTRO-MECHANA', 'AUTODIA', 'AUTORARTE', 'AUTVIS', 'AWA', 'AWGACS', 'BACKOFFICE', 'BBDA', 'BCDA', 'BEELDRECHT', 'BGDA', 'BILD-KUNST', 'BMDA', 'BNDA', 'BONO', 'BSDA', 'BUBEDRA', 'BUCUDA', 'BUMA', 'BUMDA', 'BURAFO', 'BURIDA', 'BUS', 'BUTODRA', 'CAL', 'CAPAC', 'CAPASSO', 'CASH', 'CCL', 'CHA', 'CMRRA', 'COMPASS', 'COPY-DAN BILLEDKUNST', 'COPYRO', 'COSCAP', 'COSGA', 'COSOMA', 'COSOTA', 'COTT', 'CPSN', 'CREAIMAGEN', 'CSCS', 'DACS', 'DALRO', 'DGA', 'DILIA ', 'DIRECTORES', 'DIVA', 'DP', 'DPRS', 'DRCC', 'EAU', 'ECAD', 'FILMAUTOR', 'FILSCAP', 'FLIM JUS', 'FONOPERU', 'GEMA', 'GESAC', 'GESTOR', 'GMR', 'HAA', 'HARRY FOX', 'HDS-ZAMP', 'ECCO', 'EDEM', 'HUNGART', 'ICE', 'ICG', 'IMJV', 'IMRO', 'IPRS', 'JACAP', 'JASRAC', 'KAZAK', 'KCI', 'KODA', 'KOMCA', 'KOPIOSTO', 'KOSA', 'KUVASTO', 'KYRGYZPATENT', 'LAA', 'LATGA-A', 'LATINAUTOR', 'LATINNET', 'LIRA', 'LITA', 'LITERAR-MECHANA', 'LVG', 'MACP', 'MASA', 'MCPS', 'MCSC', 'MCSK', 'MCSN', 'MCT', 'MESAM', 'MINT', 'MISASIA', 'MLC', 'MRS', 'MSG', 'MUSICAUTOR', 'MUSICMARK', 'MUSIKEDITION', 'MUSIXMATCH', 'MUST', 'NASCAM', 'NCB', 'NMPA', 'NORD-DOC', 'NS', 'OMDA', 'ONDA', 'OSA', 'OTPDA', 'PAPPRI', 'PROCAN', 'PROLITTERIS', 'RAO', 'ROMS', 'RUPIS', 'SABAM', 'SABEM', 'SACD', 'SACEM', 'SACEMLUXEMBOURG', 'SACENC', 'SACERAU', 'SACK', 'SACM', 'SACVEN', 'SADA', 'SADAIC', 'SADEMBRA', 'SADH', 'SAIF', 'SAMPRA', 'SAMRO', 'SARRAL', 'SARTEC', 'SAS', 'SAYCE', 'SAYCO', 'SAZAS', 'SBACEM', 'SBAT', 'SCAM', 'SCD', 'SESAC', 'SESAM', 'SFF', 'SGA', 'SGACEDOM', 'SGAE', 'SGDL', 'SIAE', 'SICAM', 'SLPRS', 'SNAC', 'SOBODAYCOM', "SOCIETE DE L'IMAGE", 'SOCINADA', 'SOCINPRO', 'SODART', 'SODRAC', 'SOFAM', 'SOGEM', 'SOKOJ', 'SOMAAP', 'SOMAS', 'SONECA', 'SONGCODE', 'SOPE', 'SOZA', 'SPA', 'SPAC', 'SPACEMF', 'SPACQ', 'SPOTIFY', 'SQN', 'SSA', 'STEF', 'STEMRA', 'STIM', 'SUISA', 'SUISSIMAGE', 'SUOMEN KIRJAILIJALIITTO', 'TEATERAUTOR', 'TEOSTO', "THE AUTHOR'S REGISTRY INC.", 'THE SOCIETY OF AUTHORS', 'TONO', 'UACRR', 'UBC', 'UCMR-ADA', 'UCOSO', 'UFFICIO LEGALE', 'VAGA', 'VBK', 'VDFS', 'VEGAP', 'VEVAM', 'VG WORT', 'VISCOPY', 'WAMI', 'WGA', 'WGJ', 'WID CENTRE', 'YOUTUBE', 'ZAIKS', 'ZAMCOPS', 'ZAMP Association of Slovenia', 'ZAMP - Macédoine', 'ZAPA', 'ZIMRA', 'UNISON', 'KOSCAP']
 *         syncProIdentifier:
 *           type: string
 *           description: Identifier for the Sync PRO.
 *         controlled:
 *           type: boolean
 *         catalogueGroups:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of catalogue groups the composer belongs to.
 *         notes:
 *           type: string
 *         societies:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               society:
 *                 type: string
 *                 enum: ['PRS', 'ASCAP', 'BMI', 'SOCAN', 'AACIMH', 'ABRAC', 'ABRAMUS', 'ACAM', 'ACCESS', 'ACDAM', 'ACEMLA', 'ACUM', 'ADAGP', 'ADAVIS', 'ADDAF', 'AEPI', 'AGADU', 'AGAYC', 'AKKA/LAA', 'AKM', 'ALBAUTOR', 'ALCS', 'AMAR', 'AMCOS', 'AMPAL', 'AMRA', 'AMUS', 'ANACIM', 'APA', 'APDAYC', 'APG-JAPAN', 'APRA', 'APSAV', 'ARGENTORES', 'ARMAUTHOR', 'ARS', 'ARTISJUS', 'ASDAC', 'ASSIM', 'ATIDA', 'ATN', 'AUSTRO-MECHANA', 'AUTODIA', 'AUTORARTE', 'AUTVIS', 'AWA', 'AWGACS', 'BACKOFFICE', 'BBDA', 'BCDA', 'BEELDRECHT', 'BGDA', 'BILD-KUNST', 'BMDA', 'BNDA', 'BONO', 'BSDA', 'BUBEDRA', 'BUCUDA', 'BUMA', 'BUMDA', 'BURAFO', 'BURIDA', 'BUS', 'BUTODRA', 'CAL', 'CAPAC', 'CAPASSO', 'CASH', 'CCL', 'CHA', 'CMRRA', 'COMPASS', 'COPY-DAN BILLEDKUNST', 'COPYRO', 'COSCAP', 'COSGA', 'COSOMA', 'COSOTA', 'COTT', 'CPSN', 'CREAIMAGEN', 'CSCS', 'DACS', 'DALRO', 'DGA', 'DILIA ', 'DIRECTORES', 'DIVA', 'DP', 'DPRS', 'DRCC', 'EAU', 'ECAD', 'FILMAUTOR', 'FILSCAP', 'FLIM JUS', 'FONOPERU', 'GEMA', 'GESAC', 'GESTOR', 'GMR', 'HAA', 'HARRY FOX', 'HDS-ZAMP', 'ECCO', 'EDEM', 'HUNGART', 'ICE', 'ICG', 'IMJV', 'IMRO', 'IPRS', 'JACAP', 'JASRAC', 'KAZAK', 'KCI', 'KODA', 'KOMCA', 'KOPIOSTO', 'KOSA', 'KUVASTO', 'KYRGYZPATENT', 'LAA', 'LATGA-A', 'LATINAUTOR', 'LATINNET', 'LIRA', 'LITA', 'LITERAR-MECHANA', 'LVG', 'MACP', 'MASA', 'MCPS', 'MCSC', 'MCSK', 'MCSN', 'MCT', 'MESAM', 'MINT', 'MISASIA', 'MLC', 'MRS', 'MSG', 'MUSICAUTOR', 'MUSICMARK', 'MUSIKEDITION', 'MUSIXMATCH', 'MUST', 'NASCAM', 'NCB', 'NMPA', 'NORD-DOC', 'NS', 'OMDA', 'ONDA', 'OSA', 'OTPDA', 'PAPPRI', 'PROCAN', 'PROLITTERIS', 'RAO', 'ROMS', 'RUPIS', 'SABAM', 'SABEM', 'SACD', 'SACEM', 'SACEMLUXEMBOURG', 'SACENC', 'SACERAU', 'SACK', 'SACM', 'SACVEN', 'SADA', 'SADAIC', 'SADEMBRA', 'SADH', 'SAIF', 'SAMPRA', 'SAMRO', 'SARRAL', 'SARTEC', 'SAS', 'SAYCE', 'SAYCO', 'SAZAS', 'SBACEM', 'SBAT', 'SCAM', 'SCD', 'SESAC', 'SESAM', 'SFF', 'SGA', 'SGACEDOM', 'SGAE', 'SGDL', 'SIAE', 'SICAM', 'SLPRS', 'SNAC', 'SOBODAYCOM', "SOCIETE DE L'IMAGE", 'SOCINADA', 'SOCINPRO', 'SODART', 'SODRAC', 'SOFAM', 'SOGEM', 'SOKOJ', 'SOMAAP', 'SOMAS', 'SONECA', 'SONGCODE', 'SOPE', 'SOZA', 'SPA', 'SPAC', 'SPACEMF', 'SPACQ', 'SPOTIFY', 'SQN', 'SSA', 'STEF', 'STEMRA', 'STIM', 'SUISA', 'SUISSIMAGE', 'SUOMEN KIRJAILIJALIITTO', 'TEATERAUTOR', 'TEOSTO', "THE AUTHOR'S REGISTRY INC.", 'THE SOCIETY OF AUTHORS', 'TONO', 'UACRR', 'UBC', 'UCMR-ADA', 'UCOSO', 'UFFICIO LEGALE', 'VAGA', 'VBK', 'VDFS', 'VEGAP', 'VEVAM', 'VG WORT', 'VISCOPY', 'WAMI', 'WGA', 'WGJ', 'WID CENTRE', 'YOUTUBE', 'ZAIKS', 'ZAMCOPS', 'ZAMP Association of Slovenia', 'ZAMP - Macédoine', 'ZAPA', 'ZIMRA', 'UNISON', 'KOSCAP']
 *               identifier:
 *                 type: string
 *               publisherName:
 *                 type: string
 *               mechanicalPro:
 *                 type: string
 *                 enum: ['PRS', 'ASCAP', 'BMI', 'SOCAN', 'AACIMH', 'ABRAC', 'ABRAMUS', 'ACAM', 'ACCESS', 'ACDAM', 'ACEMLA', 'ACUM', 'ADAGP', 'ADAVIS', 'ADDAF', 'AEPI', 'AGADU', 'AGAYC', 'AKKA/LAA', 'AKM', 'ALBAUTOR', 'ALCS', 'AMAR', 'AMCOS', 'AMPAL', 'AMRA', 'AMUS', 'ANACIM', 'APA', 'APDAYC', 'APG-JAPAN', 'APRA', 'APSAV', 'ARGENTORES', 'ARMAUTHOR', 'ARS', 'ARTISJUS', 'ASDAC', 'ASSIM', 'ATIDA', 'ATN', 'AUSTRO-MECHANA', 'AUTODIA', 'AUTORARTE', 'AUTVIS', 'AWA', 'AWGACS', 'BACKOFFICE', 'BBDA', 'BCDA', 'BEELDRECHT', 'BGDA', 'BILD-KUNST', 'BMDA', 'BNDA', 'BONO', 'BSDA', 'BUBEDRA', 'BUCUDA', 'BUMA', 'BUMDA', 'BURAFO', 'BURIDA', 'BUS', 'BUTODRA', 'CAL', 'CAPAC', 'CAPASSO', 'CASH', 'CCL', 'CHA', 'CMRRA', 'COMPASS', 'COPY-DAN BILLEDKUNST', 'COPYRO', 'COSCAP', 'COSGA', 'COSOMA', 'COSOTA', 'COTT', 'CPSN', 'CREAIMAGEN', 'CSCS', 'DACS', 'DALRO', 'DGA', 'DILIA ', 'DIRECTORES', 'DIVA', 'DP', 'DPRS', 'DRCC', 'EAU', 'ECAD', 'FILMAUTOR', 'FILSCAP', 'FLIM JUS', 'FONOPERU', 'GEMA', 'GESAC', 'GESTOR', 'GMR', 'HAA', 'HARRY FOX', 'HDS-ZAMP', 'ECCO', 'EDEM', 'HUNGART', 'ICE', 'ICG', 'IMJV', 'IMRO', 'IPRS', 'JACAP', 'JASRAC', 'KAZAK', 'KCI', 'KODA', 'KOMCA', 'KOPIOSTO', 'KOSA', 'KUVASTO', 'KYRGYZPATENT', 'LAA', 'LATGA-A', 'LATINAUTOR', 'LATINNET', 'LIRA', 'LITA', 'LITERAR-MECHANA', 'LVG', 'MACP', 'MASA', 'MCPS', 'MCSC', 'MCSK', 'MCSN', 'MCT', 'MESAM', 'MINT', 'MISASIA', 'MLC', 'MRS', 'MSG', 'MUSICAUTOR', 'MUSICMARK', 'MUSIKEDITION', 'MUSIXMATCH', 'MUST', 'NASCAM', 'NCB', 'NMPA', 'NORD-DOC', 'NS', 'OMDA', 'ONDA', 'OSA', 'OTPDA', 'PAPPRI', 'PROCAN', 'PROLITTERIS', 'RAO', 'ROMS', 'RUPIS', 'SABAM', 'SABEM', 'SACD', 'SACEM', 'SACEMLUXEMBOURG', 'SACENC', 'SACERAU', 'SACK', 'SACM', 'SACVEN', 'SADA', 'SADAIC', 'SADEMBRA', 'SADH', 'SAIF', 'SAMPRA', 'SAMRO', 'SARRAL', 'SARTEC', 'SAS', 'SAYCE', 'SAYCO', 'SAZAS', 'SBACEM', 'SBAT', 'SCAM', 'SCD', 'SESAC', 'SESAM', 'SFF', 'SGA', 'SGACEDOM', 'SGAE', 'SGDL', 'SIAE', 'SICAM', 'SLPRS', 'SNAC', 'SOBODAYCOM', "SOCIETE DE L'IMAGE", 'SOCINADA', 'SOCINPRO', 'SODART', 'SODRAC', 'SOFAM', 'SOGEM', 'SOKOJ', 'SOMAAP', 'SOMAS', 'SONECA', 'SONGCODE', 'SOPE', 'SOZA', 'SPA', 'SPAC', 'SPACEMF', 'SPACQ', 'SPOTIFY', 'SQN', 'SSA', 'STEF', 'STEMRA', 'STIM', 'SUISA', 'SUISSIMAGE', 'SUOMEN KIRJAILIJALIITTO', 'TEATERAUTOR', 'TEOSTO', "THE AUTHOR'S REGISTRY INC.", 'THE SOCIETY OF AUTHORS', 'TONO', 'UACRR', 'UBC', 'UCMR-ADA', 'UCOSO', 'UFFICIO LEGALE', 'VAGA', 'VBK', 'VDFS', 'VEGAP', 'VEVAM', 'VG WORT', 'VISCOPY', 'WAMI', 'WGA', 'WGJ', 'WID CENTRE', 'YOUTUBE', 'ZAIKS', 'ZAMCOPS', 'ZAMP Association of Slovenia', 'ZAMP - Macédoine', 'ZAPA', 'ZIMRA', 'UNISON', 'KOSCAP']
 *               performancePro:
 *                 type: string
 *                 enum: ['PRS', 'ASCAP', 'BMI', 'SOCAN', 'AACIMH', 'ABRAC', 'ABRAMUS', 'ACAM', 'ACCESS', 'ACDAM', 'ACEMLA', 'ACUM', 'ADAGP', 'ADAVIS', 'ADDAF', 'AEPI', 'AGADU', 'AGAYC', 'AKKA/LAA', 'AKM', 'ALBAUTOR', 'ALCS', 'AMAR', 'AMCOS', 'AMPAL', 'AMRA', 'AMUS', 'ANACIM', 'APA', 'APDAYC', 'APG-JAPAN', 'APRA', 'APSAV', 'ARGENTORES', 'ARMAUTHOR', 'ARS', 'ARTISJUS', 'ASDAC', 'ASSIM', 'ATIDA', 'ATN', 'AUSTRO-MECHANA', 'AUTODIA', 'AUTORARTE', 'AUTVIS', 'AWA', 'AWGACS', 'BACKOFFICE', 'BBDA', 'BCDA', 'BEELDRECHT', 'BGDA', 'BILD-KUNST', 'BMDA', 'BNDA', 'BONO', 'BSDA', 'BUBEDRA', 'BUCUDA', 'BUMA', 'BUMDA', 'BURAFO', 'BURIDA', 'BUS', 'BUTODRA', 'CAL', 'CAPAC', 'CAPASSO', 'CASH', 'CCL', 'CHA', 'CMRRA', 'COMPASS', 'COPY-DAN BILLEDKUNST', 'COPYRO', 'COSCAP', 'COSGA', 'COSOMA', 'COSOTA', 'COTT', 'CPSN', 'CREAIMAGEN', 'CSCS', 'DACS', 'DALRO', 'DGA', 'DILIA ', 'DIRECTORES', 'DIVA', 'DP', 'DPRS', 'DRCC', 'EAU', 'ECAD', 'FILMAUTOR', 'FILSCAP', 'FLIM JUS', 'FONOPERU', 'GEMA', 'GESAC', 'GESTOR', 'GMR', 'HAA', 'HARRY FOX', 'HDS-ZAMP', 'ECCO', 'EDEM', 'HUNGART', 'ICE', 'ICG', 'IMJV', 'IMRO', 'IPRS', 'JACAP', 'JASRAC', 'KAZAK', 'KCI', 'KODA', 'KOMCA', 'KOPIOSTO', 'KOSA', 'KUVASTO', 'KYRGYZPATENT', 'LAA', 'LATGA-A', 'LATINAUTOR', 'LATINNET', 'LIRA', 'LITA', 'LITERAR-MECHANA', 'LVG', 'MACP', 'MASA', 'MCPS', 'MCSC', 'MCSK', 'MCSN', 'MCT', 'MESAM', 'MINT', 'MISASIA', 'MLC', 'MRS', 'MSG', 'MUSICAUTOR', 'MUSICMARK', 'MUSIKEDITION', 'MUSIXMATCH', 'MUST', 'NASCAM', 'NCB', 'NMPA', 'NORD-DOC', 'NS', 'OMDA', 'ONDA', 'OSA', 'OTPDA', 'PAPPRI', 'PROCAN', 'PROLITTERIS', 'RAO', 'ROMS', 'RUPIS', 'SABAM', 'SABEM', 'SACD', 'SACEM', 'SACEMLUXEMBOURG', 'SACENC', 'SACERAU', 'SACK', 'SACM', 'SACVEN', 'SADA', 'SADAIC', 'SADEMBRA', 'SADH', 'SAIF', 'SAMPRA', 'SAMRO', 'SARRAL', 'SARTEC', 'SAS', 'SAYCE', 'SAYCO', 'SAZAS', 'SBACEM', 'SBAT', 'SCAM', 'SCD', 'SESAC', 'SESAM', 'SFF', 'SGA', 'SGACEDOM', 'SGAE', 'SGDL', 'SIAE', 'SICAM', 'SLPRS', 'SNAC', 'SOBODAYCOM', "SOCIETE DE L'IMAGE", 'SOCINADA', 'SOCINPRO', 'SODART', 'SODRAC', 'SOFAM', 'SOGEM', 'SOKOJ', 'SOMAAP', 'SOMAS', 'SONECA', 'SONGCODE', 'SOPE', 'SOZA', 'SPA', 'SPAC', 'SPACEMF', 'SPACQ', 'SPOTIFY', 'SQN', 'SSA', 'STEF', 'STEMRA', 'STIM', 'SUISA', 'SUISSIMAGE', 'SUOMEN KIRJAILIJALIITTO', 'TEATERAUTOR', 'TEOSTO', "THE AUTHOR'S REGISTRY INC.", 'THE SOCIETY OF AUTHORS', 'TONO', 'UACRR', 'UBC', 'UCMR-ADA', 'UCOSO', 'UFFICIO LEGALE', 'VAGA', 'VBK', 'VDFS', 'VEGAP', 'VEVAM', 'VG WORT', 'VISCOPY', 'WAMI', 'WGA', 'WGJ', 'WID CENTRE', 'YOUTUBE', 'ZAIKS', 'ZAMCOPS', 'ZAMP Association of Slovenia', 'ZAMP - Macédoine', 'ZAPA', 'ZIMRA', 'UNISON', 'KOSCAP']
 *               syncPro:
 *                 type: string
 *                 enum: ['PRS', 'ASCAP', 'BMI', 'SOCAN', 'AACIMH', 'ABRAC', 'ABRAMUS', 'ACAM', 'ACCESS', 'ACDAM', 'ACEMLA', 'ACUM', 'ADAGP', 'ADAVIS', 'ADDAF', 'AEPI', 'AGADU', 'AGAYC', 'AKKA/LAA', 'AKM', 'ALBAUTOR', 'ALCS', 'AMAR', 'AMCOS', 'AMPAL', 'AMRA', 'AMUS', 'ANACIM', 'APA', 'APDAYC', 'APG-JAPAN', 'APRA', 'APSAV', 'ARGENTORES', 'ARMAUTHOR', 'ARS', 'ARTISJUS', 'ASDAC', 'ASSIM', 'ATIDA', 'ATN', 'AUSTRO-MECHANA', 'AUTODIA', 'AUTORARTE', 'AUTVIS', 'AWA', 'AWGACS', 'BACKOFFICE', 'BBDA', 'BCDA', 'BEELDRECHT', 'BGDA', 'BILD-KUNST', 'BMDA', 'BNDA', 'BONO', 'BSDA', 'BUBEDRA', 'BUCUDA', 'BUMA', 'BUMDA', 'BURAFO', 'BURIDA', 'BUS', 'BUTODRA', 'CAL', 'CAPAC', 'CAPASSO', 'CASH', 'CCL', 'CHA', 'CMRRA', 'COMPASS', 'COPY-DAN BILLEDKUNST', 'COPYRO', 'COSCAP', 'COSGA', 'COSOMA', 'COSOTA', 'COTT', 'CPSN', 'CREAIMAGEN', 'CSCS', 'DACS', 'DALRO', 'DGA', 'DILIA ', 'DIRECTORES', 'DIVA', 'DP', 'DPRS', 'DRCC', 'EAU', 'ECAD', 'FILMAUTOR', 'FILSCAP', 'FLIM JUS', 'FONOPERU', 'GEMA', 'GESAC', 'GESTOR', 'GMR', 'HAA', 'HARRY FOX', 'HDS-ZAMP', 'ECCO', 'EDEM', 'HUNGART', 'ICE', 'ICG', 'IMJV', 'IMRO', 'IPRS', 'JACAP', 'JASRAC', 'KAZAK', 'KCI', 'KODA', 'KOMCA', 'KOPIOSTO', 'KOSA', 'KUVASTO', 'KYRGYZPATENT', 'LAA', 'LATGA-A', 'LATINAUTOR', 'LATINNET', 'LIRA', 'LITA', 'LITERAR-MECHANA', 'LVG', 'MACP', 'MASA', 'MCPS', 'MCSC', 'MCSK', 'MCSN', 'MCT', 'MESAM', 'MINT', 'MISASIA', 'MLC', 'MRS', 'MSG', 'MUSICAUTOR', 'MUSICMARK', 'MUSIKEDITION', 'MUSIXMATCH', 'MUST', 'NASCAM', 'NCB', 'NMPA', 'NORD-DOC', 'NS', 'OMDA', 'ONDA', 'OSA', 'OTPDA', 'PAPPRI', 'PROCAN', 'PROLITTERIS', 'RAO', 'ROMS', 'RUPIS', 'SABAM', 'SABEM', 'SACD', 'SACEM', 'SACEMLUXEMBOURG', 'SACENC', 'SACERAU', 'SACK', 'SACM', 'SACVEN', 'SADA', 'SADAIC', 'SADEMBRA', 'SADH', 'SAIF', 'SAMPRA', 'SAMRO', 'SARRAL', 'SARTEC', 'SAS', 'SAYCE', 'SAYCO', 'SAZAS', 'SBACEM', 'SBAT', 'SCAM', 'SCD', 'SESAC', 'SESAM', 'SFF', 'SGA', 'SGACEDOM', 'SGAE', 'SGDL', 'SIAE', 'SICAM', 'SLPRS', 'SNAC', 'SOBODAYCOM', "SOCIETE DE L'IMAGE", 'SOCINADA', 'SOCINPRO', 'SODART', 'SODRAC', 'SOFAM', 'SOGEM', 'SOKOJ', 'SOMAAP', 'SOMAS', 'SONECA', 'SONGCODE', 'SOPE', 'SOZA', 'SPA', 'SPAC', 'SPACEMF', 'SPACQ', 'SPOTIFY', 'SQN', 'SSA', 'STEF', 'STEMRA', 'STIM', 'SUISA', 'SUISSIMAGE', 'SUOMEN KIRJAILIJALIITTO', 'TEATERAUTOR', 'TEOSTO', "THE AUTHOR'S REGISTRY INC.", 'THE SOCIETY OF AUTHORS', 'TONO', 'UACRR', 'UBC', 'UCMR-ADA', 'UCOSO', 'UFFICIO LEGALE', 'VAGA', 'VBK', 'VDFS', 'VEGAP', 'VEVAM', 'VG WORT', 'VISCOPY', 'WAMI', 'WGA', 'WGJ', 'WID CENTRE', 'YOUTUBE', 'ZAIKS', 'ZAMCOPS', 'ZAMP Association of Slovenia', 'ZAMP - Macédoine', 'ZAPA', 'ZIMRA', 'UNISON', 'KOSCAP']
 *         publisherAgreements:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               publisherId:
 *                 type: string
 *                 description: Should match a Publisher that exists
 *               agreementType:
 *                 type: string
 *                 enum: ['Original General', 'Original Specific']
 *               territory:
 *                 type: string
 *                 description: ISO2 Country Code
 *               society:
 *                 type: string
 *                 enum: ['PRS', 'ASCAP', 'BMI', 'SOCAN', 'AACIMH', 'ABRAC', 'ABRAMUS', 'ACAM', 'ACCESS', 'ACDAM', 'ACEMLA', 'ACUM', 'ADAGP', 'ADAVIS', 'ADDAF', 'AEPI', 'AGADU', 'AGAYC', 'AKKA/LAA', 'AKM', 'ALBAUTOR', 'ALCS', 'AMAR', 'AMCOS', 'AMPAL', 'AMRA', 'AMUS', 'ANACIM', 'APA', 'APDAYC', 'APG-JAPAN', 'APRA', 'APSAV', 'ARGENTORES', 'ARMAUTHOR', 'ARS', 'ARTISJUS', 'ASDAC', 'ASSIM', 'ATIDA', 'ATN', 'AUSTRO-MECHANA', 'AUTODIA', 'AUTORARTE', 'AUTVIS', 'AWA', 'AWGACS', 'BACKOFFICE', 'BBDA', 'BCDA', 'BEELDRECHT', 'BGDA', 'BILD-KUNST', 'BMDA', 'BNDA', 'BONO', 'BSDA', 'BUBEDRA', 'BUCUDA', 'BUMA', 'BUMDA', 'BURAFO', 'BURIDA', 'BUS', 'BUTODRA', 'CAL', 'CAPAC', 'CAPASSO', 'CASH', 'CCL', 'CHA', 'CMRRA', 'COMPASS', 'COPY-DAN BILLEDKUNST', 'COPYRO', 'COSCAP', 'COSGA', 'COSOMA', 'COSOTA', 'COTT', 'CPSN', 'CREAIMAGEN', 'CSCS', 'DACS', 'DALRO', 'DGA', 'DILIA ', 'DIRECTORES', 'DIVA', 'DP', 'DPRS', 'DRCC', 'EAU', 'ECAD', 'FILMAUTOR', 'FILSCAP', 'FLIM JUS', 'FONOPERU', 'GEMA', 'GESAC', 'GESTOR', 'GMR', 'HAA', 'HARRY FOX', 'HDS-ZAMP', 'ECCO', 'EDEM', 'HUNGART', 'ICE', 'ICG', 'IMJV', 'IMRO', 'IPRS', 'JACAP', 'JASRAC', 'KAZAK', 'KCI', 'KODA', 'KOMCA', 'KOPIOSTO', 'KOSA', 'KUVASTO', 'KYRGYZPATENT', 'LAA', 'LATGA-A', 'LATINAUTOR', 'LATINNET', 'LIRA', 'LITA', 'LITERAR-MECHANA', 'LVG', 'MACP', 'MASA', 'MCPS', 'MCSC', 'MCSK', 'MCSN', 'MCT', 'MESAM', 'MINT', 'MISASIA', 'MLC', 'MRS', 'MSG', 'MUSICAUTOR', 'MUSICMARK', 'MUSIKEDITION', 'MUSIXMATCH', 'MUST', 'NASCAM', 'NCB', 'NMPA', 'NORD-DOC', 'NS', 'OMDA', 'ONDA', 'OSA', 'OTPDA', 'PAPPRI', 'PROCAN', 'PROLITTERIS', 'RAO', 'ROMS', 'RUPIS', 'SABAM', 'SABEM', 'SACD', 'SACEM', 'SACEMLUXEMBOURG', 'SACENC', 'SACERAU', 'SACK', 'SACM', 'SACVEN', 'SADA', 'SADAIC', 'SADEMBRA', 'SADH', 'SAIF', 'SAMPRA', 'SAMRO', 'SARRAL', 'SARTEC', 'SAS', 'SAYCE', 'SAYCO', 'SAZAS', 'SBACEM', 'SBAT', 'SCAM', 'SCD', 'SESAC', 'SESAM', 'SFF', 'SGA', 'SGACEDOM', 'SGAE', 'SGDL', 'SIAE', 'SICAM', 'SLPRS', 'SNAC', 'SOBODAYCOM', "SOCIETE DE L'IMAGE", 'SOCINADA', 'SOCINPRO', 'SODART', 'SODRAC', 'SOFAM', 'SOGEM', 'SOKOJ', 'SOMAAP', 'SOMAS', 'SONECA', 'SONGCODE', 'SOPE', 'SOZA', 'SPA', 'SPAC', 'SPACEMF', 'SPACQ', 'SPOTIFY', 'SQN', 'SSA', 'STEF', 'STEMRA', 'STIM', 'SUISA', 'SUISSIMAGE', 'SUOMEN KIRJAILIJALIITTO', 'TEATERAUTOR', 'TEOSTO', "THE AUTHOR'S REGISTRY INC.", 'THE SOCIETY OF AUTHORS', 'TONO', 'UACRR', 'UBC', 'UCMR-ADA', 'UCOSO', 'UFFICIO LEGALE', 'VAGA', 'VBK', 'VDFS', 'VEGAP', 'VEVAM', 'VG WORT', 'VISCOPY', 'WAMI', 'WGA', 'WGJ', 'WID CENTRE', 'YOUTUBE', 'ZAIKS', 'ZAMCOPS', 'ZAMP Association of Slovenia', 'ZAMP - Macédoine', 'ZAPA', 'ZIMRA', 'UNISON', 'KOSCAP']
 *               agreementNo:
 *                 type: string
 *           description: Publisher agreements associated with the composer.
 *         linkedContracts:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               contractId:
 *                 type: string
 *         publisherId:
 *           type: string
 *           description: Publisher ID associated with the composer.
 *         territories:
 *           type: array
 *           items:
 *             type: string
 *           description: ISO2 Country Codes.
 *         createdBy:
 *           type: string
 *           format: uuid
 *           description: User ID of the creator of the composer record.
 *         lastModifiedBy:
 *           type: string
 *           format: uuid
 *           description: User ID of the last person who modified the composer record.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the composer was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of when the composer was last updated.
 *       required:
 *         - name
 */
