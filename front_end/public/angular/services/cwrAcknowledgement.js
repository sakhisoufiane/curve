angular.module('Curve')
  .factory('CwrAcknowledgement', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrAcknowledgements?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrAcknowledgements/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/cwrAcknowledgements/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/cwrAcknowledgements/${id}`).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/cwrAcknowledgements`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    reingest(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/cwrAcknowledgements/${id}/reingest`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    getWorks(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrAcknowledgements/${id}/works?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    getWorks_v1(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrAcknowledgements/${id}/works_v1?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    redeliverWorks(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrAcknowledgements/${id}/redeliver_works?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    export(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrAcknowledgements/${id}/export?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    importAcknowledgement(id, file, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/cwrAcknowledgements/${id}/importAcknowledgement`,
        data: {
          file,
        },
      }).then((response) => {
        if (callback) { callback(response); }
      }, (e) => {
        if (callback) { callback(e); }
      });
    },
    archiveMany(ids, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrAcknowledgements/archive_many?${$.param({ ids })}` }).then((data) => {
        callback(data);
      });
    },
    unarchiveMany(ids, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrAcknowledgements/unarchive_many?${$.param({ ids })}` }).then((data) => {
        callback(data);
      });
    },
  }));
