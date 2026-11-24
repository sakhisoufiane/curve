angular.module('Curve')
  .factory('Sales', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/sales?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/sales/${id}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/sales/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    updateMultipleIds(ids, params, callback) {
      params.ids = ids;
      return $http({ method: 'PUT', url: `${Session.apiUrl}/sales/multiple_ids`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    updateFiltered(params, body, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/sales/filtered?${$.param(params)}`, data: body, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/sales/${id}`).then((data) => {
        callback(data);
      }).catch(callback);
    },
    deleteMultipleIds(ids, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/sales/delete_multiple_ids`, data: { ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    export(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/sales/export_to_csv`, data: params }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    importMappings(file, catalogueType, templateType, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/sales/import_mappings`,
        data: {
          file,
        },
        params: {
          catalogueType,
          templateType,
        },
      }).then((response) => {
        callback(response);
      }).catch(callback);
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/sales/${id}/history` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
  }));
