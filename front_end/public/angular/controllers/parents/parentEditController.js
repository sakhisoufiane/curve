angular.module('Curve')
  .controller('parentEditController', ['$scope', '$routeParams', '$window', '$q', 'Session', 'Parent', 'Notification', 'Loader', 'Upload',
    function ($scope, $routeParams, $window, $q, Session, Parent, Notification, Loader, Upload) {
      $window.scrollTo(0, 0);
      $scope.parent = {};
      $scope.originalObj = JSON.parse(angular.toJson($scope.parent));
      // Load Parent if ID exists
      if ($routeParams.id) {
        Loader.load();
        Parent.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.parent = response.data;
            $scope.originalObj = JSON.parse(angular.toJson($scope.parent));
            Loader.complete();
          } else {
            Loader.error('Error loading parent, please try again or contact support');
          }
        });
      }

      function upload(file, url, callback) {
        Upload.upload({
          url,
          method: 'POST',
          data: {
            file,
          },
        })
          .then((resp) => {
            callback(null, resp);
          });
      }

      function uploadFiles(callback) {
        function darkUpload() {
          return $q((resolve, reject) => {
            if ($scope.parentDarkLogo) {
              upload($scope.parentDarkLogo, `${Session.apiUrl}/parents/${$scope.parent._id}/uploadDarkLogo`, (err, response) => {
                $scope.parent.publicDarkLogo = response.data.publicDarkLogo;
                resolve();
              });
            } else {
              resolve();
            }
          });
        }

        function lightUpload() {
          return $q((resolve, reject) => {
            if ($scope.parentLightLogo) {
              upload($scope.parentLightLogo, `${Session.apiUrl}/parents/${$scope.parent._id}/uploadLightLogo`, (err, response) => {
                $scope.parent.publicLightLogo = response.data.publicLightLogo;
                resolve();
              });
            } else {
              resolve();
            }
          });
        }

        function faviconUpload() {
          return $q((resolve, reject) => {
            if ($scope.parentFavicon) {
              upload($scope.parentFavicon, `${Session.apiUrl}/parents/${$scope.parent._id}/uploadFavicon`, (err, response) => {
                $scope.parent.publicFavicon = response.data.publicFavicon;
                resolve();
              });
            } else {
              resolve();
            }
          });
        }

        $q.all([darkUpload(), lightUpload(), faviconUpload()]).then(callback);
      }

      $scope.save = function () {
        Loader.load();
        updatePriceCategories();
        updateConfigurations();
        updateDistributionhannels();
        updateCostTypes();
        if (!$scope.parent._id) {
          Parent.create($scope.parent, (response) => {
            if (response.status === 200) {
              $scope.isSaveSuccessful = true;
              uploadFiles(() => {
                $window.location.href = `#/parents/${response.data._id}/edit`;
                Loader.success('Parent successfully created');
              });
            } else {
              Loader.error('Error creating parent, please try again or contact support');
            }
          }).catch((response) => {
            Loader.error(response.data.message);
          });
        } else {
          Parent.update($scope.parent._id, $scope.parent, (response) => {
            if (response.status === 200) {
              $scope.parent = response.data;
              $scope.originalObj = JSON.parse(angular.toJson($scope.parent));
              uploadFiles(() => {
                Loader.success('Parent successfully saved');
              });
            } else {
              Loader.error('Error saving parent, please try again or contact support');
            }
          }).catch((response) => {
            Loader.error(response.data.message);
          });
        }
      };
      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          Parent.delete($scope.parent._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/parents';
              Loader.success('Parent successfully deleted');
            } else {
              Loader.error('Error deleting parent, please try again or contact support');
            }
          });
        });
      };

      $scope.$watch('parent.distributionChannels', (distributionChannels) => {
        $scope.displayDistributionChannels = [];
        angular.forEach(distributionChannels, (channel) => {
          $scope.displayDistributionChannels.push({ name: channel });
        });
      });
      $scope.addDistributionChannel = function () {
        $scope.displayDistributionChannels.push('');
        updateDistributionhannels();
      };
      $scope.deleteDistributionChannel = function (channel) {
        const index = $scope.displayDistributionChannels.indexOf(channel);
        $scope.displayDistributionChannels.splice(index, 1);
      };

      function updateDistributionhannels(callback) {
        $scope.parent.distributionChannels = [];
        if ($scope.displayDistributionChannels.length > 0) {
          angular.forEach($scope.displayDistributionChannels, (channel) => {
            $scope.parent.distributionChannels.push(channel.name);
            if ($scope.parent.distributionChannels.length === $scope.displayDistributionChannels.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('parent.configurations', (configurations) => {
        $scope.displayConfigurations = [];
        angular.forEach(configurations, (configuration) => {
          $scope.displayConfigurations.push({ name: configuration });
        });
      });
      $scope.addConfiguration = function () {
        $scope.displayConfigurations.push('');
        updateConfigurations();
      };
      $scope.deleteConfiguration = function (configuration) {
        const index = $scope.displayConfigurations.indexOf(configuration);
        $scope.displayConfigurations.splice(index, 1);
      };

      function updateConfigurations(callback) {
        $scope.parent.configurations = [];
        if ($scope.displayConfigurations.length > 0) {
          angular.forEach($scope.displayConfigurations, (configuration) => {
            $scope.parent.configurations.push(configuration.name);
            if ($scope.parent.configurations.length === $scope.displayConfigurations.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('parent.priceCategories', (priceCategories) => {
        $scope.displayPriceCategories = [];
        angular.forEach(priceCategories, (category) => {
          $scope.displayPriceCategories.push({ name: category });
        });
      });
      $scope.addPriceCategory = function () {
        $scope.displayPriceCategories.push('');
        updatePriceCategories();
      };
      $scope.deletePriceCategory = function (category) {
        const index = $scope.displayPriceCategories.indexOf(category);
        $scope.displayPriceCategories.splice(index, 1);
      };

      function updatePriceCategories(callback) {
        $scope.parent.priceCategories = [];
        if ($scope.displayPriceCategories.length > 0) {
          angular.forEach($scope.displayPriceCategories, (category) => {
            $scope.parent.priceCategories.push(category.name);
            if ($scope.parent.priceCategories.length === $scope.displayPriceCategories.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$watch('parent.costTypes', (costTypes) => {
        $scope.displayCostTypes = [];
        angular.forEach(costTypes, (costType) => {
          $scope.displayCostTypes.push({ name: costType });
        });
      });
      $scope.addCostType = function () {
        $scope.displayCostTypes.push('');
        updateCostTypes();
      };
      $scope.deleteCostType = function (costType) {
        const index = $scope.displayCostTypes.indexOf(costType);
        $scope.displayCostTypes.splice(index, 1);
      };

      function updateCostTypes(callback) {
        $scope.parent.costTypes = [];
        if ($scope.displayCostTypes.length > 0) {
          angular.forEach($scope.displayCostTypes, (costType) => {
            $scope.parent.costTypes.push(costType.name);
            if ($scope.parent.costTypes.length === $scope.displayCostTypes.length) {
              if (callback) { callback(); }
            }
          });
        } else if (callback) { callback(); }
      }

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        if ($scope.isSaveSuccessful) {
          $scope.isSaveSuccessful = false;
          return;
        }
        const current = JSON.parse(angular.toJson($scope.parent));

        if (angular.toJson(current) !== angular.toJson($scope.originalObj)) {
          // set an alert message for old browser versions
          const message = 'You have unsaved changes. Are you sure you want to leave this page?';
          if (event.type === 'beforeunload') {
            event.returnValue = message;
            // return manually set message for older browsers, in most cases the browsers own message will override and display
            return message;
          }
          // eslint-disable-next-line no-restricted-globals, no-alert
          const answer = confirm(message);
          if (!answer) {
            event.preventDefault();
          } else {
            // Reset so User does does not see refresh warning after hitting back
            $scope.parent = $scope.originalObj;
          }
        }
      }

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.parent._id) {
          Parent.modelHistory($scope.parent._id, (response) => {
            if (response.status === 200) {
              $scope.parent.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.parent));
              $('#modelHistoryModal').modal();
              Loader.complete();
            } else {
              Loader.error(response.data.message);
            }
          })
            .catch((response) => {
              Loader.error(response.data.message);
            });
        }
      };
    },
  ]);
