angular.module('Curve')
  .factory('Search', ($http, Session) => ({
    get(text, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/search?text=${text}` }).then((data) => {
        callback(data);
      });
    },
  }));
