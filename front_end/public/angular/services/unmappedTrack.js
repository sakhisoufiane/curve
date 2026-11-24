angular.module('Curve')
  .factory('UnmappedTrack', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/unmappedTracks?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/unmappedTracks/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/unmappedTracks/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/unmappedTracks/${id}`).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/unmappedTracks/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    createTracks(tracks, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/unmappedTracks/create_tracks`, data: { tracks }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    export(exportBody, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/unmappedTracks/export`, data: exportBody, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
  }));
