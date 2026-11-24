angular.module('Curve')
  .factory('SalesTemplate', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesTemplates?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesTemplates/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/salesTemplates/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/salesTemplates/${id}`).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/salesTemplates`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    import(file, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/salesTemplates/upload`,
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
    createFromLibrary(libraryTemplateId, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/salesTemplates/create_from_library_template/${libraryTemplateId}`, data: {}, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    addToLibrary(id, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/salesTemplates/${id}/add_to_library`, data: {}, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesTemplates/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    archiveMany(ids, archived, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/salesTemplates/archive_many?${$.param({ ids })}&archived=${archived}` }).then((data) => {
        callback(data);
      });
    },
  }));
