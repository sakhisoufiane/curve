const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { HowToIngestOtherIdsOnImport } = require('../../libs/enums/client');

const getTrackRelease = (xml, isrc) => {
  let releases;
  if (xml['ern:NewReleaseMessage']) {
    releases = xml['ern:NewReleaseMessage'].ReleaseList[0].Release;
  } else if (xml['ernm:NewReleaseMessage']) {
    releases = xml['ernm:NewReleaseMessage'].ReleaseList[0].Release;
  } else if (xml['ern382:NewReleaseMessage']) {
    releases = xml['ern382:NewReleaseMessage'].ReleaseList[0].Release;
  }
  let outputRelease;
  // Loop through releases in ReleaseList
  releases.forEach((release) => {
    // Pull the ISRC
    let releaseIsrc;
    try { releaseIsrc = release.ReleaseId[0].ISRC[0]._; } catch (err) {}
    try { if (!releaseIsrc) { releaseIsrc = release.ReleaseId[0].ISRC[0]; } } catch (err) {}
    // If ISRC matches, load the data
    if (releaseIsrc && releaseIsrc === isrc) {
      // console.log("ISRC:", isrc, "ReleaseIsrc:", releaseIsrc);
      outputRelease = release;
    }
  });
  return outputRelease;
};

const setupReleases = ({ releases, releaseToImport, deals }) => {
  // Loop through releases in XML
  for (let i = 0; i < releases.length; i += 1) {
    const release = releases[i];
    // Check style of XML based on IsMainRelease element
    if (release.$ && release.$.IsMainRelease) {
      // Fuga Import
      // Set main params
      try { releaseToImport.barcode = release.ReleaseId[0].ICPN[0]._; } catch (err) {}
      try { releaseToImport.catNo = release.ReleaseId[0].CatalogNumber[0]._; } catch (err) {}
      try { releaseToImport.foreignId = release.ReleaseId[0].ProprietaryId[0]._; } catch (err) {}
      try { releaseToImport.artist = release.ReleaseDetailsByTerritory[0].DisplayArtistName[0]; } catch (err) {}
      try { releaseToImport.label = release.ReleaseDetailsByTerritory[0].LabelName[0]; } catch (err) {}
      if (!releaseToImport.label || typeof releaseToImport.label !== 'string') {
        try { releaseToImport.label = release.ReleaseDetailsByTerritory[0].LabelName[0]._; } catch (err) { }
      }
      // Pull out label ID from label name field in DDEX to allow for a single feed to include multiple labels
      try {
        if (release.ReleaseDetailsByTerritory[0].LabelName && release.ReleaseDetailsByTerritory[0].LabelName.length > 0) {
          release.ReleaseDetailsByTerritory[0].LabelName.forEach((labelName) => {
            if (labelName?.$?.LabelNameType === 'UserDefined') {
              releaseToImport.feedClientId = labelName._;
            }
          });
        }
      } catch (err) {}
      try { releaseToImport.title = release.ReleaseDetailsByTerritory[0].Title[0].TitleText[0]; } catch (err) {}
      // Provide fallback to reference title when release title isn't supplied
      if (!releaseToImport.title) {
        try { releaseToImport.title = release.ReferenceTitle[0].TitleText[0]; } catch (err) { }
      }
      try { releaseToImport.version = release.ReleaseDetailsByTerritory[0].Title[0].TitleVersion[0]; } catch (err) {}
      try { if (!releaseToImport.version) { releaseToImport.version = release.ReleaseDetailsByTerritory[0].Title[0].SubTitle[0]._; } } catch (err) {}
      try { if (!releaseToImport.version) { releaseToImport.version = release.ReleaseDetailsByTerritory[0].Title[0].SubTitle[0]; } } catch (err) {}
      try { releaseToImport.pLine = `${release.PLine[0].Year} ${release.PLine[0].PLineText}`; } catch (err) {}
      // Loop through deals
      for (let dealIndex = 0; dealIndex < deals.length; dealIndex += 1) {
        const deal = deals[dealIndex];
        // Loop through references
        for (let dealReferenceIndex = 0; dealReferenceIndex < deal.DealReleaseReference.length; dealReferenceIndex += 1) {
          if (deal.DealReleaseReference[dealReferenceIndex]._ === release.ReleaseReference[0]._) {
            // Find contract mapping should it be included
            try { releaseToImport.contractMapping = deal.Deal[0].DealReference[0]; } catch (err) {}
            // Set release date
            try { releaseToImport.releaseDate = deal.Deal[0].DealTerms[0].ValidityPeriod[0].StartDateTime[0]; } catch (err) {}
            try {
              if (!releaseToImport.releaseDate || releaseToImport.releaseDate === '') {
                releaseToImport.releaseDate = deal.Deal[0].DealTerms[0].ValidityPeriod[0].StartDate[0];
              }
            } catch (err) {}
          }
        }
      }
      // Loop through resrouces to get references
      for (let j = 0; j < release.ReleaseResourceReferenceList[0].ReleaseResourceReference.length; j += 1) {
        const ref = release.ReleaseResourceReferenceList[0].ReleaseResourceReference[j];
        const val = ref._ ? ref._ : ref;
        if (releaseToImport.refs.indexOf(val) === -1) {
          releaseToImport.refs.push(val);
        }
      }
    } else if (release.ReleaseType && release.ReleaseType[0] !== 'TrackRelease' && release.ReleaseType[0] !== 'VideoTrackRelease') {
      // 3.8.2 Audiosalad Import
      // Set main params
      try { releaseToImport.barcode = release.ReleaseId[0].ICPN[0]._; } catch (err) {}
      try { releaseToImport.catNo = release.ReleaseId[0].CatalogNumber[0]._; } catch (err) {}
      try { releaseToImport.foreignId = release.ReleaseId[0].ProprietaryId[0]._; } catch (err) {}
      try { releaseToImport.artist = release.ReleaseDetailsByTerritory[0].DisplayArtistName[0]; } catch (err) {}
      // Fallback on artist to DisplayArtist if DisplayArtistName isn't present
      try {
        if (!releaseToImport.artist) {
          // concatenate all DisplayArtist names to one artist string
          const displayArtists = release.ReleaseDetailsByTerritory[0].DisplayArtist.map((displayArtist) => displayArtist.PartyName[0].FullName[0]);
          releaseToImport.artist = displayArtists.join(', ');
        }
      } catch (err) {}
      try { releaseToImport.label = release.ReleaseDetailsByTerritory[0].LabelName[0]; } catch (err) {}
      if (!releaseToImport.label || typeof releaseToImport.label !== 'string') {
        try { releaseToImport.label = release.ReleaseDetailsByTerritory[0].LabelName[0]._; } catch (err) { }
      }
      // Pull out label ID from label name field in DDEX to allow for a single feed to include multiple labels
      try {
        if (release.ReleaseDetailsByTerritory[0].LabelName && release.ReleaseDetailsByTerritory[0].LabelName.length > 0) {
          release.ReleaseDetailsByTerritory[0].LabelName.forEach((labelName) => {
            if (labelName?.$?.LabelNameType === 'UserDefined') {
              releaseToImport.feedClientId = labelName._;
            }
          });
        }
      } catch (err) {}
      try { releaseToImport.title = release.ReleaseDetailsByTerritory[0].Title[0].TitleText[0]; } catch (err) {}
      // Provide fallback to reference title when release title isn't supplied
      if (!releaseToImport.title) {
        try { releaseToImport.title = release.ReferenceTitle[0].TitleText[0]; } catch (err) { }
      }
      try { releaseToImport.title = release.ReleaseDetailsByTerritory[0].Title[0].TitleText[0]; } catch (err) { }
      try { releaseToImport.version = release.ReleaseDetailsByTerritory[0].Title[0].TitleVersion[0]; } catch (err) {}
      try { releaseToImport.pLine = release.PLine[0].PLineText; } catch (err) {}
      try { releaseToImport.reference = release.ReleaseReference[0]._; } catch (err) {}
      // Loop through deals
      for (let dealIndex = 0; dealIndex < deals.length; dealIndex += 1) {
        const deal = deals[dealIndex];
        // Loop through references
        for (let dealReferenceIndex = 0; dealReferenceIndex < deal.DealReleaseReference.length; dealReferenceIndex += 1) {
          if (deal.DealReleaseReference[dealReferenceIndex]._ === release.ReleaseReference[0]._) {
            // Find contract mapping should it be included
            try { releaseToImport.contractMapping = deal.Deal[0].DealReference[0]; } catch (err) {}
            // Set release date
            try { releaseToImport.releaseDate = deal.Deal[0].DealTerms[0].ValidityPeriod[0].StartDateTime[0]; } catch (err) {}
            try {
              if (!releaseToImport.releaseDate || releaseToImport.releaseDate === '') {
                releaseToImport.releaseDate = deal.Deal[0].DealTerms[0].ValidityPeriod[0].StartDate[0];
              }
            } catch (err) {}
          }
        }
      }
      try {
      // Loop through resrouces to get references
        for (let j = 0; j < release.ReleaseResourceReferenceList[0].ReleaseResourceReference.length; j += 1) {
          const ref = release.ReleaseResourceReferenceList[0].ReleaseResourceReference[j];
          const val = ref._ ? ref._ : ref;
          if (releaseToImport.refs.indexOf(val) === -1) {
            releaseToImport.refs.push(val);
          }
        }
      } catch (err) {}
    }
  }
};

