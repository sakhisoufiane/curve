angular.module('Curve')
  .factory('Spotify', ($http, Session) => ({
    search(params, callback) {
      return $http({
        method: 'GET',
        url: `${Session.apiUrl}/spotify/search`,
        params,
      }).then((data) => {
        callback(data);
      });
    },
    import(params, type, updateExistingItems, callback) {
      return $http({
        method: 'POST',
        url: `${Session.apiUrl}/spotify/import`,
        data: {
          items: params,
          type,
          updateExistingItems,
        },
        headers: { 'Content-Type': 'application/json' },
      }).then((response) => {
        callback(response);
      });
    },
  }));
