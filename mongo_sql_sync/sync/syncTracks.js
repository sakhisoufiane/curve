const Track = require('../models/track');
const knex = require('../db');
const { eachLimit } = require('async');

async function syncTracks() {
  console.log('Syncing tracks');
  let exitLoop = false;
  let page = 0;
  let limit = 1000;
  let processedTracks = 0;
  while (!exitLoop) {
    console.log('Getting page ', page);

    const tracks = await Track.find({ clientId: process.env.CURVE_CLIENT }).sort({_id: 1}).skip(page*limit).limit(limit).lean();
    const count = await Track.countDocuments({ clientId: process.env.CURVE_CLIENT });
    console.log('Returned tracks:', tracks.length);
    
    await eachLimit(tracks, 500, async (track) => {
    const [returnedTrack] = await knex('tracks')
      .insert({ 
        track_id: track._id.toString(),
        client_id: track.clientId, 
        title: track.title,
        version: track.version,
        artist: track.artist,
        foreign_id: track.foreignId,
        project_id: track.projectId,
        isrc: track.isrc,
        label: track.label,
        p_line: track.pLine,
        default_release_id: track.defaultReleaseId,
        duration: track.duration,
        statutory_rate: track.statutoryRate,
        canadian_statutory_rate: track.canadianStatutoryRate,
        report_mechanicals: track.reportMechanicals,
        total_participation: track.totalParticipation,
        mechanical_calculation_basis: track.mechanicalCalculationBasis

      })
      .returning('id');

      const trackId = track._id.toString();

      const inserts = [

        // track_aliases
        ...(track.aliases || []).map(alias =>
          knex('track_aliases').insert({ track_id: trackId, alias })
        ),
      
        // track_catalogue_groups
        ...(track.catalogueGroups || []).map(group =>
          knex('track_catalogue_groups').insert({ track_id: trackId, group_name: group })
        ),
      
        // track_mechanical_contracts
        ...(track.mechanicalContractIds || []).map(contractId =>
          knex('track_mechanical_contracts').insert({ track_id: trackId, contract_id: contractId })
        ),
      
        // catalogue_rights: salesReturnsRights
        ...(track.salesReturnsRights || []).map(right =>
          knex('catalogue_rights').insert({
            track_id: trackId.toString(),
            contract_id: right.contractId.toString(),
            percentage: right.percentage,
            right_type: 'sales',
            catalogue_type: 'track'
          })
        ),
      
        // catalogue_rights: costsRights
        ...(track.costsRights || []).map(right =>
          knex('catalogue_rights').insert({
            track_id: trackId.toString(),
            contract_id: right.contractId.toString(),
            percentage: right.percentage,
            right_type: 'costs',
            catalogue_type: 'track'
          })
        ),
      
        // catalogue_rights: releaseSpecificSalesReturnsRights
        ...(track.releaseSpecificSalesReturnsRights || []).map(right =>
          knex('catalogue_rights').insert({
            track_id: trackId.toString(),
            contract_id: right.contractId.toString(),
            release_id: right.releaseId.toString(),
            percentage: right.percentage,
            right_type: 'release_specific',
            catalogue_type: 'track'
          })
        ),
      
        // track_mechanical_licenses
        ...(track.mechanicalLicenses || []).map(license =>
          knex('track_mechanical_licenses').insert({
            track_id: trackId.toString(),
            contract_id: license.contractId?.toString(),
            composer_id: license.composerId?.toString(),
            publisher_id: license.publisherId?.toString(),
            license_no: license.licenseNo,
            rate: license.rate,
            share: license.share
          })
        )
      
      ];
      
      // Run all insertions concurrently
      await Promise.all(inserts);

    processedTracks += 1;
    process.stdout.write(`\rProcessed ${processedTracks}/${count} - ${((processedTracks/count)*100).toFixed(0)}%`);
  });
  
    if (!tracks.length) {
      exitLoop = true;
    } else {
      page += 1;
    }
  }

  
  console.log('Done syncing tracks');
}
module.exports = syncTracks;
