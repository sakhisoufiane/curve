angular.module('Curve')
  .controller('companyEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'Company', 'Parent', 'Notification', 'Loader', 'Upload',
    function ($rootScope, $scope, $routeParams, $window, Session, Company, Parent, Notification, Loader, Upload) {
      $window.scrollTo(0, 0);
      $scope.company = {};
      $scope.clientType = Session.clientType;
      $scope.internal = Session.internal;
      $scope.originalObj = JSON.parse(angular.toJson($scope.company));

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.contracts === 'None') {
            $location.path('/');
          }
        }
      });

      // Configure Statement Designs to Display
      $scope.statementDesigns = ['Standard', 'Standard - Catalogue Summary', 'Standard - Extended', 'Combined', 'Combined - Catalogue Summary', 'Combined - Extended', 'Distribution'];
      if (Session.internal) {
        $scope.statementDesigns = ['Standard', 'Standard - Catalogue Summary', 'Standard - Extended', 'Combined', 'Combined - Catalogue Summary', 'Combined - Extended', 'Distribution', 'Proper', 'Just Music', 'Topic', 'Late Night Tales', 'Drag City', 'Platoon', 'Combined Plus Release Summary'];
      }

      $scope.validateImage = function (file, invalidFile) {
        if (invalidFile && invalidFile.$errorMessages) {
          if (invalidFile.$errorMessages.maxHeight || invalidFile.$errorMessages.maxWidth) {
            Loader.error('Image should be a maximum of 500x500px to ensure it displays properly on the statements');
            $scope.file = null;
          }

          if (invalidFile.$errorMessages.maxSize) {
            Loader.error('File size is too large. Please upload a file that is no more than 2MB');
            $scope.file = null;
          }
        }
      };

      // Load Company if ID exists
      if ($routeParams.id) {
        Loader.load();
        Company.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.company = response.data;
            Loader.complete();
          } else {
            Loader.error('Error loading company, please try again or contact support');
          }
        });
      }

      function upload(file, id, callback) {
        Upload.upload({
          url: `${Session.apiUrl}/companies/${id}/upload`,
          method: 'POST',
          data: {
            file,
          },
        })
          .then((resp) => {
            $scope.company = resp.data;
            $scope.file = null;
            callback();
          });
      }
      $scope.save = function () {
        Loader.load();
        if (!$scope.company._id) {
          Company.create($scope.company, (response) => {
            if (response.status === 200) {
              if ($scope.file) {
                upload($scope.file, response.data._id, () => {
                  $window.location.href = `#/companies/${response.data._id}/edit`;
                  Loader.success('Company successfully created');
                });
              } else {
                $window.location.href = `#/companies/${response.data._id}/edit`;
                Loader.success('Company successfully created');
              }
            } else {
              Loader.error('Error creating company, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        } else {
          Company.update($scope.company._id, $scope.company, (response) => {
            if (response.status === 200) {
              $scope.company = response.data;
              if ($scope.file) {
                upload($scope.file, $scope.company._id, () => {
                  Company.get($routeParams.id, (response) => {
                    $scope.company = response.data;
                    Loader.success('Company successfully saved');
                  });
                });
              } else {
                Loader.success('Company successfully saved');
              }
            } else {
              Loader.error('Error saving company, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been saved.  ${response.data.message}`);
            });
        }
      };
      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          Company.delete($scope.company._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/companies';
              Loader.success('Company successfully deleted');
            } else {
              Loader.error('Error deleting company, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The object has not been deleted.  ${response.data.message}`);
            });
        });
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.company._id) {
          Company.modelHistory($scope.company._id, (response) => {
            if (response.status === 200) {
              $scope.company.modelHistory = response.data.modelHistory;
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

      Company.getReports().then((reports) => {
        $scope.salesReports = reports.map((report) => {
          if (report.table === 'Sales Output' || report.table === 'Royalties') {
            return report;
          }
        }).filter(Boolean);
        $scope.costsReports = reports.map((report) => {
          if (report.table === 'Costs Output') {
            return report;
          }
        }).filter(Boolean);
      });
    },

  ]);
