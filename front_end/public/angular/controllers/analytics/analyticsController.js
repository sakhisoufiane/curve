angular.module('Curve')
  .controller('analyticsController', ['$scope', '$window',
    function ($scope, $window) {
      /*
      ====== Directive : analyticsSuite ==========================================================================

      <analytics-suite analytics-config="analyticsConfig" pre-populate-filters="filters"></analytics-suite>
      <analytics-suite analytics-config="analyticsConfig "pre-populate-filters="filters" pre-populate-comparison-filters="comparisonFilters" ignore-graphs="true"></analytics-suite>

      ignore-graphs : Does as it suggests - no chart functionality will be loaded or run if passed as true

      ====== $scope.prePopulateFilters ===========================================================================

      - Optional
      - pre-populated filter for reports/saved analytics query
      - this should allow us to prepopulate filters for loaded reports and also allows for analytics filter saving
      - directive will preload included catalogue records for filter dropdowns
      - note for testing :  ensure catalogue Ids are relevant to selected client
      - uses 2way binding so changes in the ui filters reflected in the model here
      - If passed, must be a standard filter  - object
        {
          filterblocks: [{
            filterRows: [{}]
          }]
        };

      egs:
      $scope.filters = {
        filterblocks: [{
          filterRows: [{
            key: 'releaseIds',
            values: ['5e9eb1d7bd15d65a78a3275d']
          },{
            key: 'priceCategories',
            values: ['Full Price']
          },{
            key: 'catType',
            values: 'Release'
          }]
        }]
      };

      $scope.filters = {
        filterblocks: [{
          filterRows: [{
            key: 'releaseIds',
            values: ['5e9eb1d7bd15d65a78a3275d']
          },{
            key: 'trackIds',
            values: ['5ce5188c8a81233d21c74d66']
          }]
        },{
          filterRows: [{
            key: 'releaseIds',
            values: ['5ced65ac2e9987765d193c1f']
          }]
        }]
      };

      $scope.comparisonFilters = {
        filterblocks: [{
          filterRows:[{
            key:'releaseIds',
            values:['5ced65ac2e9987765d193c3d']
          }]
        }]
      };

      ====== $scope.analyticsConfig ==============================================================================

      - Optional
      - If passed:
          - must be an object with optional properties
          - Applies base filter to all queries

        * baseFilter: Object {key, value}
          - Optional
          - to force the base filter - must contain key value pair.
          - used for catalogue page analytics tabs
          - properties:
            * key:
              - Required
              - must match one of analyticsSuite > $scope.fieldOptions
              - fieldOptions matching key will be hidden from filter dropdowns
              - if both present, will be merged with hideFieldOptions array
            * value:
              - Required
              - forms the search value for key
            * title:
              - Required
              - title to display on page for base filter
            * includeTracksWithRelease:
              - Required for releases only:
              - include tracks associated with release flag
              - if true then includeTracksWithRelease will be populated on initial load request
              - if false or omitted then will only be present if checked by user

        * hideFieldOptions : [options]
          - Optional
          - options must match one of analyticsSuite > $scope.fieldOptions
          - fieldOptions will be hidden from filter dropdowns
          - if both present, will be merged with baseFilter.key

        * hideChartOptions : [graphs]
          - Optional
          - graphs must match one of analyticsSuite > $scope.graphOptions
          - graphs will be hidden from configure 'graphs options'

        * devShowDebug
          - Optional
          - true: shows debug info in the console and the ui || ommitted or false does not

        * devAutoload
          - Optional
          - true: forces load of data on page load || ommitted or false does not

      e.g:
      $scope.analyticsConfig = {
        baseFilter: {
          key: "releaseIds",
          value: $routeParams.id,
          title: $scope.release.title,
          includeTracksWithRelease: false
        },
        hideFieldOptions: ['trackIds', 'priceCategories'],
        hideChartOptions: ['catalogue'],
        devShowDebug: true,
        devAutoload: true
      };
      */

      $scope.analyticsConfig = {
        devShowDebug: false,
        devAutoload: false,
      };
    },
  ]);
