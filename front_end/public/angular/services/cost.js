angular.module('Curve')
  .factory('Cost', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/costs?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/costs/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/costs/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/costs/${id}`).then((data) => {
        callback(data);
      });
    },
    deleteBulk(ids, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/costs/bulk`, data: { ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    deleteFile(id, key, callback) {
      return $http.delete(`${Session.apiUrl}/costs/${id}/file/${key}`).then(
        (data) => {
          callback(data);
        },
        // handle errors
        (error) => {
          callback(error);
        },
      );
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/costs`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    import(file, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/costs/import`,
        data: {
          file,
        },
      }).then((response) => {
        callback(response);
      }, (e) => {
        callback(e);
      });
    },
    export(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/costs/export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/costs/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    archiveMany(ids, archived, callback) {
      return $http({
        method: 'POST',
        url: `${Session.apiUrl}/costs/archive_many`,
        data: { ids, archived },
        headers: { 'Content-Type': 'application/json' },
      }).then((data) => {
        callback(data);
      });
    },
    getFilterOptions(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/costs/filter_options` }).then((data) => {
        callback(data);
      }, (err) => {
        callback(err);
      });
    },
  }));
