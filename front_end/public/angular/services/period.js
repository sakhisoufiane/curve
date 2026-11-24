angular.module('Curve')
  .factory('Period', ($http, Session) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    qaReport(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/qa_report` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    platoonExport(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/platoon_output` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    platoonDownload(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/platoon_sap_download` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    batchTasks(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/batch_tasks?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    analytics(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/detail` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    salesFiles(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/sales_files?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    costs(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/costs?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    includeAllSalesFiles(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/include_all_sales_files` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    includeFilteredSalesFiles(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/include_filtered_sales_files?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    includeSelectedSalesFiles(id, salesFileIds, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/include_selected_sales_files?${$.param({ salesFileIds })}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    removeSelectedSalesFiles(id, salesFileIds, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/remove_selected_sales_files?${$.param({ salesFileIds })}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    unincludedSalesFiles(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/unincluded_sales_files?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    includeAllCosts(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/include_all_costs` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    includeFilteredCosts(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/include_filtered_costs?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    includeSelectedCosts(id, costIds, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/include_selected_costs?${$.param({ costIds })}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    removeSelectedCosts(id, costIds, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/remove_selected_costs?${$.param({ costIds })}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    unincludedCosts(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/unincluded_costs?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    resolvedGroups(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/resolved_groups?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    unincludedResolvedGroups(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/unincluded_resolved_groups?${$.param(params)}` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    includeFilteredResolvedGroups(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods/${id}/include_filtered_resolved_groups`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
        .then(callback).catch(callback);
    },
    includeSelectedResolvedGroups(id, resolvedGroupIds, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods/${id}/include_selected_resolved_groups`, data: $.param({ resolvedGroupIds }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
        .then(callback).catch(callback);
    },
    removeSelectedResolvedGroups(id, resolvedGroupIds, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods/${id}/remove_selected_resolved_groups`, data: $.param({ resolvedGroupIds }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
        .then(callback).catch(callback);
    },
    update(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/periods/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/periods/${id}`).then((data) => {
        callback(data);
      }).catch(callback);
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    runCalculation(id, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods/${id}/calculate`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    runCalculationFull(id, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods/${id}/calculateFull`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    runBatchTask(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods/${id}/process_batch_task`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    exportStatementsZip(id, params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods/${id}/statements_zip`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    exportSalesCsv(id, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods/${id}/sales_csv`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    exportCostsCsv(id, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods/${id}/costs_csv`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    publishAllStatements(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/publish_all_statements` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    unpublishAllStatements(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/unpublish_all_statements` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    sendAllStatements(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/send_all_statements` }).then(
        (data) => {
          callback(data);
        },
      ).catch(callback);
    },
    exportStatements(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/statements_export` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    archiveAllSalesFiles(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/archive_all_sales_files` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    archiveFullyReportedSalesFiles(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/archive_fully_reported_sales_files` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    archiveAllCosts(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/archive_all_costs` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    archiveFullyReportedCosts(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/archive_fully_reported_costs` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    exportSales(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/export_sales` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    exportCosts(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/export_costs` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/periods/${id}/history` }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    createStatement(periodId, contractId, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods/${periodId}/create_statement`, data: $.param({ contractId }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    validatePeriodFileGeneration(periodId, type, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods/${periodId}/validate_generate_unreported_file`, data: $.param({ type }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    generateUnreportedFile(periodId, type, excludedSalesFiles, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods/${periodId}/generate_unreported_file`, data: $.param({ type, excludedSalesFiles }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
    publishFugaStatements(periodId, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/periods/${periodId}/publish_fuga_statements`, date: {}, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then((data) => {
        callback(data);
      }).catch(callback);
    },
  }));
