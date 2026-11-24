angular.module('Curve')
  .factory('Delivery', ($http, Session, Upload, Loader) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrDeliveries?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    specificDeliveries(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrDeliveries/specific_deliveries?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrDeliveries/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/cwrDeliveries/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    updateWorkIds(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/cwrDeliveries/${id}/update_workids`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/cwrDeliveries/${id}`).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/cwrDeliveries`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    export(id, markWorksAsDelivered, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrDeliveries/${id}/export?${$.param({ markWorksAsDelivered })}` }).then((data) => {
        callback(data);
      });
    },
    exportSonglist(id, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/cwrDeliveries/${id}/songlist/export` })
        .then((data) => callback(data));
    },
    deliver(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrDeliveries/${id}/deliver` }).then((data) => {
        callback(data);
      });
    },
    getWorks(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrDeliveries/${id}/works?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    redeliverWorks(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrDeliveries/${id}/redeliver_works?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    exportWorks(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrDeliveries/${id}/export_works?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    importAcknowledgement(id, file, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/cwrDeliveries/${id}/importAcknowledgement`,
        data: {
          file,
        },
      }).then((response) => {
        if (callback) { callback(response); }
      }, (e) => {
        if (callback) { callback(e); }
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrDeliveries/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    flushQueuedStatus(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrDeliveries/flush_delivery_queued_status` }).then((data) => {
        callback(data);
      });
    },
    notifyClientOfScheduledDelivery(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrDeliveries/pre_delivery_notification` }).then((data) => {
        callback(data);
      });
    },
    makeDeliveries(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/cwrDeliveries/run_scheduled_deliveries` }).then((data) => {
        callback(data);
      });
    },
  }));
