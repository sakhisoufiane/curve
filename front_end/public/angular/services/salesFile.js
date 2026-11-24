angular.module('Curve')
  .factory('SalesFile', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesFiles?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesFiles/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/salesFiles/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/salesFiles/${id}`).then((data) => {
        callback(data);
      }, (err) => {
        callback(err);
      });
    },
    bulkDelete(ids, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/salesFiles/bulk`, data: { ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/salesFiles`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    ingest(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/salesFiles/${id}/ingest`, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }, (err) => {
        callback(err);
      });
    },
    revalidate(id, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/salesFiles/${id}/revalidate`, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }, (err) => {
        callback(err);
      });
    },
    // ingestionError() {
    //   return $http({ method: 'POST', url: `${Session.apiUrl}/salesFiles/${id}/ingestion_error`, headers: { 'Content-Type': 'application/json' } }).then(function (data) {
    //     callback(data);
    //   });
    // },
    // ingestionComplete() {
    //   return $http({ method: 'POST', url: `${Session.apiUrl}/salesFiles/${id}/ingestion_complete`, headers: { 'Content-Type': 'application/json' } }).then(function (data) {
    //     callback(data);
    //   });
    // },
    export(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/salesFiles/export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    import(file, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/salesFiles/upload`,
        data: {
          file,
          another: 'field',
        },
      }).then((response) => {
        callback(response);
      }, (e) => {
        callback(e);
      });
    },
    ignitionExport(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesFiles/${id}/ignition_export` }).then((data) => {
        callback(data);
      });
    },
    archiveMany(ids, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesFiles/archive_many?${$.param({ ids })}` }).then((data) => {
        callback(data);
      });
    },
    unarchiveMany(ids, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesFiles/unarchive_many?${$.param({ ids })}` }).then((data) => {
        callback(data);
      });
    },
    bulkIngest(ids, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/salesFiles/bulk_ingest`, data: { ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    bulkRevalidate(ids, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/salesFiles/bulk_revalidate`, data: { ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesFiles/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    bulkEditGet(ids, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesFiles/bulk_edit?${$.param({ ids })}` }).then(((data) => callback(data)));
    },
    bulkUpdate(updates, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/salesFiles/bulk_edit`, data: { updates }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }, (err) => {
        callback(err);
      });
    },
    processFinancialFile(id, callback) {
      return $http({
        method: 'POST',
        url: `${Session.apiUrl}/salesFiles/${id}/process_financial_file`,
        headers: {
          'Content-Type': 'application/json',
        },
      }).then((data) => callback(data), (err) => callback(err));
    },
    getFilterOptions(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesFiles/filter_options` }).then((data) => {
        callback(data);
      }, (err) => {
        callback(err);
      });
    },
  }));
