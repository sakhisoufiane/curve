const Release = require('../models/release');
const knex = require('../db');
const { eachLimit } = require('async');

async function syncReleases() {
  console.log('Syncing releases');
  let exitLoop = false;
  let page = 0;
  let limit = 1000;
  let processedReleases = 0;

  while (!exitLoop) {
    console.log('Getting page ', page);
    const count = await Release.countDocuments({ clientId: process.env.CURVE_CLIENT });
    const releases = await Release.find({ clientId: process.env.CURVE_CLIENT }).sort({_id: 1}).skip(page*limit).limit(limit).lean();
  
    console.log('Returned releases:', releases.length);

    await eachLimit(releases, 500, async (release) => {
      const [returnedRelease] = await knex('releases')
        .insert({ 
          release_id: release._id.toString(),
          client_id: release.clientId,
          title: release.title,
          version: release.version,
          artist: release.artist,
          foreign_id: release.foreignId,
          project_id: release.projectId,
          cat_no: release.catNo,
          barcode: release.barcode,
          label: release.label,
          release_date: release.releaseDate,
          distribution_channel: release.distributionChannel,
          format: release.format,
          price_category: release.priceCategory,
          dealer_price: release.dealerPrice,
          dealer_price: release.dealerPrice,
          mcps_id: release.mcpsId,
          mcps_tv_advertised: release.mcpsTvAdvertised,
          all_tracks_contracts: release.allTracksContracts,
          contract_validation: release.contractValidation,
          mechanical_track_cap: release.mechanicalTrackCap,
          controlled_composition_clause: release.controlledCompositionClause,
          mechanical_basis_percentage: release.mechanicalBasisPercentage,
          total_mechanical_amount: release.totalMechanicalAmount,
          total_participation: release.totalParticipation,

        })
        .returning('id');

        const releaseId = release._id.toString();

        const insertPromises = [

          // release_aliases
          ...(release.aliases || []).map(alias =>
            knex('release_aliases').insert({ release_id: releaseId, alias })
          ),
        
          // release_catalogue_groups
          ...(release.catalogueGroups || []).map(group =>
            knex('release_catalogue_groups').insert({ release_id: releaseId, group_name: group })
          ),
        
          // release_track_ids
          ...(release.trackIds || []).map(trackId =>
            knex('release_track_ids').insert({ release_id: releaseId, track_id: trackId })
          ),
        
          // catalogue_rights: salesReturnsRights
          ...(release.salesReturnsRights || []).map(right =>
            knex('catalogue_rights').insert({
              release_id: releaseId.toString(),
              contract_id: right.contractId.toString(),
              percentage: right.percentage,
              right_type: 'sales',
              catalogue_type: 'release'
            })
          ),
        
          // catalogue_rights: costsRights
          ...(release.costsRights || []).map(right =>
            knex('catalogue_rights').insert({
              release_id: releaseId.toString(),
              contract_id: right.contractId.toString(),
              percentage: right.percentage,
              right_type: 'costs',
              catalogue_type: 'release'
            })
          )
        
        ];
        
        // Handle mechanical licenses in a semi-parallel way due to dependency
        for (const licenseTrackId in release.mechanicalLicenses || {}) {
          const licenseMeta = release.mechanicalLicenses[licenseTrackId];
        
          insertPromises.push(
            knex('release_mechanical_licenses')
              .insert({
                release_id: releaseId.toString(),
                track_id: licenseTrackId,
                report_mechanicals: licenseMeta.reportMechanicals ? Boolean(licenseMeta.reportMechanicals) : false
              })
              .returning('id')
              .then(([returnedLicense]) =>
                Promise.all(
                  (licenseMeta.licenses || []).map(trackLicense =>
                    knex('release_track_mechanical_licenses').insert({
                      license_id: returnedLicense.id,
                      contract_id: trackLicense.contractId?.toString(),
                      composer_id: trackLicense.composerId?.toString(),
                      publisher_id: trackLicense.publisherId?.toString(),
                      license_no: trackLicense.licenseNo,
                      rate: trackLicense.rate,
                      share: trackLicense.share,
                      controlled: trackLicense.controlled
                    })
                  )
                )
              )
          );
        }
        
        // Run everything concurrently
        await Promise.all(insertPromises);
        
      
      processedReleases += 1;
      process.stdout.write(`\rProcessed ${processedReleases}/${count} - ${((processedReleases/count)*100).toFixed(0)}%`);
    });
    
    if (!releases.length) {
      exitLoop = true;
    } else {
      page += 1;
    }
  }

  
  console.log('Done syncing releases');
}
module.exports = syncReleases;
