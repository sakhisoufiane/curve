angular.module('Curve')
  .factory('Session', ($http) => {
    let lockedForNonPayment = false;
    return {
      isLoggedIn: false,
      token: null,
      userType: null,
      internal: false,
      parent: false,
      formats: [],
      priceCategories: [],
      contracts: [],
      currency: '',
      currencySymbol: '',
      clientType: null,
      apiUrl: null,
      getlockedForNonPayment() {
        return lockedForNonPayment;
      },
      setLockedForPayment(locked) {
        lockedForNonPayment = locked;
      },
    };
  });
