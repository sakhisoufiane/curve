angular.module('Curve')
  .factory('Work', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/works?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    getWorks(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/get_works`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch((err) => {
        callback(err);
      });
    },
    allAsync(params) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/works?${$.param(params)}` });
    },
    deliveryStatuses(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/works/deliveryStatuses?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    exportDeliveryStatuses(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/exportDeliveryStatuses`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/works/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/works/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(type, ids, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/works`, data: { type, ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      });
    },
    import(file, overwriteBlanks, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/works/import?overwriteBlanks=${overwriteBlanks}`,
        data: {
          file,
        },
      }).then((response) => {
        callback(response);
      }, (e) => {
        callback(e);
      });
    },
    updateCatalogue(file, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/works/updateMainIdentifiers`,
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
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    rawExport(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/raw-export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    exportValidationErrors(params) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/export_validation_errors`, data: params, headers: { 'Content-Type': 'application/json' } });
    },
    createDelivery(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/create_delivery`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    createMany(works, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/create_many`, data: { works }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/works/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    flushContracts(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/flushContracts`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    bulkInclude(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/bulk_include`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    toggleHold(id, onHold, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/works/${id}/toggle_hold`, data: { onHold }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch((data) => {
        callback(data);
      });
    },
    approve(id, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/works/${id}/approve` }).then((data) => {
        callback(data);
      }).catch((data) => {
        callback(data);
      });
    },
    approveMany(ids, callback) {
      return $http({ method: 'post', url: `${Session.apiUrl}/works/approve_many`, data: { ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    holdMany(ids, callback) {
      return $http({ method: 'post', url: `${Session.apiUrl}/works/hold_many`, data: { ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    significantUpdateCheck(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/significant_update_check/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    resumeMany(ids, callback) {
      return $http({ method: 'post', url: `${Session.apiUrl}/works/resume_many`, data: { ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    deliveries(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/works/${id}/deliveries` }).then((data) => {
        callback(data);
      });
    },
    deliveriesWithLogs(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/works/${id}/deliveries?showLogs=true` }).then((data) => {
        callback(data);
      });
    },
    deliveriesFromMergedWorks(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/works/${id}/deliveries_from_merged_works` }).then((data) => {
        callback(data);
      });
    },
    updateDeliveryStatus(id, deliveries, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/works/${id}/update_deliveries`, data: { deliveries } }).then((data) => {
        callback(data);
      });
    },
    updateBulkDeliveryStatus(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/bulk_update_deliveries`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    redeliverWorkIds(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/redeliver_workids`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    updateWorksWithFilter(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/update_works_with_filter`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    getSource(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/works/${id}/source` }).then((data) => {
        callback(data);
      });
    },
    getDuplicates(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/works/duplicates?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    getDuplicateOverview(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/duplicates/overview`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    merge(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/works/duplicates/merge`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
  }));
