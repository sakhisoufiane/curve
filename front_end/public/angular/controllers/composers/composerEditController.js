angular.module('Curve')
  .controller('composerEditController', ['$rootScope', '$scope', '$routeParams', '$window', '$location', 'Session', 'Composer', 'Notification', 'Fields', 'Loader', 'Settings', 'Pros', 'Territories', 'CwrTerritories',
    function ($rootScope, $scope, $routeParams, $window, $location, Session, Composer, Notification, Fields, Loader, Settings, Pros, Territories, CwrTerritories) {
      const controller = this;
      $window.scrollTo(0, 0);
      $scope.composer = { societies: [], territories: [] };
      $scope.pros = Pros;
      $scope.territories = Territories;
      $scope.deletionError = '';
      $scope.originalObj = JSON.parse(angular.toJson($scope.composer));

      $scope.rights = {};
      $rootScope.$watch('clientRights', () => {
        $scope.rights = $rootScope.clientRights;
        if ($scope.rights) {
          if ($scope.rights.catalogue === 'None') {
            $location.path('/');
          }
        }
      });

      // Load composer if ID exists
      if ($routeParams.id) {
        Loader.load();
        Composer.get($routeParams.id, (response) => {
          if (response.status === 200) {
            $scope.composer = response.data;
            $scope.originalObj = JSON.parse(angular.toJson($scope.composer));
            Loader.complete();
          } else if (response.status === 404) {
            $location.path('/composers');
          } else {
            Loader.error('Error loading composer, please try again or contact support');
          }
        });
      } else if (Composer.copiedComposer) {
        delete Composer.copiedComposer._id;
        delete Composer.copiedComposer.createdAt;
        delete Composer.copiedComposer.updatedAt;
        delete Composer.copiedComposer.interestedPartyId;
        if (Composer.copiedComposer.name) {
          Composer.copiedComposer.name += ' - Copy';
        }
        if (Composer.copiedComposer.cae) {
          delete Composer.copiedComposer.cae;
        }
        $scope.composer = Composer.copiedComposer;
      }

      $scope.leavingForCopy = false;
      $scope.copy = function () {
        Composer.copiedComposer = $scope.composer;
        $scope.leavingForCopy = true;
        $window.location.href = '#/composers/new';
      };

      this.handleCopiedObjectOnLeavingPage = function () {
        if (!$scope.leavingForCopy) {
          Composer.copiedComposer = false;
          $scope.leavingForCopy = false;
        } else {
          $scope.leavingForCopy = false;
        }
      };

      $('.sidebar-menu-item').removeClass('active');
      $('.sidebar-menu ul li.sidebar-menu-item span.icon-thumbnail').removeClass('bg-success');
      $('.sidebar-menu ul li.sidebar-menu-item ul.sub-menu li.sub-menu-item span.icon-thumbnail').removeClass('white');
      $('.sidebar-menu-item.catalogue').addClass('active');
      $('.sidebar-menu-item.catalogue').find('span.icon-thumbnail:first').addClass('bg-success');
      $('.composer-item').find('span.icon-thumbnail').addClass('white');

      // Tabs
      $scope.activeTab = 'overview';
      $scope.setTab = function (value) {
        $scope.activeTab = value;
      };

      $scope.save = function () {
        Loader.load();
        cleanPopulatedFields($scope.composer);
        if (!$scope.composer._id) {
          Composer.create($scope.composer, (response) => {
            if (response.status === 200) {
              $scope.originalObj = JSON.parse(angular.toJson($scope.composer));
              $window.location.href = `#/composers/${response.data._id}/edit`;
              Loader.success('composer successfully created');
            } else {
              Loader.error('Error creating composer, please try again or contact support');
            }
          }).catch((response) => {
            Loader.error(`The object has not been saved.  ${response.data.message}`);
          });
        } else {
          Composer.update($scope.composer._id, $scope.composer, (response) => {
            if (response.status === 200) {
              $scope.composer = response.data;
              $scope.originalObj = JSON.parse(angular.toJson($scope.composer));
              Loader.success('Composer successfully saved');
            } else {
              Loader.error('Error saving composer, please try again or contact support');
            }
          })
            .catch((response) => {
              Loader.error(`The composer has not been saved.  ${response.data.message}`);
            });
        }
      };
      $scope.delete = function () {
        Loader.load();
        $('#deleteModal').modal('hide');
        $('#deleteModal').on('hidden.bs.modal', () => {
          Composer.delete('single', [$scope.composer._id], (response) => {
            if (response.status === 201) {
              $scope.deletionError = response.data;
              Loader.error('This composer cannot be deleted as it is in use.');
            } else if (response.status === 200) {
              $window.location.href = '#/composers';
              Loader.success('Composer successfully deleted');
            } else {
              Loader.error('Error deleting composer, please try again or contact support');
            }
          });
        });
      };

      $scope.agreementTypes = ['Original General', 'Original Specific'];

      $scope.addTerritorySocietyIdentifier = function () {
        $scope.composer.societies.push({});
      };
      $scope.deleteTerritorySocietyIdentifier = function (identifier) {
        const index = $scope.composer.societies.indexOf(identifier);
        $scope.composer.societies.splice(index, 1);
      };

      $scope.addPublisherAgreement = function () {
        $scope.composer.publisherAgreements = $scope.composer.publisherAgreements ? $scope.composer.publisherAgreements : [];
        $scope.composer.publisherAgreements.push({});
      };
      $scope.deletePublisherAgreement = function (agreement) {
        const index = $scope.composer.publisherAgreements.indexOf(agreement);
        $scope.composer.publisherAgreements.splice(index, 1);
      };

      $scope.$on('$locationChangeStart', checkForUnsavedChanges);
      window.onbeforeunload = checkForUnsavedChanges;

      function checkForUnsavedChanges(event) {
        // Find any blank fields
        clearBlankFields();
        cleanPopulatedFields($scope.composer);
        cleanPopulatedFields($scope.originalObj);
        const current = JSON.parse(angular.toJson($scope.composer));
        delete current.tracks;
        // sort territories to match differently ordered lists of the same territories
        if (Array.isArray(current.territories)) { current.territories = current.territories.sort(); }
        if (Array.isArray($scope.originalObj.territories)) { $scope.originalObj.territories = $scope.originalObj.territories.sort(); }

        // Ignore territories difference if we have greater than the CISAC approved list (can be removed when we've removed all invalid territories from the db)
        if ($scope.originalObj.territories.length > CwrTerritories.COUNT) $scope.originalObj.territories = current.territories;

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
            $scope.composer = $scope.originalObj;
            controller.handleCopiedObjectOnLeavingPage();
          }
        } else {
          controller.handleCopiedObjectOnLeavingPage();
        }
      }

      function clearBlankFields() {
        // Filter out any blank objects from the following arrays.
        if (Array.isArray($scope.composer.linkedContracts)) {
          $scope.composer.linkedContracts = $scope.composer.linkedContracts.filter((linkedContract) => linkedContract.contractId);
        }

        if (Array.isArray($scope.composer.societies)) {
          $scope.composer.societies = $scope.composer.societies.filter((society) => society.society || society.identifier || society.mechanicalPro || society.performancePro || society.syncPro);
        }

        if (Array.isArray($scope.composer.publisherAgreements)) {
          $scope.composer.publisherAgreements = $scope.composer.publisherAgreements
            .filter((publisherAgreement) => publisherAgreement.publisherId || publisherAgreement.agreementType || publisherAgreement.territory || publisherAgreement.society || publisherAgreement.agreementNo);
        }
      }

      Settings.getContracts().then((response) => {
        $scope.contracts = response.contracts;
      });
      $scope.addContract = function () {
        $scope.composer.linkedContracts = $scope.composer.linkedContracts ? $scope.composer.linkedContracts : [];
        $scope.composer.linkedContracts.push({});
      };
      $scope.deleteContract = function (agreement) {
        const index = $scope.composer.linkedContracts.indexOf(agreement);
        $scope.composer.linkedContracts.splice(index, 1);
      };

      $scope.setPublisherId = function (item) {
        $scope.composer.publisherId = item._id;
      };

      $scope.modelHistory = function () {
        Loader.load();
        if ($scope.composer._id) {
          Composer.modelHistory($scope.composer._id, (response) => {
            if (response.status === 200) {
              $scope.composer.modelHistory = response.data.modelHistory;
              $scope.originalObj = JSON.parse(angular.toJson($scope.composer));
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

      // Clean the work from populated fields
      function cleanPopulatedFields(object) {
        if (object.publisherAgreements && object.publisherAgreements.length) {
          object.publisherAgreements.forEach((agreement) => {
            delete agreement.publisher;
          });
        }

        if (object.linkedContracts && object.linkedContracts.length) {
          object.linkedContracts.forEach((contract) => {
            delete contract.contract;
          });
        }
      }
    },
  ]);
