angular.module('Curve')
  .factory('UnmappedRelease', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/unmappedReleases?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/unmappedReleases/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/unmappedReleases/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/unmappedReleases/${id}`).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/unmappedReleases/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    createReleases(releases, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/unmappedReleases/create_releases`, data: { releases }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    export(exportBody, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/unmappedReleases/export`, data: exportBody, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
  }));
