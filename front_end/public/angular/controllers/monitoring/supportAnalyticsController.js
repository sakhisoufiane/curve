angular.module('Curve')
  .controller('supportAnalytics', ['$scope', '$window', 'Session', 'Loader', 'Client', 'Monitoring',
    function ($scope, $window, Session, Loader, Client, Monitoring) {
      function renderChart(id, url) {
        const { ChartsEmbedSDK } = window;

        const sdk = new ChartsEmbedSDK({
          baseUrl: url,
          getUserToken: () => Session.token,
        });

        const dashboard = sdk.createDashboard({
          dashboardId: id,
          height: 1000,
          width: 1365,
        });

        dashboard.render(document.getElementById('mongochart'));
      }

      function init() {
        Loader.load();
        Monitoring.getChartCredentials((response) => {
          if (response.status === 200) {
            renderChart(response.data.id, response.data.url);
            Loader.success();
          } else {
            Loader.error(response.data.message);
          }
        });
      }

      // init();
    },
  ]);
