/**
 * Description: Script that finds tracks appearing on more than one release for a given client
 * and exports the results to a CSV file at ~/Downloads/tracks_on_multiple_releases.csv.
 *
 * Ticket No: SUP-3209
 * Author: Attilio Marotta 
 * Category: Releases, Tracks
 * Notes: The CSV contains the columns: trackId, trackTitle, isrc, releaseIds, releaseTitles, upcs.
 * Array fields are joined with "; " and all values are quoted with CSV-style escaping.
 *
 *
 * @async
 * @function exportTracksOnMultipleReleases
 * @param {string} clientId - The client ObjectId (as a string) used to filter releases and tracks.
 * @returns {Promise<void>} Resolves when the CSV file has been written or rejects on error.
 */
require('../models/db');
const fs = require('fs');
const Release = require('../models/release');
const os = require('os');
const path = require('path');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

// Naxos ID
const clientId = '63ee0d17b0e4bd01580711dd'

const exportTracksOnMultipleReleases = async (clientId) => {
    
    logger.info('Creating aggregation for tracks on multiple releases', clientId);
    const results = await Release.aggregate([
        // Only consider releases for the client
        { $match: { clientId } },

        { $unwind: "$trackIds" },

        {
            $group: {
            _id: "$trackIds",
            releaseIds: { $addToSet: "$_id" },
            releaseTitles: { $addToSet: "$title" },
            upcs: { $addToSet: "$barcode" },
            count: { $sum: 1 }
            }
        },

        // Only tracks on more than one release
        { $match: { count: { $gt: 1 } } },

        {
            $lookup: {
                from: "tracks",
                let: { trackId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$_id", { $toObjectId: "$$trackId" }] },
                                    { $eq: ["$clientId", clientId] }
                                ]
                            }
                        }
                    }
                ],
                as: "track"
            }
        },

        { $unwind: "$track" },

        {
            $project: {
                trackId: "$_id",
                trackTitle: "$track.title",
                isrc: "$track.isrc",
                releaseIds: 1,
                releaseTitles: 1,
                upcs: 1
            }
        }
    ]);
    logger.info(`Found ${results.length} tracks on multiple releases`);
    logger.info('Exporting to CSV');
    const csvEscape = (value) => {
        if (value == null) return '""';
        const s = Array.isArray(value) ? value.map(String).join('; ') : String(value);
        return `"${s.replace(/"/g, '""')}"`;
    };

    const headers = ['trackId', 'trackTitle', 'isrc', 'releaseIds', 'releaseTitles', 'upcs'];
    const rows = [headers.join(',')];

    for (const r of results) {
        const releaseIds = Array.isArray(r.releaseIds) ? r.releaseIds.map(String).join('; ') : r.releaseIds;
        const releaseTitles = Array.isArray(r.releaseTitles) ? r.releaseTitles.join('; ') : r.releaseTitles;
        const upcs = Array.isArray(r.upcs) ? r.upcs.join('; ') : r.upcs;

        const cols = [
            r.trackId ? String(r.trackId) : '',
            r.trackTitle,
            r.isrc,
            releaseIds,
            releaseTitles,
            upcs
        ].map(csvEscape);

        rows.push(cols.join(','));
    }
    logger.info('Writing CSV file');
    const filePath = path.join(os.homedir(), 'Downloads', 'tracks_on_multiple_releases.csv');
    fs.writeFileSync(filePath, rows.join('\n'), 'utf8');
    logger.info('CSV exported to', filePath);
}

exportTracksOnMultipleReleases(clientId).catch(console.error);