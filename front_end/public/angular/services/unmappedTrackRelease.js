angular.module('Curve')
  .factory('UnmappedTrackRelease', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/unmappedTracksReleases?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, trackOrRelease, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/unmappedTracksReleases/${trackOrRelease}/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, trackOrRelease, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/unmappedTracksReleases/${trackOrRelease}/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, trackOrRelease, callback) {
      return $http.delete(`${Session.apiUrl}/unmappedTracksReleases/${trackOrRelease}/${id}`).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, trackOrRelease, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/unmappedTracksReleases/${trackOrRelease}/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    createTracks(tracks, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/unmappedTracksReleases/create_tracks`, data: { tracks }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    createReleases(releases, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/unmappedTracksReleases/create_releases`, data: { releases }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
  }));
