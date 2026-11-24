// Created by Jesli C.
// May 24, 2023

const payeeName = 'Smoke Test Payee ' + Date.now();
const composerName = 'Smoke Test Composer-' + Date.now();
// const name = 'Smoke Test Contract ' + Date.now();
class SmokeLabelPageObject {

  // Navigate to Payee Select Page
  LabelSidebarContract() { cy.get('#sidebar-contracts > a').click(); }
  LabelSidebarPayees() { cy.get('#sidebar-payees > a').click(); }
  // Validate Payee Select Page
  LabelSearchBar() { cy.get('#CUR-rYmCZlqH').should('be.visible'); }
  LabelExportButton() { cy.get('#CUR-hzouaqxY').should('be.visible').contains('Export'); }
  LabelImportButton() { cy.get('#CUR-rZPDYyzN').should('be.visible').contains('Import'); }
  LabelA() { cy.get('#CUR-mQhwuDIu').should('be.visible'); }
  LabelDeleteButton() { cy.get('#CUR-GAGrmAkQ').contains('Delete'); }
  LabelCreateButton1() { cy.get('#CUR-jYYixChE').contains('Create'); }
  // Filter Complete select box
  LabelCompleteDD() { cy.xpath('//label[@id="CUR-ihpIsdkx"]/following::span[@tabindex="-1"][1]').should('be.visible'); }
  LabelFilter() { cy.get('#CUR-qJVOIKBD').contains('Filter'); }
  LabelCheckAllNameRB() { cy.get('thead > tr > th').contains('Name').should('be.visible'); }
  LabelNameHeader() { cy.get('thead > tr > th').contains('Name').should('be.visible'); }
  LabelCategoriesHeader() { cy.get('thead > tr > th').contains('Categories').should('be.visible'); }
  LabelCreatedHeader() { cy.get('thead > tr > th').contains('Created').should('be.visible'); }
  // Click Create Button
  LabelCreateButton() { cy.get('#CUR-jYYixChE').click(); }

  // Create Payee
  LabelPayeeNameTB() { cy.get('#CUR-vNACcVKV').clear().type(payeeName); }
  LabelAlternateNameField() { cy.get('#CUR-CJyhlJZW').clear().type('Payee Test'); }
  LabelForeignIDField() { cy.get('#CUR-GRdOwpVU').clear().type('1234567'); }
  LabelProjectIDField() { cy.get('#CUR-projectId-input').clear().type('Payee12345'); }
  LabelPaymentEmailField() { cy.get('#CUR-MnQDkMSC').clear().type('gelo@curve.com'); }
  LabelPaymentCurrencyDD() { cy.xpath('//label[@id="CUR-dPzHiybT"]/following::span[@tabindex="-1"][1]').click(); }
  LabelPaymentCurrencyDDSelection() { cy.xpath('//label[@id="CUR-dPzHiybT"]/following::input[@type="search"][1]').clear().type('GBP'); }
  LabelPaymentCurrencyDDSelection1() { cy.get('#CUR-hKtsGkio').click({ force: true }); }
  LabelBankNameField() { cy.get('#CUR-yyhcuPTu').clear().type('LLoyds'); }
  LabelBankAddressTB() { cy.get('#CUR-fjfsuHQg > .form-control').click(); }
  LabelCategories() { cy.xpath('//label[@id="CUR-NckAXatU"]/following::input[@type="search"][1]').click(); }
  LabelCategoriesSelection() { cy.xpath('//label[@id="CUR-NckAXatU"]/following::span[contains(text(),"Cat 1")]').click(); }
  LabelContactEmailField() { cy.get('#CUR-NaYgFDcA').clear().type('gelo@curve.com'); }
  LabelAddressTB() { cy.xpath('//label[@id="CUR-ZZTwxZXs"]/following::textarea[@aria-invalid="false"][1]').click(); }
  LabelAccountNoField() { cy.get('#CUR-xJpyMOcS').clear().type('123456'); }
  LabelSortCodeField() { cy.get('#CUR-XVRkUxZq').clear().type('123456789'); }
  LabelIBANField() { cy.get('#CUR-xbtHjbhy').clear().type('448877'); }
  LabelSwiftCode() { cy.get('#CUR-RVHhAHbs').clear().type('UK2736352'); }
  LabelCountryDD() { cy.xpath('//label[@id="CUR-GUNMwXuz"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  LabelCountryDDSelection() { cy.xpath('//label[@id="CUR-GUNMwXuz"]/following::span[contains(text(),"World")][1]').click({ force: true }); }
  LabelVATGSTSalesTAXNoField() { cy.get('#CUR-MuenDpiw').clear().type('Test123839'); }
  LabelTaxWordingField() { cy.get('#CUR-qMPSYmVs').clear().type('Test Wording'); }
  LabelSelfBillingTaxRateField() { cy.get('#CUR-viqCfpXo').clear().type('1.2'); }
  LabelWithHoldingTaxWordingField() { cy.get('#CUR-uEYmidLa').clear().type('test'); }
  LabelWitholdingTaxRateField() { cy.get('#CUR-vhAOhxOf').clear().type('1.6'); }
  LabelFeesInvoiceTaxRateField() { cy.get('#CUR-QiMJZhFy').clear().type('1.8'); }
  LabelNotesField() { cy.xpath('//div[@id="CUR-CzvuAESR"]/following::textarea[@aria-invalid="false"][1]').click(); }
  // Save payee & test response
  LabelPayeeClickSave() { cy.get('#CUR-dJtpHGja').click(); } // click save
  // Verify edit page with saved data
  LabelVerifyPayeeName() { cy.get('#CUR-vNACcVKV').should('have.value', payeeName); }
  LabelVerifyAlternateName() { cy.get('#CUR-CJyhlJZW').should('have.value', 'Payee Test'); }
  LabelVerifyPaymentEmail() { cy.get('#CUR-MnQDkMSC').should('have.value', 'gelo@curve.com'); }
  // Navigate to select page
  LabelClickPayeesLink() { cy.get('#CUR-jbbBXmfV').click(); }
  // Find and click newly created composer
  LabelNewComposer() { cy.selectScreenFind(payeeName); }
  // Update payee
  LabelUpdatePayeeName() { cy.get('#CUR-vNACcVKV').clear().clear().type(payeeName + ' Changed'); }
  LabelUpdateAlternateName() { cy.get('#CUR-CJyhlJZW').clear().clear().type('Payee Test Update'); }
  LabelPayeeDeleteSelectedCategory() { cy.xpath('//span[@class="close ui-select-match-close"]').click(); }
  LabelUpdateCategories() { cy.xpath('//label[@id="CUR-NckAXatU"]/following::input[@type="search"][1]').click().wait(3000); }
  LabelUpdateCategoriesSelection() { cy.xpath('//label[@id="CUR-NckAXatU"]/following::span[@class="ui-select-choices-row-inner"][1]').click(); }
  // Save payee & test response
  LabelUpdateClickSave() { cy.get('#CUR-dJtpHGja').click(); }
  // Click through delete workflow and verify deletion
  LabelPayeeClickDelete() { cy.get('#CUR-DkcbEfDr').contains('Delete').click() }
  LabelPayeeDeleteModal() { cy.get('#CUR-KccMBFTd').should('be.visible'); }
  LabelPayeeClickDeleteModal() { cy.get('#CUR-vGcbzDYC').should('be.visible').contains('Delete').click().wait(2000); }
  Testing() { cy.get('#CUR-vGcbzDYC').should('be.visible').contains('Delete').click().wait(2000); }
  LogoutWait() {
    cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
      if ($logout.is(':visible')) {
        cy.log('Logout button is found').wait(30000);
      } else {
        cy.xpath('//a[@id=\'logout-button\']').wait(30000);

      }
    })

  }

  // Contract Test Case

  LabelContractsMenu() { cy.get('#sidebar-contracts > a').click(); }
  LabelContractsSubMenu() { cy.get('#sidebar-contract-submenu > a').click(); }
  // Page Content Validation
  LabelContractSearchBar() { cy.get('#CUR-rmJHDCfY').should('be.visible'); }
  LabelContractDeleteButton() { cy.get('#CUR-IPEEOupo').should('be.visible'); }
  LabelContractCreateButton() { cy.get('#CUR-UDpJJUhA').should('be.visible'); }
  LabelContractExportButton() { cy.get('#CUR-GqETKmnj').should('be.visible'); }
  LabelContractsImportContractsButton() { cy.get('#CUR-xqVjxuMZ').should('be.visible'); }
  LabelContractsImportTransactions() { cy.get('#CUR-SOZjjcnO').should('be.visible'); }
  LabelContractsExportTransactions() { cy.get('#CUR-VmJCQpXn').should('be.visible'); }
  LabelContractsFilter() { cy.get('#CUR-uGIsUwPG').should('be.visible').contains('Filter'); }
  LabelContractsCompleteDD() { cy.xpath('//label[contains(text(),"Complete")]/following::span[@tabindex="-1"]').should('be.visible'); }
  LabelContractsCompany() { cy.xpath('//label[contains(text(),"Company")]/following::input[@type="search"][1]').should('be.visible'); }
  LabelContractsCategory() { cy.xpath('//label[contains(text(),"Category")]/following::input[@type="search"][1]').should('be.visible'); }

