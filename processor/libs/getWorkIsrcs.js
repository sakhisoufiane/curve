module.exports = (catalogueData) => {
  if (catalogueData?.works && Object.values(catalogueData.works).length > 0) {
    catalogueData.works = Object.values(catalogueData.works).map((work) => {
      work.workIsrcs = work.catalogueTrackIds ? work.catalogueTrackIds.map((trackId) => catalogueData.tracks[trackId] && catalogueData.tracks[trackId].catalogueIsrc).filter(Boolean).join(', ') : '';
      return work;
    });
    return catalogueData;
  }
};
