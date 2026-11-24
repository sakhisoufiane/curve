/* eslint-disable no-else-return */
angular.module('Curve')
  .config(($routeProvider) => {
    $routeProvider.when('/', {
      templateUrl: '/angular/templates/home/index.html',
      controller: 'homeController',
      controllerAs: 'homeCtrl',
    })
      .when('/parents', {
        templateUrl: '/angular/templates/parents/index.html',
        controller: 'parentsController',
        controllerAs: 'parentsCtrl',
      })
      .when('/parents/:id/edit', {
        templateUrl: '/angular/templates/parents/edit.html',
        controller: 'parentEditController',
        controllerAs: 'parentEditCtrl',
      })
      .when('/parents/new', {
        templateUrl: '/angular/templates/parents/edit.html',
        controller: 'parentEditController',
        controllerAs: 'parentEditCtrl',
      })
      .when('/clients', {
        templateUrl: '/angular/templates/clients/index.html',
        controller: 'clientsController',
        controllerAs: 'clientsCtrl',
      })
      .when('/clients/:id/edit', {
        templateUrl: '/angular/templates/clients/edit.html',
        controller: 'clientEditController',
        controllerAs: 'clientEditCtrl',
      })
      .when('/clients/new', {
        templateUrl: '/angular/templates/clients/edit.html',
        controller: 'clientEditController',
        controllerAs: 'clientEditCtrl',
      })
      .when('/companies', {
        templateUrl: '/angular/templates/companies/index.html',
        controller: 'companiesController',
        controllerAs: 'companiesCtrl',
      })
      .when('/companies/:id/edit', {
        templateUrl: '/angular/templates/companies/edit.html',
        controller: 'companyEditController',
        controllerAs: 'companyEditCtrl',
      })
      .when('/companies/new', {
        templateUrl: '/angular/templates/companies/edit.html',
        controller: 'companyEditController',
        controllerAs: 'companyEditCtrl',
      })
      .when('/campaigns', {
        templateUrl: '/angular/templates/campaigns/index.html',
        controller: 'campaignsController',
        controllerAs: 'campaignsCtrl',
      })
      .when('/campaigns/:id/edit', {
        templateUrl: '/angular/templates/campaigns/edit.html',
        controller: 'campaignEditController',
        controllerAs: 'campaignCtrl',
      })
      .when('/campaigns/new', {
        templateUrl: '/angular/templates/campaigns/edit.html',
        controller: 'campaignEditController',
        controllerAs: 'campaignCtrl',
      })
      .when('/releases', {
        templateUrl: '/angular/templates/releases/index.html',
        controller: 'releasesController',
        controllerAs: 'releasesCtrl',
      })
      .when('/releases/:id/edit', {
        templateUrl: '/angular/templates/releases/edit.html',
        controller: 'releaseEditController',
        controllerAs: 'releaseCtrl',
      })
      .when('/releases/new', {
        templateUrl: '/angular/templates/releases/edit.html',
        controller: 'releaseEditController',
        controllerAs: 'releaseCtrl',
      })
      .when('/tracks', {
        templateUrl: '/angular/templates/tracks/index.html',
        controller: 'tracksController',
        controllerAs: 'tracksCtrl',
      })
      .when('/tracks/:id/edit', {
        templateUrl: '/angular/templates/tracks/edit.html',
        controller: 'trackEditController',
        controllerAs: 'trackCtrl',
      })
      .when('/tracks/new', {
        templateUrl: '/angular/templates/tracks/edit.html',
        controller: 'trackEditController',
        controllerAs: 'trackCtrl',
      })
      .when('/works', {
        templateUrl: '/angular/templates/works/index.html',
        controller: 'worksController',
        controllerAs: 'worksCtrl',
      })
      .when('/works/:id/edit', {
        templateUrl: '/angular/templates/works/edit.html',
        controller: 'workEditController',
        controllerAs: 'workCtrl',
      })
      .when('/works/new', {
        templateUrl: '/angular/templates/works/edit.html',
        controller: 'workEditController',
        controllerAs: 'workCtrl',
      })
      .when('/composers', {
        templateUrl: '/angular/templates/composers/index.html',
        controller: 'composersController',
        controllerAs: 'composersCtrl',
      })
      .when('/composers/:id/edit', {
        templateUrl: '/angular/templates/composers/edit.html',
        controller: 'composerEditController',
        controllerAs: 'composerCtrl',
      })
      .when('/composers/new', {
        templateUrl: '/angular/templates/composers/edit.html',
        controller: 'composerEditController',
        controllerAs: 'composerCtrl',
      })
      .when('/publishers', {
        templateUrl: '/angular/templates/publishers/index.html',
        controller: 'publishersController',
        controllerAs: 'publishersCtrl',
      })
      .when('/publishers/:id/edit', {
        templateUrl: '/angular/templates/publishers/edit.html',
        controller: 'publisherEditController',
        controllerAs: 'publisherCtrl',
      })
      .when('/publishers/new', {
        templateUrl: '/angular/templates/publishers/edit.html',
        controller: 'publisherEditController',
        controllerAs: 'publisherCtrl',
      })
      .when('/payees', {
        templateUrl: '/angular/templates/payees/index.html',
        controller: 'payeesController',
        controllerAs: 'payeesCtrl',
      })
      .when('/payees/:id/edit', {
        templateUrl: '/angular/templates/payees/edit.html',
        controller: 'payeeEditController',
        controllerAs: 'payeeCtrl',
      })
      .when('/payees/new', {
        templateUrl: '/angular/templates/payees/edit.html',
        controller: 'payeeEditController',
        controllerAs: 'payeeCtrl',
      })
      .when('/contracts', {
        templateUrl: '/angular/templates/contracts/index.html',
        controller: 'contractsController',
        controllerAs: 'contractsCtrl',
      })
      .when('/contracts/:id/edit', {
        templateUrl: '/angular/templates/contracts/edit.html',
        controller: 'contractEditController',
        controllerAs: 'contractCtrl',
      })
      .when('/contracts/new', {
        templateUrl: '/angular/templates/contracts/edit.html',
        controller: 'contractEditController',
        controllerAs: 'contractCtrl',
      })
      .when('/costs', {
        templateUrl: '/angular/templates/costs/index.html',
        controller: 'costsController',
        controllerAs: 'costsCtrl',
      })
      .when('/costs/:id/edit', {
        templateUrl: '/angular/templates/costs/edit.html',
        controller: 'costEditController',
        controllerAs: 'costCtrl',
      })
      .when('/costs/new', {
        templateUrl: '/angular/templates/costs/edit.html',
        controller: 'costEditController',
        controllerAs: 'costCtrl',
      })
      .when('/mechanicals', {
        templateUrl: '/angular/templates/mechanicals/index.html',
      })
      .when('/mechanical/:id/edit', {
        templateUrl: '/angular/templates/mechanicals/edit.html',
      })
      .when('/sales', {
        templateUrl: '/angular/templates/sales-files/index.html',
        controller: 'salesFileController',
        controllerAs: 'salesFileCtrl',
      })
      .when('/sales/:id/edit', {
        templateUrl: '/angular/templates/sales-files/sales-import.html',
        controller: 'salesImportController',
        controllerAs: 'salesImportCtrl',
      })
      .when('/sales/import', {
        templateUrl: '/angular/templates/sales-files/sales-import.html',
        controller: 'salesImportController',
        controllerAs: 'salesImportCtrl',
      })
      .when('/sales/new', {
        templateUrl: '/angular/templates/sales-files/sales-new.html',
        controller: 'salesFileNewController',
        controllerAs: 'salesFileNewCtrl',
      })
      .when('/sales/new-bulk', {
        templateUrl: '/angular/templates/sales-files/sales-new-bulk.html',
        controller: 'salesFileNewBulkController',
        controllerAs: 'salesFileNewCtrl',
      })
      .when('/sales/:id/ingestion_complete', {
        templateUrl: '/angular/templates/sales-files/sales-ingestion-complete.html',
        controller: 'salesIngestionCompleteController',
        controllerAs: 'ssalesIngestionCompleteCtrl',
      })
      .when('/sales/unmapped', {
        templateUrl: '/angular/templates/sales-files/sales-unmapped.html',
        controller: 'salesUnmappedController',
        controllerAs: 'salesUnmappedCtrl',
      })
      .when('/sales/unmapped', {
        templateUrl: '/angular/templates/sales-files/sales-unmapped-tracks-releases.html',
        controller: 'salesUnmappedTracksReleasesController',
        controllerAs: 'salesUnmappedTracksReleasesCtrl',
      })
      .when('/sales/salesdb', {
        templateUrl: '/angular/templates/sales-files/sales-unmapped.html',
        controller: 'salesUnmappedController',
        controllerAs: 'salesUnmappedCtrl',
      })
      .when('/sales/unmapped_works', {
        templateUrl: '/angular/templates/sales-files/sales-unmapped-works.html',
        controller: 'salesUnmappedWorksController',
        controllerAs: 'salesUnmappedWorksCtrl',
      })
      .when('/sales/groups', {
        templateUrl: '/angular/templates/sales-files/groups/index.html',
        controller: 'salesGroupsController',
        controllerAs: 'salesGroupsCtrl',
      })
      .when('/periods', {
        templateUrl: '/angular/templates/periods/index.html',
        controller: 'periodsController',
        controllerAs: 'periodsCtrl',
      })
      .when('/periods/:id/edit', {
        templateUrl: '/angular/templates/periods/edit.html',
        controller: 'periodEditController',
        controllerAs: 'periodEditCtrl',
      })
      .when('/periods/new', {
        templateUrl: '/angular/templates/periods/edit.html',
        controller: 'periodEditController',
        controllerAs: 'periodEditCtrl',
      })
      .when('/periods/:id/complete', {
        templateUrl: '/angular/templates/periods/period-complete.html',
        controller: 'periodCompleteController',
        controllerAs: 'periodCompleteCtrl',
      })
      .when('/accountingPeriods', {
        templateUrl: '/angular/templates/accountingPeriods/index.html',
        controller: 'accountingPeriodsController',
        controllerAs: 'accountingPeriodsCtrl',
      })
      .when('/accountingPeriods/:id/edit', {
        templateUrl: '/angular/templates/accountingPeriods/edit.html',
        controller: 'accountingPeriodEditController',
        controllerAs: 'accountingPeriodEditCtrl',
      })
      .when('/accountingPeriods/new', {
        templateUrl: '/angular/templates/accountingPeriods/edit.html',
        controller: 'accountingPeriodEditController',
        controllerAs: 'accountingPeriodEditCtrl',
      })
      .when('/accountingPeriods/:id/complete', {
        templateUrl: '/angular/templates/accountingPeriods/accounting-period-complete.html',
        controller: 'accountingPeriodCompleteController',
        controllerAs: 'accountingPeriodCompleteCtrl',
      })
      .when('/statements', {
        templateUrl: '/angular/templates/statements/index.html',
        controller: 'statementsController',
        controllerAs: 'statementsCtrl',
      })
      .when('/statements/:id/edit', {
        templateUrl: '/angular/templates/statements/edit.html',
        controller: 'statementEditController',
        controllerAs: 'statementEditCtrl',
      })
      .when('/statements/:id', {
        templateUrl: '/angular/templates/statements/view.html',
        controller: 'statementViewController',
        controllerAs: 'statementViewCtrl',
      })
      .when('/reports', {
        templateUrl: '/angular/templates/reports/index.html',
        controller: 'reportsController',
        controllerAs: 'reportsCtrl',
      })
      .when('/reports/new', {
        templateUrl: '/angular/templates/reports/edit.html',
        controller: 'reportEditController',
        controllerAs: 'reportEditCtrl',
      })
      .when('/reports/:id/edit', {
        templateUrl: '/angular/templates/reports/edit.html',
        controller: 'reportEditController',
        controllerAs: 'reportEditCtrl',
      })
      .when('/reports/:fixedReportId/fixedReportNew', {
        templateUrl: '/angular/templates/reports/fixedReportExternalEdit.html',
        controller: 'fixedReportExternalEditController',
        controllerAs: 'fixedReportExternalEditCtrl',
      })
      .when('/reports/:id/fixedReportEdit', {
        templateUrl: '/angular/templates/reports/fixedReportExternalEdit.html',
        controller: 'fixedReportExternalEditController',
        controllerAs: 'fixedReportExternalEditCtrl',
      })
      .when('/settings', {
        templateUrl: '/angular/templates/settings/index.html',
        controller: 'settingsController',
        controllerAs: 'settingsCtrl',
      })
      .when('/billing', {
        templateUrl: '/angular/templates/billing/index.html',
        controller: 'billingController',
        controllerAs: 'billingCtrl',
      })
      .when('/curvePay/setup', {
        templateUrl: '/angular/templates/curvePay/setup.html',
        controller: 'curvePaySetupController',
        controllerAs: 'curvePaySetupCtrl',
      })
      .when('/curvePay/balances', {
        templateUrl: '/angular/templates/curvePay/balances.html',
        controller: 'curvePayBalancesController',
        controllerAs: 'curvePayBalancesCtrl',
      })
      .when('/curvePay/conversions', {
        templateUrl: '/angular/templates/curvePay/conversions.html',
        controller: 'curvePayConversionsController',
        controllerAs: 'curvePayConversionsCtrl',
      })
      .when('/ftpIntegration', {
        templateUrl: '/angular/templates/ftpIntegration/index.html',
        controller: 'ftpIntegrationController',
        controllerAs: 'ftpIntegrationCtrl',
      })
      .when('/mcps', {
        templateUrl: '/angular/templates/mcps/index.html',
        controller: 'mcpsController',
        controllerAs: 'mcpsCtrl',
      })
      .when('/territoryGroups', {
        templateUrl: '/angular/templates/territoryGroups/index.html',
        controller: 'territoryGroupsController',
        controllerAs: 'territoryGroupsCtrl',
      })
      .when('/territoryGroups/new', {
        templateUrl: '/angular/templates/territoryGroups/edit.html',
        controller: 'territoryGroupEditController',
        controllerAs: 'territoryGroupsCtrl',
      })
      .when('/territoryGroups/:id/edit', {
        templateUrl: '/angular/templates/territoryGroups/edit.html',
        controller: 'territoryGroupEditController',
        controllerAs: 'territoryGroupsCtrl',
      })
      .when('/contractTermGroups', {
        templateUrl: '/angular/templates/contractTermGroups/index.html',
        controller: 'contractTermGroupsController',
        controllerAs: 'contractTermGroupsCtrl',
      })
      .when('/contractTermGroups/new', {
        templateUrl: '/angular/templates/contractTermGroups/edit.html',
        controller: 'contractTermGroupEditController',
        controllerAs: 'contractTermGroupsCtrl',
      })
      .when('/contractTermGroups/:id/edit', {
        templateUrl: '/angular/templates/contractTermGroups/edit.html',
        controller: 'contractTermGroupEditController',
        controllerAs: 'contractTermGroupsCtrl',
      })
      .when('/users', {
        templateUrl: '/angular/templates/users/index.html',
        controller: 'usersController',
        controllerAs: 'usersCtrl',
      })
      .when('/users/new', {
        templateUrl: '/angular/templates/users/edit.html',
        controller: 'userEditController',
        controllerAs: 'usersCtrl',
      })
      .when('/users/:id/edit', {
        templateUrl: '/angular/templates/users/edit.html',
        controller: 'userEditController',
        controllerAs: 'usersCtrl',
      })
      .when('/imports', {
        templateUrl({ transferringSystem }) {
          if (!transferringSystem) return '/angular/templates/imports/index.html';
          else if (transferringSystem === 'Catalogue Shipment') transferringSystem = 'catalogue-shipment';
          else if (transferringSystem === 'cwr') return '/angular/templates/imports/CWR/index.html';
          return `/angular/templates/imports/${transferringSystem}/index.html`;
        },
        controller: 'importsController',
        controllerAs: 'importsCtrl',
      })
      .when('/imports/new', {
        templateUrl({ transferringSystem }) {
          if (!transferringSystem) return '/angular/templates/imports/edit.html';
          else if (transferringSystem === 'Catalogue Shipment') transferringSystem = 'catalogue-shipment';
          else if (transferringSystem === 'cwr') return '/angular/templates/imports/CWR/edit.html';
          return `/angular/templates/imports/${transferringSystem}/edit.html`;
        },
        controller: 'importEditController',
        controllerAs: 'importsCtrl',
      })
      .when('/imports/:id/edit', {
        templateUrl({ transferringSystem }) {
          if (!transferringSystem) return '/angular/templates/imports/edit.html';
          else if (transferringSystem === 'Catalogue Shipment') transferringSystem = 'catalogue-shipment';
          else if (transferringSystem === 'cwr') return '/angular/templates/imports/CWR/edit.html';
          return `/angular/templates/imports/${transferringSystem}/edit.html`;
        },
        controller: 'importEditController',
        controllerAs: 'importsCtrl',
      })
      .when('/importPartners/new', {
        templateUrl: '/angular/templates/importPartners/edit.html',
        controller: 'importPartnersEditController',
        controllerAs: 'importPartnersEditCtrl',
      })
      .when('/importPartners/:id/edit', {
        templateUrl: '/angular/templates/importPartners/edit.html',
        controller: 'importPartnersEditController',
        controllerAs: 'importPartnersEditCtrl',
      })
      .when('/templates', {
        templateUrl: '/angular/templates/sales-templates/index.html',
        controller: 'salesTemplatesController',
        controllerAs: 'salesTemplatesCtrl',
      })
      .when('/templates/:id/edit', {
        templateUrl: '/angular/templates/sales-templates/edit.html',
        controller: 'salesTemplateEditController',
        controllerAs: 'salesTemplateCtrl',
      })
      .when('/templates/new', {
        templateUrl: '/angular/templates/sales-templates/edit.html',
        controller: 'salesTemplateEditController',
        controllerAs: 'salesTemplateCtrl',
      })
      .when('/libraryTemplates', {
        templateUrl: '/angular/templates/library-templates/index.html',
        controller: 'libraryTemplatesController',
        controllerAs: 'libraryTemplatesCtrl',
      })
      .when('/libraryTemplates/:id/edit', {
        templateUrl: '/angular/templates/library-templates/edit.html',
        controller: 'libraryTemplateEditController',
        controllerAs: 'libraryTemplateCtrl',
      })
      .when('/libraryTemplates/new', {
        templateUrl: '/angular/templates/library-templates/edit.html',
        controller: 'libraryTemplateEditController',
        controllerAs: 'libraryTemplateCtrl',
      })
      .when('/fixedReports', {
        templateUrl: '/angular/templates/fixedReports/index.html',
        controller: 'fixedReportsController',
        controllerAs: 'fixedReportsCtrl',
      })
      .when('/fixedReports/:id/edit', {
        templateUrl: '/angular/templates/fixedReports/edit.html',
        controller: 'fixedReportsEditController',
        controllerAs: 'fixedReportsEditCtrl',
      })
      .when('/transactions', {
        templateUrl: '/angular/templates/transactions/index.html',
        controller: 'transactionsController',
        controllerAs: 'transactionsCtrl',
      })
      .when('/transactions/new', {
        templateUrl: '/angular/templates/transactions/edit.html',
        controller: 'transactionEditController',
        controllerAs: 'transactionCtrl',
      })
      .when('/transactions/:id/edit', {
        templateUrl: '/angular/templates/transactions/edit.html',
        controller: 'transactionEditController',
        controllerAs: 'transactionCtrl',
      })
      .when('/deliveries', {
        templateUrl: '/angular/templates/deliveries/index.html',
        controller: 'deliveriesController',
        controllerAs: 'deliveriesCtrl',
      })
      .when('/deliveries/new', {
        templateUrl: '/angular/templates/deliveries/edit.html',
        controller: 'deliveryEditController',
        controllerAs: 'deliveryCtrl',
      })
      .when('/deliveries/:id/edit', {
        templateUrl: '/angular/templates/deliveries/edit.html',
        controller: 'deliveryEditController',
        controllerAs: 'deliveryCtrl',
      })
      .when('/iswcDeliveries', {
        templateUrl: '/angular/templates/iswcDeliveries/index.html',
        controller: 'iswcDeliveriesController',
        controllerAs: 'iswcDeliveriesCtrl',
      })
      .when('/iswcDeliveries/new', {
        templateUrl: '/angular/templates/iswcDeliveries/edit.html',
        controller: 'iswcDeliveryEditController',
        controllerAs: 'iswcDeliveryCtrl',
      })
      .when('/iswcDeliveries/:id/edit', {
        templateUrl: '/angular/templates/iswcDeliveries/edit.html',
        controller: 'iswcDeliveryEditController',
        controllerAs: 'iswcDeliveryCtrl',
      })
      .when('/iswcAcknowledgements/new', {
        templateUrl: '/angular/templates/iswcAcknowledgements/edit.html',
        controller: 'iswcAcknowledgementEditController',
        controllerAs: 'iswcAcknowledgementCtrl',
      })
      .when('/iswcAcknowledgements/:id/edit', {
        templateUrl: '/angular/templates/iswcAcknowledgements/edit.html',
        controller: 'iswcAcknowledgementEditController',
        controllerAs: 'iswcAcknowledgementCtrl',
      })
      .when('/deliverySchedules/new', {
        templateUrl: '/angular/templates/deliverySchedules/edit.html',
        controller: 'deliveryScheduleEditController',
        controllerAs: 'deliveryScheduleCtrl',
      })
      .when('/deliverySchedules/:id/edit', {
        templateUrl: '/angular/templates/deliverySchedules/edit.html',
        controller: 'deliveryScheduleEditController',
        controllerAs: 'deliveryScheduleCtrl',
      })
      .when('/cwrAcknowledgements', {
        templateUrl: '/angular/templates/cwrAcknowledgements/index.html',
        controller: 'cwrAcknowledgementsController',
        controllerAs: 'cwrAcknowledgementsCtrl',
      })
      .when('/cwrAcknowledgements/new', {
        templateUrl: '/angular/templates/cwrAcknowledgements/edit.html',
        controller: 'CwrAcknowledgementEditController',
        controllerAs: 'cwrAcknowledgementCtrl',
      })
      .when('/cwrAcknowledgements/new-bulk', {
        templateUrl: '/angular/templates/cwrAcknowledgements/new-bulk.html',
        controller: 'CwrAcknowledgementsNewBulkController',
        controllerAs: 'cwrAcknowledgementsNewBulkCtrl',
      })
      .when('/cwrAcknowledgements/:id/edit', {
        templateUrl: '/angular/templates/cwrAcknowledgements/edit.html',
        controller: 'CwrAcknowledgementEditController',
        controllerAs: 'cwrAcknowledgementCtrl',
      })
      .when('/deliverySettings', {
        templateUrl: '/angular/templates/deliverySettings/index.html',
        controller: 'deliverySettingsController',
        controllerAs: 'deliverySettingsControllerCtrl',
      })
      .when('/deliverySettings/deliveryPartners/new', {
        templateUrl: '/angular/templates/deliveryPartners/edit.html',
        controller: 'deliveryPartnerEditController',
        controllerAs: 'deliveryPartnerCtrl',
      })
      .when('/deliverySettings/deliveryPartners/:id/edit', {
        templateUrl: '/angular/templates/deliveryPartners/edit.html',
        controller: 'deliveryPartnerEditController',
        controllerAs: 'deliveryPartnerCtrl',
      })
      .when('/deliverySettings/deliveryProfiles/new', {
        templateUrl: '/angular/templates/deliveryProfiles/edit.html',
        controller: 'deliveryProfileEditController',
        controllerAs: 'deliveryProfilesCtrl',
      })
      .when('/deliverySettings/deliveryProfiles/:id/edit', {
        templateUrl: '/angular/templates/deliveryProfiles/edit.html',
        controller: 'deliveryProfileEditController',
        controllerAs: 'deliveryProfilesCtrl',
      })
      .when('/mcpsRetentions/new', {
        templateUrl: '/angular/templates/mcpsRetentions/edit.html',
        controller: 'mcpsRetentionEditController',
        controllerAs: 'mcpsRetentionCtrl',
      })
      .when('/mcpsRetentions/:id/edit', {
        templateUrl: '/angular/templates/mcpsRetentions/edit.html',
        controller: 'mcpsRetentionEditController',
        controllerAs: 'mcpsRetentionCtrl',
      })
      .when('/mcpsNegatives/new', {
        templateUrl: '/angular/templates/mcpsNegatives/edit.html',
        controller: 'mcpsNegativeEditController',
        controllerAs: 'mcpsNegativeCtrl',
      })
      .when('/mcpsNegatives/:id/edit', {
        templateUrl: '/angular/templates/mcpsNegatives/edit.html',
        controller: 'mcpsNegativeEditController',
        controllerAs: 'mcpsNegativeCtrl',
      })
      .when('/monitoring', {
        templateUrl: '/angular/templates/monitoring/index.html',
        controller: 'monitoringController',
        controllerAs: 'monitoringCtrl',
      })
      .when('/monitoring/tools', {
        templateUrl: '/angular/templates/monitoring/monitoring-tools.html',
        controller: 'monitoringTools',
        controllerAs: 'monitoringToolsCtrl',
      })
      .when('/monitoring/analytics', {
        templateUrl: '/angular/templates/monitoring/analytics.html',
        controller: 'supportAnalytics',
        controllerAs: 'supportAnalyticsCtrl',
      })
      .when('/analytics', {
        templateUrl: '/angular/templates/analytics/index.html',
        controller: 'analyticsController',
        controllerAs: 'analyticsCtrl',
      })
      .when('/paymentGroups', {
        templateUrl: '/angular/templates/paymentGroups/index.html',
        controller: 'paymentGroupsController',
        controllerAs: 'paymentGroupsCtrl',
      })
      .when('/paymentGroups/:id/edit', {
        templateUrl: '/angular/templates/paymentGroups/edit.html',
        controller: 'paymentGroupEditController',
        controllerAs: 'paymentGroupCtrl',
      })
      .when('/paymentGroups/new', {
        templateUrl: '/angular/templates/paymentGroups/edit.html',
        controller: 'paymentGroupEditController',
        controllerAs: 'paymentGroupCtrl',
      })
      .when('/payments/new', {
        templateUrl: '/angular/templates/payment/edit.html',
        controller: 'paymentEditController',
        controllerAs: 'paymentCtrl',
      })
      .when('/payments/:id/edit', {
        templateUrl: '/angular/templates/payment/edit.html',
        controller: 'paymentEditController',
        controllerAs: 'paymentCtrl',
      })
      .when('/paymentDetails', {
        templateUrl: '/angular/templates/paymentDetails/index.html',
        controller: 'paymentDetailsController',
        controllerAs: 'paymentDetailsCtrl',
      })
      .when('/catalogue/manage', {
        templateUrl: '/angular/templates/catalogue/index.html',
        controller: 'catalogueController',
        controllerAs: 'catalogueCtrl',
        params: { type: 'composer' },
      })
      .when('/catalogue/manage/merge', {
        templateUrl: '/angular/templates/catalogue/merge.html',
        controller: 'catalogueMergeController',
        controllerAs: 'catalogueMergeCtrl',
      })
      .when('/api-docs', {
        template: '<swagger-host></swagger-host>',
      })
      .otherwise({ redirectTo: '/' });
  });
