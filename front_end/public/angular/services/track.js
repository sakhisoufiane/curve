angular.module('Curve')
  .factory('Track', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/tracks?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    loadTracksForRelease(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/tracks/load-tracks-for-release`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/tracks/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/tracks/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(type, ids, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/tracks`, data: { type, ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/tracks`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      });
    },
    createMany(tracks, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/tracks/create_many`, data: { tracks }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    loadReleases(track, callback) {
      track.releases = [];
      return $http({ method: 'GET', url: `${Session.apiUrl}/tracks/${track._id}/releases` }).then((response) => {
        track.releases = response.data.releases;
        if (callback) { callback(response.data.releases); }
      });
    },
    import(file, overwriteBlanks, importTemplateVersion, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/tracks/import?overwriteBlanks=${overwriteBlanks}&importTemplateVersion=${importTemplateVersion}`,
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
        url: `${Session.apiUrl}/tracks/updateIsrc`,
        data: {
          file,
        },
      }).then((response) => {
        callback(response);
      }, (e) => {
        callback(e);
      });
    },
    export(params, exportTemplateVersion, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/tracks/export?exportTemplateVersion=${exportTemplateVersion}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    rawExport(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/tracks/raw-export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    addAlias(id, alias, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/tracks/${id}/add_alias`, data: { alias }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    addAliases(id, aliases, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/tracks/${id}/add_alias`, data: { aliases }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    addBulkAliases(aliases, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/tracks/add_bulk_aliases`, data: $.param({ aliases }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/tracks/${id}/history` }).then((data) => {
        callback(data);
      });
    },
  }));