const setupTracks = ({ result, releaseToImport, deals, howToIngestOtherIdsOnImport }) => {
  // Setup tracks array
  let tracks = [];
  let videos = [];
  // Find correct tracks element in XML
  if (result['ern:NewReleaseMessage']) {
    tracks = result['ern:NewReleaseMessage'].ResourceList[0].SoundRecording || [];
    videos = result['ern:NewReleaseMessage'].ResourceList[0].Video || [];
  } else if (result['ernm:NewReleaseMessage']) {
    tracks = result['ernm:NewReleaseMessage'].ResourceList[0].SoundRecording || [];
    videos = result['ernm:NewReleaseMessage'].ResourceList[0].Video || [];
  } else if (result['ern382:NewReleaseMessage']) {
    tracks = result['ern382:NewReleaseMessage'].ResourceList[0].SoundRecording || [];
    videos = result['ern382:NewReleaseMessage'].ResourceList[0].Video || [];
  }
  tracks = [...tracks, ...videos];

  if (tracks) {
    // Loop through tracks
    for (let i = 0; i < tracks.length; i += 1) {
      // Setup track object
      const trackToImport = { isAlternateId: false };
      const track = tracks[i];
      const prefix = (track.SoundRecordingId) ? 'SoundRecording' : 'Video';
      logger.debug('TRACK:');
      logger.debug(track);

      // Set main params
      try { trackToImport.ref = track.ResourceReference[0]; } catch (err) {}
      try { trackToImport.isrc = track[`${prefix}Id`][0].ISRC[0].trim(); } catch (err) {}
      try { trackToImport.title = track.ReferenceTitle[0].TitleText[0]; } catch (err) {}
      try { trackToImport.version = track.ReferenceTitle[0].TitleVersion[0]; } catch (err) {}
      try { if (!trackToImport.version) { trackToImport.version = track.ReferenceTitle[0].SubTitle[0]; } } catch (err) {}
      try { trackToImport.duration = track.Duration[0]; } catch (err) {}
      try { trackToImport.label = track[`${prefix}DetailsByTerritory`][0].LabelName[0]; } catch (err) {}
      try { if (!trackToImport.label || typeof trackToImport.label !== 'string') { trackToImport.label = track[`${prefix}DetailsByTerritory`][0].LabelName[0]; } } catch (err) { }
      try { trackToImport.pLine = track[`${prefix}DetailsByTerritory`][0].PLine[0].PLineText[0]; } catch (err) {}
      try { trackToImport.artist = track[`${prefix}DetailsByTerritory`][0].DisplayArtistName[0]; } catch (err) {}
      // Fallback on artist to DisplayArtist if DisplayArtistName isn't present
      try {
        if (!trackToImport.artist) {
          // concatenate all DisplayArtist names to one artist string
          const displayArtists = track[`${prefix}DetailsByTerritory`][0].DisplayArtist.map((displayArtist) => displayArtist.PartyName[0].FullName[0]);
          trackToImport.artist = displayArtists.join(', ');
        }
      } catch (err) {}
      // Loop through deals
      for (let dealIndex = 0; dealIndex < deals.length; dealIndex += 1) {
        const deal = deals[dealIndex];
        // Loop through references
        for (let dealReferenceIndex = 0; dealReferenceIndex < deal.DealReleaseReference.length; dealReferenceIndex += 1) {
          if (deal.DealReleaseReference[dealReferenceIndex]._ === track.ref) {
            // Find contract mapping should it be included
            try { trackToImport.contractMapping = deal.Deal[0].DealReference[0]; } catch (err) {}
          }
        }
      }

      // Get track release
      const trackRelease = getTrackRelease(result, trackToImport.isrc);
      if (trackRelease) {
        try { trackToImport.foreignId = trackRelease.ReleaseDetailsByTerritory[0].ProprietaryId[0]._; } catch (err) {}
        try { trackToImport.pLine = trackRelease.PLine[0].PLineText[0]; } catch (err) {}
        try { trackToImport.label = trackRelease.ReleaseDetailsByTerritory[0].LabelName[0]; } catch (err) {}
        try { if (!trackToImport.label || typeof trackToImport.label !== 'string') { trackToImport.label = track[`${prefix}DetailsByTerritory`][0].LabelName[0]._; } } catch (err) { }
      }
      // Strip any dashes in ISRC
      if (trackToImport && trackToImport.isrc) {
        trackToImport.isrc = trackToImport.isrc.replace(/-/g, '');
      }

      // Check if we need to do anything with other ids in file
      if (howToIngestOtherIdsOnImport) {
        const ids = track[`${prefix}Id`].reduce((accum, current) => {
          const proprietaryIdValue = current?.ProprietaryId?.[0]?._;
          if (proprietaryIdValue?.length === 12) accum.push(proprietaryIdValue);
          return accum;
        }, []);

        if (howToIngestOtherIdsOnImport === HowToIngestOtherIdsOnImport.CreateNewAlias && ids.length) {
          trackToImport.aliases = ids;
          trackToImport.isAlternateId = true;
        } else if (howToIngestOtherIdsOnImport === HowToIngestOtherIdsOnImport.CreateNewTrack && ids.length) {
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

      // Add to release
      releaseToImport.tracks.push(trackToImport);
    }
  }
};

const handleErnDefaultFile = ({ result, releasesToImport, howToIngestOtherIdsOnImport }) => {
  // Setup release object
  const releaseToImport = { tracks: [], refs: [] };
  // Loop through releases
  let releases = [];
  let deals = [];
  try {
    // Get release data from correct place in XML
    if (result['ern:NewReleaseMessage']) {
      releases = result['ern:NewReleaseMessage'].ReleaseList[0].Release;
      try { deals = result['ern:NewReleaseMessage'].DealList[0].ReleaseDeal; } catch (e) {}
    } else if (result['ernm:NewReleaseMessage']) {
      releases = result['ernm:NewReleaseMessage'].ReleaseList[0].Release;
      try { deals = result['ernm:NewReleaseMessage'].DealList[0].ReleaseDeal; } catch (e) {}
    } else if (result['ern382:NewReleaseMessage']) {
      releases = result['ern382:NewReleaseMessage'].ReleaseList[0].Release;
      try { deals = result['ern382:NewReleaseMessage'].DealList[0].ReleaseDeal; } catch (e) { }
    }

    // Check deals is an array
    if (!Array.isArray(deals)) {
      deals = [];
    }

    setupReleases({ releases, releaseToImport, deals });
    setupTracks({ result, releaseToImport, deals, howToIngestOtherIdsOnImport });

    // Add release to output object
    releasesToImport.push(releaseToImport);
  } catch (err) {
    logger.error(err);
  }
};

module.exports = handleErnDefaultFile;
