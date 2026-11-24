angular.module('Curve')
  .factory('UnmappedWork', ($http, Session, Upload, Loader) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/unmappedWorks?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/unmappedWorks/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/unmappedWorks`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch((response) => {
        Loader.error(response.data.message);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/unmappedWorks/${id}`).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/unmappedWorks/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    createWorks(works, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/unmappedWorks/create_works`, data: { works }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    addBulkAliases(aliases, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/unmappedWorks/add_bulk_aliases`, data: { aliases }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    export(exportBody, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/unmappedWorks/export`, data: exportBody, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
  }));
