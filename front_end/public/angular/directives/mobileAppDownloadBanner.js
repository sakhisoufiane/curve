angular.module('Curve')
  .directive('mobileAppDownloadBanner', ['$compile', '$document', '$window', 'Session', ($compile, $document, $window, Session) => ({
    restrict: 'E',
    scope: {},
    link($scope) {
      const LOCAL_STORAGE_KEY = 'isMobileDownloadAppBannerVisible';
      $scope.isMobile = function () {
        const { userAgent } = $window.navigator;
        return /android|iphone/i.test(userAgent);
      };
      $scope.isMobileDownloadAppBannerVisible = $scope.isMobile() && Session.userType === 'payee' && !localStorage.getItem(LOCAL_STORAGE_KEY);

      $scope.$watch('isMobileDownloadAppBannerVisible', (visible) => {
        if (visible) $window.Beacon('destroy');
      });

      $scope.hideMobileDownloadAppBanner = function () {
        $scope.isMobileDownloadAppBannerVisible = false;
        localStorage.setItem(LOCAL_STORAGE_KEY, false);
        initHelpscout();
      };

      const template = `
        <div
        id="mobile-app-download"
        style="
            width: 330px;
            height: 120px;
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            padding: 12px;
            border: black 1px solid;
            border-radius: 16px;
            background-color: white;
            z-index: 999;
        "
        ng-if="isMobileDownloadAppBannerVisible"
        >
        <div style="flex: 1; display: flex; flex-direction: row;">
            <div style="width: 38px; height: 38px;">
            <img
                src="../../../assets/img/mobile/Curve_Badge.svg"
                alt="Curve Mobile App"
                height="100%"
                />
            </div>
            <div style="padding-left: 12px; padding-bottom: 10px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                <h6 style="margin: 0; font-weight: 700; font-size: 20px;">Get the Curve App</h6>
                <span style="font-size: 11px; font-weight: 400; line-height: 10px; color: black">For a better mobile experience</span>
            </div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: row; justify-content: space-between; align-items: flex-end;">
            <div style="width: 136px; height: 40px;">
            <a
                href="https://apps.apple.com/gb/app/curve-royalties/id1673549335"
                class="ios-only"
                target="_blank"
                rel="noopener"
            >
                <img
                src="../../../assets/img/mobile/App_Store_Badge.svg"
                alt="Download on the App Store"
                height="100%"
                />
            </a>
            </div>
            <div style="width: 136px; height: 40px; text-align: end;">
            <a
                href="https://play.google.com/store/apps/details?id=com.curveroyalties.curvemobile"
                class="android-only"
                target="_blank"
                rel="noopener"
            >
                <img
                src="../../../assets/img/mobile/Google_Play_Badge.svg"
                alt="Download on Google Play"
                height="100%"
                />
            </a>
            </div>
        </div>
        <div style="position: absolute; top: 2px; right: 2px; text-align: center;">
            <div style="width: 24px; height: 24px;" ng-click="hideMobileDownloadAppBanner()"><i class="fa fa-times" style="font-size: 24px;"></i></div>
        </div>
        </div>
      `;

      const compiled = $compile(template)($scope);
      $document.find('body').append(compiled);

      function initHelpscout() {
        const publisherBeacon = '49311711-30a9-4d44-b105-8182cdc55479';
        const labelBeacon = '18540986-b11e-42b0-aeee-c395003847c7';
        const artistBeacon = '090a922a-0be0-4014-bee5-d588d4045341';
        // Set beacon to load based on user and client type
        if (Session.userType === 'payee') {
          $window.Beacon('init', artistBeacon);
        } else if (Session.clientType === 'Publisher') {
          $window.Beacon('init', publisherBeacon);
        } else {
          $window.Beacon('init', labelBeacon);
        }
        // Set identification
        const identification = {
          email: Session.userEmail,
          company: Session.temporaryClient,
        };
        $window.Beacon('identify', identification);
      }
    },
  })]);
