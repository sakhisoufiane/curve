// Created by Jesli 
// July 13, 2023
import globalpageobject from '../../updated-smoke-tests/page-objects/smoke.global.pageobject.js';
describe('regression release tests', () => {
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
  it('C1761 Validate Releases on Sidebar', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
  });
  it('C1762 Validate Releases Page Content', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick() 
    r.ReleasesSearchBarValidate()
    r.ReleasesBulkUpdateButtonValidate()
    r.ReleasesExportButtonValidate()
    r.ReleasesImportButtonValidate()
    r.ReleasesDeleteButtonValidate()
    r.ReleasesCreateButtonValidate()
    r.ReleasesCATGroupValidate()
    r.ReleasesContractValidate()
    r.ReleasesCreatedAfterValidate()
    r.ReleasesCreatedBeforeValidate()
    r.ReleasesParticipationValidate()
    r.ReleasesCompleteValidate()
    r.ReleasesLabelValidate()
    r.ReleasesCompanyValidate()
    r.ReleasesArtistValidate()
    r.ReleasesFormatValidate()
    r.ReleasesFilterValidate()
    r.ReleasesTableHeaderValidate()
    r.ReleasesTitleHeaderValidate()
    r.ReleasesArtistHeaderValidate()
    r.ReleasesCATNoHeaderValidate()
    r.ReleasesBarcodeHeaderValidate()
    r.ReleasesFormatHeaderValidate()
    r.ReleasesCompleteDropdClick()
    r.ReleasesCompleteDropdSelIncValidate()
    r.ReleasesCompleteDropdSelValidate()
    r.ReleaseDistribChannelValidate()
    r.ReleasesTableHeadersValidate('Created')
    r.ReleasesTableHeadersValidate('Participation')
    r.ReleasesTableHeadersValidate('Status')
    r.ReleasesShowing25PerPageValidate()
    r.ReleasesTotalValidate()
    r.ReleasesShowAllValidate()
    r.PayeePreviousButtonValidate()
    r.PayeeNextButtonValidate()
    r.ContractCurrentPageValidate()
  });
  it('Validate Release Create Page Content - Overview', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('test')
    r.ReleasesVersionFieldType('test')
    r.ReleasesInputForeignIDType('test')
    r.ReleasesProjectIDType('test')
    r.ReleasesCatNoFieldType('test')
    r.ReleasesBarCodeType('test')
    r.ReleasesLabelFieldType('test')
    r.ReleasesReleaseDateClick()
    r.ReleasesReleaseDateType('22/06/2022')
    r.ReleasesHeadersValidate('Overview')
    r.ReleasesHeadersValidate('Configuration')
    r.ReleasesHeadersValidate('Catalogue Groups')
    r.ReleasesHeadersValidate('Specific Dealer Prices')
    r.ReleasesHeadersValidate('MCPS')
    r.ReleasesHeadersValidate('Tracks')
    // Config
    r.ReleasesDistributionChannelClick()
    r.ReleasesDistributionSelectionClick()
    r.ReleasesFormatDDClick()
    r.ReleasesFormatDDSelectionClick('CD')
    r.ReleasesPriceCategoryClick()
    r.ReleasesPriceCategoryDDClick()
    // MPCS
    r.ReleasesMainDealerPriceType('test')
    r.ReleasesMPCSFieldValidate()
    // Catalogue
    r.ReleasesCatalogueGroupsClick()
    r.ReleasesAddPriceCatClick()
    r.ReleasePriceCatDdownValidate()
    r.ReleaseTerritoryDdownValidate()
    r.ReleasesCurrencyDdownValidate()
    r.ReleasesDealerPriceDdownValidate()
    // Tracks
    r.ReleasesAddTracksButtonValidate()
    r.ReleasesRemoveButtonValidate()
    r.ReleasesTracksTableValidate('Title')
    r.ReleasesTracksTableValidate('Version')
    r.ReleasesTracksTableValidate('Artist')
    r.ReleasesTracksTableValidate('ISRC')

  });
  it('C1888 Validate Release Create Page Content - Rights', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesRightsTabClick()
    // Validate Rights Content
    r.ReleasesSalesReturnsHeaderValidate()
    r.ReleasesCostsHeaderValidate()
    r.ReleasesSalesReturnsAddContractClick()
    r.ReleasesSalesProRataFromTracksValidate()
    r.ReleasesCostsAddContractValidate()
    r.ReleasesCostCopyFromSalesValidate()
  });
  it('C1889 Validate Release Create Page Content - Aliases', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesAliasesTabClick()
    // Validate Alias Content
    r.ReleasesAddAliasClick()
    r.ReleasesAliasFormValidate()
    r.ReleasesAliasDeleteClick()
    r.ReleasesAliasSeeFullHistoryValidate()
    r.ReleasesAddAliasClick()
    r.ReleasesAddAliasClick()
    // r.ReleasesLastUpdatedValidate()
  });
  it('C1890 Validate Release Create Page Content - Mechanicals', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesMechanicalsTabClick()
    r.ReleasesMechanicalTabHeadersValidate('Mechanical Basis')
    r.ReleasesMechanicalTabHeadersValidate('Mechanical Licenses')
    r.ReleasesTrackCapValidate()
    r.ReleasesControlledCompoCheckBValidate()
    r.ReleasesLoadMechFromTracksValidate()
    r.ReleasesSeeFullHistoryValidate()
  });
  it('C1903 Validate Release Create Page Content - Analytics', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A release regression')
    r.ReleasesSaveClick()
    r.ReleasesAnalyticsTabClick()
    r.AnalyticsFilterValidateIfExpanded()
    // r.ContractsAnalyticsFilterClick()
    r.ContractsAnalyticsHeadersValidate('Filter')
    r.ContractsAnalyticsFilterHeaderValidate()
    r.ContractsAnalyticsFieldDropdValidate()
    r.ContractsAnalyticsFieldValueValidate()
    r.ContractsAnalyticsAndButtonValidate()
    r.ContractsAnalyticsOrButtonValidate()
    r.ContractsAnalyticsComparisonrButtonValidate()
    r.ContractsAnalyticsGoButtonValidate()
    // validate checkboxes on select graphs
    r.PayeeAnalyticsSelectGraphsCBValidation('Distribution Channels')
    r.PayeeAnalyticsSelectGraphsCBValidation('Configurations')
    r.PayeeAnalyticsSelectGraphsCBValidation('Territories')
    r.PayeeAnalyticsSelectGraphsCBValidation('Sources')
    r.PayeeAnalyticsSelectGraphsCBValidation('Sub Sources')
    r.PayeeAnalyticsSelectGraphsCBValidation('Revenues over time')
    r.PayeeAnalyticsSelectGraphsCBValidation('Costs')
    r.PayeeAnalyticsSelectGraphsCBValidation('Average Rates')
    r.PayeeAnalyticsSelectGraphsCBValidation('Contract Breakdown')
    // delete created anayltics
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1891 Validate Release Adding Catalogue Groups', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesCatalogueGroupsClick()
    r.ReleasesReleaseCatGroupSelectionValidate('CAT 1')
    r.ReleasesReleaseCatGroupSelectionValidate('CAT 2')
    r.ReleasesReleaseCatGroupSelectionValidate('CAT 3')
    r.ReleasesReleaseCatGroupSelectionValidate('hello')
  });
  it('C1892 Validate Release Adding Specific Dealer Price', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesCatalogueGroupsClick()
    r.ReleasesAddPriceCatClick()
    r.ReleasePriceCatDdownValidate()
    r.ReleaseTerritoryDdownValidate()
    r.ReleasesCurrencyDdownValidate()
    r.ReleasesDealerPriceDdownValidate()
    r.ReleasesPriceCatdeletebutton()
    r.ReleasesPriceCategoryHeader('Price Category')
    r.ReleasesPriceCategoryHeader('Territory')
    r.ReleasesPriceCategoryHeader('Dealer Price')
    r.ReleasesPriceCategoryHeader('Currency')
    r.ReleasesAddPriceCatClick()
    r.ReleasesSpecDealrPriceCatDdownClick()
    r.ReleasesSpecDealrPriceCatDdownSelClick('Full Price')
    r.ReleasesSpecDealrPriceCatDdownSelClick('Mid Price')
    r.ReleasesSpecDealrPriceCatDdownSelClick('Budget')
    r.ReleasesSpecDealrTerritoryDdownClick()
    r.ReleasesSpecDealerTerritoryDdownSelValidate('World')
    r.ReleasesSpecDealrCurrencyClick()
    r.ReleasesSpecDealrCurrencyType('gbp') 
  });
  it('C1935 Validate Release Adding Aliases', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('Test aaa')
    r.ReleasesAliasesTabClick()
    // Validate Alias Content
    r.ReleasesAddAliasClick()
    r.ReleasesAliasFormValidate()
    r.ReleasesAliasDeleteClick()
    r.ReleasesAliasSeeFullHistoryValidate()
    r.ReleasesAddAliasClick()
    r.ReleasesAddAliasClick()
    r.ReleasesSaveClick()
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1893 Validate Release Linked to Tracks', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesAddTracksButtonValidate()
    r.ReleasesAddTracksButtonClick()
    r.ReleasesAddTracksSearchType('t2')
    r.ReleasesAddTracksSearchedValueCheckbClick()
    r.ReleasesSelectedButtonClick()
    r.ReleasesDoneButtonClick()
    r.ReleasesTracksAddedValidate('T2')
    r.ReleasesRemoveButtonClick()
    r.ReleasesRemoveModalClick()
  });
  it('C1898, C1899 Validate Release Adding Mechanicals', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('Release Mechanicals')
    r.ReleasesAddTracksButtonValidate()
    r.ReleasesAddTracksButtonClick()
    r.ReleasesAddTracksSearchType('t2')
    r.ReleasesAddTracksSearchedValueCheckbClick()
    r.ReleasesSelectedButtonClick()
    r.ReleasesDoneButtonClick()
    r.ReleasesTracksAddedValidate('T2')
    r.ReleasesMechanicalsTabClick()
    r.ReleasesMechanicalsAddReleasesClick()
    r.ReleasesMechanicalsComposersFieldType('test gelo')
    r.ReleasesMechComposersTypeAheadClick()
    r.ReleasesMechanicalsPublisherFieldType('test publisher')
    r.ReleasesMechPublisherTypeAheadClick()
    r.ReleasesMechanicalsContractFieldType('gelo test')
    r.ReleasesMechContractTypeAheadClick()
    r.ReleasesSaveClick()
    r.ReleasesAliasesTabClick()
    // Delete Created
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1900 Validate Release Deleting Mechanicals', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('Release Mechanicals')
    r.ReleasesAddTracksButtonValidate()
    r.ReleasesAddTracksButtonClick()
    r.ReleasesAddTracksSearchType('t2')
    r.ReleasesAddTracksSearchedValueCheckbClick()
    r.ReleasesSelectedButtonClick()
    r.ReleasesDoneButtonClick()
    r.ReleasesTracksAddedValidate('T2')
    r.ReleasesMechanicalsTabClick()
    r.ReleasesMechanicalsAddReleasesClick()
    r.ReleasesMechanicalsAddReleasesClick()
    r.ReleasesMechDeleteButtonClick()
  });
  it('C1901 Validate Release Deleting Mechanicals from Tracks', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('Release Mechanicals')
    r.ReleasesAddTracksButtonValidate()
    r.ReleasesAddTracksButtonClick()
    r.ReleasesAddTracksSearchType('t2')
    r.ReleasesAddTracksSearchedValueCheckbClick()
    r.ReleasesSelectedButtonClick()
    r.ReleasesDoneButtonClick()
    r.ReleasesTracksAddedValidate('T2')
    r.ReleasesMechanicalsTabClick()
    r.ReleasesMechanicalsAddReleasesClick()
    r.ReleasesMechanicalsAddReleasesClick()
    r.ReleasesMechDeleteButtonClick()
    r.ReleasesMechanicalsComposersFieldType('test gelo')
    r.ReleasesMechComposersTypeAheadClick()
    r.ReleasesMechanicalsPublisherFieldType('test publisher')
    r.ReleasesMechPublisherTypeAheadClick()
    r.ReleasesMechanicalsContractFieldType('gelo test')
    r.ReleasesMechContractTypeAheadClick()
    r.ReleasesOverviewTabClick()
    // Remove Track
    r.ReleasesCboxClick()
    r.ReleasesRemoveButtonClick()
    r.ReleasesRemoveModalClick()
  });
  it('C1894 Validate Release Linked to Contracts Rights', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('Release Mechanicals')
    r.ReleasesRightsTabClick()
    r.ReleasesSalesReturnsAddContractClick()
    r.ReleasesSalesReturnContractFieldType('Test Gelo 100')
    r.ReleasesSalesReturnsContractSelClick()
    r.ReleasesSaveClick()
    r.ReleasesRightsTabClick()
    r.ReleasesSalesReturnContractFieldValidate('Test Gelo 100')
    r.ReleasesSalesDeleteClick()
    r.ReleasesCostsAddContractValidate()
    r.ReleasesCostsContractFieldType('Test Gelo 100')
    r.ReleasesSalesReturnsContractSelClick()
    r.ReleasesSaveClick()
    r.ReleasesRightsTabClick()
    r.ReleasesCostsContractFieldValidate('Test Gelo 100')
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1895 Validate Release Required Fields', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesSaveClick()
    // Go to Index page
    r.ReleasesLinkClick()
    r.ReleaseNewReleaseClick()
    // Delete Created
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1896, C1897 Create and Update Function Validation', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    r.ReleasesSubmenuClick() 
    // create on edit page and input fields 
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A Release Smoke')
    r.ReleasesVersionFieldType('v123')
    r.ReleasesClickOutsideVersionClick()
    r.ReleasesInputArtistType('gelo12345')
    r.ReleasesInputForeignIDType('test12345')
    r.ReleasesProjectIDType('ProID12345')
    r.ReleasesDistributionChannelClick()
    r.ReleasesDistributionSelectionClick()
    r.ReleasesFormatDDClick()
    r.ReleasesFormatDDSelectionClick('CD')
    r.ReleasesPriceCategoryClick()
    r.ReleasesPriceCategoryDDClick()
    r.ReleasesMainDealerPriceType('123')
    r.ReleasesCatNoFieldType('TEST1001')
    r.ReleasesBarCodeType('12345098751')
    r.ReleasesLabelFieldType('test smoke')
    r.ReleasesReleaseDateClick()
    r.ReleasesReleaseDateType('01/02/2023')
    r.ReleasesReleaseCatGroupsClick()
    r.ReleasesReleaseCatGroupSelectionClick()
    r.ReleasesRightsTabClick()
    r.ReleasesAddContractClick()
    r.ReleasesContractType('test gelo 100')
    r.ReleasesSelectionClick()
    // save and validate created data on edit page
    r.ReleasesSaveClick()
    r.ReleasesCreatedTitleValidate('A Release Smoke')
    r.ReleasesCreatedVersionValidate('v123')
    r.ReleasesCreatedArtistValidate('gelo12345')
    r.ReleasesCreatedForeignIDValidate('test12345')
    r.ReleasesCreatedProjectIDValidate('ProID12345')
    r.ReleasesCreatedFormatValidate('CD')
    r.ReleasesCreatedPriceCatValidate('Full Price')
    r.ReleasesCreatedMainDealerPriceValidate('123')
    // validate created data on index page 
    r.ReleasesLinkClick()
    r.ReleasesTitleValidate('A Release Smoke')
    r.ReleasesValidateArtistValidate('gelo12345')
    r.ReleasesCatNoValidate('TEST1001')
    r.ReleaseBarCodeValidate('12345098751')
    // update on edit page and input fields
    r.ReleasesUpdateCreatedClick('A Release Smoke')
    r.ReleasesTitleFieldType('A Release Smoke Update')
    r.ReleasesVersionFieldType('v0987')
    r.ReleasesInputArtistType('gelo09876')
    r.ReleasesProjectIDType('Smoke12098')
    r.ReleasesCatNoFieldType('SMOKE0987')
    // save and validate updated data on edit page
    r.ReleasesSaveClick()
    r.ReleasesCreatedTitleValidate('A Release Smoke Update')
    r.ReleasesCreatedVersionValidate('v0987')
    r.ReleasesCreatedArtistValidate('gelo09876')
    r.ReleasesCreatedForeignIDValidate('test12345')
    r.ReleasesCreatedProjectIDValidate('Smoke12098')
    // validate updated data on index page
    r.ReleasesLinkClick()
    r.ReleasesTitleValidate('A Release Smoke Update')
    r.ReleasesValidateArtistValidate('gelo09876')
    r.ReleasesCatNoValidate('gelo09876')
    r.ReleaseBarCodeValidate('12345098751')
    r.ReleasesFormatHeaderValidate('CD')
    // Delete Release 
    r.ReleasesDeleteCreatedClick('A Release Smoke Update')
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1902 Validate Release Copy Function', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    r.ReleasesSubmenuClick()
    // create on edit page and input fields
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A release regression')
    r.ReleasesSaveClick()
    // Copy Created
    r.ReleasesLinkClick()
    r.ReleasesUpdateCreatedClick('A release regression')
    r.ReleasesCopyButtonClick()
    r.ReleasesSaveClick()
    r.ReleasesLinkClick()
    r.ReleasesUpdateCreatedClick('A release regression')
    // Delete created
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
    // Delete Copied
    r.ReleasesUpdateCreatedClick('A release regression - Copy')
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()


  });
  it('C1904 Validate Release Search Function', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    r.ReleasesSubmenuClick()
    // create on edit page and input fields
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A release regression')
    r.ReleasesSaveClick()
    // Copy Created
    r.ReleasesLinkClick()
    r.ReleasesUpdateCreatedClick('A release regression')
    r.ReleasesCopyButtonClick()
    r.ReleasesSaveClick()
    r.ReleasesLinkClick()
    // Search for the created and copied data
    r.ReleasesSearchDuplicateType('A release regression')
    r.ReleasesUpdateCreatedClick('A release regression')
    // Delete created
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
    // Delete Copied
    r.ReleasesUpdateCreatedClick('A release regression - Copy')
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1905 Validate Release Filter Function - CAT Group', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    r.ReleasesSubmenuClick()
    // Validate filter function
    r.ReleasesCatGroupIndexType('CAT 1')
    r.ReleasesCatgroupSelClick('CAT 1')
    r.ReleasesFilterButtonIndexClick()
    r.ReleasesUpdateCreatedClick('Regression Release 1')
  });
  it('C1906 Validate Release Filter Function - Contracts', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick() 
    // create on edit page and input fields 
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('a reg test')
    r.ReleasesVersionFieldType('v123')
    r.ReleasesClickOutsideVersionClick()
    r.ReleasesInputArtistType('gelo12345')
    r.ReleasesInputForeignIDType('test12345')
    r.ReleasesProjectIDType('ProID12345')
    r.ReleasesDistributionChannelClick()
    r.ReleasesDistributionSelectionClick()
    r.ReleasesFormatDDClick()
    r.ReleasesFormatDDSelectionClick('CD')
    r.ReleasesPriceCategoryClick()
    r.ReleasesPriceCategoryDDClick()
    r.ReleasesMainDealerPriceType('123')
    r.ReleasesCatNoFieldType('TEST1001')
    r.ReleasesBarCodeType('12345098751')
    r.ReleasesLabelFieldType('test smoke')
    r.ReleasesReleaseDateClick()
    r.ReleasesReleaseDateType('01/02/2023')
    r.ReleasesReleaseCatGroupsClick()
    r.ReleasesReleaseCatGroupSelectionClick()
    r.ReleasesRightsTabClick()
    r.ReleasesAddContractClick()
    r.ReleasesContractType('Test gelo 100')
    r.ReleasesSelectionClick()
    // save and validate created data on edit page
    r.ReleasesSaveClick()
    r.ReleasesLinkClick()
    r.ReleaseContractIndexType('Test Gelo 100')
    r.ReleasesContractIndexSelClick('Test Gelo 100')
    r.ReleasesFilterButtonIndexClick()
    r.ReleasesUpdateCreatedClick('a reg test')
    // Delete Created
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1907 Validate Release Filter Function - Created After', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick() 
    // create on edit page and input fields 
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A reg test')
    r.ReleasesVersionFieldType('v123')
    r.ReleasesClickOutsideVersionClick()
    r.ReleasesInputArtistType('gelo12345')
    r.ReleasesInputForeignIDType('test12345')
    r.ReleasesProjectIDType('ProID12345')
    r.ReleasesDistributionChannelClick()
    r.ReleasesDistributionSelectionClick()
    r.ReleasesFormatDDClick()
    r.ReleasesFormatDDSelectionClick('CD')
    r.ReleasesPriceCategoryClick()
    r.ReleasesPriceCategoryDDClick()
    r.ReleasesMainDealerPriceType('123')
    r.ReleasesCatNoFieldType('TEST1001')
    r.ReleasesBarCodeType('12345098751')
    r.ReleasesLabelFieldType('test smoke')
    r.ReleasesReleaseDateClick()
    r.ReleasesReleaseDateType('01/02/2023')
    r.ReleasesReleaseCatGroupsClick()
    r.ReleasesReleaseCatGroupSelectionClick()
    r.ReleasesRightsTabClick()
    r.ReleasesAddContractClick()
    r.ReleasesContractType('Test gelo 100')
    r.ReleasesSelectionClick()
    // save and validate created data on edit page
    r.ReleasesSaveClick()
    r.ReleasesLinkClick()
    r.ReleasesCreatedAfterIndexType('16/07/2023')
    r.ReleasesCreatedAfterDoneIndexClick()
    r.ReleasesFilterButtonIndexClick()
    r.ReleasesUpdateCreatedClick('A reg test')
    // Delete Created
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1908 Validate Release Filter Function - Created Before', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick() 
    // create on edit page and input fields 
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A reg test')
    r.ReleasesVersionFieldType('v123')
    r.ReleasesClickOutsideVersionClick()
    r.ReleasesInputArtistType('gelo12345')
    r.ReleasesInputForeignIDType('test12345')
    r.ReleasesProjectIDType('ProID12345')
    r.ReleasesDistributionChannelClick()
    r.ReleasesDistributionSelectionClick()
    r.ReleasesFormatDDClick()
    r.ReleasesFormatDDSelectionClick('CD')
    r.ReleasesPriceCategoryClick()
    r.ReleasesPriceCategoryDDClick()
    r.ReleasesMainDealerPriceType('123')
    r.ReleasesCatNoFieldType('TEST1001')
    r.ReleasesBarCodeType('12345098751')
    r.ReleasesLabelFieldType('test smoke')
    r.ReleasesReleaseDateClick()
    r.ReleasesReleaseDateType('01/02/2023')
    r.ReleasesReleaseCatGroupsClick()
    r.ReleasesReleaseCatGroupSelectionClick()
    r.ReleasesRightsTabClick()
    r.ReleasesAddContractClick()
    r.ReleasesContractType('Test gelo 100')
    r.ReleasesSelectionClick()
    // save and validate created data on edit page
    r.ReleasesSaveClick()
    r.ReleasesLinkClick()
    r.ReleasesCreatedBeforeIndexType('18/12/2023')
    r.ReleasesCreatedAfterDoneIndexClick()
    r.ReleasesFilterButtonIndexClick()
    r.ReleasesUpdateCreatedClick('A reg test')
    // Delete Created
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1909 Validate Release Filter Function - Participation', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick() 
    // create on edit page and input fields 
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A reg test')
    r.ReleasesVersionFieldType('v123')
    r.ReleasesClickOutsideVersionClick()
    r.ReleasesInputArtistType('gelo12345')
    r.ReleasesInputForeignIDType('test12345')
    r.ReleasesProjectIDType('ProID12345')
    r.ReleasesDistributionChannelClick()
    r.ReleasesDistributionSelectionClick()
    r.ReleasesFormatDDClick()
    r.ReleasesFormatDDSelectionClick('CD')
    r.ReleasesPriceCategoryClick()
    r.ReleasesPriceCategoryDDClick()
    r.ReleasesMainDealerPriceType('123')
    r.ReleasesCatNoFieldType('TEST1001')
    r.ReleasesBarCodeType('12345098751')
    r.ReleasesLabelFieldType('test smoke')
    r.ReleasesReleaseDateClick()
    r.ReleasesReleaseDateType('01/02/2023')
    r.ReleasesReleaseCatGroupsClick()
    r.ReleasesReleaseCatGroupSelectionClick()
    r.ReleasesRightsTabClick()
    r.ReleasesAddContractClick()
    r.ReleasesContractType('Test gelo 100')
    r.ReleasesSelectionClick()
    // save and validate created data on edit page
    r.ReleasesSaveClick()
    r.ReleasesLinkClick()
    r.ReleasesParticipationIndexType('100')
    r.ReleasesFilterButtonIndexClick()
    r.ReleasesUpdateCreatedClick('A reg test')
    // Delete Created
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1910,C1919 Validate Release Export Function - All ', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    r.ReleaseExportButtonClick()
    r.ReleaseExportCombinedClick()
    r.NotifBellValidate('1', '1')
    r.PayeeExportNotifValidation('Release Export Ready')
  });
  it('C1917 Validate Release Export Function - Selected', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick() 
    // create on edit page and input fields 
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A reg export test')
    r.ReleasesVersionFieldType('v123')
    r.ReleasesClickOutsideVersionClick()
    r.ReleasesInputArtistType('gelo12345')
    r.ReleasesInputForeignIDType('test12345')
    r.ReleasesProjectIDType('ProID12345')
    r.ReleasesDistributionChannelClick()
    r.ReleasesDistributionSelectionClick()
    r.ReleasesFormatDDClick()
    r.ReleasesFormatDDSelectionClick('CD')
    r.ReleasesPriceCategoryClick()
    r.ReleasesPriceCategoryDDClick()
    r.ReleasesMainDealerPriceType('123')
    r.ReleasesCatNoFieldType('TEST1001')
    r.ReleasesBarCodeType('12345098751')
    r.ReleasesLabelFieldType('test smoke')
    r.ReleasesReleaseDateClick()
    r.ReleasesReleaseDateType('01/02/2023')
    r.ReleasesReleaseCatGroupsClick()
    r.ReleasesReleaseCatGroupSelectionClick()
    r.ReleasesRightsTabClick()
    r.ReleasesAddContractClick()
    r.ReleasesContractType('Test gelo 100')
    r.ReleasesSelectionClick()
    // save and validate created data on edit page
    r.ReleasesSaveClick()
    r.ReleasesLinkClick()
    r.ReleasesSearchDuplicateType('A reg export test')
    r.ReleaseSelectSearchedCboxClick()
    r.ReleaseExportButtonClick()
    r.ReleaseExportCombinedClick()
    r.NotifBellValidate('1', '1')
    r.ReleasesUpdateCreatedClick('A reg export test')
    // Delete Created
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1918 Validate Release Export Function - All ', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    r.ReleaseExportButtonClick()
    r.ReleaseExportSeparateClick()
    r.NotifBellValidate('1', '1')
    r.PayeeExportNotifValidation('Release Export Ready')
  });
  it('C1911 Validate Release Bulk Update Function - Pro Rata Contracts', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick() 
    // create on edit page and input fields 
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A reg export test')
    r.ReleasesVersionFieldType('v123')
    r.ReleasesClickOutsideVersionClick()
    r.ReleasesInputArtistType('gelo12345')
    r.ReleasesInputForeignIDType('test12345')
    r.ReleasesProjectIDType('ProID12345')
    r.ReleasesDistributionChannelClick()
    r.ReleasesDistributionSelectionClick()
    r.ReleasesFormatDDClick()
    r.ReleasesFormatDDSelectionClick('CD')
    r.ReleasesPriceCategoryClick()
    r.ReleasesPriceCategoryDDClick()
    r.ReleasesMainDealerPriceType('123')
    r.ReleasesCatNoFieldType('TEST1001')
    r.ReleasesBarCodeType('12345098751')
    r.ReleasesLabelFieldType('test smoke')
    r.ReleasesReleaseDateClick()
    r.ReleasesReleaseDateType('01/02/2023')
    r.ReleasesReleaseCatGroupsClick()
    r.ReleasesReleaseCatGroupSelectionClick()
    r.ReleasesRightsTabClick()
    r.ReleasesAddContractClick()
    r.ReleasesContractType('Test gelo 100')
    r.ReleasesSelectionClick()
    // save and validate created data on edit page
    r.ReleasesSaveClick()
    r.ReleasesLinkClick()
    r.ReleasesSearchDuplicateType('A reg export test')
    r.ReleaseSelectSearchedCboxClick()
    r.ReleasesBulkUpdateButtonClick()
    r.ReleasesProRataContractsClick()
    r.ReleasesCancelProRataModalClick()
    r.ReleasesBulkUpdateButtonClick()
    r.ReleasesProRataContractsClick()
    r.ReleasesProRataContractsModalClick()
    r.NotifBellValidate('1', '1')
    r.NotifMsgValidate('Your Pro Rata Contracts Process Has Completed')
    r.ReleasesUpdateCreatedClick('A reg export test')
    // Delete Created
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1912 Validate Release Bulk Update Function - Inherit Mechanicals', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick() 
    // create on edit page and input fields 
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A reg export test')
    r.ReleasesVersionFieldType('v123')
    r.ReleasesClickOutsideVersionClick()
    r.ReleasesInputArtistType('gelo12345')
    r.ReleasesInputForeignIDType('test12345')
    r.ReleasesProjectIDType('ProID12345')
    r.ReleasesDistributionChannelClick()
    r.ReleasesDistributionSelectionClick()
    r.ReleasesFormatDDClick()
    r.ReleasesFormatDDSelectionClick('CD')
    r.ReleasesPriceCategoryClick()
    r.ReleasesPriceCategoryDDClick()
    r.ReleasesMainDealerPriceType('123')
    r.ReleasesCatNoFieldType('TEST1001')
    r.ReleasesBarCodeType('12345098751')
    r.ReleasesLabelFieldType('test smoke')
    r.ReleasesReleaseDateClick()
    r.ReleasesReleaseDateType('01/02/2023')
    r.ReleasesReleaseCatGroupsClick()
    r.ReleasesReleaseCatGroupSelectionClick()
    r.ReleasesRightsTabClick()
    r.ReleasesAddContractClick()
    r.ReleasesContractType('Test gelo 100')
    r.ReleasesSelectionClick()
    // save and validate created data on edit page
    r.ReleasesSaveClick()
    r.ReleasesLinkClick()
    r.ReleasesSearchDuplicateType('A reg export test')
    r.ReleaseSelectSearchedCboxClick()
    r.ReleasesBulkUpdateButtonClick()
    r.ReleasesInheritMechanicalsClick()
    r.ReleasesCancelInheritMechanicalsClick()
    r.ReleasesBulkUpdateButtonClick()
    r.ReleasesInheritMechanicalsClick()
    r.ReleasesInhertMechanicalsModalClick()
    r.NotifBellValidate('1', '1')
    r.NotifMsgValidate('Your Inherit Mechanicals Process Has Completed')
    r.ReleasesUpdateCreatedClick('A reg export test')
    // Delete Created
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1914, C1915, C3105 Validate Delete Function', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    r.ReleasesSubmenuClick()
    // create on edit page and input fields
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A reg export test')
    r.ReleasesSaveClick()
    // Copy Created
    r.ReleasesLinkClick()
    r.ReleasesUpdateCreatedClick('A reg export test')
    r.ReleasesCopyButtonClick()
    r.ReleasesSaveClick()
    r.ReleasesLinkClick()
    r.ReleasesUpdateCreatedClick('A reg export test')
    r.ReleasesLinkClick()
    r.ReleasesUpdateCreatedClick('A reg export test')
    r.ReleasesCopyButtonClick()
    r.ReleasesSaveClick()
    r.ReleasesLinkClick()
    // search created and copied
    r.ReleasesSearchDuplicateType('A reg export test')
    r.ReleasesDeleteButtonIndexClick()
    r.ReleasesDeleteSelectedIndexClick()
    r.ReleasesDeleteModalIndexClick()
    r.ReleaseSelectSearchedCboxClick()
    r.ReleasesDeleteButtonIndexClick()
    r.ReleasesDeleteSelectedIndexClick()
    r.ReleasesDeleteModalIndexClick()
    r.ReleasesCheckAllCBIndexClick()
    r.ReleasesDeleteButtonIndexClick()
    r.ReleasesDeleteSelectedIndexClick()
    r.ReleasesDeleteModalIndexClick()
    r.ReleasesConfirmDeleteDataValidate('A reg export test')
  });
  it('C1921 Validate Release Import Function - Separated ', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    r.ReleasesSubmenuClick()
    // Trigger Import
    r.ReleaseImportButtonClick()
    r.FileAttach('smoke-release-separated-import.xlsx')
    r.ReleaseImportButtonModalClick()
    // validate notification
    r.NotifBellValidate('1', '1')
    r.NotifMsgValidate('Your Release Import Has Completed')
    // validate imported data on index page
    r.ReleasesFilterButtonIndexClick()
    r.ReleaseCTableValidation('Gelo')
    r.ReleaseCTableValidation('AAAA11101')
    r.ReleaseCTableValidation('90990009655443')
    r.ReleaseCTableValidation('Premium Stream')
    // delete imported data
    r.ReleasesUpdateCreatedClick('A Release Smoke')
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1920 Validate Release Import Function - Combined', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    r.ReleasesSubmenuClick()
    // Trigger Import
    r.ReleaseImportButtonClick()
    r.ReleaseCImportTypeClick()
    r.ReleaseCImportTypeSelClick()
    r.FileAttach('smoke-release-combined-import.xlsx')
    r.ReleaseImportButtonModalClick()
    r.NotifBellValidate('1', '1')
    r.NotifMsgValidate('Your Release Import Has Completed')
    // validate imported data on index page
    r.ReleasesFilterButtonIndexClick()
    r.ReleaseCTableValidation('Gelo')
    r.ReleaseCTableValidation('AAAA11101')
    r.ReleaseCTableValidation('90990009655443')
    r.ReleaseCTableValidation('Premium Stream')
    // delete imported data
    r.ReleasesUpdateCreatedClick('A Release Smoke')
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1940	Validate Release Import Function - Overwrite Blanks Unchecked', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    r.ReleasesSubmenuClick()
    r.ReleaseImportButtonClick()
    r.FileAttach('reg-release-separated unchecked overwrte.xlsx')
    r.ReleaseImportButtonModalClick()
    r.NotifBellValidate('1', '1')
    r.NotifMsgValidate('Your Release Import Has Completed')
    r.ReleasesFilterButtonIndexClick()
    r.ReleaseImportButtonClick()
    r.FileAttach('smoke-release-separated-import.xlsx')
    r.ReleaseImportButtonModalClick()
    r.NotifBellValidate('1', '1')
    r.NotifMsgValidate('Your Release Import Has Completed')
    r.ReleasesFilterButtonIndexClick()
    // Delete Release 
    r.ReleasesDeleteCreatedClick('A Release Smoke')
    // Validate on edit page if the blank on excel didn't overwrite the fields
    r.ReleasesCreatedTitleValidate('A Release Smoke')
    r.ReleasesCreatedVersionValidate('Version123')
    r.ReleasesCreatedArtistValidate('Gelo')
    r.ReleasesCreatedForeignIDValidate('12345')
    r.ReleasesCreatedProjectIDValidate('12345')
    // validate imported data on index page
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1941	Validate Release Import Function - Overwrite Blanks checked', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    r.ReleasesSubmenuClick()
    r.ReleaseImportButtonClick()
    r.FileAttach('reg-release-separated unchecked overwrte.xlsx')
    r.ReleaseImportButtonModalClick()
    r.NotifBellValidate('1', '1')
    r.NotifMsgValidate('Your Release Import Has Completed')
    r.ReleasesFilterButtonIndexClick()
    r.ReleaseImportButtonClick()
    r.FileAttach('smoke-release-separated-import.xlsx')
    r.ReleaseOverwriteBlankCboxClick()
    r.ReleaseImportButtonModalClick()
    r.NotifBellValidate('1', '1')
    r.NotifMsgValidate('Your Release Import Has Completed')
    r.ReleasesFilterButtonIndexClick()
    // Delete Release 
    r.ReleasesDeleteCreatedClick('A Release Smoke')
    // Validate on edit page if the blank on excel didn't overwrite the fields
    r.ReleasesCreatedTitleValidate('A Release Smoke')
    r.ReleasesCreatedUpdatedVersionValidate('Version123')
    // validate imported data on index page
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C2964 Validate Release CAT No is not duplicate', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    r.ReleasesSubmenuClick() 
    // create on edit page and input fields 
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A Release Smoke')
    r.ReleasesVersionFieldType('v123')
    r.ReleasesClickOutsideVersionClick()
    r.ReleasesInputArtistType('gelo12345')
    r.ReleasesInputForeignIDType('test12345')
    r.ReleasesProjectIDType('ProID12345')
    r.ReleasesDistributionChannelClick()
    r.ReleasesDistributionSelectionClick()
    r.ReleasesFormatDDClick()
    r.ReleasesFormatDDSelectionClick('CD')
    r.ReleasesPriceCategoryClick()
    r.ReleasesPriceCategoryDDClick()
    r.ReleasesMainDealerPriceType('123')
    r.ReleasesCatNoFieldType('TEST1001')
    r.ReleasesBarCodeType('12345098751')
    r.ReleasesLabelFieldType('test smoke')
    r.ReleasesReleaseDateClick()
    r.ReleasesReleaseDateType('01/02/2023')
    r.ReleasesReleaseCatGroupsClick()
    r.ReleasesReleaseCatGroupSelectionClick()
    r.ReleasesRightsTabClick()
    r.ReleasesAddContractClick()
    r.ReleasesContractType('test gelo 100')
    r.ReleasesSelectionClick()
    // save and validate created data on edit page
    r.ReleasesSaveClick()
    r.ReleasesLinkClick()
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A Release Smoke')
    r.ReleasesCatNoFieldType('TEST1001')
    r.ReleasesVersionFieldType('v123')
    r.ReleasesClickOutsideVersionClick()
    r.ReleasesInputArtistType('gelo12345')
    r.ReleasesInputForeignIDType('test12345')
    r.ReleasesProjectIDType('ProID12345')
    r.ReleasesDistributionChannelClick()
    r.ReleasesDistributionSelectionClick()
    r.ReleasesFormatDDClick()
    r.ReleasesFormatDDSelectionClick('CD')
    r.ReleasesPriceCategoryClick()
    r.ReleasesPriceCategoryDDClick()
    r.ReleasesMainDealerPriceType('123')
    // save and validate created data on edit page
    r.ReleasesSaveClick()
    r.ReleasesLinkClick()
    r.ReleasesSearchDuplicateType('A Release Smoke')
    // Create new release to attempt to duplicate cat no
    // Delete Release 
    r.ReleasesDeleteCreatedClick('A Release Smoke')
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
    r.ReleasesConfirmDeleteDataValidate('A Release Smoke')
  });
})