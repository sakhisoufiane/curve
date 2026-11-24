describe('Smoke Imports Suite', () => {
  beforeEach(() => {
    const username = null;
    const password = null;
    cy.login(username, password);
    cy.selectClientMulti();
  })

  afterEach(() => {
    cy.logout();
  })

  // COMPLETED Import Test on Payees
  it('Payees Import Test', () => {
    cy.get('#sidebar-contracts > a').click();
    cy.get('#sidebar-payees > a').click();
    cy.get('#CUR-rZPDYyzN').click();
    cy.get('input[type=file]').attachFile('Smoke Payee Import.xlsx');
    cy.get('#CUR-QbvHbKWR').click().wait(5000);

    // Validate Imported File
    cy.get('#notification-counter div').contains('1').should('have.text', '1');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-md-12 > .ng-scope').contains('Your Payee Import Has Completed').first().should('be.visible');
    cy.get('#CUR-bpBBggvy').click().wait(5000);
    cy.get('#CUR-CsnuAETh a').contains('A Payee Import').should('be.visible');
    cy.get('#CUR-CsnuAETh span').contains('Cat 1').should('be.visible');

    // Delete Import
    cy.get('#CUR-CsnuAETh a').contains('A Payee Import').click();
    cy.get('#CUR-DkcbEfDr').click();
    cy.get('#CUR-vGcbzDYC').click();
  });

  // COMPLETED Import Test on Contracts
  it('Contracts Import Test', () => {
    cy.get('#sidebar-contracts > a').click();
    cy.get('#sidebar-contract-submenu > a').click();
    cy.get('#CUR-xqVjxuMZ').click();
    cy.get('input[type=file]').attachFile('smoke-contract-import-label.xlsx');
    cy.get('#CUR-PfMsRKsg').click().wait(5000);

    // Validate Imported File
    cy.get('#notification-counter div').contains('1').should('have.text', '1');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.read-false > .col-md-12 > .ng-scope').contains('Your Contract Import Has Completed').first().should('be.visible');
    cy.get('#CUR-cvqKuYKK > .pg-search').click().wait(5000);
    cy.get('#CUR-EcVRXuaF a').contains('A Contract Smoke').should('be.visible');
    cy.get('#CUR-EcVRXuaF span').contains('Royalty').first().should('be.visible');
    cy.get('#CUR-EcVRXuaF span').contains('Creator').should('be.visible');

    // Delete Import
    cy.get('#CUR-EcVRXuaF a').contains('A Contract Smoke').click();
    cy.get('#CUR-EDDJtFXV').click();
    cy.get('#CUR-SIepMXur').click();
  });

  // COMPLETED Import Test on Mechanical Contracts
  it('Mechanical Contracts Import Test', () => {
    cy.get('#sidebar-contracts > a').click();
    cy.get('#sidebar-mechanicals a').click();
    cy.get('#CUR-xqVjxuMZ').click();
    cy.get('input[type=file]').attachFile('smoke-mechanical-contract-import-label.xlsx');
    cy.get('#CUR-PfMsRKsg').click().wait(5000);
    // Validate Imported File
    cy.get('#notification-counter div').contains('1').should('be.visible').wait(3000);
    cy.get('#notification-counter div').contains('1').click();
    cy.get('.col-xs-12 > .ng-scope').contains('Your Mechanical Contract Import Has Completed').first().should('be.visible');


    cy.get('#CUR-cvqKuYKK > .pg-search').click().wait(3000);
    cy.get('#CUR-EcVRXuaF a').contains('A Mechanical Contract Smoke').should('be.visible');
    cy.get('#CUR-EcVRXuaF span').contains('Mechanical').first().should('be.visible');
    cy.get('#CUR-EcVRXuaF span').contains('Composer').should('be.visible');
    // Delete Import
    cy.get('#CUR-EcVRXuaF a').contains('A Mechanical Contract Smoke').click();
    cy.get('#CUR-EDDJtFXV').click();
    cy.get('#CUR-SIepMXur').click();
  });

  // COMPLETED Import Test on Release Combined
  it('Releases (Combined) Import Test', () => {
    cy.get('#sidebar-catalogue > a').click();
    cy.get('#sidebar-releases > a').click();

    // trigger import
    cy.get('#CUR-zWopaSgP > .fa').click();
    cy.get('input[type=file]').attachFile('smoke-release-combined-import.xlsx');
    cy.get('#CUR-sIIioKZr').click();
    cy.get('#CUR-krOSBdbc span').contains('Combined').click();
    cy.get('#CUR-RjvsbDlF').click().wait(5000);

    // validate notification
    cy.get('#notification-counter div').contains('1').should('be.visible');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-xs-12 > .ng-scope').contains('Your Release Import Has Completed').first().should('be.visible');

    // validate imported data on index page
    cy.get('#CUR-nVfWuehA').click().wait(2000);
    cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('Gelo').first().should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('AAAA11101').should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('90990009655443').should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('Premium Stream').first().should('be.visible');

    // delete imported data
    cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').click();
    cy.get('#CUR-IORvSKtL').click();
    cy.get('#CUR-NOYiTdFv').click();
  });

  // COMPLETED Import Test on Release Separated
  it('Releases (Separated) Import Test', () => {
    cy.get('#sidebar-catalogue > a').click();
    cy.get('#sidebar-releases > a').click();

    // trigger import
    cy.get('#CUR-zWopaSgP > .fa').click();
    cy.get('input[type=file]').attachFile('smoke-release-separated-import.xlsx');
    // cy.get('#CUR-sIIioKZr').click();
    // cy.get('#CUR-krOSBdbc span').contains('Combined').click();
    cy.get('#CUR-RjvsbDlF').click().wait(5000);

    // validate notification
    cy.get('#notification-counter div').contains('1').should('be.visible');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-xs-12 > .ng-scope').contains('Your Release Import Has Completed').first().should('be.visible');

    // validate imported data on index page
    cy.get('#CUR-nVfWuehA').click().wait(2000);
    cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('Gelo').first().should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('AAAA11101').should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('90990009655443').should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('Premium Stream').first().should('be.visible');

    // delete imported data
    cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').click();
    cy.get('#CUR-IORvSKtL').click();
    cy.get('#CUR-NOYiTdFv').click();


  });

  // COMPLETED Import Test on Tracks Combined
  it('Tracks (Combined) Import Test', () => {
    cy.get('#sidebar-catalogue > a').click();
    cy.get('#sidebar-tracks > a').click();

    // import combined modal
    cy.get('#CUR-qPFhbvpu').click();
    cy.get('input[type=file]').attachFile('smoke-track-combined-import.xlsx');
    cy.get('#CUR-WUCIXBpX').click();
    cy.get('#CUR-hsJQcGZx span').contains('Combined').click();
    cy.get('#CUR-UmIZyIbK').click().wait(5000);

    // validate notifications
    cy.get('#notification-counter div').contains('1').should('be.visible');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-xs-12 > .ng-scope').contains('Your Track Import Has Completed').first().should('be.visible');

    // validate imported on index page
    cy.get('#CUR-uiaJvCvp').click().wait(3000);
    cy.get('#CUR-MSfnkrEY a').contains('A Track Smoke').should('be.visible');
    cy.get('#CUR-MSfnkrEY span').contains('Gelo').first().should('be.visible');
    cy.get('#CUR-MSfnkrEY span').contains('V1234').should('be.visible');
    cy.get('#CUR-MSfnkrEY span').contains('AAAA001').should('be.visible');

    // delete imported
    cy.get('#CUR-MSfnkrEY a').contains('A Track Smoke').click();
    cy.get('#CUR-YLCMDySu').click();
    cy.get('#CUR-tOCyBdOF').click();
  });

  // COMPLETED Import Test on Tracks Separated
  it('Tracks (Separated) Import Test', () => {
    cy.get('#sidebar-catalogue > a').click();
    cy.get('#sidebar-tracks > a').click();

    // import combined modal
    cy.get('#CUR-qPFhbvpu').click();
    cy.get('input[type=file]').attachFile('smoke-track-separated-import.xlsx');
    // cy.get('#CUR-WUCIXBpX').click();
    // cy.get('#CUR-hsJQcGZx span').contains('Combined').click();
    cy.get('#CUR-UmIZyIbK').click().wait(5000);

    // validate notifications
    cy.get('#notification-counter div').contains('1').should('be.visible');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-xs-12 > .ng-scope').contains('Your Track Import Has Completed').first().should('be.visible');
    // validate imported on index page
    cy.get('#CUR-uiaJvCvp').click().wait(3000);
    cy.get('#CUR-MSfnkrEY a').contains('A Track Smoke').should('be.visible');
    cy.get('#CUR-MSfnkrEY span').contains('Gelo').first().should('be.visible');
    cy.get('#CUR-MSfnkrEY span').contains('V1234').should('be.visible');
    cy.get('#CUR-MSfnkrEY span').contains('AAAA001').should('be.visible');
    // delete imported
    cy.get('#CUR-MSfnkrEY a').contains('A Track Smoke').click();
    cy.get('#CUR-YLCMDySu').click();
    cy.get('#CUR-tOCyBdOF').click();
  });

  // COMPLETED Import Test on Composers
  it('Composers Import Test', () => {
    cy.get('#sidebar-catalogue > a').click();
    cy.get('#sidebar-composers > a').click();

    // import data on composer
    cy.get('#CUR-eTaahVPO').click();
    cy.get('input[type=file]').attachFile('smoke-composers-import-label.xlsx');
    cy.get('#CUR-SogplsAK').click().wait(3000);

    // validate notifications
    cy.get('#notification-counter div').contains('1').should('be.visible');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-xs-12 > .ng-scope').contains('Your Composer Import Has Completed').first().should('be.visible');

    // validate on index page
    cy.get('#CUR-xRrQkQuq').click().wait(3000);
    cy.get('#CUR-OuUVLroh a').contains('A Composer Smoke').should('be.visible');
    cy.get('#CUR-OuUVLroh span').contains('A4162BN').should('be.visible');

    // delete imported data
    cy.get('#CUR-OuUVLroh a').contains('A Composer Smoke').click();
    cy.get('#CUR-JaWdFtZJ').click();
    cy.get('#CUR-bcgdhSSZ').click();
  });

  // COMPLETED Import Test on Publishers
  it('Publishers Import Test', () => {
    cy.get('#sidebar-catalogue > a').click();
    cy.get('#sidebar-publishers > a').click();

    // import data on composer
    cy.get('#CUR-cRnLChHq').click();
    cy.get('input[type=file]').attachFile('smoke-publishers-import-label.xlsx');
    cy.get('#CUR-dwTjiytw').click().wait(3000);

    // validate notifications
    cy.get('#notification-counter div').contains('1').should('be.visible');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-xs-12 > .ng-scope').contains('Your Publisher Import Has Completed').first().should('be.visible');

    // validate on index page
    cy.get('#CUR-HiCNhUSw').click().wait(3000);
    cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke').should('be.visible');
    cy.get('#CUR-UBgtBBTg span').contains('MNH1231').should('be.visible');

    // delete imported data
    cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke').click();
    cy.get('#CUR-mvVYCWXR').click();
    cy.get('#CUR-LnaBreyR').click();
  });

  // COMPLETED PUBLISHING Import Test on Works
  it('Publishing Works Import Test', () => {
    cy.selectClientMulti('Gelo Publisher For New Features');
    cy.get('#sidebar-catalogue > a').click();
    cy.get('#sidebar-works > a').click();

    // import data on composer
    cy.get('#CUR-iANFXSjF').click();
    cy.get('input[type=file]').attachFile('smoke-works-import.xlsx');
    cy.get('#CUR-BwJGXXxF').click().wait(10000);

    // validate notifications
    cy.get('#notification-counter div').contains('1').should('be.visible');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-xs-12 > .ng-scope').contains('Your Work Import Has Completed').first().should('be.visible');

    // validate on index page
    cy.get('#CUR-TDcqiadQ').click().wait(3000);
    cy.get('#CUR-QJScNMSt a').contains('A Work Smoke').should('be.visible');
    cy.get('#CUR-QJScNMSt span').contains('zzz composer 2').should('be.visible');
    cy.get('#CUR-QJScNMSt span').contains('W12345').should('be.visible');

    // delete imported data
    cy.get('#CUR-QJScNMSt a').contains('A Work Smoke').click();
    cy.get('#CUR-XJkFoQlq').click();
    cy.get('#CUR-AzjXhskq').click();
  });

  // COMPLETED PUBLISHING Import Test on Payees
  it('Publishing Payees Import Test', () => {

    cy.selectClientMulti('Gelo Publisher For New Features');

    cy.get('#sidebar-contracts > a').click();
    cy.get('#sidebar-payees > a').click();
    cy.get('#CUR-rZPDYyzN').click();
    cy.get('input[type=file]').attachFile('Smoke Payee Import.xlsx');
    cy.get('#CUR-QbvHbKWR').click().wait(5000);

    // Validate Imported File
    cy.get('#notification-counter div').contains('1').should('have.text', '1');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-md-12 > .ng-scope').contains('Your Payee Import Has Completed').first().should('be.visible');
    cy.get('#CUR-bpBBggvy').click().wait(5000);
    cy.get('#CUR-CsnuAETh a').contains('A Payee Import').should('be.visible');
    cy.get('#CUR-CsnuAETh span').contains('Cat 1').should('be.visible');

    // Delete Import
    cy.get('#CUR-CsnuAETh a').contains('A Payee Import').click();
    cy.get('#CUR-DkcbEfDr').click();
    cy.get('#CUR-vGcbzDYC').click();
  });

  // COMPLETED PUBLISHING Import Test on Contracts
  it('Contracts Publishing Import Test', () => {

    cy.selectClientMulti('Gelo Publisher For New Features');
    cy.get('#sidebar-contracts > a').click();
    cy.get('#sidebar-contract-submenu > a').click();
    cy.get('#CUR-xqVjxuMZ').click();
    cy.get('input[type=file]').attachFile('smoke-contract-import-publishing.xlsx');
    cy.get('#CUR-PfMsRKsg').click().wait(5000);

    // Validate Imported File
    cy.get('#notification-counter div').contains('1').should('have.text', '1');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.read-false > .col-md-12 > .ng-scope').contains('Your Publisher Contract Import Has Completed').first().should('be.visible');
    cy.get('#CUR-cvqKuYKK > .pg-search').click().wait(5000);
    cy.get('#CUR-EcVRXuaF a').contains('A Contract Smoke').should('be.visible');
    cy.get('#CUR-EcVRXuaF span').contains('Royalty').first().should('be.visible');
    cy.get('#CUR-EcVRXuaF span').contains('Bandcamp').should('be.visible');

    // Delete Import
    cy.get('#CUR-EcVRXuaF a').contains('A Contract Smoke').click();
    cy.get('#CUR-EDDJtFXV').click();
    cy.get('#CUR-SIepMXur').click();
  });

  // COMPLETED PUBLISHING Import Test on Release Combined
  it('Releases (Combined) Publishing Import Test', () => {

    cy.selectClientMulti('Gelo Publisher For New Features');
    cy.get('#sidebar-catalogue > a').click();
    cy.get('#sidebar-releases > a').click();

    // trigger import
    cy.get('#CUR-zWopaSgP > .fa').click();
    cy.get('input[type=file]').attachFile('smoke-release-combined-import.xlsx');
    cy.get('#CUR-sIIioKZr').click();
    cy.get('#CUR-krOSBdbc span').contains('Combined').click();
    cy.get('#CUR-RjvsbDlF').click().wait(10000);

    // validate notification
    cy.get('#notification-counter div').contains('1').should('be.visible');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-xs-12 > .ng-scope').contains('Your Release Import Has Completed').first().should('be.visible');

    // validate imported data on index page
    cy.get('#CUR-nVfWuehA').click().wait(2000);
    cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('Gelo').first().should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('AAAA11101').should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('90990009655443').should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('Premium Stream').first().should('be.visible');

    // delete imported data
    cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').click();
    cy.get('#CUR-IORvSKtL').click();
    cy.get('#CUR-NOYiTdFv').click();
  });

  // COMPLETED PUBLISHING Import Test on Release Separated
  it('Releases (Separated) PublishingImport Test', () => {
    cy.selectClientMulti('Gelo Publisher For New Features');
    cy.get('#sidebar-catalogue > a').click();
    cy.get('#sidebar-releases > a').click();

    // trigger import
    cy.get('#CUR-zWopaSgP > .fa').click();
    cy.get('input[type=file]').attachFile('smoke-release-separated-import.xlsx');
    // cy.get('#CUR-sIIioKZr').click();
    // cy.get('#CUR-krOSBdbc span').contains('Combined').click();
    cy.get('#CUR-RjvsbDlF').click().wait(10000);

    // validate notification
    cy.get('#notification-counter div').contains('1').should('be.visible');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-xs-12 > .ng-scope').contains('Your Release Import Has Completed').first().should('be.visible');

    // validate imported data on index page
    cy.get('#CUR-nVfWuehA').click().wait(2000);
    cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('Gelo').first().should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('AAAA11101').should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('90990009655443').should('be.visible');
    cy.get('#CUR-VtMGALPT span').contains('Premium Stream').first().should('be.visible');

    // delete imported data
    cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').click();
    cy.get('#CUR-IORvSKtL').click();
    cy.get('#CUR-NOYiTdFv').click();


  });

  // COMPLETED PUBLISHING Import Test on Tracks Combined
  it('Tracks (Combined) Publishing Import Test', () => {

    cy.selectClientMulti('Gelo Publisher For New Features');
    cy.get('#sidebar-catalogue > a').click();
    cy.get('#sidebar-tracks > a').click();

    // import combined modal
    cy.get('#CUR-qPFhbvpu').click();
    cy.get('input[type=file]').attachFile('smoke-track-combined-import.xlsx');
    cy.get('#CUR-WUCIXBpX').click();
    cy.get('#CUR-hsJQcGZx span').contains('Combined').click();
    cy.get('#CUR-UmIZyIbK').click().wait(5000);

    // validate notifications
    cy.get('#notification-counter div').contains('1').should('be.visible');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-xs-12 > .ng-scope').contains('Your Track Import Has Completed').first().should('be.visible');

    // validate imported on index page
    cy.get('#CUR-uiaJvCvp').click().wait(3000);
    cy.get('#CUR-MSfnkrEY a').contains('A Track Smoke').should('be.visible');
    cy.get('#CUR-MSfnkrEY span').contains('Gelo').first().should('be.visible');
    cy.get('#CUR-MSfnkrEY span').contains('V1234').should('be.visible');
    cy.get('#CUR-MSfnkrEY span').contains('AAAA001').should('be.visible');

    // delete imported
    cy.get('#CUR-MSfnkrEY a').contains('A Track Smoke').click();
    cy.get('#CUR-YLCMDySu').click();
    cy.get('#CUR-tOCyBdOF').click();
  });

  // COMPLETED PUBLISHING Import Test on Tracks Separated
  it('Tracks (Separated) Publishing Import Test', () => {
    cy.selectClientMulti('Gelo Publisher For New Features');
    cy.get('#sidebar-catalogue > a').click();
    cy.get('#sidebar-tracks > a').click();

    // import combined modal
    cy.get('#CUR-qPFhbvpu').click();
    cy.get('input[type=file]').attachFile('smoke-track-separated-import.xlsx');
    // cy.get('#CUR-WUCIXBpX').click();
    // cy.get('#CUR-hsJQcGZx span').contains('Combined').click();
    cy.get('#CUR-UmIZyIbK').click().wait(7000);

    // validate notifications
    cy.get('#notification-counter div').contains('1').should('be.visible');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-xs-12 > .ng-scope').contains('Your Track Import Has Completed').first().should('be.visible');

    // validate imported on index page
    cy.get('#CUR-uiaJvCvp').click().wait(3000);
    cy.get('#CUR-MSfnkrEY a').contains('A Track Smoke').should('be.visible');
    cy.get('#CUR-MSfnkrEY span').contains('Gelo').first().should('be.visible');
    cy.get('#CUR-MSfnkrEY span').contains('V1234').should('be.visible');
    cy.get('#CUR-MSfnkrEY span').contains('AAAA001').should('be.visible');

    // delete imported
    cy.get('#CUR-MSfnkrEY a').contains('A Track Smoke').click();
    cy.get('#CUR-YLCMDySu').click();
    cy.get('#CUR-tOCyBdOF').click();
  });

  // COMPLETED PUBLISHING Import Test on Composers
  it('Composers Import Publishing Test', () => {
    cy.selectClientMulti('Gelo Publisher For New Features');
    cy.get('#sidebar-catalogue > a').click();
    cy.get('#sidebar-composers > a').click();

    // import data on composer
    cy.get('#CUR-eTaahVPO').click();
    cy.get('input[type=file]').attachFile('smoke-composers-import-publishing.xlsx');
    cy.get('#CUR-SogplsAK').click().wait(3000);

    // validate notifications
    cy.get('#notification-counter div').contains('1').should('be.visible');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-xs-12 > .ng-scope').contains('Your Composer Import Has Completed').first().should('be.visible');

    // validate on index page
    cy.get('#CUR-xRrQkQuq').click().wait(3000);
    cy.get('#CUR-OuUVLroh a').contains('A Composer Smoke').should('be.visible');
    cy.get('#CUR-OuUVLroh span').contains('A4162BN').should('be.visible');

    // delete imported data
    cy.get('#CUR-OuUVLroh a').contains('A Composer Smoke').click();
    cy.get('#CUR-JaWdFtZJ').click();
    cy.get('#CUR-bcgdhSSZ').click();
  });

  // COMPLETED PUBLISHING Import Test on Publishers
  it('Publishers Publishing Import Test', () => {
    cy.selectClientMulti('Gelo Publisher For New Features');
    cy.get('#sidebar-catalogue > a').click();
    cy.get('#sidebar-publishers > a').click();

    // import data on composer
    cy.get('#CUR-cRnLChHq').click();
    cy.get('input[type=file]').attachFile('smoke-publishers-import-publishing.xlsx');
    cy.get('#CUR-dwTjiytw').click().wait(8000);

    // validate notifications
    cy.get('#notification-counter div').contains('1').should('be.visible');
    cy.get('#notification-counter div').contains('1').click().wait(3000);
    cy.get('.col-xs-12 > .ng-scope').contains('Your Publisher Import Has Completed').first().should('be.visible');

    // validate on index page
    cy.get('#CUR-HiCNhUSw').click().wait(3000);
    cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke').should('be.visible');
    cy.get('#CUR-UBgtBBTg span').contains('MNH1231').should('be.visible');

    // delete imported data
    cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke').click();
    cy.get('#CUR-mvVYCWXR').click();
    cy.get('#CUR-LnaBreyR').click();

  });

});
