// Created by Jesli 
// July 31, 2023
import globalpageobject from '../../updated-smoke-tests/page-objects/smoke.global.pageobject.js';
describe('regression publisher tests', () => {
  beforeEach(() => {
    const username = null;
    const password = null;
    cy.login(username, password);
    cy.wait(2000);
    cy.selectClientMulti();
    cy.wait(2000);
    // cy.login_dev();  
    // cy.selectClientSingle();
  })

  afterEach(() => {
    cy.logout();
  })
  it('C2027	Validate Publishers on Sidebar', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
  });
  it('C2028	Validate Publishers Page Content', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Index Page Content validations
    p.PublishersLinkValidate()
    p.PublisherExportButtonValidate()
    p.PublishersDeleteValidate()
    p.PublishersImportValidate()
    p.PublishersCreateValidate()
    p.PublishersHeaderValidate()
    p.PublishersHeaderNameValidate()
    p.PublishersCAEValidate()
    p.PublishersCreatedHeaderValidate()
    p.PublishersShowingPage25Validate()
    p.PublisherShowAllValidate()
    p.PublisherTotalValidate()
    p.PublishersFilterButtonValidate()
    p.PublishersExportButtonValidate()
  });
  it('C3115 Validate Publishers Create Page Content - Overview', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate create page
    p.PublishersCreateClick()
    p.PublishersNameType('aaa')
    p.PublishersForeignIDFieldType('12345')
    p.PublishersCAEFieldType('12345')
    // save publisher
    p.PublishersSaveButtonClick()
    // linked contract
    p.PublisherLinkedContractLabelType('Gelo Test')
    p.PublisherContractLabelSelClick()
    p.PublisherLinkedContractLabelValidate('Gelo Test')
    // Delete created publisher
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
    
  });
  it('C2031 Validate Publishers Linked to Contracts', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate create page
    p.PublishersCreateClick()
    p.PublishersNameType('aaa')
    p.PublishersForeignIDFieldType('12345')
    p.PublishersCAEFieldType('12345')
    // save publisher
    p.PublishersSaveButtonClick()
    // linked contract
    p.PublisherLinkedContractLabelType('Gelo Test')
    p.PublisherContractLabelSelClick()
    p.PublisherLinkedContractLabelValidate('Gelo Test')
    // Delete created publisher
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()

    
  });
  it('C3117 Validate Publishers Required Fields', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate create page required fields
    p.PublishersCreateClick()
    p.PublishersSaveButtonClick()
    // validate error message pop up
    p.ContractsDeleteErrorMsgValidate()
    p.PublishersNameType('test publish')
    // delete publisher
    p.PublishersSaveButtonClick()
    p.PublishersLinkClick()
    p.PublishersCreatedPubClick('test publish')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2036 Validate Publishers Create Function', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Input on edit page (create data)
    p.PublishersCreateClick()
    p.PublishersNameType('A Publisher Smoke')
    p.PublishersForeignIDFieldType('1245678')
    p.PublishersCAEFieldType('098765')
    // Save and validate on edit page
    p.PublishersSaveButtonClick()
    p.PublishersValidateName('A Publisher Smoke')
    p.PublishersForeignName('1245678')
    p.PublishersCAENumber('098765')
    // Validate data on index page
    p.PublishersLinkClick()
    p.PublishersCreatedValidate('A Publisher Smoke')
    p.PublishersValidateCAE('098765')
    // update data on edit page
    p.PublishersCreatedPubClick('A Publisher Smoke')
    p.PublishersNameType('A Publisher Smoke Update')
    p.PublishersForeignIDFieldType('ABC1245678')
    p.PublishersCAEFieldType('ABC098765')
    // save and validate updated data on edit page
    p.PublishersSaveButtonClick()
    p.PublishersValidateName('A Publisher Smoke Update')
    p.PublishersForeignName('ABC1245678')
    p.PublishersCAENumber('ABC098765')
    p.PublishersLinkClick()
    // validate updayed data on index page
    p.PublishersCreatedValidate('A Publisher Smoke Update')
    p.PublishersValidateCAE('ABC098765')
    // delete data
    p.PublishersDeleteCreatedClick()
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2037 Validate Publishers Update Function', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Input on edit page (create data)
    p.PublishersCreateClick()
    p.PublishersNameType('A Publisher Smoke')
    p.PublishersForeignIDFieldType('1245678')
    p.PublishersCAEFieldType('098765')
    // Save and validate on edit page
    p.PublishersSaveButtonClick()
    p.PublishersValidateName('A Publisher Smoke')
    p.PublishersForeignName('1245678')
    p.PublishersCAENumber('098765')
    // Validate data on index page
    p.PublishersLinkClick()
    p.PublishersCreatedValidate('A Publisher Smoke')
    p.PublishersValidateCAE('098765')
    // update data on edit page
    p.PublishersCreatedPubClick('A Publisher Smoke')
    p.PublishersNameType('A Publisher Smoke Update')
    p.PublishersForeignIDFieldType('ABC1245678')
    p.PublishersCAEFieldType('ABC098765')
    // save and validate updated data on edit page
    p.PublishersSaveButtonClick()
    p.PublishersValidateName('A Publisher Smoke Update')
    p.PublishersForeignName('ABC1245678')
    p.PublishersCAENumber('ABC098765')
    p.PublishersLinkClick()
    // validate updayed data on index page
    p.PublishersCreatedValidate('A Publisher Smoke Update')
    p.PublishersValidateCAE('ABC098765')
    // delete data
    p.PublishersDeleteCreatedClick()
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2038	Validate Publishers Copy Function', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Create publisher and copy
    p.PublishersCreateClick()
    p.PublishersNameType('reg pub')
    p.PublishersSaveButtonClick()
    p.PublishersCopyButtonClick()
    p.PublishersSaveButtonClick()
    p.PublishersCopyButtonClick()
    p.PublishersSaveButtonClick()
    // go to index page
    p.PublishersLinkClick()
    p.PublisherSearchDuplicateType('reg pub')
    p.PublisherCheckAllRbClick()
    // Delete publsiher
    p.PublishersDeleteButtonIndexClick()
    p.PublisherDeleteSelectedIndexClick()
    p.PublishersDeleteButtonModalIndexClick()
  });
  it('C2039	Validate Publishers Search Function', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Create publisher and copy
    p.PublishersCreateClick()
    p.PublishersNameType('reg pub')
    p.PublishersSaveButtonClick()
    p.PublishersCopyButtonClick()
    p.PublishersSaveButtonClick()
    p.PublishersCopyButtonClick()
    p.PublishersSaveButtonClick()
    // go to index page
    p.PublishersLinkClick()
    p.PublisherSearchDuplicateType('reg pub')
    p.PublisherCheckAllRbClick()
    // Delete publsiher
    p.PublishersDeleteButtonIndexClick()
    p.PublisherDeleteSelectedIndexClick()
    p.PublishersDeleteButtonModalIndexClick()
  });
  it('C2044 Validate Publishers Delete Function - Selected', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Create publisher and copy
    p.PublishersCreateClick()
    p.PublishersNameType('reg pub')
    p.PublishersSaveButtonClick()
    // go to index page
    p.PublishersLinkClick()
    p.PublisherSearchDuplicateType('reg pub')
    p.PublisherCheckSelectedCboxClick()
    // Delete publsiher
    p.PublishersDeleteButtonIndexClick()
    p.PublisherDeleteSelectedIndexClick()
    p.PublishersDeleteButtonModalIndexClick()
  });
  it('C2042	Validate Publishers Delete Function - Edit Page', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate create page required fields
    p.PublishersCreateClick()
    p.PublishersSaveButtonClick()
    // validate error message pop up
    p.ContractsDeleteErrorMsgValidate()
    p.PublishersNameType('test publish')
    // delete publisher
    p.PublishersSaveButtonClick()
    p.PublishersLinkClick()
    p.PublishersCreatedPubClick('test publish')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2040	Validate Publishers Export Function - All', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Validate export
    p.PublisherExportButtonClick()
    p.NotifBellValidate('1', '1')
    p.PayeeExportNotifValidation('Publishers Export Ready')
  });
  it('C2041 Validate Publishers Export Function - Selected	', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // Create publisher and copy
    p.PublishersCreateClick()
    p.PublishersNameType('reg pub')
    p.PublishersSaveButtonClick()
    // go to index page
    p.PublishersLinkClick()
    p.PublisherCheckSelectedCboxClick()
    p.PublisherExportButtonClick()
    p.NotifBellValidate('1', '1')
    p.PayeeExportNotifValidation('Publishers Export Ready')
    // Delete publsiher
    p.PublishersCreatedPubClick('reg pub')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2042 Validate Publishers Delete Function - Edit Page', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate create page required fields
    p.PublishersCreateClick()
    p.PublishersSaveButtonClick()
    // validate error message pop up
    p.ContractsDeleteErrorMsgValidate()
    p.PublishersNameType('test publish')
    // delete publisher
    p.PublishersSaveButtonClick()
    p.PublishersLinkClick()
    p.PublishersCreatedPubClick('test publish')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2046	Validate Publishers Import Function Only', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate Import error
    p.PublisherImportButtonClick()
    p.FileAttach('smoke-publishers-import-publishing.xlsx')
    p.PublisherImportModalClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Publisher Import Has Errored')
    p.PublisherFilterButtonClick()
    // validate import valid
    p.PublisherImportButtonClick()
    p.FileAttach('smoke-publishers-import-label.xlsx')
    p.PublisherImportModalClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Publisher Import Has Completed')
    p.PublisherSearchDuplicateType('A Publisher Smoke')
    // Delete imported publisher
    p.PublishersCreatedPubClick('A Publisher Smoke')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2047	Validate Publishers Import Function - Overwrite Blanks Unchecked', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate import valid
    p.PublisherImportButtonClick()
    p.FileAttach('smoke-publishers-import-label.xlsx')
    p.PublisherImportModalClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Publisher Import Has Completed')
    p.PublisherFilterButtonClick()
    // re import to overwrite existing
    p.PublisherImportButtonClick()
    p.FileAttach('reg publisher label overwrite blank.xlsx')
    p.PublisherImportModalClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Publisher Import Has Completed')
    p.PublisherFilterButtonClick()
    // search overwriten data
    p.PublisherSearchDuplicateType('A Publisher Smoke')
    // Delete imported publisher
    p.PublishersCreatedPubClick('A Publisher Smoke')
    p.PublishersCAENumber('MNH1231')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
  it('C2048	Validate Publishers Import Function - Overwrite Blanks Checked', () => {
    const p = new globalpageobject();
    p.CatalogueMenuClick()
    p.PublishersSubMenuClick()
    // validate import valid
    p.PublisherImportButtonClick()
    p.FileAttach('smoke-publishers-import-label.xlsx')
    p.PublisherImportModalClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Publisher Import Has Completed')
    p.PublisherFilterButtonClick()
    // re import to overwrite existing
    p.PublisherImportButtonClick()
    p.FileAttach('reg publisher label overwrite blank.xlsx')
    p.PublisherImportOverwriteBlankCboxClick()
    p.PublisherImportModalClick()
    p.NotifBellValidate('1', '1')
    p.NotifMsgValidate('Your Publisher Import Has Completed')
    p.PublisherFilterButtonClick()
    // search overwriten data
    p.PublisherSearchDuplicateType('A Publisher Smoke')
    // Delete imported publisher
    p.PublishersCreatedPubClick('A Publisher Smoke')
    p.PublisherCAEEmptyValidate('MNH1231')
    p.PublishersDeleteButtonClick()
    p.PublishersDeleteButtonModalClick()
  });
})