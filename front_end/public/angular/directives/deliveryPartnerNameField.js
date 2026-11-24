angular.module('Curve')
  .directive('deliveryPartnerNameField', (DeliveryPartner, Loader) => ({
    restrict: 'E',
    templateUrl: 'angular/templates/directives/delivery-partner-name-field.html',
    scope: {
      deliveryPartnerId: '=',
      edit: '=',
      index: '=',
      onClick: '=',
    },
    link($scope) {
      $scope.deliveryPartner = null;

      function getDeliveryPartner(deliveryPartnerId) {
        DeliveryPartner.get(deliveryPartnerId, (response) => {
          if (response.status === 200) {
            $scope.deliveryPartner = response.data;
          } else {
            Loader.error('Error loading Delivery Partners, please try again or contact support');
          }
        });
      }

      if ($scope.deliveryPartnerId) {
        getDeliveryPartner($scope.deliveryPartnerId);
      }

      $scope.$watch('deliveryPartnerId', (updatedPartnerId) => {
        if (!updatedPartnerId) return;
        getDeliveryPartner(updatedPartnerId);
      });
    },
  }));
