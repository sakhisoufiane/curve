const getAvailableValuesFromComposers = (type, documents) => {
  const name = new Set();
  const cae = new Set();
  const firstName = new Set();
  const middleNames = new Set();
  const surname = new Set();
  const foreignId = new Set();
  const mainPro = new Set();
  const mechanicalPro = new Set();
  const performancePro = new Set();
  const syncPro = new Set();
  const mainProIdentifier = new Set();
  const mechanicalProIdentifier = new Set();
  const performanceProIdentifier = new Set();
  const syncProIdentifier = new Set();
  const cwrName = new Set();
  let linkedContracts = [];
  let societies = [];
  let publisherAgreements = [];

  documents.forEach((document) => {
    if (document.name) {
      name.add(document.name);
    }
    if (document.cae) {
      cae.add(document.cae);
    }
    if (document.firstName) {
      firstName.add(document.firstName);
    }
    if (document.middleNames) {
      middleNames.add(document.middleNames);
    }
    if (document.surname) {
      surname.add(document.surname);
    }
    if (document.foreignId) {
      foreignId.add(document.foreignId);
    }
    if (document.mainPro) {
      mainPro.add(document.mainPro);
    }
    if (document.mechanicalPro) {
      mechanicalPro.add(document.mechanicalPro);
    }
    if (document.performancePro) {
      performancePro.add(document.performancePro);
    }
    if (document.syncPro) {
      syncPro.add(document.syncPro);
    }
    if (document.mainProIdentifier) {
      mainProIdentifier.add(document.mainProIdentifier);
    }
    if (document.mechanicalProIdentifier) {
      mechanicalProIdentifier.add(document.mechanicalProIdentifier);
    }
    if (document.performanceProIdentifier) {
      performanceProIdentifier.add(document.performanceProIdentifier);
    }
    if (document.syncProIdentifier) {
      syncProIdentifier.add(document.syncProIdentifier);
    }
    if (document.cwrName) {
      cwrName.add(document.cwrName);
    }

    if (document.linkedContracts.length) {
      document.linkedContracts = document.linkedContracts
        // Contracts are sometimes empty objects due to a legacy bug
        // This filters out those empty objects
        .filter((obj) => Object.keys(obj).length !== 0)
        .map((linkedContract) => ({ ...linkedContract, [`${type}Id`]: document._id.toString(), [`${type}Name`]: document.name }));
      linkedContracts = [...linkedContracts, ...document.linkedContracts];
    }

    if (document.societies?.length) {
      document.societies = document.societies.map((society) => ({ ...society, [`${type}Id`]: document._id.toString(), [`${type}Name`]: document.name }));
      societies = [...societies, ...document.societies];
    }

    if (document.publisherAgreements?.length) {
      // Agreements only need transforming for Composers
      // The Publisher > Sub-Publisher Agreements component expects the original data structure
      if (type === 'composer') {
        document.publisherAgreements = document.publisherAgreements.map((publisherAgreement) => ({ ...publisherAgreement, [`${type}Id`]: document._id.toString(), [`${type}Name`]: document.name }));
      }
      publisherAgreements = [...publisherAgreements, ...document.publisherAgreements];
    }
  });

  return {
    name: [...name],
    cae: [...cae],
    linkedContracts: [...linkedContracts],
    firstName: [...firstName],
    middleNames: [...middleNames],
    surname: [...surname],
    foreignId: [...foreignId],
    mainPro: [...mainPro],
    mechanicalPro: [...mechanicalPro],
    performancePro: [...performancePro],
    syncPro: [...syncPro],
    mainProIdentifier: [...mainProIdentifier],
    mechanicalProIdentifier: [...mechanicalProIdentifier],
    performanceProIdentifier: [...performanceProIdentifier],
    syncProIdentifier: [...syncProIdentifier],
    cwrName: [...cwrName],
    societies,
    publisherAgreements,
  };
};

module.exports = getAvailableValuesFromComposers;
