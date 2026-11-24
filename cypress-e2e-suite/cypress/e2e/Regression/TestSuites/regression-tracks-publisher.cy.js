// Created by Jesli 
// July 20, 2023
import globalpageobject from '../../updated-smoke-tests/page-objects/smoke.global.pageobject.js';
describe('regression tracks tests', () => {
  beforeEach(() => {
    const username = null;
    const password = null;
    cy.login(username, password);
    cy.wait(2000);
    cy.selectClientMulti('Gelo Publisher For New Features');
    cy.wait(2000);
    // cy.login_dev();  
    // cy.selectClientSingle();
  })

  afterEach(() => {
    cy.logout();
  })
  it('C1922 Validate Tracks on Sidebar', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
  });
  it('C1923 Validate Tracks Page Content', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    // Validate index page
    t.TracksLinkValidate()
    t.TracksSearchBarValidate()
    t.TracksImportButtonValidate()
    t.TracksExportButtonValidate()
    t.TracksDeleteButtonValidate()
    t.TracksCreateButtonValidate()
    t.TracksCATGroupFieldValidate()
    t.TracksCreatedAfterValidate()
    t.TracksCreatedBeforeValidate()
    t.TracksCompleteDDValidate()
    t.TracksCompleteDDClick()
    t.TracksCompleteDDSelCompleteValidate()
    t.TracksCompleteDDSelIncompleteValidate()
    t.TracksLabelFieldValidate()
    t.TracksFilterValidate()
    t.TracksTotalCounterValidate()
    t.TracksPageNumberButtons()
    t.TracksShowAllButtonValidate()
    t.TracksTableHeaderValidate('Title')
    t.TracksTableHeaderValidate('Version')
    t.TracksTableHeaderValidate('Artist')
    t.TracksTableHeaderValidate('ISRC')
    t.TracksTableHeaderValidate('Created')
    t.TracksTableHeaderValidate('Participation')
    t.TracksTableHeaderValidate('Status')
    t.TracksShowingPerPageValidate()
  });
  it('C1924 Validate Tracks Create Page Content - Overview', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    // Create Track
    t.TracksCreateButtonClick()
    t.TracksOverviewTabValidate()
    t.TracksOverViewHeaderValidate()
    t.TracksDefaultReleaseHeaderValidate()
    t.TracksReleaseSpecificForeignIDsHeaderValidate()
    t.TracksCatalogueGroupsValidate()
    t.TracksTitleFieldType('A Tracks Smoke')
    t.TracksVersionFieldType('v123')
    t.TracksArtistFieldType('Gelo')
    t.TracksForeignIDType('Tracks12345')
    t.TracksProjectIDType('Tracks12345')
    t.TracksCatalogueGroupsClick()
    t.TracksCatalogueGroupsSelectionClick()
    t.TracksISRCType('Smoke001')
    t.TracksLabelType('GeloTest')
    t.TracksPlineType('1234')
    t.TracksDurationType('120')
    t.TracksDefaultReleaseFieldType('test')
  });
  it('C1925 Validate Tracks Create Page Content - Rights', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    // Create Track Validation
    t.TracksCreateButtonClick()
    t.TracksOverviewTabValidate()
    t.TracksTitleFieldType('A Tracks Smoke')
    t.TracksVersionFieldType('v123')
    t.TracksArtistFieldType('Gelo')
    t.TracksForeignIDType('Tracks12345')
    t.TracksProjectIDType('Tracks12345')
    t.TracksCatalogueGroupsClick()
    t.TracksCatalogueGroupsSelectionClick()
    t.TracksISRCType('Smoke001')
    t.TracksLabelType('GeloTest')
    t.TracksPlineType('1234')
    t.TracksDurationType('120')

    // Rights Tab
    t.TracksRightsTabClick()
    // Sales Returns
    t.TracksAddContractClick()
    t.TracksContractsSearchFieldType()
    t.TracksContractsSelectionClick()
    t.TracksSalesReturnsHeaderValidate()
    t.TracksRightsCostsHeadersValidate()
    t.TracksReleaseSpecificSalesValidate()
    t.TracksSalesReturnDeleteButtonClick()
    // Costs
    t.TracksRightsCostsAddContractClick()
    t.TracksRightsContractFieldType('Test Gelo 100')
    t.TracksRightsRatetFieldType('100')
    t.TracksRightsDeleteButtonClick()
    t.TracksCopyFromSalesClick()
    // Release Spec Sales / returns
    t.TracksRightsReleaseSpecSalesContractClick()
    t.TracksRightsReleaseFieldType('test')
    t.TracksRightsRelSpecSalesContractFieldType('Test Gelo 100')
    t.TracksRightsRateFieldType('100')
    t.TracksRightsRelSpecSalesReturnDeleteClick()
  });
  it('C1926 Validate Tracks Create Page Content - Aliases', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    // Create Track Validation
    t.TracksCreateButtonClick()
    t.TracksAliasesTabClick()
    t.TracksAddAliasButtonClick()
    t.TracksAliasesFieldType('Test Track')
    t.TracksAliasesDeleteButtonClick()
    t.TracksAddAliasButtonClick()
    t.TracksAddAliasButtonClick() 
  });
  it('C1928 Validate Tracks Create Page Content - Releases', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    // Create Track Releases Validation'
    t.TracksCreateButtonClick()
    t.TracksReleasesTabClick()
    t.TracksReleasesHeaderValidate()
    t.TracksReleasesTableHeaderValidate('Title')
    t.TracksReleasesTableHeaderValidate('Artist')
    t.TracksReleasesTableHeaderValidate('Cat No')
    t.TracksReleasesTableHeaderValidate('Barcode')
    t.TracksReleasesTableHeaderValidate('Format')
    t.TracksReleasesTableHeaderValidate('Created')
  });
  it('C1929 Validate Tracks Create Page Content - Analytics', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    // Create Track Releases Validation'
    t.TracksCreateButtonClick()
    t.TracksAnalyticsTabClick()
    t.AnalyticsFilterValidateIfExpanded()
    t.ContractsAnalyticsHeadersValidate('Filter')
    t.ContractsAnalyticsFilterHeaderValidate()
    t.ContractsAnalyticsFieldDropdValidate()
    t.ContractsAnalyticsFieldValueValidate()
    t.ContractsAnalyticsAndButtonValidate()
    t.ContractsAnalyticsOrButtonValidate()
    t.ContractsAnalyticsComparisonrButtonValidate()
    t.ContractsAnalyticsGoButtonValidate()
    // validate checkboxes on select graphs
    t.PayeeAnalyticsSelectGraphsCBValidation('Distribution Channels')
    t.PayeeAnalyticsSelectGraphsCBValidation('Configurations')
    t.PayeeAnalyticsSelectGraphsCBValidation('Territories')
    t.PayeeAnalyticsSelectGraphsCBValidation('Sources')
    t.PayeeAnalyticsSelectGraphsCBValidation('Sub Sources')
    t.PayeeAnalyticsSelectGraphsCBValidation('Top Catalogue')
    t.PayeeAnalyticsSelectGraphsCBValidation('Revenues over time')
    t.PayeeAnalyticsSelectGraphsCBValidation('Average Rates')
    t.PayeeAnalyticsSelectGraphsCBValidation('Contract Breakdown')
  });
  it('C1930 Validate Tracks Adding Catalogue Groups', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    r.TracksSubMenuClick()
    // Validate Create page and cat group
    r.TracksCreateButtonClick()
    r.TracksCatalogueGroupsClick()
    r.TracksCatalogueGroupsSelectionClick()
    r.TracksCatalogueGroupsClick()
    r.TracksCatGroupsSelClick('CAT 2')
    r.TracksCatalogueGroupsClick()
    r.TracksCatGroupsSelClick('CAT 3')
  });
  it('C1931 Validate Tracks Adding Release Specific Foreign IDs', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    r.ReleasesSubmenuClick() 
    // create on edit page and input fields 
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('A test release')
    r.ReleasesVersionFieldType('v123')
    r.ReleasesClickOutsideVersionClick()
    r.ReleasesInputArtistType('gelo12345')
    r.ReleasesInputForeignIDType('test12345')
    r.ReleasesProjectIDType('ProID12345')
    r.ReleasesDistributionChannelClick()
    r.ReleasesDistributionSelectionClick()
    r.ReleasesFormatDDClick()
    r.ReleasesFormatDDSelectionClick('Television')
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
    r.TracksSubMenuClick()
    // Validate Create page and Foreign ID
    r.TracksCreateButtonClick()
    r.TracksTitleFieldType('testing')
    r.TracksAddForeignIDClick()
    r.TracksRelSpecReleaseFieldType('A test release')
    r.TracksRelSpecForeignSelPublisherClick()
    r.TracksRelSpecForeignIDType('test')
    r.TracksSaveClick()
    // Validate created release specific foreign id
    r.TracksRelSpecReleaseFieldValidate('A test release (v123) - gelo12345 - TEST1001 - Television')
    r.TrasDeleteButtonClick()
    r.TracksDeleteModalButtonClick()
    r.ReleasesSubmenuClick()
    // Delete created modal
    r.ReleasesDeleteCreatedClick('A test release')
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1932 Validate Tracks Linked to Contracts Rights', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    // Create Track Validation
    t.TracksCreateButtonClick()
    t.TracksOverviewTabValidate()
    t.TracksTitleFieldType('A Tracks Smoke')
    t.TracksVersionFieldType('v123')
    t.TracksArtistFieldType('Gelo')
    t.TracksForeignIDType('Tracks12345')
    t.TracksProjectIDType('Tracks12345')
    t.TracksCatalogueGroupsClick()
    t.TracksCatalogueGroupsSelectionClick()
    t.TracksISRCType('Smoke001')
    t.TracksLabelType('GeloTest')
    t.TracksPlineType('1234')
    t.TracksDurationType('120')

    // Rights Tab
    t.TracksRightsTabClick()
    // Sales Returns
    t.TracksAddContractClick()
    t.TracksContractsSearchFieldType()
    t.TracksContractsSelectionClick()
    t.TracksSalesReturnsHeaderValidate()
    t.TracksRightsCostsHeadersValidate()
    t.TracksReleaseSpecificSalesValidate()
    t.TracksSaveClick()
    t.TracksRightsTabClick()
    t.TracksSalesReturnDeleteButtonClick()
    // Costs
    t.TracksRightsCostsAddContractClick()
    t.TracksRightsContractFieldType('Test Gelo 100')
    t.TracksContractsSelectionClick()
    t.TracksRightsRatetFieldType('100')
    t.TracksSaveClick()
    t.TracksAliasesTabClick()
    t.TrasDeleteButtonClick()
    t.TracksDeleteModalButtonClick()
  });
  it('C1936 Validate Tracks Adding Aliases', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    // Create Track Validation
    t.TracksCreateButtonClick()
    t.TracksAliasesTabClick()
    t.TracksAddAliasButtonClick()
    t.TracksAliasesFieldType('Test Track')
    t.TracksAliasesDeleteButtonClick()
    t.TracksAddAliasButtonClick()
    t.TracksAddAliasButtonClick() 
  });
  it('C1928 Validate Tracks Create Page Content - Releases', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.ReleasesSubmenuClick()
    // Validate Create Page
    r.ReleasesClickCreateClick()
    r.ReleasesTitleFieldType('a link track')
    r.ReleasesAddTracksButtonValidate()
    r.ReleasesAddTracksButtonClick()
    r.ReleasesAddTracksSearchType('t2')
    r.ReleasesAddTracksSearchedValueCheckbClick()
    r.ReleasesSelectedButtonClick()
    r.ReleasesDoneButtonClick()
    r.ReleasesTracksAddedValidate('T2')
    r.ReleasesSaveClick()
    // go to tracks and validate linked release
    r.TracksSubMenuClick()
    r.TracksEditCreatedClick('T2')
    r.TracksReleasesTabClick()
    r.TracksLinkedReleaseValidate('a link track')
    // go back to release and delete created
    r.ReleasesSubmenuClick()
    r.ReleasesDeleteCreatedClick('a link track')
    r.ReleasesDeleteButtonClick()
    r.ReleasesClickDeleteModalClick()
  });
  it('C1938 Validate Tracks Required Fields', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.TracksSubMenuClick()
    // Validate Create Page
    r.TracksCreateButtonClick()
    r.TracksSaveClick()
    r.TracksLinkClick()
    r.TracksEditCreatedClick('New Track')
    // Deelete Created blank title track
    r.TrasDeleteButtonClick()
    r.TracksDeleteModalButtonClick()
  });
  it('C1939, C1942 Validate Tracks Create and Update Function', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    t.TracksLinkValidate()
    t.TracksSearchBarValidate()
    t.TracksExportButtonValidate()
    t.TracksDeleteButtonValidate()
    t.TracksCreateButtonValidate()
    t.TracksCATGroupFieldValidate()
    t.TracksCreatedAfterValidate()
    t.TracksCreatedBeforeValidate()
    t.TracksCompleteDDValidate()
    t.TracksLabelFieldValidate()
    t.TracksFilterValidate()
    t.TracksTableHeaderValidate('Title')
    t.TracksTableHeaderValidate('Version')
    t.TracksTableHeaderValidate('Artist')
    t.TracksTableHeaderValidate('ISRC')
    t.TracksTableHeaderValidate('Created')
    t.TracksSearchDuplicateType('A Tracks Smoke')
    t.TracksDeleteDuplicateIfExist()
    t.TracksSearchClear()
    // Create Track
    t.TracksCreateButtonClick()
    t.TracksOverviewTabValidate()
    t.TracksTitleFieldType('A Tracks Smoke')
    t.TracksVersionFieldType('v123')
    t.TracksArtistFieldType('Gelo')
    t.TracksForeignIDType('Tracks12345')
    t.TracksProjectIDType('Tracks12345')
    t.TracksCatalogueGroupsClick()
    t.TracksCatalogueGroupsSelectionClick()
    t.TracksISRCType('Smoke001')
    t.TracksLabelType('GeloTest')
    t.TracksPlineType('1234')
    t.TracksDurationType('120')
    t.TracksRightsTabClick()
    t.TracksAddContractClick()
    t.TracksContractsSearchFieldType()
    t.TracksContractsSelectionClick()
    t.TracksSaveClick()
    // save and validate created data on edit page
    t.TracksTitleValidate('A Tracks Smoke')
    t.TracksVersionValidate('v123')
    t.TracksArtistValidate('Gelo')
    t.TracksForeignIDValidate('Tracks12345')
    t.TracksProjectIDValidate('Tracks12345')
    // Go to Rights Tab
    t.TracksRightsTabClick()
    t.TracksContractValidate()
    // validate created data on index page 
    t.TracksLinkClick()
    t.TracksCreatedTitleValidate('A Tracks Smoke')
    t.TracksCreatedDetailsValidate('Gelo')
    t.TracksCreatedDetailsValidate('v123')
    t.TracksCreatedDetailsValidate('Smoke001')
    // Update Tracks on edit page
    t.TracksEditCreatedClick('A Tracks Smoke')
    t.TracksTitleFieldType('A Tracks Smoke Update')
    t.TracksVersionFieldType('v1236789')
    t.TracksArtistFieldType('Gelo1234')
    t.TracksForeignIDType('098765')
    t.TracksProjectIDType('T09876')
    t.TracksSaveClick()
    // save and validate updated data on edit page
    t.TracksVersionValidate('v1236789')
    t.TracksForeignIDValidate('098765')
    t.TracksProjectIDValidate('T09876')
    t.TracksArtistValidate('Gelo1234')
    // validate updtaed data on index page 
    t.TracksLinkClick()
    t.TracksCreatedTitleValidate('A Tracks Smoke Update')
    t.TracksCreatedDetailsValidate('v1236789')
    t.TracksCreatedDetailsValidate('Gelo1234')
    t.TracksCreatedDetailsValidate('Smoke001')
    // delete track on edit page
    t.TracksEditCreatedClick('A Tracks Smoke Update')
    t.TrasDeleteButtonClick()
    t.TracksDeleteModalButtonClick()
  });
  it('C1943, C1944, C1955, C1956 Validate Tracks Copy. Delete and Search Function', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    // Go to create button
    t.TracksCreateButtonClick()
    t.TracksTitleFieldType('A test track')
    t.TracksSaveClick()
    t.TracksLinkClick()
    t.TracksEditCreatedClick('A test track')
    // copy created
    t.TracksCopyButtonClick()
    t.TracksSaveClick()
    t.TracksLinkClick()
    t.TracksEditCreatedClick('A test track')
    t.TracksCopyButtonClick()
    t.TracksSaveClick()
    t.TracksLinkClick()
    t.TracksEditCreatedClick('A test track')
    t.TracksCopyButtonClick()
    t.TracksSaveClick()
    // go to index page and search for copied data
    t.TracksLinkClick()
    t.TracksSearchDuplicateType('A test track')
    // Delete specific test data
    t.TrackDeleteCreatedCboxClick()
    t.TracksDeleteIndexClick()
    t.TracksDeleteSelectedIndexClick()
    t.TracksDeleteModalIndexClick()
    // delete all
    t.TracksSearchDuplicateType('A test track')
    t.TracksDeleteAllCboxClick()
    t.TracksDeleteIndexClick()
    t.TracksDeleteSelectedIndexClick()
    t.TracksDeleteModalIndexClick()
  });
  it('C1945 Validate Tracks Filter Function - CAT Group', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.TracksSubMenuClick()
    r.TracksCreateButtonClick()
    r.TracksTitleFieldType('A track filter test')
    r.TracksCatalogueGroupsClick()
    r.TracksCatalogueGroupsSelectionClick()
    r.TracksSaveClick()
    r.TracksLinkClick()
    // Validate Cat Group Filter
    r.TracksCatGroupindexType('CAT 1')
    r.TracksCatGroupindexSelClick()
    r.TracksFilterButtonIndexClick()
    r.TracksEditCreatedClick('A track filter test')
    // Delete track
    r.TrasDeleteButtonClick()
    r.TracksDeleteModalButtonClick()
  });
  it('C1947 Validate Tracks Filter Function - Created After', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.TracksSubMenuClick()
    r.TracksCreateButtonClick()
    r.TracksTitleFieldType('A track filter test')
    // Validate Cat Group Filter
    r.TracksSaveClick()
    r.TracksLinkClick()
    r.TracksCreatedAfterType('09/03/2022')
    r.TracksCreatedAfterDoneClick()
    r.TracksFilterButtonIndexClick()
    r.TracksEditCreatedClick('A track filter test')
    // Delete track
    r.TrasDeleteButtonClick()
    r.TracksDeleteModalButtonClick()
  });
  it('C1948 Validate Tracks Filter Function - Created Before', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.TracksSubMenuClick()
    r.TracksCreateButtonClick()
    r.TracksTitleFieldType('A track filter test')
    // Validate Cat Group Filter
    r.TracksSaveClick()
    r.TracksLinkClick()
    r.TracksCreatedBeforeType('09/03/2024')
    r.TracksCreatedAfterDoneClick()
    r.TracksFilterButtonIndexClick()
    r.TracksEditCreatedClick('A track filter test')
    // Delete track
    r.TrasDeleteButtonClick()
    r.TracksDeleteModalButtonClick()
  });
  it('C1950,C1951,C1952,C953 Validate Tracks Export Function - Selected, All, Combined and Separated', () => {
    const r = new globalpageobject();
    r.CatalogueMenuClick()
    // validate index page content
    r.TracksSubMenuClick()
    r.TracksCreateButtonClick()
    r.TracksTitleFieldType('A test track')
    r.TracksSaveClick()
    r.TracksLinkClick()
    r.TracksExportButtonClick()
    r.TracksExportCombinedButtonClick()
    r.NotifBellValidate('1', '1')
    r.PayeeExportNotifValidation('Track Export Ready')
    r.TrackDeleteCreatedCboxClick()
    r.TracksExportButtonClick()
    r.TracksExportSeparatedButtonClick()
    r.NotifBellValidate('1', '1')
    r.PayeeExportNotifValidation('Track Export Ready')
    r.TracksDeleteAllCboxClick()
    r.TracksExportButtonClick()
    r.TracksExportSeparatedButtonClick()
    r.NotifBellValidate('1', '1')
    r.PayeeExportNotifValidation('Track Export Ready')
    r.TracksDeleteAllCboxClick()
    r.TracksSearchDuplicateType('A test track')
    r.TracksEditCreatedClick('A test track')
    // delete created
    r.TrasDeleteButtonClick()
    r.TracksDeleteModalButtonClick()
  });
  it('C1958 Validate Tracks Import Function - Combined', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    t.TracksImportButtonClick()
    t.TracksImportTypeButton()
    t.TracksImportTypeCombinedClick()
    t.FileAttach('smoke-track-combined-import.xlsx')
    t.TracksImportModalClick()
    // validate notifications
    t.NotifBellValidate('1', '1')
    t.NotifMsgValidate('Your Track Import Has Completed')
    // validate imported on index page
    t.TracksFilterButtonIndexClick()
    t.TracksTableValidate('Gelo')
    t.TracksTableValidate('V1234')
    t.TracksTableValidate('AAAA001')
    // delete imported
    t.TracksEditCreatedClick('A Track Smoke')
    t.TrasDeleteButtonClick()
    t.TracksDeleteModalButtonClick()
  });
  it('C1959 Validate Tracks Import Function - Separated', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    t.TracksImportButtonClick()
    t.TracksImportTypeButton()
    t.TracksImportTypeSeparatedClick()
    t.FileAttach('smoke-track-separated-import.xlsx')
    t.TracksImportModalClick()
    // validate notifications
    t.NotifBellValidate('1', '1')
    t.NotifMsgValidate('Your Track Import Has Completed')
    // validate imported on index page
    t.TracksFilterButtonIndexClick()
    t.TracksTableValidate('Gelo')
    t.TracksTableValidate('V1234')
    t.TracksTableValidate('AAAA001')
    // delete imported
    t.TracksEditCreatedClick('A Track Smoke')
    t.TrasDeleteButtonClick()
    t.TracksDeleteModalButtonClick()
  });
  it('C1960	Validate Tracks Import Function - Overwrite Blanks Unchecked', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    // Create Track
    t.TracksSearchDuplicateType('A Track Smoke')
    t.TracksDeleteDuplicateIfExist()
    t.TracksSearchClear()
    t.TracksImportButtonClick()
    t.TracksImportTypeButton()
    t.TracksImportTypeSeparatedClick()
    t.FileAttach('smoke track blank origin.xlsx')
    t.TracksImportModalClick()
    // validate notifications
    t.NotifBellValidate('1', '1')
    t.NotifMsgValidate('Your Track Import Has Completed')
    t.TracksFilterButtonIndexClick()
    t.TracksImportButtonClick()
    // Import again
    t.TracksImportTypeButton()
    t.TracksImportTypeSeparatedClick()
    t.FileAttach('smoke track blank separated.xlsx')
    t.TracksImportModalClick()
    // validate notifications
    t.NotifBellValidate('1', '1')
    t.NotifMsgValidate('Your Track Import Has Completed')
    t.TracksFilterButtonIndexClick()
    t.TracksTableValidate('Gelo')
    t.TracksTableValidate('V1234')
    t.TracksTableValidate('AAAA001')
    t.TracksSearchDuplicateType('A Track Smoke')
    t.TracksFilterButtonIndexClick()
    t.TracksDeleteCheckAllModalIndexClick()
    t.TracksDeleteIndexClick()
    t.TracksDeleteSelectedIndexClick()
    t.TracksDeleteModalIndexClick()
  })
  it('C1961	Validate Tracks Import Function - Overwrite Blanks checked', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    // Create Track
    t.TracksSearchDuplicateType('A Tracks Smoke')
    t.TracksDeleteDuplicateIfExist()
    t.TracksSearchClear()
    t.TracksImportButtonClick()
    t.TracksImportTypeButton()
    t.TracksImportTypeSeparatedClick()
    t.FileAttach('smoke track blank origin.xlsx')
    t.TracksImportModalClick()
    // validate notifications
    t.NotifBellValidate('1', '1')
    t.NotifMsgValidate('Your Track Import Has Completed')
    t.TracksFilterButtonIndexClick()
    t.TracksImportButtonClick()
    // Import again
    t.TracksImportTypeButton()
    t.TracksImportTypeSeparatedClick()
    t.FileAttach('smoke track blank separated.xlsx')
    t.TracksOverwriteBlanks()
    t.TracksImportModalClick()
    // validate notifications
    t.NotifBellValidate('1', '1')
    t.NotifMsgValidate('Your Track Import Has Completed')
    t.TracksFilterButtonIndexClick()
    t.TracksEditCreatedClick('A Track Smoke')
    t.TracksVersionBlankValidate('V1234')
    t.TracksLinkClick()
    t.TracksSearchDuplicateType('A Track Smoke')
    t.TracksFilterButtonIndexClick()
    t.TracksDeleteCheckAllModalIndexClick()
    t.TracksDeleteIndexClick()
    t.TracksDeleteSelectedIndexClick()
    t.TracksDeleteModalIndexClick()
  });
  it('C2963 Validate that ISRC is not duplicate', () => {
    const t = new globalpageobject();
    t.CatalogueMenuClick()
    t.TracksSubMenuClick()
    // Create Track
    t.TracksCreateButtonClick()
    t.TracksTitleFieldType('A ISRC test')
    t.TracksISRCType('Smoke001')
    t.TracksSaveClick()
    t.TracksLinkClick()
    // Create the same ISRC
    t.TracksCreateButtonClick()
    t.TracksTitleFieldType('A ISRC test')
    t.TracksISRCType('Smoke001')
    t.TracksSaveClick()
    t.TracksDuplicateISRCValidate()
    t.TracksLinkClick()
    // delete track on edit page
    t.TracksEditCreatedClick('A ISRC test')
    t.TrasDeleteButtonClick()
    t.TracksDeleteModalButtonClick()
  });
})