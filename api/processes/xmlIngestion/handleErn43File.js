const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { HowToIngestOtherIdsOnImport } = require('../../libs/enums/client');

const handleUnderscoreValue = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  return value?._;
};

const setupReleases = ({ releases, deals, releaseToImport }) => {
  const release = releases?.[0];
  releaseToImport.barcode = handleUnderscoreValue(release?.ReleaseId?.[0]?.ICPN[0]);
  releaseToImport.catNo = handleUnderscoreValue(release?.ReleaseId?.[0]?.CatalogNumber?.[0]);
  if (!releaseToImport.catNo) {
    releaseToImport.catNo = releaseToImport.barcode;
  }
  releaseToImport.artist = handleUnderscoreValue(release?.DisplayArtistName?.[0]);
  releaseToImport.label = handleUnderscoreValue(release?.ReleaseLabelReference?.[0]);
  releaseToImport.title = handleUnderscoreValue(release?.DisplayTitleText?.[0]);
  releaseToImport.pLine = `${handleUnderscoreValue(release?.PLine?.[0]?.Year?.[0])} ${handleUnderscoreValue(release?.PLine?.[0]?.PLineText?.[0])}`;

  const deal = deals?.find(
    (dealItem) => dealItem?.DealReleaseReference?.some(
      (refItem) => refItem === handleUnderscoreValue(release?.ReleaseReference?.[0]),
    ),
  );
  releaseToImport.contractMapping = handleUnderscoreValue(
    deal?.DealReleaseReference?.find((refItem) => refItem === release?.ReleaseReference?.[0]),
  );
  releaseToImport.releaseDate = handleUnderscoreValue(deal?.Deal?.[0]?.DealTerms?.[0]?.ValidityPeriod?.[0]?.StartDate?.[0]);

  for (let j = 0; j < release?.ResourceGroup?.[0]?.ResourceGroup?.[0]?.ResourceGroupContentItem?.length; j += 1) {
    const ref = handleUnderscoreValue(
      release.ResourceGroup[0].ResourceGroup[0].ResourceGroupContentItem[j]?.ReleaseResourceReference[0],
    );
    if (releaseToImport.refs.indexOf(ref) === -1) {
      releaseToImport.refs.push(ref);
    }
  }
};

const setupTracks = ({ releases, tracks, deals, releaseToImport, howToIngestOtherIdsOnImport }) => {
  for (let i = 0; i < tracks.length; i += 1) {
    const trackToImport = { isAlternateId: false };
    const track = tracks[i];

    const prefix = (track?.Type?.[0]?.toLowerCase()?.indexOf('soundrecording') > -1) ? 'SoundRecordingEdition' : 'VideoEdition';

    trackToImport.ref = handleUnderscoreValue(track?.ResourceReference?.[0]);
    trackToImport.isrc = handleUnderscoreValue(
      track?.[prefix]?.[0]?.ResourceId?.[0]?.ISRC?.[0]?.trim(),
    );
    trackToImport.isrc = trackToImport?.isrc?.replace(/-/g, '');
    trackToImport.title = handleUnderscoreValue(track?.DisplayTitle?.[0]?.TitleText?.[0]);
    trackToImport.version = handleUnderscoreValue(track?.DisplayTitle?.[0]?.SubTitle?.[0]);
    trackToImport.duration = handleUnderscoreValue(track?.Duration?.[0]);
    trackToImport.pLine = handleUnderscoreValue(track?.[prefix]?.[0]?.PLine?.[0]?.PLineText?.[0]);
    trackToImport.artist = handleUnderscoreValue(track?.DisplayArtistName?.[0]);

    const deal = deals?.find(
      (dealItem) => dealItem?.DealReleaseReference?.some(
        (refItem) => refItem === handleUnderscoreValue(track?.ResourceReference?.[0]),
      ),
    );
    releaseToImport.contractMapping = handleUnderscoreValue(
      deal?.DealReleaseReference?.find((refItem) => refItem === track?.ResourceReference?.[0]),
    );

    // Check if we need to do anything with other ids in file
    if (howToIngestOtherIdsOnImport) {
      const ids = track?.[prefix]?.[0]?.ResourceId?.[0]?.ProprietaryId?.map((id) => id._).filter((id) => id && id.length === 12);

      if (howToIngestOtherIdsOnImport === HowToIngestOtherIdsOnImport.CreateNewAlias && ids.length) {
        trackToImport.aliases = ids;
        trackToImport.isAlternateId = true;
      } else if (howToIngestOtherIdsOnImport === HowToIngestOtherIdsOnImport.CreateNewTrack && ids?.length) {
        ids
          .map((id) => {
            const copiedTrack = JSON.parse(JSON.stringify(trackToImport));
            copiedTrack.isrc = id;
            copiedTrack.isAlternateId = true;
            return copiedTrack;
          })
          .forEach((track) => releaseToImport.tracks.push(track));
      }
    }

    releaseToImport.tracks.push(trackToImport);
  }
};

const handleErn43File = ({ result, releasesToImport, howToIngestOtherIdsOnImport }) => {
  try {
    const ernVariant = result['ern:NewReleaseMessage'] || result['ernm:NewReleaseMessage'];
    const releaseToImport = { tracks: [], refs: [] };
    let releases = [];
    let deals = [];

    releases = ernVariant?.ReleaseList?.[0]?.Release;
    deals = ernVariant?.DealList?.[0]?.ReleaseDeal;

    // Check deals is an array
    if (!Array.isArray(deals)) {
      deals = [];
    }

    setupReleases({ releases, deals, releaseToImport });

    let tracks = [];
    let videos = [];
    tracks = ernVariant.ResourceList[0].SoundRecording || [];
    videos = ernVariant.ResourceList[0].Video || [];
    tracks = [...tracks, ...videos];

    setupTracks({ releases, tracks, deals, releaseToImport, howToIngestOtherIdsOnImport });

    releasesToImport.push(releaseToImport);
  } catch (error) {
    logger.error('Error in DDEX Ingestion: handleErn43File:', error);
  }
};

module.exports = handleErn43File;
