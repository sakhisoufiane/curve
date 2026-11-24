angular.module('Curve')
  .controller('deliveryPartnerEditController', ['$rootScope', '$scope', '$routeParams', '$window', 'Session', 'DeliveryPartner', 'CwrTerritories', 'TerritoryGroup', 'Loader', 'Pros', 'Client',
    function ($rootScope, $scope, $routeParams, $window, Session, DeliveryPartner, CwrTerritories, TerritoryGroup, Loader, Pros, Client) {
      $window.scrollTo(0, 0);
      $scope.clientType = Session.clientType;
      $scope.deliveryPartner = {
        clientId: Session.clientId,
        insertion: {},
        extraPartners: [],
        subPartners: [],
      };
      $scope.pros = Pros.concat(['Other']);
      $scope.territories = CwrTerritories.ALL;
      $scope.originalObj = JSON.parse(angular.toJson($scope.deliveryPartner));
      $scope.isISWC = false;
      $scope.deliveryTypes = ['FTP', 'FTPS', 'SFTP', 'Email', 'Export Only'];
      $scope.authenticationTypes = ['Password', 'Key File'];
      $scope.file = null;
      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });
      $scope.uploadFile = function (deliveryPartner, file) {
        function saveKeyFile() {
          DeliveryPartner.upload(deliveryPartner._id, file, (response) => {
            if (response.status === 200) {
              $scope.deliveryPartner = response.data.deliveryPartner;
              $scope.originalObj = JSON.parse(angular.toJson($scope.deliveryPartner));
              Loader.success('File successfully uploaded');
            } else {
              Loader.error('Error uploading file, please try again or contact support');
            }
          });
        }

        save(saveKeyFile);
      };

      // Load deliveryPartner if ID exists
      if ($routeParams.id) {
        Loader.load();
        DeliveryPartner.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.deliveryPartner = response.data;
            $scope.originalObj = JSON.parse(angular.toJson($scope.deliveryPartner));
            $scope.adjustDeliveryTypes(false);
            Loader.complete();
          } else {
            Loader.error('Error loading Delivery Partner, please try again or contact support');
          }
        });
      }
      $scope.save = save;

      // Load territory groups and concatenate it with countries
      TerritoryGroup.all({}, (response) => {
        if (response.status === 200) {
          const array = response.data.territoryGroups;
          for (let index = 0; index < array.length; index += 1) {
            array[index].continent = 'Groups';
            array[index].code = array[index]._id;
          }
          const validGroups = array.filter((group) => !CwrTerritories.isOnlyInvalidTerritories(group.territories));
          $scope.territoriesWithGroups = validGroups.concat($scope.territories);
        } else {
          Loader.error(response.data.message);
        }
      });

      $scope.groupFind = function (country) {
        return country.continent;
      };

      $scope.adjustDeliveryTypes = function (clearTypeValue) {
        if (
          $scope.deliveryPartner.outputFormat.indexOf('ISWC Allocation (IAS)') > -1
          || $scope.deliveryPartner.outputFormat.indexOf('ISWC Resolution (IRS)') > -1
        ) {
          $scope.isISWC = true;
          $scope.deliveryTypes = ['FTP', 'FTPS', 'SFTP'];
        } else {
          $scope.isISWC = false;
          $scope.deliveryTypes = ['FTP', 'FTPS', 'SFTP', 'Email', 'Export Only'];
        }
        if (clearTypeValue) {
          $scope.deliveryPartner.type = '';
        }
      };

      function save(callback) {
        Loader.load();
        if (($scope.deliveryPartner?.type === 'SFTP' || $scope.deliveryPartner?.type === 'FTP') && !$scope.deliveryPartner?.ftpPort) {
          Loader.error('Error creating Delivery Partner, please ensure Port is valid for the server.');
        } else {
          if (!['MUSICMARK', 'ICE'].includes($scope.deliveryPartner.receivingParty)) {
            $scope.deliveryPartner.subPartners = [];
          }

          if (!$scope.deliveryPartner._id) {
            if (($scope.deliveryPartner?.deliveryType === 'SFTP' || $scope.deliveryPartner?.deliveryType === 'FTP') && !$scope.deliveryPartner?.ftpPort) {
              Loader.error('Error creating Delivery Partner, please ensure Port is valid for the server.');
            }

            // Create Delivery Partner
            DeliveryPartner.create($scope.deliveryPartner, (response) => {
              if (response.status === 200) {
                $window.location.href = `#/deliverySettings/deliveryPartners/${response.data._id}/edit`;
                $scope.originalObj = JSON.parse(angular.toJson($scope.deliveryPartner));
                if (callback) { callback(); }
                Loader.success('Delivery Partner successfully created');
              } else {
                Loader.error('Error creating Delivery Partner, please try again or contact support');
              }
            }).catch((response) => {
              Loader.error(`Delivery Partner could not be created.  ${response.data.message}`);
            });
          } else {
            // Delete Key file if type is not SFTP or not using Key File
            if ($scope.deliveryPartner.type !== 'SFTP' || $scope.deliveryPartner.ftpAuthenticationType !== 'Key File') {
              DeliveryPartner.deleteUpload($scope.deliveryPartner._id, (response) => {
                $scope.deliveryPartner.ftpFileKey = '';
                Loader.success(response.status === 200 ? 'Key file successfully deleted' : 'Error deleting Key File, please try again or contact support');
              });
            }

            // Update Delivery Partner
            DeliveryPartner.update($scope.deliveryPartner._id, $scope.deliveryPartner, (response) => {
              if (response.status === 200) {
                $scope.deliveryPartner = response.data;
                $scope.originalObj = JSON.parse(angular.toJson($scope.deliveryPartner));
                if (callback) { callback(); }
                Loader.success('Delivery Partner successfully saved');
              } else {
                Loader.error('Error saving Delivery Partner, please try again or contact support');
              }
            }).catch((response) => {
              Loader.error(`Delivery Partner has not been saved.  ${response.data.message}`);
            });
          }
        }
      }

      $scope.delete = function () {
        Loader.load();
        $('#deliveryPartnersDeleteModal').modal('hide');
        $('#deliveryPartnersDeleteModal').on('hidden.bs.modal', () => {
          if ($scope.deliveryPartner.type !== 'SFTP' || $scope.deliveryPartner.ftpAuthenticationType !== 'Key File') {
            DeliveryPartner.deleteUpload($scope.deliveryPartner._id, (response) => {
              Loader.success(response.status === 200 ? 'Key file successfully deleted' : 'Error deleting Key File, please try again or contact support');
            });
          }

          DeliveryPartner.delete($scope.deliveryPartner._id, (response) => {
            if (response.status === 200) {
              $window.location.href = '#/deliverySettings';
              Loader.success('Delivery Partner successfully deleted');
            } else if (response.status === 400) {
              Loader.error('This Delivery Partner is included in a Works Partner IP Chain and cannot be deleted');
            } else {
              Loader.error('Error deleting Delivery Partner, please try again or contact support');
            }
          });
        });
      };

      $scope.addSubPartner = function () {
        if ($scope.deliveryPartner.subPartners.length < 20) {
          $scope.deliveryPartner.subPartners.push({ partner: '', _id: '' });
        }
      };

      $scope.removeSubPartner = function (subPartner) {
        const index = $scope.deliveryPartner.subPartners.indexOf(subPartner);
        $scope.deliveryPartner.subPartners.splice(index, 1);
      };

      $scope.addExtraPartner = function () {
        $scope.deliveryPartner.extraPartners.push({ publisherId: '', mechanicalPro: '', performancePro: '', territories: [] });
      };
      $scope.deleteExtraPartner = function (extraPartner) {
        const index = $scope.deliveryPartner.extraPartners.indexOf(extraPartner);
        $scope.deliveryPartner.extraPartners.splice(index, 1);
      };

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        const current = JSON.parse(angular.toJson($scope.deliveryPartner));
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
            $scope.deliveryPartner = $scope.originalObj;
          }
        }
      }

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.deliveryPartner._id) {
          DeliveryPartner.modelHistory($scope.deliveryPartner._id, (response) => {
            if (response.status === 200) {
              $scope.deliveryPartner.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.deliveryPartner));
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

      $scope.verifyDeliveryPartnerFtp = function (deliveryPartner) {
        const server = {
          name: deliveryPartner.name,
          protocol: deliveryPartner.type,
          host: deliveryPartner.ftpHost,
          username: deliveryPartner.ftpUsername,
          password: deliveryPartner.ftpPassword,
          port: deliveryPartner.ftpPort,
          directory: deliveryPartner.ftpRootDir,
          authenticationType: deliveryPartner.ftpAuthenticationType,
          fileKey: deliveryPartner.ftpFileKey,
        };

        if (Session.clientId) {
          Loader.load();
          const ftpConfig = JSON.parse(JSON.stringify(server));
          Client.verifyFtp({ ftpConfig }, (response) => {
            if (response.status === 200) {
              Loader.success('FTP connection verification success');
            } else {
              Loader.error('FTP connection verification failed - please check your credentials');
            }
          });
        }
      };
    },
  ]);