  LabelContractsName() { cy.get('thead > tr > th').contains('Name').should('be.visible'); }
  LabelContractsType() { cy.get('thead > tr > th').contains('Type').should('be.visible'); }
  LabelContractsCategories() { cy.get('thead > tr > th').contains('Categories').should('be.visible'); }
  LabelContractsCreated() { cy.get('thead > tr > th').contains('Created').should('be.visible'); }
  // Click Create Button
  LabelContractsClickCreate() { cy.get('#CUR-UDpJJUhA').click(); }
  LabelContractSelectPayee() { cy.typeAheadSelection('stan', 'Z Standard', '#CUR-eahYeMnc'); }
  LabelContractsNameField() { cy.get('#CUR-tYltRUcS').type('A Smoke Contract'); }
  LabelContractsStartDate() { cy.get('#CUR-dyWxzodj').clear().type('01/02/2023'); }
  LabelContractsStartDateDoneButton() { cy.xpath('//button[contains(text(),"Done")]').click().wait(1000); }
  LabelContractsEndDate() { cy.get('#CUR-HCfjjYNb').clear().type('01/02/2023'); }
  LabelContractsForeignID() { cy.get('#CUR-gaQtKgcB').clear().type('Gelo12345'); }
  LabelContractsProjectID() { cy.get('#CUR-projectId-input').clear().type('Contract12345'); }
  // Categories
  LabelContractsClickCategoriesDD() { cy.xpath('//label[@id="CUR-NqJxUpNS"]/following::input[@type="search"][1]').click(); }
  LabelContractsTypeCategoriesDD() { cy.xpath('//label[@id="CUR-NqJxUpNS"]/following::input[@type="search"][1]').type('Creator').wait(1000); }
  LabelContractsSelectCreator() { cy.get('#CUR-nxGGltrV span').contains('Creator').click(); }
  // HomeCurrency
  LabelContractsHomeCurrencyDD() { cy.xpath('//label[@id="CUR-tXdmkGHf"]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  LabelContractsHomeCurrencyDDSelection() { cy.xpath('//label[@id="CUR-tXdmkGHf"]/following::span[@id="CUR-LQcCzhiE"][1]').click({ force: true }); }
  // Accounting Period
  LabelContractsAccountingPeriod() { cy.xpath('//label[@id="CUR-KuWObaYW"]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  LabelContractsAccountingPeriodDDSelection() { cy.get('#CUR-BcAglvFK').click(); }
  // Finances
  LabelContractsOpeningBalance() { cy.get('#CUR-XAgXnZFz').type('50'); }
  LabelContractsMinPayout() { cy.get('#CUR-pLtIIIAd').type('10'); }
  // Contract Type
  LabelContractsClickContractType() { cy.get('#CUR-lCgBDBVK').click().wait(1000); }
  LabelContractsClickContractTypeDDSelection() { cy.get('#CUR-lCgBDBVK span').contains('Royalty').click(); }
  // terms page
  LabelContractsTermsTab() { cy.get('#CUR-aXNqZBBZ').click().wait(3000); }
  LabelContractsSales() { cy.get('#CUR-rjmQDouq').click(); }
  LabelContractsDealTypeDD() { cy.xpath('//div[@id="CUR-MWHEIZHC"]/following::select[@ng-model="sale.type"]').select('string:Gross Receipts'); }
  LabelContractsRate() { cy.xpath('//label[contains(text(),"Cat Group")]/following::input[@type="text"][2]').type('100'); }
  LabelContractsMultiplier() { cy.xpath('//div[@id="CUR-MWHEIZHC"]/following::input[@type="text"][3]').type('1'); }
  LabelContractsReduction() { cy.xpath('//div[@id="CUR-MWHEIZHC"]/following::input[@type="text"][4]').type('1'); }
  // save and validate created data  
  LabelContractsTermsSave() { cy.get('#CUR-TinbGPNU').click().wait(5000); }
  LabelContractsValidation1() { cy.get('#CUR-tYltRUcS').should('have.value', 'A Smoke Contract'); }
  LabelContractsValidation2() { cy.get('#CUR-projectId-input').should('have.value', 'Contract12345'); }
  LabelContractsValidation3() { cy.get('#CUR-XanMLNZY').should('have.text', 'Royalty'); }
  // validate on index page
  LabelContractsClickContractsLink() { cy.get('#CUR-wOfZbPpM').click().wait(3000); }
  LabelContractsCreatedContract() { cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract').should('be.visible'); }
  LabelContractsRoyaltyValidation() { cy.get('#CUR-EcVRXuaF span').contains('Royalty').first().should('be.visible'); }
  LabelContractsCreatorValidation() { cy.get('#CUR-EcVRXuaF span').contains('Creator').should('be.visible'); }
  // Update Contract  
  LabelContractsClickCreateContract() { cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract').click().wait(1000); }
  LabelContractsUpdateName() { cy.get('#CUR-tYltRUcS').clear().type('A Smoke Contract update'); }
  LabelContractsUpdateProjectID() { cy.get('#CUR-projectId-input').clear().type('C123457'); }
  // save and validate updated data 
  LabelContractsUpdateSave() { cy.get('#CUR-TinbGPNU').click(); }
  LabelContractsUpdateNameValidation() { cy.get('#CUR-tYltRUcS').should('have.value', 'A Smoke Contract update'); }
  LabelContractProjectIDValidation() { cy.get('#CUR-projectId-input').should('have.value', 'C123457'); }
  // validate on index page
  LabelContractsClickContractsLink1() { cy.get('#CUR-wOfZbPpM').click().wait(3000); }
  LabelContractsUpdateContractValidation() { cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract update').should('be.visible'); }
  LabelContractsTypeValidation() { cy.get('#CUR-EcVRXuaF span').contains('Royalty').first().should('be.visible'); }
  // delete contract on edit page
  LabelContractsClickDeleteSelected() { cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract update').click().wait(1000); }
  LabelContractsClickDeleteButton() { cy.get('#CUR-EDDJtFXV').click(); }
  LabelContractsClickDeleteButtonModal() { cy.get('#CUR-SIepMXur').click().wait(1000); }


  // Mechanical Contracts Test Case
  LabelMechContractsMenu1() { cy.get('#sidebar-contracts > a').click(); }
  LabelMechechanicalsSubmenu() { cy.get('#sidebar-mechanicals > a').click(); }
  // Mechanical Page Content Validation
  LabelMechContractsLink() { cy.get('#CUR-nAjCXYYG').should('have.text', 'Mechanical Contracts'); }
  LabelMechContractsDelete() { cy.get('#CUR-IPEEOupo').should('be.visible'); }
  LabelMechContractsCreate() { cy.get('#CUR-UDpJJUhA').should('be.enabled'); }
  LabelMechExport() { cy.get('#CUR-GqETKmnj').should('be.visible'); }
  LabelMechImportContracts() { cy.get('#CUR-xqVjxuMZ').should('be.visible'); }
  LabelMechimportTransactions() { cy.get('#CUR-SOZjjcnO').should('be.visible'); }
  LabelMechExportTransactions() { cy.get('#CUR-VmJCQpXn').should('be.visible'); }
  LabelMechSearchBar() { cy.get('#CUR-rmJHDCfY').should('be.visible'); }
  LabelMechComplete() { cy.xpath('//label[@id="CUR-JnbARxvG"]/following::span[@tabindex="-1"]').should('be.visible'); } // Complete
  LabelMechCompany1() { cy.xpath('//label[@id="contract-company-search-label"]/following::input[@type="search"][1]').should('be.visible'); } // Company
  LabelMechCategory() { cy.xpath('//label[@id="contract-contractCategories-search-label"]/following::input[@type="search"][1]').should('be.visible'); } // Category
  LabelMechFilter() { cy.get('#CUR-uGIsUwPG').should('be.visible'); } // Filter
  LabelMechName() { cy.get('.sorting_asc').should('have.text', 'Name'); }
  LabelMechType1() { cy.get('#CUR-FmLOyUsD th').contains('Type').should('be.visible'); }
  LabelMechCategories() { cy.get('#CUR-FmLOyUsD th').contains('Categories').should('be.visible'); }
  LabelMechCreated() { cy.get('#CUR-FmLOyUsD th').contains('Created').should('be.visible'); }
  // Create Mechanical Contract
  LabelMechClickCreate() { cy.get('#CUR-UDpJJUhA').click().wait(1000); }
  LabelMechPayeeField() { cy.get('#CUR-payee-select-field').clear().type('payee 2').wait(1000); }
  LabelMechPayeeTypeAhead() { cy.get('#CUR-eahYeMnc a').contains('zzz payee 2').first().click(); }
  LabelMechCompany() { cy.get('#CUR-GcRTTdNA').click().wait(1000); }
  LabelMechCompanySelection() { cy.xpath('//label[@id="CUR-aytJgykW"]/following::span[@class="ui-select-choices-row-inner"][1]').contains('Test Pixel 1').click(); }
  LabelMechNameField() { cy.get('#CUR-tYltRUcS').clear().type('A Mechanical Smoke'); }
  LabelMechStartName() { cy.get('#CUR-dyWxzodj').click().clear().type('01/01/2022'); }
  LabeMechFilesHeader() { cy.get('#CUR-TgDcnQlg').click(); }
  LabelMechEndDate() { cy.get('#CUR-HCfjjYNb').click().clear().type('01/01/2023'); }
  LabelMechFilesHeader2() { cy.get('#CUR-TgDcnQlg').click(); }
  LabelMechForeignID1() { cy.get('#CUR-gaQtKgcB').clear().type('AM129203028'); }
  LabelMechCategories1() { cy.get('.input-xs').click(); }
  LabelMechType() { cy.xpath('//label[@id="CUR-NqJxUpNS"]/following::input[@type="search"][1]').type('Creator').wait(1000); }
  LabelMechCategoriesDDSelection() { cy.xpath('//label[@id="CUR-NqJxUpNS"]/following::span[contains(text(),"Creator")]').contains('Creator').click({ force: true }); }
  LabelMechProjectID() { cy.get('#CUR-projectId-input').clear().type('AMS10928272'); }
  LabelMechCurrency() { cy.get('#CUR-isvSrjLA').click().wait(1000); }
  LabelMechHomeCurrency() { cy.get('#CUR-isvSrjLA span span').contains('Home Currency').click(); }
  LabelMechLicenseNumber() { cy.get('#CUR-oaTCKDBN').clear().type('123456'); }
  LabelMechAccountingPeriod() { cy.get('#CUR-ZxtyZCPP').click().wait(1000); }
  LabelMechAccountingPeriodSelection() { cy.get('#CUR-ZxtyZCPP div ul li div span span').contains('Yearly').first().click(); }
  LabelMechOpeningBalance() { cy.get('#CUR-XAgXnZFz').clear().type('50'); }
  LabelMechMinPayout() { cy.get('#CUR-pLtIIIAd').clear().type('10'); }
  LabelMechNotes() { cy.get('#CUR-BIaDTDYH > .form-control').click(); }
  LabelMechTermsTab() { cy.get('#CUR-aXNqZBBZ').click(); }
  LabelMechAddTerm() { cy.get('#CUR-XYgdzizn').click().wait(3000); }
  LabelMechRate() { cy.xpath('//label[contains(text(),"Rate %")]/following::input[@type="text"][1]').clear().type('100'); }
  LabelMechTermsSave() { cy.get('#CUR-TinbGPNU').click().wait(2000); } // save
  // Validate Created Data on edit page
  LabelMechSuccessMsg() { cy.get('.alert-success').should('be.visible').contains('Contract successfully created'); }
  LabelMechVerifyPayee() { cy.get('#CUR-payee-select-field').should('have.value', 'zzz payee 2'); }
  LabelMechVerifyCompany() { cy.xpath('//label[@id="CUR-aytJgykW"]/following::span[@tabindex="-1"][1]').contains('Test Pixel 1').should('be.visible'); }
  LabelMechVerifyName() { cy.get('#CUR-tYltRUcS').should('have.value', 'A Mechanical Smoke'); }
  LabelMechForeignID() { cy.get('#CUR-gaQtKgcB').should('have.value', 'AM129203028'); }
  // Validate Created Data on index page
  LabelClickMechContractsLink() { cy.get('#CUR-ekDjaNNY').click().wait(2000); }
  LabelMechVerifyCreated() { cy.get('#CUR-EcVRXuaF a').contains('A Mechanical Smoke').should('be.visible'); }
  LabelMechVerifyType() { cy.get('#CUR-EcVRXuaF span').contains('Mechanical').first().should('be.visible'); }
  LabelMechVerifyCreator() { cy.get('#CUR-EcVRXuaF span').contains('Creator').should('be.visible'); }
  // Update Mechanical Contract on edit page
  LabelMechClickCreated() { cy.get('#CUR-EcVRXuaF a').contains('A Mechanical Smoke').click(); }
  LabelMechUpdateName() { cy.get('#CUR-tYltRUcS').clear().type('A Mechanical Smoke Update'); }
  LabelMechUpdateSave() { cy.get('#CUR-TinbGPNU').click().wait(2000); }
  // Validate Updated Data on edit and index page
  LabelMechUpdateSuccessMsg() { cy.get('.alert-success').should('be.visible').contains('Contract successfully saved'); }
  LabelMechVerifyUpdatedName() { cy.get('#CUR-tYltRUcS').should('have.value', 'A Mechanical Smoke Update'); }
  LabelMechContractLink2() { cy.get('#CUR-ekDjaNNY').click().wait(2000); }
  LabelMechVerifyUpdatedName2() { cy.get('#CUR-EcVRXuaF a').contains('A Mechanical Smoke Update').should('be.visible'); }
  // Delete Mechanical Contract
  LabelMechClickDelete() { cy.get('#CUR-EcVRXuaF a').contains('A Mechanical Smoke Update').click(); }
  LabelMechDelete() { cy.get('#CUR-EDDJtFXV').click(); }
  LabelMechDeleteModal() { cy.get('#CUR-SIepMXur').click().wait(2000); }
  


  // Composers Test Case
  // Navigate to Composer Select Page
  LabelComposersCatalogueMenu() { cy.get('#sidebar-catalogue > a').click(); }
  LabelComposersSubMenu() { cy.get('#sidebar-composers > a').click(); }
  // Validate Composer Select Page
  LabelComposersLink() { cy.get('#CUR-NGqqjbFT').should('have.text', 'Composers'); }
  LabelComposersSearchBar() { cy.get('#CUR-ucZUtjNV').should('be.visible'); }
  LabelComposersSearchIcon() { cy.get('#CUR-xRrQkQuq > .pg-search').should('be.visible'); }
  LabelComposersExportButton() { cy.get('#CUR-uUKVnFba').should('be.visible').contains('Export'); }
  LabelComposersImportButton() { cy.get('#CUR-eTaahVPO').should('be.visible').contains('Import'); }
  LabelComposersDeleteButton() { cy.get('#CUR-FuVciLZH').should('be.visible').contains('Delete'); }
  LabelComposersCreateButton() { cy.get('#CUR-KSqmmqMO').should('be.visible').contains('Create'); }
  LabelComposersHeader() { cy.get('#CUR-BHqUuhJj').should('be.visible').contains('Composers'); }
  LabelComposersNameHeader() { cy.get('.sorting_asc').should('be.visible').should('have.text', 'Name'); }
  LabelComposersCaeHeader() { cy.xpath('//div[@id="CUR-BHqUuhJj"]/following::th[3]').should('be.visible').should('have.text', 'CAE'); }
  LabelComposersCreated() { cy.xpath('//div[@id="CUR-BHqUuhJj"]/following::th[4]').should('be.visible').should('have.text', 'Created'); }
  LabelComposersPaginationPrev() { cy.xpath('//a[@id="CUR-LEYMBPSy"]/following::span[@aria-label="Previous"]').should('be.visible'); }
  LabelComposersPagination1() { cy.xpath('//a[@id="CUR-LEYMBPSy"]/following::span[@class="ng-binding current"]').should('be.visible').should('have.text', '1'); }
  LabelComposersPaginationNext() { cy.xpath('//a[@id="CUR-LEYMBPSy"]/following::span[@aria-label="Next"]').should('be.visible'); }
  LabelComposersShowing25() { cy.get('#CUR-LqwYOLQU').should('be.visible').should('have.text', 'Showing 25 Per Page  |'); }
  LabelComposersShowAll() { cy.get('#CUR-LEYMBPSy').should('be.visible').should('have.text', 'Show All'); }
  // Click Create Button
  LabelClickCreateButton() { cy.get('#CUR-KSqmmqMO').click(); }
  // Validate create composer page
  LabelComposersOverviewTab() { cy.get('#CUR-pVNhgltH').should('be.visible').should('have.text', 'Overview'); }
  LabelComposersOverviewHeader() { cy.get('#CUR-smkapbFG').should('be.visible').contains('Overview'); }
  LabelComposersPartyID() { cy.get('#CUR-RZmpjwQE').should('be.visible').contains('Party ID'); }
  LabelComposersPartyIdVerify() { cy.get('#CUR-nbiKXCsP').should('be.visible').should('be.disabled'); }
  LabelComposersNameHeader1() { cy.get('#CUR-KtaROuOK').should('be.visible').should('have.text', 'Name'); }
  LabelComposersNameField() { cy.get('#CUR-xsBQITjy').should('be.visible'); }
  LabelComposersForeignIDHeader() { cy.get('#CUR-ifHNbXNd').should('be.visible').contains('Foreign ID'); }
  LabelComposersForeignIDField() { cy.get('#CUR-PznCFrfI').should('be.visible'); }
  LabelComposersFirstNameHeader() { cy.get('#CUR-HZHuhJGz').should('be.visible').should('have.text', 'First Name'); }
  LabelComposersFirstNameField() { cy.get('#CUR-TegBJoBK').should('be.visible'); }
  LabelComposersMiddleNameHeader() { cy.get('#CUR-eUymJsSE').should('be.visible').should('have.text', 'Middle Names'); }
  LabelComposersMiddleNameField() { cy.get('#CUR-DrmeRXPD').should('be.visible'); }
  LabelComposersSurnameHeader() { cy.get('#CUR-XlURFkkQ').should('be.visible').should('have.text', 'Surname'); }
  LabelComposersSurnameField() { cy.get('#CUR-JRzrthyU').should('be.visible'); }
  LabelComposersCAEHeader() { cy.get('#CUR-TrDBODzi').should('be.visible').should('have.text', 'CAE Number'); }
  LabelComposersCAEField() { cy.get('#CUR-BbMNJqNK').should('be.visible'); }
  // Enter create composer data
  LabelComposersTypeName() { cy.get('#CUR-xsBQITjy').clear().type(composerName); }
  LabelComposersTypeForeignID() { cy.get('#CUR-PznCFrfI').clear().type('111'); }
  LabelComposersTypeFirstName() { cy.get('#CUR-TegBJoBK').clear().type('Smoke'); }
  LabelComposersTypeMiddleName() { cy.get('#CUR-DrmeRXPD').clear().type('B'); }
  LabelComposersTypeSurName() { cy.get('#CUR-JRzrthyU').clear().type('Composer'); }
  LabelComposersTypeCAE() { cy.get('#CUR-BbMNJqNK').clear().type('123'); }
  LabelComposersCAETypeAhead() { cy.typeAheadSelection('tes', 'test publisher'); }
  // Save Composer & test response
  LabelComposersSaveButton() { cy.get('#CUR-rExQKhmY').click(); }
  LabelComposersSuccessMessage() { cy.get('.alert-success').should('be.visible').contains('composer successfully created'); }
  // Verify composer edit page with saved data 1
  LabelComposers1PartyIDVerification() { cy.get('#CUR-nbiKXCsP').should('be.visible').should('be.disabled'); }
  LabelComposersNameValidation() { cy.get('#CUR-xsBQITjy').should('have.value', composerName); }
  LabelComposersNameEditForeignID() { cy.get('#CUR-PznCFrfI').should('have.value', '111'); }
  LabelComposersEditFirstName() { cy.get('#CUR-TegBJoBK').should('have.value', 'Smoke'); }
  LabelComposersEditMiddleName() { cy.get('#CUR-DrmeRXPD').should('have.value', 'B'); }
  LabelComposersEditSurName() { cy.get('#CUR-JRzrthyU').should('have.value', 'Composer'); }
  LabelComposersEditCAE() { cy.get('#CUR-BbMNJqNK').should('have.value', '123'); }
  LabelComposers123Validation() { cy.xpath('//label[@id="CUR-rTzLwWeB"]/following::input[@type="text"]').should('have.value', 'test publisher'); }
  // Navigate to composer select page
  LabelComposersClickComposerLink() { cy.get('#CUR-NycXRuxX').click(); }
  // Find and click newly created composer
  LabelComposersClickNewCreatedComposer() { cy.selectScreenFind(composerName); }
  // Update composer data
  LabelComposersUpdateComposerName1() { cy.get('#CUR-xsBQITjy').clear().type(composerName + ' Changed'); }
  LabelComposersUpdateForeignID() { cy.get('#CUR-PznCFrfI').clear().type('222'); }
  LabelComposersUpdateFirstName() { cy.get('#CUR-TegBJoBK').clear().type('Smoke Changed'); }
  LabelComposersUpdateMiddleName() { cy.get('#CUR-DrmeRXPD').clear().type('C'); }
  LabelComposersUpdateSurName() { cy.get('#CUR-JRzrthyU').clear().type('Composer Changed'); }
  LabelComposersUpdateCAE() { cy.get('#CUR-BbMNJqNK').clear().type('321'); }
  LabelComposersTypeAheadSelection1() { cy.typeAheadSelection('lin', 'Linking to Publisher'); }// @todo !! Why does this only work on first two in dropdown
  // Save Composer & test response
  LabelComposersClickSave2() { cy.get('#CUR-rExQKhmY').click(); }
  LabelComposersSuccessfulMessage2() { cy.get('.alert-success').should('be.visible').contains('Composer successfully saved'); }
  // Verify composer edit page with saved data 2
  LabelComposersVerifyPartyId2() { cy.get('#CUR-nbiKXCsP').should('be.disabled'); }
  LabelComposersVerifyName2() { cy.get('#CUR-xsBQITjy').should('have.value', composerName + ' Changed'); }
  LabelComposersVerifyForeignID2() { cy.get('#CUR-PznCFrfI').should('have.value', '222'); }
  LabelComposersVerifyFirstName2() { cy.get('#CUR-TegBJoBK').should('have.value', 'Smoke Changed'); }
  LabelComposersVerifyMiddleName2() { cy.get('#CUR-DrmeRXPD').should('have.value', 'C'); }
  LabelComposersVerifySurName2() { cy.get('#CUR-JRzrthyU').should('have.value', 'Composer Changed'); }
  LabelComposersVerifyCAE() { cy.get('#CUR-BbMNJqNK').should('have.value', '321'); }
  LabelComposersVerifyA() { cy.xpath('//label[@id="CUR-rTzLwWeB"]/following::input[@type="text"]').should('have.value', 'Linking to Publisher'); }
  // Click through delete workflow and verify deletion
  LabelComposersClickDelete() { cy.get('#CUR-JaWdFtZJ').contains('Delete').click(); }
  LabelComposersVerifyDeleteModal() { cy.get('#CUR-mtUbndiF').should('be.visible'); }
  LabelComposersDeleteConfirmation() { cy.get('#CUR-gicTyKvK > p').should('have.text', 'Are you sure you want to delete this composer? This cannot be undone.'); }
  LabelComposersDeleteButtonClick() { cy.get('#CUR-bcgdhSSZ').contains('Delete').click().wait(2000); }
  



  // COMPLETED Testing Publishers Create, Read, Update and Delete Functions
  // Smoke Publisher TC
  LabelPublishersCatalogueMenu() { cy.get('#sidebar-catalogue > a').click(); }
  LabelPublishersSubMenu() { cy.get('#sidebar-publishers > a').click(); }
  // Index Page Content validations
  LabelPublishersLink() { cy.get('#CUR-WPeTuqhB').should('be.visible'); }
  LabelPublisherExportButton() { cy.get('#CUR-qSMNNTsL').should('be.visible'); }
  LabelPublishersDelete() { cy.get('#CUR-cUnwntgQ').should('be.visible'); }
  LabelPublishersImport() { cy.get('#CUR-cRnLChHq > .fa').should('be.visible'); }
  LabelPublishersCreate() { cy.get('#CUR-gzVjvyDf').should('be.enabled'); }
  LabelPublishersHeader() { cy.get('#CUR-IdTyYZVz').should('be.visible'); }
  LabelPublishersHeaderName() { cy.get('#CUR-UBgtBBTg th').contains('Name').should('be.visible'); }
  LabelPublishersCAE() { cy.get('#CUR-UBgtBBTg th').contains('CAE').should('be.visible'); }
  LabelPublishersCreated() { cy.get('#CUR-UBgtBBTg th').contains('Created').should('be.visible'); }
  LabelPublishersShowingPage25() { cy.get('#CUR-UyCYXogv').should('be.visible'); }
  LabelPublisherShowAll() { cy.get('#CUR-ZlQYpBSV').should('be.visible'); }
  // Input on edit page (create data)
  LabelPublishersClickCreate() { cy.get('#CUR-gzVjvyDf').click(); }
  LabelPublishersTypeName() { cy.get('#CUR-uwDhIFdL').type('A Publisher Smoke'); }
  LabelPublishersForeignIDField() { cy.get('#CUR-jBtFftsd').type('1245678'); }
  LabelPublishersCAEField() { cy.get('#CUR-YGFKkpxE').type('098765'); }
  // Save and validate on edit page
  LabelPublishersClickSaveButton() { cy.get('#CUR-dWTsVAEi').click().wait(1000); }
  LabelPublishersValidateName() { cy.get('#CUR-uwDhIFdL').should('have.value', 'A Publisher Smoke'); }
  LabelPublishersForeignName() { cy.get('#CUR-jBtFftsd').should('have.value', '1245678'); }
  LabelPublishersCAENumber() { cy.get('#CUR-YGFKkpxE').should('have.value', '098765'); }
  // Validate data on index page
  LabelPublishersClickLink() { cy.get('#CUR-kftJkCAH').click(); }
  LabelPublishersValidateCreated() { cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke').should('be.visible'); }
  LabelPublishersValidateCAE() { cy.get('#CUR-UBgtBBTg span').contains('098765').should('be.visible'); }
  // update data on edit page
  LabelPublishersClickCreatedPub() { cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke').click(); }
  LabelPublishersNameUpdate() { cy.get('#CUR-uwDhIFdL').clear().type('A Publisher Smoke Update'); }
  LabelPublishersUpdateForeignID() { cy.get('#CUR-jBtFftsd').clear().type('ABC1245678'); }
  LabelPublishersupdateCAE() { cy.get('#CUR-YGFKkpxE').clear().type('ABC098765'); }
  LabelPublishersContractUpdate() { cy.get('#CUR-INFEeFLF input').type('Gelo Test').wait(1000); }
  LabelPublishersContractSelect() { cy.get('#CUR-INFEeFLF strong').contains('Gelo Test').click(); }
  // save and validate updated data on edit page
  LabelPublishersUpdateSave() { cy.get('#CUR-dWTsVAEi').click().wait(1000); }
  LabelPublisherSuccessMsg() { cy.get('.alert-success').should('be.visible').contains('Publisher successfully saved'); }
  LabelPublishersValidateUpdatedName() { cy.get('#CUR-uwDhIFdL').should('have.value', 'A Publisher Smoke Update'); }
  LabelPublishersValidateUpdatedForeignID() { cy.get('#CUR-jBtFftsd').should('have.value', 'ABC1245678'); }
  LabelPublishersValidateUpdatedCAE() { cy.get('#CUR-YGFKkpxE').should('have.value', 'ABC098765'); }
  // validate updayed data on index page
  LabelPublishersLinkClick2() { cy.get('#CUR-kftJkCAH').click(); }
  LabelPublishersValidateUpdated2() { cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke Update').should('be.visible'); }
  LabelPublishersValidateA() { cy.get('#CUR-UBgtBBTg span').contains('ABC098765').should('be.visible'); }
  // delete data
  LabelPublishersDeleteCreated() { cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke Update').click({ force: true }); }
  LabelPublishersClickDelete() { cy.get('#CUR-mvVYCWXR').click({ force: true }); }
  LabelPublishersClickDeleteModal() { cy.get('#CUR-LnaBreyR').click({ force: true }); }



  // Tracks TC
  LabelTracksCatalogueMenu() { cy.get('#sidebar-catalogue > a').click({ force: true }); }
  LabelTracksSubMenu() { cy.get('#sidebar-tracks > a').click(); }
  // Page content validation
  LabelTracksLink() { cy.get('#CUR-EbAPTKvy').should('be.visible'); }
  LabelTracksSearchBar() { cy.get('#CUR-KcppnpIT').should('be.visible'); }
  LabelTracksExportButton() { cy.get('#CUR-FOxFDCYV').should('be.visible'); }
  LabelTracksDeleteButton() { cy.get('#CUR-DsaOOCyn').should('be.visible'); }
  LabelTracksCreateButton() { cy.get('#CUR-ImZPJRMB').should('be.visible'); }
  LabelTracksCATGroupField() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::input[@type="search"][1]') }
  LabelTracksContractField() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::input[@type="search"][2]') }
  LabelTracksCreatedAfter() { cy.get('#CUR-DbLvGukz').should('be.visible'); }
  LabelTracksCreatedBefore() { cy.get('#CUR-rfxIOvip').should('be.visible'); }
  LabelTracksParticipation() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::input[@type="number"]') }
  LabelTracksCompleteDD() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::span[@aria-label="Select box activate"][1]') }
  LabelTracksLabelField() { cy.get('#CUR-filter-label-textbox').should('be.visible'); }
  LabelTracksCompanyField() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::input[@type="search"][4]') } 
  LabelTracksMechanicalContract() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::input[@type="search"][5]') }
  LabelTracksFilter() { cy.get('#CUR-uiaJvCvp').should('be.visible'); }
  LabelTracksTitleHeader() { cy.get('#CUR-MSfnkrEY th').contains('Title').should('be.visible'); }
  LabelTracksVersionHeader() { cy.get('#CUR-MSfnkrEY th').contains('Version').should('be.visible'); }
  LabelTracksArtistHeader() { cy.get('#CUR-MSfnkrEY th').contains('Artist').should('be.visible'); }
  LabelTracksISRCHeader() { cy.get('#CUR-MSfnkrEY th').contains('ISRC').should('be.visible'); }
  LabelTracksCreatedHeader() { cy.get('#CUR-MSfnkrEY th').contains('Created').should('be.visible'); }
  // Create Track
  LabelTracksClickCreateButton() { cy.get('#CUR-ImZPJRMB').click({ force: true }).wait(1000); }
  LabelTracksOverviewTab() { cy.get('#CUR-BpKgzLNW').should('be.visible'); }
  LabelTracksTitleField() { cy.get('#CUR-aJwaQxhr').clear().type('A Tracks Smoke'); }
  LabelTracksVersionField() { cy.get('#CUR-kQslEfhD').clear().type('v123'); }
  LabelTracksArtistField() { cy.get('#CUR-MbNpDepo').clear().type('Gelo'); }
  LabelTracksForeignID() { cy.get('#CUR-YwEVxbHr').clear().type('Tracks12345'); }
  LabelTracksProjectID() { cy.get('#CUR-projectId-input').clear().type('Tracks12345'); }
  LabelTracksCatalogueGroupsClick() { cy.xpath('//input[@id="CUR-aJwaQxhr"]/following::input[@type="search"][1]').click({ force: true }).wait(2000) }
  LabelTracksCatalogueGroupsSelection() { cy.get('#CUR-vcYOVxje span').contains('CAT 1').click(); }
  LabelTracksISRCType() { cy.get('#CUR-cOegSfmz').clear().type('Smoke001'); }
  LabelTracksLabel() { cy.get('#CUR-XGvXfkQh').clear().type('GeloTest'); }
  LabelTracksPline() { cy.get('#CUR-FALBZvqH').clear().type('1234'); }
  LabelTracksDuration() { cy.get('#CUR-egOoZEpB').clear().type('120'); }
  LabelTracksRightsTab() { cy.get('#CUR-gXGXUiea').click(); }
  LabelTracksAddContract() { cy.get('#CUR-lwiBgRup').click(); }
  // LabelTracksContractsSearchField1() { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"][1]').click({ force: true }).type('Test Gelo 100',{ force: true }).wait(2000); }
  LabelTracksContractsSearchField() { cy.get('contract-select-field.ng-isolate-scope > .row > .form-group > input').clear().type('Test Gelo 100').wait(2000); }
  LabelTracksContractsSelection() { cy.xpath('//strong[contains(text(),"Test Gelo 100")]').click({ force: true }) }
  // save and validate created data on edit page
  LabelTracksClickSaveRights() { cy.get('#CUR-UaNimHCt').click({ force: true }).wait(1000); } // Save Button
  LabelTracksValidateTitle() { cy.get('#CUR-aJwaQxhr').should('have.value', 'A Tracks Smoke'); } 
  LabelTracksValidateVersion() { cy.get('#CUR-kQslEfhD').should('have.value', 'v123'); }
  LabelTracksValidateArtist() { cy.get('#CUR-MbNpDepo').should('have.value', 'Gelo'); }
  LabelTracksValidateForeignID() { cy.get('#CUR-YwEVxbHr').should('have.value', 'Tracks12345'); }
  LabelTracksValidateProjectID() { cy.get('#CUR-projectId-input').should('have.value', 'Tracks12345'); }
  LabelTracksRightsTabClick() { cy.get('#CUR-HtCcvMVh').click(); } // Go to Rights Tab
  LabelTracksContractValidate() { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"][1]').should('have.value', 'Test Gelo 100'); }
  // validate created data on index page 
  LabelTracksLinkClick1() { cy.get('#CUR-MwPfmXzd').click().wait(2000); }
  LabelTracksValidateCreatedTitle() { cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke').should('be.visible'); }
  LabelTracksValidateCreatedArtist() { cy.get('#CUR-MSfnkrEY span').contains('Gelo').should('be.visible'); }
  LabelTracksValidateCreatedVersion() { cy.get('#CUR-MSfnkrEY span').contains('v123').should('be.visible'); }
  LabelTracksValidateCreatedISRC() { cy.get('#CUR-MSfnkrEY span').contains('Smoke001').should('be.visible'); }
  // Update Tracks on edit page
  LabelTracksEditCreated() { cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke').click({ force: true }); }
  LabelTracksEditTitle() { cy.get('#CUR-aJwaQxhr').clear().type('A Tracks Smoke Update'); }
  LabelTracksEditVersion() { cy.get('#CUR-kQslEfhD').clear().type('v1236789'); }
  LabelTracksEditArtist() { cy.get('#CUR-MbNpDepo').clear().type('Gelo1234'); }
  LabelTracksEditForeignID() { cy.get('#CUR-YwEVxbHr').clear().type('098765'); }
  LabelTracksEditProjectID() { cy.get('#CUR-projectId-input').clear('T'); }
  LabelTracksEditProjectIDType() { cy.get('#CUR-projectId-input').type('T09876'); }
  // save and validate updated data on edit page
  LabelTracksClickEditSave() { cy.get('#CUR-UaNimHCt').click({ force: true }).wait(1000); }
  LabelTracksValidateUpdatedTitle() { cy.get('#CUR-aJwaQxhr').should('have.value', 'A Tracks Smoke Update'); }
  LabelTracksValidateUpdatedVersion() { cy.get('#CUR-kQslEfhD').should('have.value', 'v1236789'); }
  LabelTracksValidateUpdatedArtist() { cy.get('#CUR-MbNpDepo').should('have.value', 'Gelo1234'); }
  LabelTracksValidateUpdatedForeignID() { cy.get('#CUR-YwEVxbHr').should('have.value', '098765'); }
  LabelTracksValidateUpdateedProjectID() { cy.get('#CUR-projectId-input').should('have.value', 'T09876'); }
  // validate updtaed data on index page 
  LabelTracksLinkClick2() { cy.get('#CUR-MwPfmXzd').click().wait(2000); }
  LabelTracksValidatEditedTitle() { cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke Update').should('be.visible'); }
  LabelTracksValidatEditedeVersion() { cy.get('#CUR-MSfnkrEY span').contains('v1236789').should('be.visible'); } 
  LabelTracksValidateEditedArtist() { cy.get('#CUR-MSfnkrEY span').contains('Gelo1234').should('be.visible'); }
  LabelTracksValidateISRC() { cy.get('#CUR-MSfnkrEY span').contains('Smoke001').should('be.visible'); }
  // delete track on edit page
  LabelTracksClickCreatedTitleDelete() { cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke Update').click(); }
  LabelTrakcsClickDeleteButton() { cy.get('#CUR-YLCMDySu').click(); }
  LabelTracksClickDeleteModalButton() { cy.get('#CUR-tOCyBdOF').click(); }

  // Releases TC
  LabelReleasesCatalogueMenu() { cy.get('#sidebar-catalogue > a').click({ force: true }); }
  LabelReleasesSubmenu() { cy.get('#sidebar-releases > a').click(); }
  // validate index page content
  LabelReleasesSearchBar() { cy.get('#CUR-cFpKxgfD').should('be.visible'); }
  LabelReleasesBulkUpdateButton() { cy.get('#CUR-cBzPNSYL').should('be.visible'); }
  LabelReleasesExportButton() { cy.get('#CUR-TCRcrdqE').should('be.visible'); }
  LabelReleasesImportButton() { cy.get('#CUR-zWopaSgP').should('be.visible'); }
  LabelReleasesDeleteButton() { cy.get('#CUR-qIHIFTHv').should('be.visible'); }
  LabelReleasesCreateButton() { cy.get('#CUR-wACALinu').should('be.visible'); }
  LabelReleasesCATGroup() { cy.xpath('//a[@id="CUR-ebSvwdEJ"]/following::input[@type="search"][1]') }
  LabelReleasesContract() { cy.xpath('//a[@id="CUR-ebSvwdEJ"]/following::input[@type="search"][2]') }
  LabelReleasesCreatedAfter() { cy.get('#CUR-hrSUzIbD').should('be.visible'); }
  LabelReleasesCreatedBefore() { cy.get('#CUR-qonjDtEo').should('be.visible'); }
  LabelReleasesParticipation() { cy.xpath('//input[@type="number"]') }
  LabelReleasesComplete() { cy.xpath('//a[@id="CUR-ebSvwdEJ"]/following::span[@tabindex="-1"][1]') }
  LabelReleasesLabel() { cy.get('#CUR-filter-label-textbox').should('be.visible'); }
  LabelReleasesCompany() { cy.get('#CUR-filter-company-select').should('be.visible'); }
  LabelReleasesArtist() { cy.get('#CUR-filter-distributionChannel-select').should('be.visible'); }
  LabelReleasesFormat() { cy.get('#CUR-filter-format-select').should('be.visible'); }
  LabelReleasesFilter() { cy.get('#CUR-nVfWuehA').should('be.visible'); }
  LabelReleasesTableHeader() { cy.get('#CUR-HZtPrtxX').should('be.visible'); }
  LabelReleasesTitleHeader() { cy.get('#CUR-VtMGALPT th').contains('Title').should('be.visible'); }
  LabelReleasesArtistHeader() { cy.get('#CUR-VtMGALPT th').contains('Artist').should('be.visible'); }
  LabelReleasesCATNoHeader() { cy.get('#CUR-VtMGALPT th').contains('Cat No').should('be.visible'); }
  LabelReleasesBarcodeHeader() { cy.get('#CUR-VtMGALPT th').contains('Barcode').should('be.visible'); }
  LabelReleasesFormatHeader() { cy.get('#CUR-VtMGALPT th').contains('Format').should('be.visible'); }
  // create on edit page and input fields 
  LabelReleasesClickCreate() { cy.get('#CUR-wACALinu').click({ force: true }); }
  LabelReleasesTitleField() { cy.get('#CUR-jJwVtlIr').clear().type('A Release Smoke '); }
  LabelReleasesVersionField() { cy.get('#CUR-bhQcVumh').clear().type('v123'); }
  LabelReleasesClickOutsideVersion() { cy.get('#CUR-rsNOsbpf').click(); }
  LabelReleasesInputArtist() { cy.get('#CUR-fzTwggPi').clear().type('gelo12345'); }
  LabelReleasesInputForeignID() { cy.get('#CUR-gjpsiQTF').clear().type('test12345'); }
  LabelReleasesProjectID() { cy.get('#CUR-projectId-input').clear().type('ProID12345'); }
  LabelReleasesDistributionChannel() { cy.get('#CUR-VBAWXqzd').click().wait(1000); }
  LabelReleasesDistributionSelection() { cy.xpath('//span[@id="CUR-oDYKgzAp" and contains(text(),"Digital")]').click({ force: true }) }
  LabelReleasesFormatDD() { cy.get('#CUR-FjplwIxU').click().wait(1000); }
  LabelReleasesFormatDDSelection() { cy.get('#CUR-FjplwIxU span').contains('CD').click(); }
  LabelReleasesPriceCategory() { cy.get('#CUR-AjGvMDtA').click().wait(1000); }
  LabelReleasesPriceCategoryDD() { cy.get('#CUR-AjGvMDtA span').contains('Full Price').click(); }
  LabelReleasesMainDealerPrice() { cy.get('#CUR-YIiKGOHt').clear().type('123'); }
  LabelReleasesCatNoField() { cy.get('#CUR-LsLPGmQZ').clear().type('TEST1001'); }
  LabelReleasesBarCode() { cy.get('#CUR-QkNcjbSR').clear().type('12345098751'); }
  LabelReleasesLabelField() { cy.get('#CUR-SEeQyaaO').clear().type('test smoke'); }
  LabelReleasesReleaseDate() { cy.get('#CUR-rJbBtFhO').click({ force: true }); }
  LabelReleasesReleaseDateType() { cy.get('#CUR-rJbBtFhO').clear().type('01/02/2023'); }
  LabelReleasesReleaseCatGroups() { cy.get('#CUR-gnUaOjad').click().wait(1000); }
  LabelReleasesReleaseCatGroupSelection() { cy.get('#CUR-gnUaOjad span').contains('CAT 1').click(); }
  LabelReleasesRightsTab() { cy.get('#CUR-MxSnludE').click().wait(1000); }
  LabelReleasesAddContract1() { cy.get('#CUR-LkJBDvYJ').click({ force: true }).wait(3000); }
  // LabelReleasesTypeContract1() { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"][1]').type('test gelo 100', { force: true }).wait(1000); }
  LabelReleasesTypeContract() { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"][1]').clear().type('test gelo 100').wait(1000); }
  LabelReleasesSelection() { cy.xpath('//a[@title="Test Gelo 100"]').contains('Test Gelo 100').click(); }
  // save and validate created data on edit page
  LabelReleasesClickSave() { cy.get('#CUR-NVcvbMbM').click().wait(2000); }
  LabelReleasesValidateCreatedTitle() { cy.get('#CUR-jJwVtlIr').should('have.value', 'A Release Smoke'); }
  LabelReleasesValidateCreatedVersion() { cy.get('#CUR-bhQcVumh').should('have.value', 'v123'); }
  LabelReleasesValidateCreatedArtist() { cy.get('#CUR-fzTwggPi').should('have.value', 'gelo12345'); }
  LabelReleasesValidateCreatedForeignID() { cy.get('#CUR-gjpsiQTF').should('have.value', 'test12345'); }
  LabelReleasesValidateCreatedProjectID() { cy.get('#CUR-projectId-input').should('have.value', 'ProID12345'); }
  LabelReleasesValidateCreatedFormat() { cy.get('#CUR-EOPFqKqU').should('have.text', 'CD'); }
  LabelReleasesValidateCreatedPriceCat() { cy.get('#CUR-LjBshnBd').should('have.text', 'Full Price'); }
  LabelReleasesValidateCreatedMainDealerPrice() { cy.get('#CUR-YIiKGOHt').should('have.value', '123'); }
  // validate created data on index page 
  LabelReleasesLinkClick() { cy.get('#CUR-NVopGmjV').click().wait(8000); }
  LabelReleasesValidateTitle() { cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').should('be.visible'); }
  LabelReleasesValidateArtist() { cy.get('#CUR-VtMGALPT span').contains('gelo12345').should('be.visible'); }
  LabelReleasesValidateCatNo() { cy.get('#CUR-VtMGALPT span').contains('TEST1001').should('be.visible'); }
  LabelReleaseValidateBarCode() { cy.get('#CUR-VtMGALPT span').contains('12345098751').should('be.visible'); }
  // update on edit page and input fields
  LabelReleasesUpdateCreatedClick() { cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').click(); }
  LabelReleasesUpdateTitle() { cy.get('#CUR-jJwVtlIr').clear().type('A Release Smoke Update'); }
  LabelReleasesUpdateVersion() { cy.get('#CUR-bhQcVumh').clear().type('v0987'); }
  LabelReleasesUpdateArtist() { cy.get('#CUR-fzTwggPi').clear().type('gelo09876'); }
  LabelReleasesUpdateProjectID() { cy.get('#CUR-projectId-input').clear().type('Smoke12098'); }
  LabelReleasesUpdateCatNo() { cy.get('#CUR-LsLPGmQZ').clear().type('SMOKE0987'); } 
  // save and validate updated data on edit page
  LabelReleasesUpdateClickSave() { cy.get('#CUR-NVcvbMbM').click().wait(2000); }
  LabelReleaseesValidateUpdatedTitle() { cy.get('#CUR-jJwVtlIr').should('have.value', 'A Release Smoke Update'); }
  LabelReleasesValidateUpdatedVersion() { cy.get('#CUR-bhQcVumh').should('have.value', 'v0987'); }
  LabelReleasesValidateUpdatedArtist() { cy.get('#CUR-fzTwggPi').should('have.value', 'gelo09876'); }
  LabelReleasesValidateUpdatedForeignID() { cy.get('#CUR-gjpsiQTF').should('have.value', 'test12345'); }
  LabelReleasesValidateUpdatedProjectID() { cy.get('#CUR-projectId-input').should('have.value', 'Smoke12098'); }
  // validate updated data on index page
  LabelReleasesClickReleasesLink1() { cy.get('#CUR-NVopGmjV').click().wait(8000); }
  LabelReleasesValidateUpdatedTitle1() { cy.get('#CUR-VtMGALPT a').contains('A Release Smoke Update').should('be.visible'); }
  LabelReleasesValidateUpdatedArtist1() { cy.get('#CUR-VtMGALPT span').contains('gelo09876').should('be.visible'); }
  LabelReleaseValidateUpdatedCatNo1() { cy.get('#CUR-VtMGALPT span').contains('gelo09876').should('be.visible'); }
  LabelReleaseValidateUpdatedBarCode1() { cy.get('#CUR-VtMGALPT span').contains('12345098751').should('be.visible'); }
  LabelReleaseValidateUpdatedFormat1() { cy.get('#CUR-VtMGALPT span').contains('CD').should('be.visible'); }
  // Delete Release 
  LabelReleasesDeleteClickCreated() { cy.get('#CUR-VtMGALPT a').contains('A Release Smoke Update').click(); }
  LabelReleasesClickDeleteButton() { cy.get('#CUR-IORvSKtL').click(); }
  LabelReleasesClickDeleteModal() { cy.get('#CUR-NOYiTdFv').click().wait(1000); }



  // Period TC
  LabelPeriodStatementsMenu() { cy.get('#sidebar-statements > a').click({ force: true }); }
  LabelPeriodSubmenu() { cy.get('#sidebar-periods > a').click(); }
  LabelPeriodCreate() { cy.get('#CUR-gYxIZkCO').click({ force: true }); }
  // create page
  LabelPeriodNameField() { cy.xpath('//input[@type="text" and @ng-model="period.name"]').clear().type('A Period Test'); }
  LabelPeriodAccountingPeriodTypeDD1() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@tabindex="-1"][1]').wait(3000).click(); }
  // LabelPeriodAccountingPeriodTypeDD() { cy.get(':nth-child(3) > .ui-select-container > .ui-select-match > .btn-default').wait(3000).click(); }
  // LabelPeriodAccountingPeriodTypeDDSelection1() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::div[@id="ui-select-choices-row-2-0"]').click({ force: true }); }
  LabelPeriodAccountingPeriodTypeDDSelection2() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@class="ui-select-choices-row-inner"][1]').click(); }
  LabelPeriodYear() { cy.xpath('//label[contains(text(),"Year")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(3000) }
  LabelPeriodYearDDSelection() { cy.xpath('//a[contains(text(),"Setup")]/following::span[@class="ui-select-choices-row-inner"][2]').click() }
  LabelPeriodAccountingPeriod1() { cy.xpath('//label[contains(text(),"Accounting Period")]/following::span[@tabindex="-1"][2]').click({ multiple: true }).wait(3000) }
  LabelPeriodAccountingPeriod() { cy.xpath('//label[contains(text(),"Year")]/following::span[@tabindex="-1"][2]').click().wait(3000); }
  LabelPeriodAccountingPeriodDDSelection() { cy.xpath('//label[contains(text(),"Accounting Period")]/following::span[@class="ui-select-choices-row-inner"][2]').click().wait(2000); }
  // Start Date
  LabelPeriodStartDateClick() { cy.xpath('//input[@is-open="startDatePopup"]').click(); }
  LabelPeriodStartDateClick1() { cy.xpath('//input[@is-open="startDatePopup"]').click(); }
  LabelPeriodStartDateType() { cy.xpath('//input[@is-open="startDatePopup"]').type('01/07/2022'); }
  // End Date
  LabelPeriodEndDateClick() { cy.xpath('//input[@is-open="endDatePopup"]').click(); }
  LabelPeriodEndDateClick1() { cy.xpath('//input[@is-open="endDatePopup"]').click(); }
  LabelPeriodEndDateType() { cy.xpath('//input[@is-open="endDatePopup"]').type('31/12/2022'); }
  // Sales Date
  LabelPeriodAccountingDateClick() { cy.xpath('//input[@is-open="accountingDatePopup"]').click(); }
  LabelPeriodAccountingDateClick1() { cy.xpath('//input[@is-open="accountingDatePopup"]').click(); }
  LabelPeriodAccountingDateType() { cy.xpath('//input[@is-open="accountingDatePopup"]').type('31/12/2022'); }
  LabelPeriodNextButton() { cy.xpath('//a[@ng-click="validateSetup()"]').click({ force: true }).wait(25000); }
  // Select Sales
  // LabelPeriodSelectAllRB1() { cy.xpath('//button[@ng-click="filterExcludedSales()"]/following::input[@ng-click="selectAll(excludedSalesFiles)"]').click(); }
  LabelPeriodSelectAllRB() { cy.xpath('//input[@ng-click="selectAll(excludedSalesFiles)"]').click({ force: true }); }
  LabelPeriodIncludeSelected() { cy.xpath('//button[@ng-click="includeSelectedSales()"]').click().wait(3000); }
  LabelPeriodNextButton1() { cy.xpath('//a[contains(text(),"Next")]').click().wait(3000); }
  // Select Cost
  LabelPeriodClickSelected() { cy.xpath('//button[@ng-click="filterExcludedCosts()"]/following::input[@id="cost-select-"][1]').click({ force: true }); }
  LabelPeriodIncludeSelected1() { cy.xpath('//button[@class="btn btn-success pull-right ng-scope"]').click({ force: true }).wait(10000); }
  LabelPeriodCalculate() { cy.xpath('//a[contains(text(),"Calculate")]').click().wait(10000); }
  // validate created data on index page
  LabelPeriodOutsideClick() { cy.get('#CUR-juUorLcH').click(); }
  LabelPeriodValidateCreatedName() { cy.get('#CUR-FpasAYSv a').contains('A Period Test').should('be.visible'); }
  LabelPeriodValidateCreatedYear() { cy.get('#CUR-FpasAYSv td').contains('2023').first().should('be.visible'); }
  LabelPeriodValidateCreatedPeriod() { cy.get('#CUR-FpasAYSv td').contains('H1').should('be.visible'); }
  LabelPeriodValidateCreatedStatus() { cy.get('#CUR-FpasAYSv span').contains('Processing').should('be.visible'); }
  // validate created data on period page
  LabelPeriodClickCreated() { cy.get('#CUR-FpasAYSv a').contains('A Period Test').click().wait(1000); }

  // LabelPeriodWaitAfterClick() { cy.get('#CUR-AkesVxMP'); }
  LabelPeriodGrossRevenue() { cy.get('#CUR-tXTGsrcQ').contains('Gross Revenue >').should('be.visible'); }
  LabelPeriodNetPayout() { cy.get('#CUR-bxPoRhTC').contains('Net Payout >').should('be.visible'); }
  LabelPeriodGrossCrost() { cy.get('#CUR-XHVnixfn').contains('Gross Costs >').should('be.visible'); }
  LabelPeriodRechargedCosts() { cy.get('#CUR-hSDHlghB').contains('Recharged Costs >').should('be.visible'); }
  LabelPeriodInputUnits() { cy.get('#CUR-XjZWWqsL').contains('Input Units >').should('be.visible'); }
  LabelPeriodInputSalesLines() { cy.get('#CUR-RYQoItzw').contains('Input Sales Lines >').should('be.visible'); }
  // validate statement created
  LabelPeriodClickStatementsTab() { cy.get('#CUR-wkHjTyNE').click().wait(5000); }
  LabelPeriodValidateExisting() { cy.get('#CUR-HNSDHMbl a').contains('2023 - H1: Test Gelo 100').should('be.visible'); }
  // update on edit page period
  LabelPeriodClickEdit() { cy.get('#CUR-HLUNTSif').click().wait(5000); }
  LabelPeriodEditName() { cy.xpath('//label[contains(text(),"Name")]/following::input[@ng-model="period.name"]').click().clear().type('A Period Test Update'); }
  LabelPeriodEditNext() { cy.xpath('//a[@ng-click="validateSetup()"]').click().wait(2000); }
  LabelPeriodEditNext1() { cy.xpath('//a[contains(text(),"Next")]').click().wait(2000); }
  LabelPeriodEditCalculation() { cy.xpath('//a[@ng-click="runCalculation()"]').click().wait(2000); }
  // validate updated data on period page
  LabelPeriodClickUpdated() { cy.get('#CUR-FpasAYSv a').contains('A Period Test Update').click().wait(2000); }
  LabelPeriodValidateHeader() { cy.get('#CUR-TRIZDfAQ').should('be.visible'); }
  // validate updated data on index page
  LabelPeriodsClickLink() { cy.get('#CUR-cxqkIWfA').click().wait(3000); }
  LabelPeriodClickUpdatedIndex() { cy.get('#CUR-FpasAYSv a').contains('A Period Test Update').should('be.visible'); }
  LabelPeriodValidateStatus() { cy.get('#CUR-FpasAYSv span').contains('Complete').should('be.visible'); }
  // delete data
  LabelPeriodDeleteClickCreated() { cy.get('#period-select-0').check(); }
  LabelPeriodClickDeleteButton() { cy.get('#CUR-knYbtmzh').click(); }
  LabelPeriodClickDeleteModal() { cy.get('#CUR-bsqGxjeL').click().wait(5000); }



  // Statements TC
  LabelStatementsMenu() { cy.get('#sidebar-statements > a').click({ force: true }); }
  LabelStatementsSubMenu() { cy.get('#sidebar-statements-submenu > a').click(); }
  // index page validation
  LabelStatementsSearchBar() { cy.get('#CUR-WBKJWKoQ').should('be.visible'); }
  LabelStatementsPeriodDD() { cy.xpath('//label[@id="CUR-cRIQfQMq"]/following::span[@tabindex="-1"][1]').should('be.visible'); }
  LabelStatementsTypeDD() { cy.xpath('//label[@id="CUR-MQMEexwv"]/following::span[@tabindex="-1"]').should('be.visible'); }
  LabelStatementsFilter() { cy.get('#CUR-NsfLNPuP').should('be.visible'); }
  LabelStatementsNameHeader() { cy.get('#CUR-YxdjgveE th').contains('Name').should('be.visible'); }
  LabelStatementsGrossSalesHeader() { cy.get('#CUR-YxdjgveE th').contains('Gross Sales').should('be.visible'); }
  LabelStatementsCreatedHeader() { cy.get('#CUR-YxdjgveE th').contains('Created').should('be.visible'); }
  LabelStatementsStatusHeader() { cy.get('#CUR-YxdjgveE th').contains('Status').should('be.visible'); }
  // create statement via period
  LabelStatementsClickPeriod() { cy.get('#sidebar-periods > a').click(); }
  LabelStatementsPeriodClickCreate() { cy.get('#CUR-gYxIZkCO').click(); }
  LabelStatementsNameField() { cy.xpath('//input[@type="text" and @ng-model="period.name"]').clear().type('A Statement Smoke'); }
  LabelStatementsAccountingPeriodTypeDD() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@tabindex="-1"][1]').wait(3000).click(); }
  LabelStatementsAccountingPeriodTypeDDSelection() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@class="ui-select-choices-row-inner"][1]').click(); }
  LabelStatementsYear() { cy.xpath('//label[contains(text(),"Year")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(3000) }
  LabelStatementsYearDDSelection() { cy.xpath('//a[contains(text(),"Setup")]/following::span[@class="ui-select-choices-row-inner"][1]').click(); }
  LabelStatementsAccountingPeriod() { cy.xpath('//label[contains(text(),"Year")]/following::span[@tabindex="-1"][2]').click(); }
  LabelStatementsAccountingPeriodDD() { cy.xpath('//label[contains(text(),"Accounting Period")]/following::span[@class="ui-select-choices-row-inner"][1]').click(); }
  // date picker
  LabelStatementsStartDateType() { cy.xpath('//input[@is-open="startDatePopup"]').click({ force: true }).clear().type('01/07/2022'); }
  LabelStatementsEndDateType() { cy.xpath('//input[@is-open="endDatePopup"]').click({ force: true }).clear().type('31/12/2022'); }
  LabelStatementsAccountingDateType() { cy.xpath('//input[@is-open="accountingDatePopup"]').click({ force: true }).clear().type('31/12/2022'); }
  LabelStatementsNextButton() { cy.xpath('//a[contains(text(),"Next")]').click({ force: true }).wait(25000); }
  // selecting sales
  LabelStatementCheckAllCB() { cy.xpath('//input[@ng-click="selectAll(excludedSalesFiles)"]').click({ force: true }).wait(2000); }
  LabelStatementsIncludeSelected() { cy.xpath('//button[@ng-click="includeSelectedSales()"]').click().wait(3000); }
  LabelStatementsNextButton1() { cy.xpath('//a[contains(text(),"Next")]').click().wait(3000); }
  // Select Cost
  LabelStatementsClickSelected() { cy.xpath('//button[@ng-click="filterExcludedCosts()"]/following::input[@id="cost-select-"][1]').click({ force: true }); }
  LabelStatementsIncludeSelected1() { cy.get('.btn-success').click().wait(10000); }
  LabelStatementsCalculate() { cy.xpath('//a[contains(text(),"Calculate")]').click().wait(10000); }
  
  // Insert Condition Statement here
  LabelPeriodProcessing(status) { cy.get('body').then(($wait) => {
    // synchronously ask for the body's text
    // and do something based on whether it includes
    // another string
    if ($wait.text().includes(status)) {
      // yup found it
      cy.log('Period is processing')
      cy.xpath('//span[@class="complete ng-binding ng-scope"]').contains(status).should('be.visible').wait(1000);
    } else {
      cy.log('Wait all elements to complete').wait(30000)
      
    }
  }) }
  // validate statement in period
  LabelStatementsValidateCreated() { cy.get('#CUR-ilajBlTY a').contains('A Statement Smoke').click() }
  LabelStatementsTabLink() { cy.get('#CUR-wkHjTyNE').click().wait(2000); }
  LabelStatementsValidateExisting() { cy.get('#CUR-IxnzJpGe a').contains('2024 - Y1: Test Gelo 100').should('be.visible'); }
  // validate statement index page
  LabelStatementsSubMenuClick() { cy.get('#sidebar-statements-submenu > a').click(); }
  LabelStatementsSearchBarType() { cy.get('#CUR-WBKJWKoQ').clear().type('Test Gelo 100'); }
  LabelStatementsSearchIcon() { cy.get('#CUR-bzBwwprg').click(); }
  LabelStatementsCreated() { cy.get('#CUR-bkUowpSN a').contains('2024 - Y1: Test Gelo 100').should('be.visible'); }
  // add statement on period
  LabelStatementsClickPeriod2() { cy.get('#sidebar-periods > a').click(); }
  LabelSatementsClickCreatedPeriod2() { cy.get('#CUR-ilajBlTY a').contains('A Statement Smoke').click(); }
  LabelStatementsClickStatementsTab2() { cy.get('#CUR-yJluSXBB').click(); }
  LabelStatementsClickCreateStatements() { cy.get('#CUR-FYPxzvoA').click(); }
  LabelStatementsContract() { cy.xpath('//input[@ng-model="getterSetter"]').clear().type('test gelo 6').wait(3000); }
  LabelStatementsContractSelection() { cy.xpath('//strong[contains(text(),"Test Gelo 6")]').click({ force: true }); }
  LabelStatementsContractCreate() { cy.get('#CUR-nqObrHgU').click().wait(3000); }
  LabelStatementsValidateCreatedContract() { cy.get('#CUR-IxnzJpGe a').contains('2024 - Y1: Test Gelo 6').should('be.visible'); }
  // Validate that Statement is on Statement index page
  LabelStatementsClickSatementsSubMenu3() { cy.get('#sidebar-statements-submenu > a').click(); }
  LabelSatementsSearchCreated() { cy.get('#CUR-WBKJWKoQ').clear().type('Gelo 6'); }
  LabelStatementsClickSearchIcon2() { cy.get('#CUR-bzBwwprg').click(); }
  LabelStatementsValidateSearch() { cy.get('#CUR-bDVEURjD a').contains('2024 - Y1: Test Gelo 6').should('be.visible'); }
  LabelStatementsClickSearch() { cy.get('#CUR-VFrbmBtF').click(); }
  // Go to Periods and Delete
  LabelStatementsGotoPeriod() { cy.get('#sidebar-periods > a').click(); }
  LabelStatementsClickSelected1() { cy.get('#period-select-0').check(); }
  LabelStatementsClickDeleteButton() { cy.get('#CUR-knYbtmzh').click(); }
  LabelStatementsClickDeleteModal() { cy.get('#CUR-bsqGxjeL').click().wait(20000); }



  // Costs TC
  LabelCostsSalesMenu() { cy.get('#sidebar-sales-files > a').click(); }
  LabelCostsSubMenu() { cy.get('#sidebar-costs > a').click(); }
  // Cost Page Content Validation
  LabelCostsSearchBar() { cy.get('#CUR-SSvIUIOD').should('be.visible'); }
  LabelCostsExportButton() { cy.get('#CUR-AROTYiOp').should('be.visible'); }
  LabelCostsImportButton() { cy.get('#CUR-Wyuhdneo').should('be.visible'); }
  LabelCostsDeleteButton() { cy.get('#CUR-YacstJXY').should('be.visible'); }
  LabelCostsArchiveButton() { cy.get('#CUR-AipxbKdB').should('be.visible'); }
  LabelCostsCreateButton() { cy.get('#CUR-PmBsPhdG').should('be.visible'); }
  LabelCostsArchiveDD() { cy.get('#CUR-bSMhGqpM').should('be.visible'); }
  LabelCostsNameHeader() { cy.get('#CUR-cAZqlMux th').contains('Name').should('be.visible'); }
  LabelCostsAmountHeader() { cy.get('#CUR-cAZqlMux th').contains('Amount').should('be.visible'); }
  LabelCostsDescriptionHeader() { cy.get('#CUR-cAZqlMux th').contains('Description').should('be.visible'); }
  LabelCostsTargetPeriod() { cy.get('#CUR-cAZqlMux th').contains('Target Period').should('be.visible'); }
  LabelCostsTypeHeader() { cy.get('#CUR-cAZqlMux th').contains('Type').should('be.visible'); }
  LabelCostsCreatedArt() { cy.get('#CUR-cAZqlMux th').contains('Created At').should('be.visible'); }
  LabelCostsReported() { cy.get('#CUR-cAZqlMux th').contains('Reported').should('be.visible'); }
  // Create Cost
  LabelCostsClickCreateButton() { cy.get('#CUR-PmBsPhdG').click(); }
  LabelCostsTypeNameField() { cy.get('#CUR-fapHAIUM').type('A Cost Smoke'); }
  LabelCostsTypeAmountField() { cy.get('#CUR-QQbgsijo').type('123'); }
  LabelCostsDateField() { cy.get('#CUR-hvMRPWrI').click().type('11/11/2022'); }
  LabelCostsClickOutside() { cy.get('#CUR-wuFoOJlb').click(); }
  LabelCostsTypeDD() { cy.xpath('//label[@id="CUR-igslSkzc"]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  LabelCostsTypeDDSelection() { cy.get('#CUR-byDkVIRe span').contains('Artwork').click(); }
  LabelCostsTerritorDD() { cy.xpath('//label[@id="CUR-PLwTdZoJ"]/following::span[@tabindex="-1"]').click().wait(1000); }
  LabelCostsTerritoryDDSelection() { cy.get('#CUR-ZBPyVsQy span').contains('World').click(); }
  LabelCostsInvoiceNoField() { cy.get('#CUR-vMuHEYmk').type('12345'); }
  LabelCostsTargetPeriodField() { cy.get('#CUR-jrgAFiXF').type('test'); }
  LabelCostsDescriptionField() { cy.get('#CUR-dPyhOWpT').type('this is a test'); }
  // save and validate created data
  LabelCostsClickSaveButton() { cy.get('#CUR-xMDvxoWP').click(); }
  LabelCostsValidateName() { cy.get('#CUR-fapHAIUM').should('have.value', 'A Cost Smoke'); }
  LabelCostsValidateAmount() { cy.get('#CUR-QQbgsijo').should('have.value', '123'); }
  LabelCostsValidateDate() { cy.get('#CUR-hvMRPWrI').should('have.value', '11/11/2022'); }
  LabelCostsValidateType() { cy.get('#CUR-byDkVIRe span').contains('Artwork').should('be.visible'); }
  LabelCostsValidateTerritory() { cy.get('#CUR-UcUcyYTp').should('have.text', 'World'); }
  LabelCostsValidateInvoice() { cy.get('#CUR-vMuHEYmk').should('have.value', '12345'); }
  LabelCostsValidateTargetPeriod() { cy.get('#CUR-jrgAFiXF').should('have.value', 'test'); }
  LabelCostsValidateDescription() { cy.get('#CUR-dPyhOWpT').should('have.value', 'this is a test'); }
  // validate created data on index page
  LabelCostsLink() { cy.get('#CUR-ZSOjMzJH').click(); }
  LabelCostsValidatedCreatedName() { cy.get('#CUR-hyXIbMwu a').contains('A Cost Smoke').should('be.visible'); }
  LabelCostsValidateCreatedAmount() { cy.get('#CUR-hyXIbMwu td').contains('123').should('be.visible'); }
  LabelCostsValidateCreatedDesc() { cy.get('#CUR-hyXIbMwu td').contains('this is a test').should('be.visible'); }
  LabelCostsValidateCreatedTargetPeriod() { cy.get('#CUR-hyXIbMwu td').contains('test').should('be.visible'); }
  LabelCostsValidateCreatedType() { cy.get('#CUR-hyXIbMwu td').contains('Artwork').should('be.visible'); }
  // update data on edit page
  LabelCostsClickCreated() { cy.get('#CUR-hyXIbMwu a').contains('A Cost Smoke').click(); }
  LabelCostsEditName() { cy.get('#CUR-fapHAIUM').clear().type('A Cost Smoke update'); }
  LabelCostsEditAmount() { cy.get('#CUR-QQbgsijo').clear().type('55'); }
  LabelCostsEditInvoiceNo() { cy.get('#CUR-vMuHEYmk').clear().type('09876'); }
  // validate updated data on edit page
  LabelCostsEditClickSave() { cy.get('#CUR-xMDvxoWP').click(); }
  LabelCostsUpdatedName() { cy.get('#CUR-fapHAIUM').should('have.value', 'A Cost Smoke update'); }
  LabelCostsUpdatedAmount() { cy.get('#CUR-QQbgsijo').should('have.value', '55'); }
  LabelCostsUpadatedInvoiceNo() { cy.get('#CUR-vMuHEYmk').should('have.value', '09876'); }
  // validate updated data on index page
  LabelCostsClickLink1() { cy.get('#CUR-ZSOjMzJH').click(); }
  LabelCostsValidateUpdatedName() { cy.get('#CUR-hyXIbMwu a').contains('A Cost Smoke update').should('be.visible'); }
  LabelCoststValidateUpdatedAmount() { cy.get('#CUR-hyXIbMwu td').contains('55').should('be.visible'); }
  LabelCostsValidateUpdatedDesc() { cy.get('#CUR-hyXIbMwu td').contains('test').should('be.visible'); }
  // Delete Cost
  LabelCostsDeleteCreated() { cy.get('#CUR-hyXIbMwu a').contains('A Cost Smoke update').click(); }
  LabelCostsClickDeleteButton() { cy.get('#CUR-cpHMoyZc').click(); }
  LabelCostsClickDeleteModalButton() { cy.get('#CUR-zqfkAkIc').click(); }



  // Templates TC
  LabelTemplatesSalesMenu() { cy.get('#sidebar-sales-files > a').click(); }
  LabelTemplatesSubMenu() { cy.get('#sidebar-templates > a').click(); }
  LabelTemplatesCreateButton() { cy.xpath('//button[@id="CUR-RYumwoor"]/following::a[@data-toggle="dropdown"]').click(); }
  LabelTemplatesCreateFromNew() { cy.get('#CUR-tHSGHnBz').click(); }
  // Calculation Tab
  LabelTemplatesClickCalculationsTab() { cy.get('#CUR-xxVHzJFg').click(); }
  LabelTemplatesAddCalculation() { cy.get('#CUR-NJDqEPhR').click().wait(2000); }
  LabelTemplatesWhenDD() { cy.xpath('//label[contains(text(),"When")]/following::select[@ng-model="calculation.conditionType"]').select('string:Any'); }
  LabelTemplatesAddCondition() { cy.xpath('//label[contains(text(),"When")]/following::button[@ng-click="addCondition()"]').click().wait(5000); }
  // LabelTemplatesInputeTypeDD1() { cy.xpath('//label[contains(text(),"When")]/following::span[@tabindex="-1" and @role="button"][1]').click().wait(1000); }
  // LabelTemplatesInputTypeDDSelection1() { cy.xpath('//label[contains(text(),"When")]/following::span[@class="ui-select-choices-row-inner"][1]').click(); }
  LabelTemplatesInputTypeDD() { cy.xpath('//label[contains(text(),"When")]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  LabelTemplatesInputTypeDDSelection() { cy.xpath('//label[contains(text(),"When")]/following::span[@class="ui-select-choices-row-inner"][1]').click({ force: true }); }
  LabelTemplatesInputValue() { cy.xpath('//label[contains(text(),"When")]/following::input[@type="number"]').clear().type('1'); }
  LabelTemplatesComparisonDD() { cy.xpath('//label[contains(text(),"Comparison")]/following::span[@tabindex="-1"][2]').click().wait(1000); }
  LabelTemplatesComparisonSelectionDD() { cy.xpath('//span[contains(text(),"Is Blank")]').click({ force: true }); }
  LabelTemplatesOutputFieldDD() { cy.xpath('//label[contains(text(),"Output Field")]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  LabelTemplatesOutputFieldDDSelection() { cy.xpath('//label[contains(text(),"Output Field")]/following::span[contains(text(),"Skip Row")]').click({ force: true }); }
  // Overview Tab
  LabelTemplatesClickOverviewTab() { cy.get('#CUR-EtCgEaNp').click(); }
  LabelTemplatesNameField() { cy.get('#CUR-lDUnDkZE').type('A Template Smoke'); }
  LabelTemplatesSource() { cy.get('#CUR-DVIVtmuI').type('ATS'); }
  LabelTemplatesTabNumber() { cy.get('#CUR-GHphjaeq').type('1'); }
  LabelTemplatesHeaderRow() { cy.get('#CUR-SeOCdrpE').type('1'); }
  LabelTemplatesStartingRow() { cy.get('#CUR-qXfqrZTK').type('2'); }
  LabelTemplatesUploadFile() { cy.get('input[type=file]').attachFile('smoke-sales-template.xlsx'); }
  LabelTemplatesClickSaveButton() { cy.get('#CUR-MVMxRkBl').click().wait(8000); } // Save Button
  // Setting Example Lines
  LabelTemplates1stField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][1]').click(); }
  LabelTemplates1stFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][1]').type('sale date').wait(1000); }
  LabelTemplates1stFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Sale Date').click(); }

  LabelTemplates2ndField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][2]').click(); }
  LabelTemplates2ndFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][2]').type('source').wait(1000); }
  LabelTemplates22ndFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Source').first().click(); }

  LabelTemplates3rdField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][3]').click(); }
  LabelTemplates3rdFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][3]').type('sub source').wait(1000); }
  LabelTemplates3rdFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Sub Source').click(); }

  LabelTemplates4thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][4]').click(); }
  LabelTemplates4thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][4]').type('territory').wait(1000); }
  LabelTemplates4thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Territory').click(); }

  LabelTemplates5thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][5]').click(); }
  LabelTemplates5thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][5]').type('distribution').wait(1000); }
  LabelTemplates5thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Distribution Channel').click(); }

  LabelTemplates6thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][6]').click(); }
  LabelTemplates6thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][6]').type('configuration').wait(1000); }
  LabelTemplates6thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Configuration').click(); }

  LabelTemplates7thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][7]').click(); }
  LabelTemplates7thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][7]').type('isrc').wait(1000); }
  LabelTemplates7thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('ISRC').click(); }

  LabelTemplates8thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][8]').click(); }
  LabelTemplates8thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][8]').type('units').wait(1000); }
  LabelTemplates8thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Units').click(); }

  LabelTemplates9thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][9]').click(); }
  LabelTemplates9thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][9]').type('gross').wait(1000); }
  LabelTemplates9thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Gross Amount').click(); }

  LabelTemplates10thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][10]').click(); }
  LabelTemplates10thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][10]').type('net amount').wait(1000); }
  LabelTemplates10thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Net Amount').click(); }

  LabelTemplates11thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][11]').click(); }
  LabelTemplates11thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][11]').type('per unit rate').wait(1000); }
  LabelTemplates11thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Per Unit Rate').click(); }

  LabelTemplates12thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][12]').click(); }
  LabelTemplates12thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][12]').type('transaction date').wait(1000); }
  LabelTemplates12thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Transaction Date').click(); }

  LabelTemplatesClickSave2() { cy.get('#CUR-MVMxRkBl').click().wait(2000); }
  // validate on index page
  LabelTemplatesClickTemplateLink() { cy.get('#CUR-pOyCFpuZ').click().wait(4000); }
  LabelTemplatesValidateCreated() { cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke').should('be.visible'); }
  LabelTemplatesValidateSource() { cy.get('#CUR-WNCyYxcz span').contains('ATS').should('be.visible'); }
  // update template
  LabelTemplatesClickCreated() { cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke').click(); }
  LabelTemplatesUpdateName() { cy.get('#CUR-lDUnDkZE').clear().type('A Template Smoke Update'); }
  LabelTemplatesUpdateSource() { cy.get('#CUR-DVIVtmuI').clear().type('STA'); }
  // save and validate on edit page
  LabelTemplatesClickSave3() { cy.get('#CUR-MVMxRkBl').click().wait(2000); }
  LabelTemplatesValidateEditedName() { cy.get('#CUR-lDUnDkZE').should('have.value', 'A Template Smoke Update'); }
  LabelTemplatesValidateEditedSource() { cy.get('#CUR-DVIVtmuI').should('have.value', 'STA'); }
  // validate on index page
  LabelTemplatesClickTemplatesLink2() { cy.get('#CUR-pOyCFpuZ').click().wait(2000); }
  LabelTemplatesValidateEditedName1() { cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke Update').should('be.visible'); }
  LabelTemplatesValidateEditedSource1() { cy.get('#CUR-WNCyYxcz span').contains('STA').should('be.visible'); }
  // delete
  LabelTemplatesDeleteCreated() { cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke Update').click().wait(2000); }
  LabelTemplatesClickDelete() { cy.get('#CUR-mZEcFCVq').click(); }
  LabelTemplatesClickDeleteModal() { cy.get('#CUR-GWPyNhGt').click(); }


  // Sales Ingestion TC
  LabelSalesIngestSalesMenu() { cy.get('#sidebar-sales-files > a').click(); }
  LabelSalesSubMenu() { cy.get('#sidebar-sales-file-submenu > a').click(); } 
  // index page content validation
  LabelSalesValidHeader() { cy.get('#CUR-FHufgwGM').should('have.text', 'Valid'); }
  LabelSalesStatusHeader() { cy.get('#CUR-vwBFXAWO').should('have.text', 'Status'); }
  LabelSalesReportedHeader() { cy.get('#CUR-sSeLfdFL').should('have.text', 'Reported'); }
  LabelSalesArchived() { cy.get('#CUR-gTNhalNj').should('have.text', 'Archived'); }
  LabelSalesNewHeader() { cy.get('#CUR-ZYheIwqI').should('have.text', 'New'); }
  LabelSalesFilterHeader() { cy.get('#CUR-NlTTzTrO').should('be.visible'); }
  LabelSalesExportButton() { cy.get('#CUR-ivKvGcQl').should('be.visible'); }
  LabelSalesRerunButton() { cy.get('#CUR-nBTrboeS').should('be.visible'); }
  LabelSalesDeleteButton() { cy.get('#CUR-riqaSlSH').should('be.visible'); }
  LabelSalesArchiveButton() { cy.get('#CUR-ofnmYZwF').should('be.visible'); }
  LabelSalesCreateButton() { cy.get('#CUR-PNdYcPxE').should('be.visible'); }
  LabelSalesNameHeader() { cy.get('#CUR-yprfVOlM th').contains('Name').should('be.visible'); } 
  LabeLSalesInvoiceHeader() { cy.get('#CUR-yprfVOlM th').contains('Invoice').should('be.visible'); }
  LabelSalesTargetHeader() { cy.get('#CUR-yprfVOlM th').contains('Target').should('be.visible'); }
  LabelSalesAccountHeader() { cy.get('#CUR-yprfVOlM th').contains('Account').should('be.visible'); }
  LabelSalesGrossHeader() { cy.get('#CUR-yprfVOlM th').contains('Gross').should('be.visible'); }
  LabelSalesNetHeader() { cy.get('#CUR-yprfVOlM th').contains('Net').should('be.visible'); }
  LabelSalesInvalidLinesHeader() { cy.get('#CUR-yprfVOlM th').contains('Invalid Lines').should('be.visible'); }
  LabelSalesDeleteIfExist() { cy.get('body').then(($body) => {
    // synchronously ask for the body's text
    // and do something based on whether it includes
    // another string
    if ($body.text().includes('smoke-sales-publishing')) {
      // yup found it
      cy.log('Found Duplicate Test Data')
      cy.xpath('//a[@title="smoke-sales-publishing"]/preceding::tr/following::input[@id="sales-file-select-2"]').click()
      cy.get('#CUR-riqaSlSH').click() // delete button
      cy.get('#CUR-LIkCBbfT').click() // delete button in modal
      cy.wait(5000)

    } else {
      // nope not here
      cy.log('No Duplicate Files is visible')
    }
  }) }
  // create sales ingestion
  LabelSalesCreate() { cy.get('#CUR-PNdYcPxE').click(); }
  LabelSalesUpload() { cy.get('input[type=file]').attachFile('smoke-sales-publishing.xlsx').wait(5000); }
  LabelSalesComplete() { cy.get('#CUR-aEbJeVnL').click(); }
  // validate data on index page
  LabelSalesValidateUploaded() { cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').should('be.visible'); }
  // sales page
  LabelSalesClickUploadedFile() { cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').click(); }
  LabelSalesCompleteClick() { cy.get('#CUR-tSDxRqMQ').click().wait(2000); }
  LabelSalesRevalidate() { cy.get('#CUR-DUdWDnqe').click().wait(10000); }
  // update sales
  LabelSalesUploadedClick() { cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').click(); }
  LabelSalesTitleHeader() { cy.get('#CUR-CormnEei').should('be.visible'); }
  LabelSalesEditButton() { cy.get('#CUR-JntuUeyO').click(); }
  LabelSalesEditName() { cy.get('#CUR-uOyLTZEv').clear().type('smoke-sales-publishing testing'); }
  LabelSalesClickSave() { cy.get('#CUR-VcrTkCcj').click(); }
  LabelSalesClickSalesLink() { cy.get('#CUR-QkoCHvTt').click().wait(2000); }
  LabelSalesValidateEditedName() { cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing testing').should('be.visible').wait(5000); }
  // delete sales
  LabelSalesDeleteUpload() { cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing testing').click().wait(5000); }
  LabelSalesDeleteClickEdit() { cy.get('#CUR-JntuUeyO').click().wait(5000); }
  LabelSalesClickDeleteButton() { cy.get('#CUR-dYQCkJmQ').click().wait(5000); }
  LabelSalesClickDeleteModal() { cy.get('#CUR-alQhgDPu').click().wait(5000); }



  // COMPLETED Testing Configurations Create, Read, Update and Delete Functions
  // Configuration TC 
  LabelConfigSettings() { cy.get('#sidebar-settings > a').click(); }
  LabelConfigGeneral() { cy.get('#sidebar-settings-general > a').click(); }
  // configuration page content validation
  LabelConfigTab() { cy.get('#CUR-zfwLctsq').click(); }
  LabelConfigCurrencyHeader() { cy.get('#CUR-RUMGcfIR').contains('Currency').should('be.visible'); }
  LabelConfigAccountingPeriodTypesHeader() { cy.get('#CUR-SygJfpJW').contains('Accounting Period Types').should('be.visible'); }
  LabelConfigDistribChannelsHeader() { cy.get('#CUR-WiTwKpln').contains('Distribution Channels').should('be.visible'); }
  LabelConfigConfigurationsHeader() { cy.get('#CUR-NcIEqMey').contains('Configurations').should('be.visible'); }
  LabelConfigPriceCategoriesHeader() { cy.get('#CUR-zazhWYra').contains('Price Categories').should('be.visible'); }
  LabelConfigCatalogueGroupsHeader() { cy.get('#CUR-JtjtHBvs').contains('Catalogue Groups').should('be.visible'); }
  LabelConfigCostTypesHeader() { cy.get('#CUR-xgAYmZKX').contains('Cost Types').should('be.visible'); }
  LabelConfigSourcesHeader() { cy.get('#CUR-dBjmMSky').contains('Sources').should('be.visible'); }
  LabelConfigPayeeCategoriesHeader() { cy.get('#CUR-FhiBtVul').contains('Payee Categories').should('be.visible'); }
  LabelConfigCotractCategoriesHeader() { cy.get('#CUR-uIpxoudN').contains('Contract Categories').should('be.visible'); }
  // configuration page add data
  LabelConfigClickAdd() { cy.get('#CUR-UXciuPMi').click().wait(1000); }
  LabelConfigAccountingPeriodNewField() { cy.xpath('//div[@id="CUR-SygJfpJW"]/following::input[@ng-model="type.name" and @type="text"][5]').type('Smoke test'); }
  LabelConfigAddPriceCategories() { cy.get('#CUR-nFeigaBb').click().wait(1000); }
  LabelConfigPriceCategNewField() { cy.xpath('//div[@id="CUR-zazhWYra"]/following::input[@type="text"][4]').type('Smoke test'); }
  LabelConfigAddCatalogueGroups() { cy.get('#CUR-KIJKDlFj').click().wait(1000); }
  LabelConfigCatalogueGroups() { cy.xpath('//div[@id="CUR-JtjtHBvs"]/following::input[@type="text"][5]').type('Smoke test'); }
  LabelConfigAddSources() { cy.get('#CUR-VkmnVCYN').click().wait(1000); }
  LabelConfigAddPayeeCategories() { cy.get('#CUR-GLPJtuem').click().wait(1000); }
  LabelConfigPayeeCategoriesNewField() { cy.xpath('//div[@id="CUR-uXxvxmvN"]/following::input[@type="text"][5]').type('Smoke Test'); }
  LabelConfigAddContractCategories() { cy.get('#CUR-gVVhjIam').click().wait(1000); }
  LabelConfigContractCategories() { cy.xpath('//div[@id="CUR-uIpxoudN"]/following::input[@type="text"][4]').type('Smoke test'); }
  // Save and validate added data
  LabelConfigClickSaveButton() { cy.get('#CUR-XbCaWLaC').click().wait(1000); } // Save Button 
  LabelConfigSuccessMessage() { cy.get('.alert').should('be.visible'); }
  // added content validation
  LabelConfigAccountingPeriodValidation() { cy.xpath('//div[@id="CUR-SygJfpJW"]/following::input[@type="text"][5]').should('have.value', 'Smoke test'); }
  LabelConfigCatalogueGroupsValidation() { cy.xpath('//div[@id="CUR-JtjtHBvs"]/following::input[@type="text"][5]').should('have.value', 'Smoke test'); }
  LabelConfigPayeeCategories() { cy.xpath('//div[@id="CUR-FhiBtVul"]/following::input[@type="text"][5]').should('have.value', 'Smoke Test'); }
  LabelConfigContractCategories1() { cy.xpath('//div[@id="CUR-uIpxoudN"]/following::input[@type="text"][4]').should('have.value', 'Smoke test'); }
  // deletion of added data
  LabelConfigDelete2() { cy.xpath('//div[@id="CUR-SygJfpJW"]/following::button[5]').click().wait(3000); }
  LabelConfigDelete3() { cy.xpath('//div[@id="CUR-zazhWYra"]/following::button[4]').click().wait(3000); }
  LabelConfigDelete4() { cy.xpath('//div[@id="CUR-JtjtHBvs"]/following::button[5]').click().wait(3000); }
  LabelConfigDelete6() { cy.xpath('//div[@id="CUR-FhiBtVul"]/following::button[5]').click().wait(3000); }
  LabelConfigDelete7() { cy.xpath('//div[@id="CUR-uIpxoudN"]/following::button[4]').click().wait(3000); }

  LabelConfigClickSave1() { cy.get('#CUR-XbCaWLaC').click(); }
  LabelConfigClickSave2() { cy.get('#CUR-tVJNiQMy').click(); }


  // COMPLETED Testing Users Create, Read, Update and Delete Functions
  // Users TC
  LabelUserSettingsMenu() { cy.get('#sidebar-settings > a').click(); }
  LabelUserSubmenu() { cy.get('#sidebar-users > a').click(); }
  // create admin user
  LabelUserCreateButton() { cy.get('#CUR-MEXvNKZp').click(); } // Create Button 
  LabelUserUserTypeDD() { cy.xpath('//label[@id="CUR-rCWHNKVr"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  LabelUserUserTypeDDSelection() { cy.xpath('//label[@id="CUR-rCWHNKVr"]/following::span[@class="ui-select-choices-row-inner"][1]').click({ force: true }); }
  LabelUserEmailField() { cy.get('#CUR-uDjOsHCe').clear().type('aausertest@curve.com'); }
  LabelUserSaveButton() { cy.get('#CUR-RxSOwcRN').click(); } // Save Button

  // save and validate created admin user on index page
  LabelUserSaveModal() { cy.get('#CUR-xQRKRMjR').click().wait(1000); }
  LabelUsersValidateCreated() { cy.get('#CUR-AArHwreX a').contains('aausertest@curve.com').should('be.visible'); }
  LabelUserValidateAdminTag() { cy.get('#CUR-AArHwreX span').contains('Admin').should('be.visible'); }
  // delete admin data
  LabelUserClickCheckButton() { cy.get('#user-select-0').check(); }
  LabelUserClickDeleteButton() { cy.get('#CUR-RWlxftDS').click(); }
  LabelUserClickDeleteModal() { cy.get('#CUR-qmXpxFpo').click(); }
  // create standard user
  LabelUserClickCreate2() { cy.get('#CUR-MEXvNKZp').click(); }
  LabelUserEnterEmail() { cy.get('#CUR-uDjOsHCe').clear().type('aausertest@curve.com'); }
  // save validate created standard user on index page
  LabelUserClickSave2() { cy.get('#CUR-RxSOwcRN').click(); }
  LabelUserClickSaveModal2() { cy.get('#CUR-xQRKRMjR').click().wait(1000); }
  LabelValidateCreated() { cy.get('#CUR-AArHwreX a').contains('aausertest@curve.com').should('be.visible'); }
  // delete standard user 
  LabelUserClickCheckButton1() { cy.get('#user-select-0').check(); }
  LabelUserClickDeleteButton1() { cy.get('#CUR-RWlxftDS').click(); }
  LabelUserClickDeleteModal2() { cy.get('#CUR-qmXpxFpo').click().wait(2000); }



  // Payments TC
  LabelPaymentsMenu() { cy.get('#sidebar-payments > a').click(); }
  // payment groups index page validation
  LabelPaymentsSearchBar() { cy.get('#CUR-HojkyIsW').should('be.visible'); }
  LabelPaymentsDeleteButton() { cy.get('#CUR-kXoADWjR').should('be.visible'); }
  LabelPaymentsCreateButton() { cy.get('#CUR-INWUtDqr').should('be.visible'); }
  LabelPaymentsNameHeader1() { cy.get('#CUR-oTADdvMB th').contains('Name').should('be.visible'); }
  LabelPaymentsStatusHeader() { cy.get('#CUR-oTADdvMB th').contains('Status').should('be.visible'); }
  LabelPaymentsCreatedHeader() { cy.get('#CUR-oTADdvMB th').contains('Created').should('be.visible'); }
  // payment index page validation
  LabelPaymentsClickCreate() { cy.get('#CUR-INWUtDqr').click(); }
  LabelPaymentsOverviewHeader() { cy.get('#CUR-EnfXLjHD').contains('Overview').should('be.visible'); }
  LabelPaymentsNameHeader() { cy.get('#CUR-XBVbaFCZ').contains('Name').should('be.visible'); }
  LabelPaymentsSaveButton() { cy.get('#CUR-LzsfBxoh').should('be.visible'); }
  LabelPaymentsPayeeHeader() { cy.get('#CUR-McqILDtO th').contains('Payee').should('be.visible'); }
  LabelPaymentsNameHeader2() { cy.get('#CUR-McqILDtO th').contains('Name').should('be.visible'); }
  LabelPaymentsCurrencyHeader() { cy.get('#CUR-McqILDtO th').contains('Currency').should('be.visible'); }
  LabelPaymentsAmountHeader() { cy.get('#CUR-McqILDtO th').contains('Amount').should('be.visible'); }
  LabelPaymentsStatusHeader1() { cy.get('#CUR-McqILDtO th').contains('Status').should('be.visible'); }
  // Add Payment
  LabelPaymentsEnterName() { cy.get('#CUR-eAKxeLbd').type('A Smoke Test'); }
  LabelPaymentsClickSave() { cy.get('#CUR-LzsfBxoh').click(); }
  LabelPaymentsClickCreate1() { cy.get('#CUR-sovaMLmn').click(); }
  LabelPaymentsEnterName1() { cy.get('#CUR-XHhdnPOg').type('A Smoke Payment'); }
  LabelPaymentsEnterAmount() { cy.get('#CUR-eFDNZivS').type('0123'); }
  LabelPaymentsPayee() { cy.get('#CUR-payee-select-field').type('z standard').wait(2000); }
  LabelPaymentsPayeeTypeAdvance() { cy.get('#CUR-hqUJePRw a').contains('Z Standard').click(); }
  LabelPaymentsPayeeClickSave() { cy.get('#CUR-vzLwJXME').click().wait(2000); }
  // Validate Created Data
  LabelPaymentsValidatePayee() { cy.get('#CUR-BAKorZom a').contains('Z Standard').should('be.visible'); }
  LabelPaymentsValidateName() { cy.get('#CUR-BAKorZom td').contains('A Smoke Payment').should('be.visible'); }
  LabelPaymentsValidateCurrency() { cy.get('#CUR-BAKorZom td').contains('GBP').should('be.visible'); }
  LabelPaymentsValidateAmount() { cy.get('#CUR-BAKorZom td').contains('123.00').should('be.visible'); }
  LabelPaymentsValidateStatus() { cy.get('#CUR-BAKorZom td').contains('Pending').should('be.visible'); }
  // Update Payment
  LabelPaymentsClickCreated() { cy.get('#CUR-BAKorZom a').contains('Z Standard').click(); }
  LabelPaymentsUpdateName() { cy.get('#CUR-XHhdnPOg').clear().type('A Payment Smoke Updated'); }
  LabelPaymentsUpdateAmount() { cy.get('#CUR-eFDNZivS').clear().type('121'); }
  LabelPaymentsClickSave2() { cy.get('#CUR-vzLwJXME').click(); }
  LabelPaymentsGroupsLink() { cy.get('#CUR-nwSFNGwm').click(); }
  // Validate Updated Data
  LabelPaymentsUpdatedPayee() { cy.get('#CUR-BAKorZom a').contains('Z Standard').should('be.visible'); }
  LabelPaymentsUpdatedName() { cy.get('#CUR-BAKorZom td').contains('A Payment Smoke Updated').should('be.visible'); }
  LabelPaymentsUpdatedCurrency() { cy.get('#CUR-BAKorZom td').contains('GBP').should('be.visible'); }
  LabelPaymentsUpdatedAmount() { cy.get('#CUR-BAKorZom td').contains('121.00').should('be.visible'); }
  // delete payment
  LabelPaymentsClickCreated1() { cy.get('#CUR-BAKorZom a').contains('Z Standard').click(); }
  LabelPaymentsClickDelete() { cy.get('#CUR-fjzEPjoB').click(); }
  LabelPaymentsClickDeleteModal() { cy.get('#CUR-OSFxsxNc').click(); }
  // delete payment groups
  LabelPaymentsClickDeleteGroup() { cy.get('#CUR-cwYxrxYN').click(); }
  LabelPaymentsClickDeleteGroupModal() { cy.get('#CUR-kcQIXvUd').click(); }














}

export default SmokeLabelPageObject;
