angular.module('Curve')
  .factory('Client', ($http, Session, Upload) => ({
    all(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients?${$.param(params)}` }).then((data) => {
        callback(data);
      });
    },
    get(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/${id}` }).then((data) => {
        callback(data);
      });
    },
    getBilling(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/${id}?clientBilling=true` }).then((data) => {
        callback(data);
      });
    },
    getPeriods(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/${id}/periods` }).then((data) => {
        callback(data);
      });
    },
    getStripeSetupIntent(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/stripe_setup_intent` }).then((data) => {
        callback(data);
      });
    },
    getPaymentMethod(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/payment_method` }).then((data) => {
        callback(data);
      });
    },
    charge(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/charge` }).then((data) => {
        callback(data);
      });
    },
    getUsage(id, currency, callback) {
      let endpoint = `/clients/${id}/usage`;
      if (currency) { endpoint += `?currency=${currency}`; }
      return $http({ method: 'GET', url: Session.apiUrl + endpoint }).then((data) => {
        callback(data);
      });
    },
    setPaymentMethod(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/clients/stripe_update_payment_method`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    getSummary(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/${id}/summary` }).then((data) => {
        callback(data);
      });
    },
    update(id, params, callback) {
      const data = {
        ...params,
        // Encode Custom HTML Text
        inviteEmailCustomText: params.inviteEmailCustomText ? btoa(encodeURIComponent(params.inviteEmailCustomText)) : params.inviteEmailCustomText,
        statementEmailCustomText: params.statementEmailCustomText ? btoa(encodeURIComponent(params.statementEmailCustomText)) : params.statementEmailCustomText,
      };
      return $http({ method: 'PUT', url: `${Session.apiUrl}/clients/${id}`, data, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      })
        .catch((response) => {
          callback(response);
        });
    },
    updateFugaSettings(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/clients/settingsFuga/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      })
        .catch((response) => {
          callback(response);
        });
    },
    updateIswcFtpSettings(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/clients/settingsIswcFtp/${id}`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      })
        .catch((response) => {
          callback(response);
        });
    },
    verifyFtp(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/clients/verifyFtp`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      })
        .catch((response) => {
          callback(response);
        });
    },
    updateBilling(id, params, callback) {
      return $http({ method: 'PUT', url: `${Session.apiUrl}/clients/${id}?clientBilling=true`, data: params, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      })
        .catch((response) => {
          callback(response);
        });
    },
    delete(id, callback) {
      return $http.delete(`${Session.apiUrl}/clients/${id}`).then((data) => {
        callback(data);
      });
    },
    create(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/clients`, data: $.param(params), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
        .then(callback)
        .catch(callback);
    },
    export(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/clients/export`, data: params, headers: { 'Content-Type': 'application/json' } }).then(
        (data) => {
          callback(data);
        },
        // handle errors
        (error) => {
          callback(error);
        },
      );
    },
    modelHistory(id, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/${id}/history` }).then((data) => {
        callback(data);
      });
    },
    acceptLegalTerms(callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/clients/accept_legal_terms` }).then((data) => {
        callback(data);
      });
    },
    chargeClients(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/processes/charge-clients` }).then((data) => {
        callback(data);
      });
    },
    checkExpiringTrials(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/processes/check-expiring-trials` }).then((data) => {
        callback(data);
      });
    },
    notifyAboutClientBeingDeleted(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/processes/notify-about-client-deleted` }).then((data) => {
        callback(data);
      });
    },
    deleteClients(callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/processes/delete-clients` }).then((data) => {
        callback(data);
      });
    },
    getWiseProfiles(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/${id}/wise_profiles?${$.param(params)}` })
        .then(callback)
        .catch(callback);
    },
    getWisePaymentRequirements(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/${id}/wise_payment_requirements?${$.param(params)}` })
        .then(callback)
        .catch(callback);
    },
    getWiseListOfRecipients(id, params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/${id}/wise_list_recipients?${$.param(params)}` })
        .then(callback)
        .catch(callback);
    },
    fugaSyncCatalogue(clientId, userEmail, callback) {
      return $http({
        method: 'GET',
        url: `${Session.apiUrl}/clients/${clientId}/sync_fuga_catalogue`,
        params: { userEmail },
      }).then((data) => {
        callback(data);
      }).catch((err) => {
        callback(err);
      });
    },
    downloadTemplate(params, callback) {
      return $http({ method: 'GET', url: `${Session.apiUrl}/clients/download_template?${$.param(params)}`, responseType: 'blob' })
        .then(callback)
        .catch(callback);
    },
    importConfigSettings(params, callback) {
      return $http({ method: 'POST', url: `${Session.apiUrl}/clients/import_config_settings`, data: params, headers: { 'Content-Type': 'application/json' } })
        .then(callback)
        .catch(callback);
    },
    upload(clientId, index, file, callback) {
      Upload.upload({ url: `${Session.apiUrl}/clients/${clientId}/ftp_key_file?ackFtpIngestionIndex=${index}`, data: { file } }).then((response) => {
        callback(response);
      });
    },
    deleteUpload(clientId, index, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/clients/${clientId}/ftp_key_file?ackFtpIngestionIndex=${index}`, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
    uploadCatalogueKeyFile(clientId, file, callback) {
      Upload.upload({ url: `${Session.apiUrl}/clients/${clientId}/ftp_key_file`, data: { file } }).then((response) => {
        callback(response);
      });
    },
    deleteCatalogueKeyFile(clientId, callback) {
      return $http({ method: 'DELETE', url: `${Session.apiUrl}/clients/${clientId}/ftp_key_file`, headers: { 'Content-Type': 'application/json' } }).then((data) => {
        callback(data);
      });
    },
  }));
