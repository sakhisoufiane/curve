angular.module('Curve')
  .factory('Contract', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contracts?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contracts/${id}` }).then((data) => {
        callback(data);
      });
    },
    getStatuses(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contracts/${id}/statuses` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/contracts/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(type, ids, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/contracts`, data: { type, ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    deleteFile(id, key, callback) {
      return $http.delete(`${Session.apiUrl}/contracts/${id}/file/${key}`).then(
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
      return $http({ method: 'POST', url: `${Session.apiUrl}/contracts`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    import(file, contractType, clientType, overwriteBlanks, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/contracts/import?contractType=${contractType}&clientType=${clientType}&overwriteBlanks=${overwriteBlanks}`,
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
      return $http({ method: 'POST', url: `${Session.apiUrl}/contracts/export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    releases(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contracts/${id}/releases?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    tracks(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contracts/${id}/tracks?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    works(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contracts/${id}/works?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    costs(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contracts/${id}/costs?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    transactions(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contracts/${id}/transactions` }).then((data) => {
        callback(data);
      });
    },
    futureTransactions(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contracts/${id}/future_transactions` }).then((data) => {
        callback(data);
      });
    },
    matchContractToLabels(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contracts/${id}/flush_labels_to_catalogue` }).then((data) => {
        callback(data);
      });
    },
    addAlias(id, alias, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/contracts/${id}/add_alias`, data: { alias }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    addAliases(id, aliases, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/contracts/${id}/add_alias`, data: { aliases }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/contracts/${id}/history` }).then((data) => {
        callback(data);
      });
    },
  }));
