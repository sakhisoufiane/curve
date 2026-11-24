angular.module('Curve')
  .factory('Settings', (Session, User, Client, $q, Notification, Period, Contract, Payee, Company, Report, Release, Track, Work, Composer, Publisher, SalesTemplate, SalesFile, Cost, Statement, DeliveryPartner) => ({
    distributionChannels: [],
    configurations: [],
    priceCategories: [],
    costTypes: [],
    catalogueGroups: [],
    releases: [],
    tracks: [],
    works: [],
    composers: [],
    publishers: [],
    deliveryPartners: [],
    accountingPeriodTypes: [],
    accountingSystem: null,
    payeeCategories: [],
    contractCategories: [],
    clientCurrencies: [],
    // DMP SPECIFIC CHANGE
    isDMP: false,
    getSettings() {
      const settings = this;
      return $q((resolve, reject) => {
        if (Session.id && (Session.userType === 'client' || Session.payeeId)) {
          run();
        } else {
          setTimeout(run, 2000);
        }
        function run() {
          User.get(Session.id, (response) => {
            if (response.status === 200) {
              settings.user = response.data;
              if ((settings.user.clientId || Session.clientId) && Session.userType !== 'payee') {
                const clientId = Session.clientId ? Session.clientId : settings.user.clientId;
                Client.get(clientId, (response) => {
                  if (response.status === 200) {
                    settings.distributionChannels = response.data.distributionChannels;
                    settings.distributionChannels.unshift('All');
                    settings.configurations = response.data.configurations;
                    settings.configurations.unshift('All');
                    settings.priceCategories = response.data.priceCategories;
                    settings.priceCategories.unshift('All');
                    settings.sources = response.data.sources;
                    settings.sources.unshift('All');
                    settings.costTypes = response.data.costTypes;
                    settings.catalogueGroups = response.data.catalogueGroups;
                    settings.catalogueGroups.unshift('All');
                    settings.accountingPeriodTypes = response.data.accountingPeriodTypes;
                    settings.accountingSystem = response.data.accountingSystem;
                    settings.payeeCategories = response.data.payeeCategories;
                    settings.contractCategories = response.data.contractCategories;
                    settings.defaultMechanicalBasis = response.data.defaultMechanicalBasis;
                    // DMP SPECIFIC CHANGE
                    settings.isDMP = !!response.data.features?.dmp;
                    settings.defaultReportMechanicals = response.data.defaultReportMechanicals;
                    resolve({
                      distributionChannels: settings.distributionChannels,
                      configurations: settings.configurations,
                      priceCategories: settings.priceCategories,
                      costTypes: settings.costTypes,
                      sources: settings.sources,
                      catalogueGroups: settings.catalogueGroups,
                      accountingPeriodTypes: settings.accountingPeriodTypes,
                      accountingSystem: settings.accountingSystem,
                      payeeCategories: settings.payeeCategories,
                      contractCategories: settings.contractCategories,
                      defaultMechanicalBasis: settings.defaultMechanicalBasis,
                      isDMP: settings.isDMP,
                      defaultReportMechanicals: settings.defaultReportMechanicals,
                    });
                  } else {
                    Notification.error('Error loading client, please try again or contact support');
                    reject('Error loading client, please try again or contact support');
                  }
                });
              } else if (settings.user.payeeId) {
                Payee.get(settings.user.payeeId, (response) => {
                  if (response.status === 200) {
                    settings.distributionChannels = response.data.distributionChannels;
                    settings.distributionChannels.unshift('All');
                    settings.configurations = response.data.configurations;
                    settings.configurations.unshift('All');
                    settings.priceCategories = response.data.priceCategories;
                    settings.priceCategories.unshift('All');
                    settings.sources = response.data.sources;
                    settings.sources.unshift('All');
                    settings.costTypes = response.data.costTypes;
                    settings.costTypes.unshift('All');
                    settings.catalogueGroups = response.data.catalogueGroups;
                    settings.catalogueGroups.unshift('All');
                    settings.accountingPeriodTypes = response.data.accountingPeriodTypes;
                    settings.payeeCategories = response.data.payeeCategories;
                    settings.contractCategories = response.data.contractCategories;
                    resolve({
                      distributionChannels: settings.distributionChannels,
                      configurations: settings.configurations,
                      priceCategories: settings.priceCategories,
                      costTypes: settings.costTypes,
                      sources: settings.sources,
                      catalogueGroups: settings.catalogueGroups,
                      accountingPeriodTypes: settings.accountingPeriodTypes,
                      payeeCategories: settings.payeeCategories,
                      contractCategories: settings.contractCategories,
                    });
                  } else {
                    Notification.error('Error loading client, please try again or contact support');
                    reject('Error loading client, please try again or contact support');
                  }
                });
              }
            } else {
              Notification.error('Error loading user, please try again or contact support');
              reject('Error loading client, please try again or contact support');
            }
          });
        }
      });
    },
    getContracts(contracts) {
      contracts = [];
      return $q((resolve, reject) => {
        Contract.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            contracts = response.data;
            resolve(contracts);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
    getMechanicalContracts(contracts) {
      contracts = [];
      return $q((resolve, reject) => {
        Contract.all({ limit: 10000, contractType: 'Mechanical' }, (response) => {
          if (response.status === 200) {
            contracts = response.data;
            resolve(contracts);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
    getPeriods(periods) {
      periods = [];
      return $q((resolve, reject) => {
        Period.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            periods = response.data;
            resolve(periods);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
    getPayees(payees) {
      payees = [];
      return $q((resolve, reject) => {
        Payee.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            ({ payees } = response.data);
            resolve(payees);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
    getCompanies() {
      let companies = [];
      return $q((resolve, reject) => {
        Company.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            ({ companies } = response.data);
            resolve(companies);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
    getReports(reports) {
      return $q((resolve, reject) => {
        Report.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            ({ reports } = response.data);
            resolve(reports);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
    getReleases(releases) {
      const settings = this;
      return $q((resolve, reject) => {
        if (settings.releases.length === 0) {
          Release.all({ limit: 10000 }, (response) => {
            if (response.status === 200) {
              settings.releases = response.data;
              resolve(settings.releases);
            } else {
              Notification.error(response.data.message);
            }
          });
        } else {
          resolve(settings.releases);
        }
      });
    },
    getTracks(tracks) {
      const settings = this;
      return $q((resolve, reject) => {
        if (settings.tracks.length === 0) {
          Track.all({ limit: 10000 }, (response) => {
            if (response.status === 200) {
              settings.tracks = response.data;
              resolve(settings.tracks);
            } else {
              Notification.error(response.data.message);
            }
          });
        } else {
          resolve(settings.tracks);
        }
      });
    },
    getWorks(works) {
      const settings = this;
      return $q((resolve, reject) => {
        if (settings.works.length === 0) {
          Work.all({ limit: 10000 }, (response) => {
            if (response.status === 200) {
              settings.works = response.data;
              resolve(settings.works);
            } else {
              Notification.error(response.data.message);
            }
          });
        } else {
          resolve(settings.works);
        }
      });
    },
    getComposers(composers) {
      const settings = this;
      return $q((resolve, reject) => {
        Composer.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            settings.composers = response.data;
            resolve(settings.composers);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
    getPublishers(publishers) {
      const settings = this;
      return $q((resolve, reject) => {
        Publisher.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            settings.publishers = response.data;
            resolve(settings.publishers);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
    getTemplates(templates) {
      templates = [];
      return $q((resolve, reject) => {
        SalesTemplate.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            templates = response.data.salesTemplates;
            resolve(templates);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
    getActiveTemplates(templates) {
      templates = [];
      return $q((resolve, reject) => {
        SalesTemplate.all({ archived: false, limit: 10000 }, (response) => {
          if (response.status === 200) {
            templates = response.data.salesTemplates;
            resolve(templates);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
    getSalesFiles(salesFiles) {
      salesFiles = [];
      return $q((resolve, reject) => {
        SalesFile.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            ({ salesFiles } = response.data);
            resolve(salesFiles);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
    getCosts(costs) {
      costs = [];
      return $q((resolve, reject) => {
        Cost.all({ limit: 1000 }, (response) => {
          if (response.status === 200) {
            ({ costs } = response.data);
            resolve(costs);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
    getStatements(statements) {
      statements = [];
      return $q((resolve, reject) => {
        Statement.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            ({ statements } = response.data);
            resolve(statements);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
    getDeliveryPartners() {
      let deliveryPartners = [];
      return $q((resolve, reject) => {
        DeliveryPartner.all({ limit: 10000 }, (response) => {
          if (response.status === 200) {
            ({ deliveryPartners } = response.data);
            resolve(deliveryPartners);
          } else {
            Notification.error(response.data.message);
          }
        });
      });
    },
  }));
