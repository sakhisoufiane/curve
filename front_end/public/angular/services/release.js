angular.module('Curve')
  .factory('Release', ($http, Session, Track, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/releases?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/releases/${id}` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/releases/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    delete(type, ids, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/releases`, data: { type, ids }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/releases`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      });
    },
    createMany(releases, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/releases/create_many`, data: { releases }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    loadTracks(release, callback) {
      release.tracks = [];
      if (release.trackIds) {
        return $http({ method: 'GET', url: `${Session.apiUrl}/releases/${release._id}/tracks` }).then((response) => {
          release.tracks = response.data.tracks.filter(Boolean);
          if (callback) { callback(response.data.tracks); }
        });
      } if (callback) {
        callback(release);
      }
    },
    proRataContracts(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/releases/pro_rata_contracts_from_tracks`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch((err) => {
        callback(err);
      });
    },
    inheritMechanicals(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/releases/inherit_mechanicals_from_tracks`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch((err) => {
        callback(err);
      });
    },
    proRataTrackContracts(release, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/releases/${release._id}/pro_rata_track_contracts` }).then((response) => {
        release.salesReturnsRights = response.data.contracts.salesReturnsRights;
        release.costsRights = response.data.contracts.costsRights;
        if (callback) { callback(response.data.contracts); }
      });
    },
    inheritTrackMechanicals(release, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/releases/${release._id}/inherit_track_mechanicals` }).then((response) => {
        ({ release } = response.data);
        if (callback) { callback(response); }
      }).catch((err) => {
        callback(err);
      });
    },
    import(file, overwriteBlanks, importTemplateVersion, callback) {
      Upload.upload({
        url: `${Session.apiUrl}/releases/import?overwriteBlanks=${overwriteBlanks}&importTemplateVersion=${importTemplateVersion}`,
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
        url: `${Session.apiUrl}/releases/updateCatNo`,
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
      return $http({ method: 'POST', url: `${Session.apiUrl}/releases/export?exportTemplateVersion=${exportTemplateVersion}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    rawExport(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/releases/raw-export`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    addAlias(id, alias, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/releases/${id}/add_alias`, data: { alias }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    addAliases(id, aliases, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/releases/${id}/add_alias`, data: { aliases }, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    addBulkAliases(aliases, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/releases/add_bulk_aliases`, data: $.param({ aliases }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      });
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/releases/${id}/history` }).then((data) => {
        callback(data);
      });
    },
  }));
