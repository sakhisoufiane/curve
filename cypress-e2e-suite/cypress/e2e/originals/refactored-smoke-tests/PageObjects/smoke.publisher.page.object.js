// Created By Jesli J
// Date June 06, 2023
const payeeName = 'Smoke Test Payee ' + Date.now();

class publisherpageobject {
  // Payee TC
  // Navigate to Payee Select Page
  PublishlSidebarContract() { cy.get('#sidebar-contracts > a').click(); }
  PublishSidebarPayees() { cy.get('#sidebar-payees > a').click(); }
  // Validate Payee Select Page
  PublishSearchBar() { cy.get('#CUR-rYmCZlqH').should('be.visible'); }
  PublishExportButton() { cy.get('#CUR-hzouaqxY').should('be.visible').contains('Export'); }
  PublishImportButton() { cy.get('#CUR-rZPDYyzN').should('be.visible').contains('Import'); }
  PublishA() { cy.get('#CUR-mQhwuDIu').should('be.visible'); }
  PublishDeleteButton() { cy.get('#CUR-GAGrmAkQ').contains('Delete'); }
  PublishCreateButton1() { cy.get('#CUR-jYYixChE').contains('Create'); }
  // Filter Complete select box
  PublishCompleteDD() { cy.xpath('//label[@id="CUR-ihpIsdkx"]/following::span[@tabindex="-1"][1]').should('be.visible'); }
  PublishFilter() { cy.get('#CUR-qJVOIKBD').contains('Filter'); }
  PublishCheckAllNameRB() { cy.get('thead > tr > th').contains('Name').should('be.visible'); }
  PublishNameHeader() { cy.get('thead > tr > th').contains('Name').should('be.visible'); }
  PublishCategoriesHeader() { cy.get('thead > tr > th').contains('Categories').should('be.visible'); }
  PublishCreatedHeader() { cy.get('thead > tr > th').contains('Created').should('be.visible'); }
  // Click Create Button
  PublishCreateButton() { cy.get('#CUR-jYYixChE').click(); }

  // Create Payee
  PublishPayeeNameTB() { cy.get('#CUR-vNACcVKV').clear().type('A Payee Smoke'); }
  PublishAlternateNameField() { cy.get('#CUR-CJyhlJZW').clear().type('Smoke Test'); }
  PublishForeignIDField() { cy.get('#CUR-GRdOwpVU').clear().type('P12352783'); }
  PublishProjectIDField() { cy.get('#CUR-projectId-input').clear().type('APS0298372'); }
  PublishPaymentEmailField() { cy.get('#CUR-MnQDkMSC').clear().type('test@curve.com'); }
  PublishPaymentCurrencyDD() { cy.xpath('//label[@id="CUR-dPzHiybT"]/following::span[@tabindex="-1"][1]').click(); }
  PublishPaymentCurrencyDDSelection() { cy.xpath('//label[@id="CUR-dPzHiybT"]/following::input[@type="search"][1]').clear().type('GBP'); }
  PublishPaymentCurrencyDDSelection1() { cy.get('#CUR-hKtsGkio').click({ force: true }); }
  PublishBankNameField() { cy.get('#CUR-yyhcuPTu').clear().type('LLoyds'); }
  PublishBankAddressTB() { cy.get('#CUR-fjfsuHQg > .form-control').click(); }
  PublishCategories() { cy.xpath('//label[@id="CUR-NckAXatU"]/following::input[@type="search"][1]').click(); }
  PublishCategoriesSelection() { cy.xpath('//label[@id="CUR-NckAXatU"]/following::span[contains(text(),"Cat 1")]').click(); }
  PublishContactEmailField() { cy.get('#CUR-NaYgFDcA').clear().type('test@curve.com'); }
  PublishAddressTB() { cy.xpath('//label[@id="CUR-ZZTwxZXs"]/following::textarea[@aria-invalid="false"][1]').click(); }
  PublishAccountNoField() { cy.get('#CUR-xJpyMOcS').clear().type('123456'); }
  PublishSortCodeField() { cy.get('#CUR-XVRkUxZq').clear().type('123456789'); }
  PublishIBANField() { cy.get('#CUR-xbtHjbhy').clear().type('448877'); }
  PublishSwiftCode() { cy.get('#CUR-RVHhAHbs').clear().type('UK2736352'); }
  PublishCountryDD() { cy.xpath('//label[@id="CUR-GUNMwXuz"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  PublishCountryDDSelection() { cy.xpath('//label[@id="CUR-GUNMwXuz"]/following::span[contains(text(),"World")][1]').click({ force: true }); }
  PublishVATGSTSalesTAXNoField() { cy.get('#CUR-MuenDpiw').clear().type('Test123839'); }
  PublishTaxWordingField() { cy.get('#CUR-qMPSYmVs').clear().type('Test Wording'); }
  PublishSelfBillingTaxRateField() { cy.get('#CUR-viqCfpXo').clear().type('1.2'); }
  PublishWithHoldingTaxWordingField() { cy.get('#CUR-uEYmidLa').clear().type('test'); }
  PublishWitholdingTaxRateField() { cy.get('#CUR-vhAOhxOf').clear().type('1.6'); }
  PublishFeesInvoiceTaxRateField() { cy.get('#CUR-QiMJZhFy').clear().type('1.8'); }
  PublishNotesField() { cy.xpath('//div[@id="CUR-CzvuAESR"]/following::textarea[@aria-invalid="false"][1]').click(); }
  // Save payee & test response
  PublishPayeeClickSave() { cy.get('#CUR-dJtpHGja').click(); } // click save
  // Verify edit page with saved data
  PublishVerifyPayeeNameClickPayeeLink() { cy.get('#CUR-jbbBXmfV').click().wait(1000); }
  PublishVerifyAlternateName() { cy.get('#CUR-CsnuAETh a').contains('A Payee Smoke').should('be.visible'); }
  PublishVerifyCategories() { cy.get('#CUR-CsnuAETh span').contains('Cat 1').first().should('be.visible'); }
  // Find and click newly created composer
  PublishNewComposer() { cy.get('#CUR-CsnuAETh a').contains('A Payee Smoke').click() }
  // Update payee
  PublishUpdatePayeeName() { cy.get('#CUR-vNACcVKV').clear().clear().type(payeeName + ' Changed'); }
  PublishUpdateAlternateName() { cy.get('#CUR-CJyhlJZW').clear().clear().type('Payee Test Update'); }
  PublishPayeeDeleteSelectedCategory() { cy.xpath('//span[@class="close ui-select-match-close"]').click(); }
  PublishUpdateCategories() { cy.xpath('//label[@id="CUR-NckAXatU"]/following::input[@type="search"][1]').click().wait(3000); }
  PublishUpdateCategoriesSelection() { cy.xpath('//label[@id="CUR-NckAXatU"]/following::span[@class="ui-select-choices-row-inner"][1]').click({ force: true }); }
  // Save payee & test response
  PublishUpdateClickSave() { cy.get('#CUR-dJtpHGja').click(); }
  // Click through delete workflow and verify deletion
  PublishPayeeClickDelete() { cy.get('#CUR-DkcbEfDr').contains('Delete').click() }
  PublishPayeeDeleteModal() { cy.get('#CUR-KccMBFTd').should('be.visible'); }
  PublishPayeeClickDeleteModal() { cy.get('#CUR-vGcbzDYC').should('be.visible').contains('Delete').click().wait(2000); }
  Testing() { cy.get('#CUR-vGcbzDYC').should('be.visible').contains('Delete').click().wait(2000); }



  // Contracts TC
  PublishContractsMenu() { cy.get('#sidebar-contracts > a').click(); }
  PublishContractsSubMenu() { cy.get('#sidebar-contract-submenu > a').click(); }
  // Page Content Validation
  PublishContractSearchBar() { cy.get('#CUR-rmJHDCfY').should('be.visible'); }
  PublishContractDeleteButton() { cy.get('#CUR-IPEEOupo').should('be.visible'); }
  PublishContractCreateButton() { cy.get('#CUR-UDpJJUhA').should('be.visible'); }
  PublishContractExportButton() { cy.get('#CUR-GqETKmnj').should('be.visible'); }
  PublishContractsImportContractsButton() { cy.get('#CUR-xqVjxuMZ').should('be.visible'); }
  PublishContractsImportTransactions() { cy.get('#CUR-SOZjjcnO').should('be.visible'); }
  PublishContractsExportTransactions() { cy.get('#CUR-VmJCQpXn').should('be.visible'); }
  PublishContractsFilter() { cy.get('#CUR-uGIsUwPG').should('be.visible').contains('Filter'); }
  PublishContractsCompleteDD() { cy.get('#CUR-UBJcRsgF .ui-select-match').should('be.visible'); }
  PublishContractsCompany() { cy.xpath('//label[contains(text(),"Company")]/following::input[@type="search"][1]').should('be.visible'); }
  PublishContractsCategory() { cy.xpath('//label[contains(text(),"Category")]/following::input[@type="search"][1]').should('be.visible'); }

  PublishContractsName() { cy.get('thead > tr > th').contains('Name').should('be.visible'); }
  PublishContractsType() { cy.get('thead > tr > th').contains('Type').should('be.visible'); }
  PublishContractsCategories() { cy.get('thead > tr > th').contains('Categories').should('be.visible'); }
  PublishContractsCreated() { cy.get('thead > tr > th').contains('Created').should('be.visible'); }
  // Click Create Button
  PublishContractsClickCreate() { cy.get('#CUR-UDpJJUhA').click(); }
  PublishContractSelectPayee() { cy.typeAheadSelection('stan', 'Z Standard', '#CUR-eahYeMnc'); }
  PublishContractsNameField() { cy.get('#CUR-tYltRUcS').type('A Smoke Contract'); }
  PublishContractsStartDate() { cy.get('#CUR-dyWxzodj').clear().type('01/02/2023'); }
  PublishContractsStartDateDoneButton() { cy.xpath('//button[contains(text(),"Done")]').click().wait(1000); }
  PublishContractsEndDate() { cy.get('#CUR-HCfjjYNb').clear().type('01/02/2023'); }
  PublishContractsForeignID() { cy.get('#CUR-gaQtKgcB').clear().type('Gelo12345'); }
  PublishContractsProjectID() { cy.get('#CUR-projectId-input').clear().type('Contract12345'); }
  // Categories
  PublishContractsClickCategoriesDD() { cy.xpath('//label[@id="CUR-NqJxUpNS"]/following::input[@type="search"][1]').click(); }
  PublishContractsTypeCategoriesDD() { cy.xpath('//label[@id="CUR-NqJxUpNS"]/following::input[@type="search"][1]').type('Premium').wait(1000); }
  PublishContractsSelectCreator() { cy.get('#CUR-nxGGltrV span').contains('Premium').click(); }
  // HomeCurrency
  PublishContractsHomeCurrencyDD() { cy.xpath('//label[@id="CUR-tXdmkGHf"]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  PublishContractsHomeCurrencyDDSelection() { cy.xpath('//label[@id="CUR-tXdmkGHf"]/following::span[@id="CUR-LQcCzhiE"][1]').click({ force: true }); }
  // Accounting Period
  PublishContractsAccountingPeriod() { cy.xpath('//label[@id="CUR-KuWObaYW"]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  PublishContractsAccountingPeriodDDSelection() { cy.get('#CUR-BcAglvFK').click(); }
  // Finances
  PublishContractsOpeningBalance() { cy.get('#CUR-XAgXnZFz').type('50'); }
  PublishContractsMinPayout() { cy.get('#CUR-pLtIIIAd').type('10'); }
  // terms page
  PublishContractsTermsTab() { cy.get('#CUR-aXNqZBBZ').click().wait(3000); }
  PublishContractsIncome() { cy.get('#CUR-idpDiiuB').click(); }
  PublishContractsDealTypeDD() { cy.xpath('//div[@id="CUR-KhIBBHQC"]/following::select[@aria-invalid="false"][6]').select('string:Gross Receipts'); }
  PublishContractsRate() { cy.xpath('//label[contains(text(),"Cat Group")]/following::input[@type="text"][2]').type('100'); }
  // save and validate created data  
  PublishContractsTermsSave() { cy.get('#CUR-TinbGPNU').click().wait(5000); }
  PublishContractsValidation1() { cy.get('#CUR-tYltRUcS').should('have.value', 'A Smoke Contract'); }
  PublishContractsValidation2() { cy.get('#CUR-projectId-input').should('have.value', 'Contract12345'); }
  PublishContractsValidation3() { cy.get('#CUR-XanMLNZY').should('have.text', 'Royalty'); }
  // validate on index page
  PublishContractsClickContractsLink() { cy.get('#CUR-wOfZbPpM').click().wait(3000); }
  PublishContractsCreatedContract() { cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract').should('be.visible'); }
  PublishContractsRoyaltyValidation() { cy.get('#CUR-EcVRXuaF span').contains('Royalty').first().should('be.visible'); }
  PublishContractsCreatorValidation() { cy.get('#CUR-EcVRXuaF span').contains('Premium').should('be.visible'); }
  // Update Contract  
  PublishContractsClickCreateContract() { cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract').click().wait(1000); }
  PublishContractsUpdateName() { cy.get('#CUR-tYltRUcS').clear().type('A Smoke Contract update'); }
  PublishContractsUpdateProjectID() { cy.get('#CUR-projectId-input').clear().type('C123457'); }
  // save and validate updated data 
  PublishContractsUpdateSave() { cy.get('#CUR-TinbGPNU').click(); }
  PublishContractsUpdateNameValidation() { cy.get('#CUR-tYltRUcS').should('have.value', 'A Smoke Contract update'); }
  PublishContractProjectIDValidation() { cy.get('#CUR-projectId-input').should('have.value', 'C123457'); }
  // validate on index page
  PublishContractsClickContractsLink1() { cy.get('#CUR-wOfZbPpM').click().wait(3000); }
  PublishContractsUpdateContractValidation() { cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract update').should('be.visible'); }
  PublishContractsTypeValidation() { cy.get('#CUR-EcVRXuaF span').contains('Royalty').first().should('be.visible'); }
  // delete contract on edit page
  PublishContractsClickDeleteSelected() { cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract update').click().wait(1000); }
  PublishContractsClickDeleteButton() { cy.get('#CUR-EDDJtFXV').click(); }
  PublishContractsClickDeleteButtonModal() { cy.get('#CUR-SIepMXur').click().wait(1000); }




  // Releases TC
  PublishReleasesCatalogueMenu() { cy.get('#sidebar-catalogue > a').click({ force: true }); }
  PublishReleasesSubmenu() { cy.get('#sidebar-releases > a').click(); }
  // validate index page content
  PublishReleasesSearchBar() { cy.get('#CUR-cFpKxgfD').should('be.visible'); }
  PublishReleasesExportButton() { cy.get('#CUR-TCRcrdqE').should('be.visible'); }
  PublishReleasesImportButton() { cy.get('#CUR-zWopaSgP').should('be.visible'); }
  PublishReleasesDeleteButton() { cy.get('#CUR-qIHIFTHv').should('be.visible'); }
  PublishReleasesCreateButton() { cy.get('#CUR-wACALinu').should('be.visible'); }
  PublishReleasesCATGroup() { cy.xpath('//a[@id="CUR-ebSvwdEJ"]/following::input[@type="search"][1]') }
  PublishReleasesCreatedAfter() { cy.get('#CUR-hrSUzIbD').should('be.visible'); }
  PublishReleasesCreatedBefore() { cy.get('#CUR-qonjDtEo').should('be.visible'); }
  PublishReleasesComplete() { cy.xpath('//a[@id="CUR-ebSvwdEJ"]/following::span[@tabindex="-1"][1]') }
  PublishReleasesLabel() { cy.get('#CUR-filter-label-textbox').should('be.visible'); }
  PublishReleasesArtist() { cy.get('#CUR-filter-artist-textbox').should('be.visible'); }
  PublishReleasesDistributionChannel() { cy.get('#CUR-filter-distributionChannel-select').should('be.visible'); }
  PublishReleasesFormat() { cy.get('#CUR-filter-format-select').should('be.visible'); }
  PublishReleasesTitleHeader() { cy.get('#CUR-VtMGALPT th').contains('Title').should('be.visible'); }
  PublishReleasesArtistHeader() { cy.get('#CUR-VtMGALPT th').contains('Artist').should('be.visible'); }
  PublishReleasesCATNoHeader() { cy.get('#CUR-VtMGALPT th').contains('Cat No').should('be.visible'); }
  PublishReleasesBarcodeHeader() { cy.get('#CUR-VtMGALPT th').contains('Barcode').should('be.visible'); }
  PublishReleasesFormatHeader() { cy.get('#CUR-VtMGALPT th').contains('Format').should('be.visible'); }
  // create on edit page and input fields
  PublishReleasesClickCreate() { cy.get('#CUR-wACALinu').click({ force: true }); }
  PublishReleasesTitle() { cy.get('#CUR-jJwVtlIr').type('A Release Smoke'); }
  PublishReleasesVersion() { cy.get('#CUR-bhQcVumh').type('v1234'); }
  PublishReleasesArtist1() { cy.get('#CUR-fzTwggPi').type('Gelo1234'); }
  PublishReleasesInputForeignID() { cy.get('#CUR-gjpsiQTF').clear().type('test12345'); }
  PublishReleasesProjectID() { cy.get('#CUR-projectId-input').clear().type('ProID12345'); }
  PublishReleasesDistributionChannel1() { cy.get('#CUR-VBAWXqzd').click().wait(1000); }
  PublishReleasesDistributionSelection() { cy.xpath('//span[@id="CUR-oDYKgzAp" and contains(text(),"Digital")]').click({ force: true }) }
  PublishReleasesFormatDD() { cy.get('#CUR-FjplwIxU').click().wait(1000); }
  PublishReleasesFormatDDSelection() { cy.get('#CUR-FjplwIxU span').contains('Television').click(); }
  PublishReleasesMainDealerPrice() { cy.get('#CUR-YIiKGOHt').clear().type('123'); }
  PublishReleasesCatNoField() { cy.get('#CUR-LsLPGmQZ').clear().type('TEST1001'); }
  PublishReleasesBarCode() { cy.get('#CUR-QkNcjbSR').clear().type('12345098751'); }
  PublishReleasesLabelField() { cy.get('#CUR-SEeQyaaO').clear().type('test smoke'); }
  PublishReleasesReleaseDate() { cy.get('#CUR-rJbBtFhO').click({ force: true }); }
  PublishReleasesReleaseDateType() { cy.get('#CUR-rJbBtFhO').clear().type('01/02/2023'); }
  PublishReleasesReleaseCatGroups() { cy.get('#CUR-gnUaOjad').click().wait(1000); }
  PublishReleasesReleaseCatGroupSelection() { cy.get('#CUR-gnUaOjad span').contains('CAT 1').click(); }
  PublishReleasesRightsTab() { cy.get('#CUR-MxSnludE').click().wait(1000); }
  PublishReleasesAddContract1() { cy.get('#CUR-LkJBDvYJ').click({ force: true }).wait(3000); }
  PublishReleasesTypeContract() { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"][1]').clear().type('test gelo 100').wait(1000); }
  PublishReleasesSelection() { cy.xpath('//a[@title="Test Gelo 100"]').contains('Test Gelo 100').click(); }
  // save and validate created data on edit page
  PublishReleasesClickSave() { cy.get('#CUR-NVcvbMbM').click().wait(2000); }
  PublishReleasesSuccessMsg() { cy.get('.alert-success').should('be.visible').contains('Release successfully created'); }
  // Index page created data validation
  PublishReleasesClickLink() { cy.get('#CUR-NVopGmjV').click(); }
  PublishReleasesValidateArtist() { cy.get('#CUR-VtMGALPT span').contains('Gelo1234').should('be.visible'); }
  // Udpate Release
  PublishReleasesClickCreated() { cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').click(); }
  PublishReleasesUpdateTitle() { cy.get('#CUR-jJwVtlIr').clear().type('A Release Smoke Update'); }
  PublishReleasesUpdateArtist() { cy.get('#CUR-fzTwggPi').clear().type('Test0099'); }
  PublishReleasesUpdateCatNo() { cy.get('#CUR-LsLPGmQZ').clear().type('ARS9999'); }
  PublishReleasesUpdateBarCode() { cy.get('#CUR-QkNcjbSR').clear().type('1111118888888'); }
  // Save and validate Updated release
  PublishReleasesClickSaveButton() { cy.get('#CUR-NVcvbMbM').click().wait(1000); }
  PublishReleaseClickLink1() { cy.xpath('//a[@id="CUR-NVopGmjV"]').click(); }
  PublishReleasesValidateUpdateedTitle() { cy.get('#CUR-jJwVtlIr').should('have.value', 'A Release Smoke Update'); }
  PublishReleasesValidateUpdatedArtist() { cy.get('#CUR-VtMGALPT span').contains('Test0099').should('be.visible'); }
  PublishReleasesValidateUpdatedCatno() { cy.get('#CUR-VtMGALPT span').contains('ARS9999').should('be.visible'); }
  PublishReleasesValidateUpdatedBarCode() { cy.get('#CUR-VtMGALPT span').contains('1111118888888').should('be.visible'); }
  // Delete Release
  PublishReleasesDeleteCreated() { cy.get('#CUR-VtMGALPT a').contains('A Release Smoke Update').click(); }
  PublishReleasesClickDeleteButton() { cy.get('#CUR-IORvSKtL').click(); }
  PublishReleasesClickDeleteModalI() { cy.get('#CUR-NOYiTdFv').click().wait(2000); }



  // Tracks TC
  PublishTracksCatalogueMenu() { cy.get('#sidebar-catalogue > a').click({ force: true }); }
  PublishTracksSubMenu() { cy.get('#sidebar-tracks > a').click(); }
  // Page content validation
  PublishTracksLink() { cy.get('#CUR-EbAPTKvy').should('be.visible'); }
  PublishTracksSearchBar() { cy.get('#CUR-KcppnpIT').should('be.visible'); }
  PublishTracksExportButton() { cy.get('#CUR-FOxFDCYV').should('be.visible'); }
  PublishTracksDeleteButton() { cy.get('#CUR-DsaOOCyn').should('be.visible'); }
  PublishTracksCreateButton() { cy.get('#CUR-ImZPJRMB').should('be.visible'); }
  PublishTracksCATGroupField() { cy.xpath('//a[@id="CUR-EbAPTKvy"]/following::input[@type="search"][1]') }
  PublishTracksCreatedAfter() { cy.get('#CUR-DbLvGukz').should('be.visible'); }
  PublishTracksCreatedBefore() { cy.get('#CUR-rfxIOvip').should('be.visible'); }
  PublishTracksCompleteDD() { cy.xpath('//label[@id="CUR-MMQeqjbO"]/following::span[@tabindex="-1"][1]') }
  PublishTracksLabelField() { cy.get('#CUR-filter-label-textbox').should('be.visible'); }
  PublishTracksFilter() { cy.get('#CUR-uiaJvCvp').should('be.visible'); }
  PublishTracksTitleHeader() { cy.get('#CUR-MSfnkrEY th').contains('Title').should('be.visible'); }
  PublishTracksVersionHeader() { cy.get('#CUR-MSfnkrEY th').contains('Version').should('be.visible'); }
  PublishTracksArtistHeader() { cy.get('#CUR-MSfnkrEY th').contains('Artist').should('be.visible'); }
  PublishTracksISRCHeader() { cy.get('#CUR-MSfnkrEY th').contains('ISRC').should('be.visible'); }
  PublishTracksCreatedHeader() { cy.get('#CUR-MSfnkrEY th').contains('Created').should('be.visible'); }
  // Create Track
  PublishTracksClickCreateButton() { cy.get('#CUR-ImZPJRMB').click({ force: true }).wait(1000); }
  PublishTracksOverviewTab() { cy.get('#CUR-BpKgzLNW').should('be.visible'); }
  PublishTracksTitleField() { cy.get('#CUR-aJwaQxhr').clear().type('A Tracks Smoke'); }
  PublishTracksVersionField() { cy.get('#CUR-kQslEfhD').clear().type('v123'); }
  PublishTracksArtistField() { cy.get('#CUR-MbNpDepo').clear().type('Gelo'); }
  PublishTracksForeignID() { cy.get('#CUR-YwEVxbHr').clear().type('Tracks12345'); }
  PublishTracksProjectID() { cy.get('#CUR-projectId-input').clear().type('Tracks12345'); }
  PublishTracksCatalogueGroupsClick() { cy.xpath('//input[@id="CUR-aJwaQxhr"]/following::input[@type="search"][1]').click({ force: true }).wait(2000) }
  PublishTracksCatalogueGroupsSelection() { cy.get('#CUR-vcYOVxje span').contains('CAT 1').click(); }
  PublishTracksISRCType() { cy.get('#CUR-cOegSfmz').clear().type('Smoke001'); }
  PublishTracksLabel() { cy.get('#CUR-XGvXfkQh').clear().type('GeloTest'); }
  PublishTracksPline() { cy.get('#CUR-FALBZvqH').clear().type('1234'); }
  PublishTracksDuration() { cy.get('#CUR-egOoZEpB').clear().type('120'); }
  PublishTracksRightsTab() { cy.get('#CUR-gXGXUiea').click(); }
  PublishTracksAddContract() { cy.get('#CUR-lwiBgRup').click(); }
  // LabelTracksContractsSearchField1() { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"][1]').click({ force: true }).type('Test Gelo 100',{ force: true }).wait(2000); }
  PublishTracksContractsSearchField() { cy.get('contract-select-field.ng-isolate-scope > .row > .form-group > input').clear().type('Test Gelo 100').wait(2000); }
  PublishTracksContractsSelection() { cy.xpath('//strong[contains(text(),"Test Gelo 100")]').click({ force: true }) }
  // save and validate created data on edit page
  PublishTracksClickSaveRights() { cy.get('#CUR-UaNimHCt').click({ force: true }).wait(1000); } // Save Button
  PublishTracksValidateTitle() { cy.get('#CUR-aJwaQxhr').should('have.value', 'A Tracks Smoke'); }
  PublishTracksValidateVersion() { cy.get('#CUR-kQslEfhD').should('have.value', 'v123'); }
  PublishTracksValidateArtist() { cy.get('#CUR-MbNpDepo').should('have.value', 'Gelo'); }
  PublishTracksValidateForeignID() { cy.get('#CUR-YwEVxbHr').should('have.value', 'Tracks12345'); }
  PublishTracksValidateProjectID() { cy.get('#CUR-projectId-input').should('have.value', 'Tracks12345'); }
  PublishTracksRightsTabClick() { cy.get('#CUR-HtCcvMVh').click(); } // Go to Rights Tab
  PublishTracksContractValidate() { cy.xpath('//label[contains(text(),"Contract")]/following::input[@type="text"][1]').should('have.value', 'Test Gelo 100'); }
  // validate created data on index page 
  PublishTracksLinkClick1() { cy.get('#CUR-MwPfmXzd').click().wait(2000); }
  PublishTracksValidateCreatedTitle() { cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke').should('be.visible'); }
  PublishTracksValidateCreatedArtist() { cy.get('#CUR-MSfnkrEY span').contains('Gelo').should('be.visible'); }
  PublishTracksValidateCreatedVersion() { cy.get('#CUR-MSfnkrEY span').contains('v123').should('be.visible'); }
  PublishTracksValidateCreatedISRC() { cy.get('#CUR-MSfnkrEY span').contains('Smoke001').should('be.visible'); }
  // Update Tracks on edit page
  PublishTracksEditCreated() { cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke').click({ force: true }); }
  PublishTracksEditTitle() { cy.get('#CUR-aJwaQxhr').clear().type('A Tracks Smoke Update'); }
  PublishTracksEditVersion() { cy.get('#CUR-kQslEfhD').clear().type('v1236789'); }
  PublishTracksEditArtist() { cy.get('#CUR-MbNpDepo').clear().type('Gelo1234'); }
  PublishTracksEditForeignID() { cy.get('#CUR-YwEVxbHr').clear().type('098765'); }
  PublishTracksEditProjectID() { cy.get('#CUR-projectId-input').clear('T'); }
  PublishTracksEditProjectIDType() { cy.get('#CUR-projectId-input').type('T09876'); }
  // save and validate updated data on edit page
  PublishTracksClickEditSave() { cy.get('#CUR-UaNimHCt').click({ force: true }).wait(1000); }
  PublishTracksValidateUpdatedTitle() { cy.get('#CUR-aJwaQxhr').should('have.value', 'A Tracks Smoke Update'); }
  PublishTracksValidateUpdatedVersion() { cy.get('#CUR-kQslEfhD').should('have.value', 'v1236789'); }
  PublishTracksValidateUpdatedArtist() { cy.get('#CUR-MbNpDepo').should('have.value', 'Gelo1234'); }
  PublishTracksValidateUpdatedForeignID() { cy.get('#CUR-YwEVxbHr').should('have.value', '098765'); }
  PublishTracksValidateUpdateedProjectID() { cy.get('#CUR-projectId-input').should('have.value', 'T09876'); }
  // validate updtaed data on index page 
  PublishTracksLinkClick2() { cy.get('#CUR-MwPfmXzd').click().wait(2000); }
  PublishTracksValidatEditedTitle() { cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke Update').should('be.visible'); }
  PublishTracksValidatEditedeVersion() { cy.get('#CUR-MSfnkrEY span').contains('v1236789').should('be.visible'); }
  PublishTracksValidateEditedArtist() { cy.get('#CUR-MSfnkrEY span').contains('Gelo1234').should('be.visible'); }
  PublishTracksValidateISRC() { cy.get('#CUR-MSfnkrEY span').contains('Smoke001').should('be.visible'); }
  // delete track on edit page
  PublishTracksClickCreatedTitleDelete() { cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke Update').click(); }
  PublishTrakcsClickDeleteButton() { cy.get('#CUR-YLCMDySu').click(); }
  PublishTracksClickDeleteModalButton() { cy.get('#CUR-tOCyBdOF').click(); }



  // Works TC
  PublishWorksCatalogueMenu() { cy.get('#sidebar-catalogue > a').click(); }
  PublishWorksSubMenu() { cy.get('#sidebar-works > a').click(); }
  // Works Page content validation
  PublishWorksSearchBar() { cy.get('#CUR-UGPXLwcU').should('be.visible'); }
  PublishWorksBulkUpdate() { cy.get('#CUR-NnJJRmNQ').should('be.visible'); }
  PublishWorksDeliver() { cy.get('#CUR-EQmlyZrK').should('be.visible'); }
  PublishWorksExport() { cy.get('#CUR-fqGIIWLl').should('be.visible'); }
  PublishWorksImport() { cy.get('#CUR-EXKAKmlJ').should('be.visible'); }
  PublishWorksDelete() { cy.get('#CUR-HAmSUhwK').should('be.visible'); }
  PublishWorksCreate() { cy.get('#CUR-KAaEpThj').should('be.visible'); }
  PublishWorksCatGroup() { cy.xpath('//a[@id="CUR-KAaEpThj"]/following::input[@type="search"][1]').should('be.visible'); }
  PublishWorksCreateAfter() { cy.get('#CUR-WXUZHcuG').should('be.enabled'); }
  PublishWorksCreatedBefore() { cy.get('#CUR-BnuXKbhL').should('be.enabled'); }
  PublishWorksComposer() { cy.xpath('//label[@id="CUR-MQtuFgXJ"]/following::input[@type="search"][1]').should('be.enabled'); }
  PublishWorksPublisher() { cy.xpath('//label[@id="CUR-GMWwHXUT"]/following::input[@type="search"][1]').should('be.visible'); }
  PublishWorksValid() { cy.xpath('//label[@id="CUR-dUAImXqt"]/following::span[@tabindex="-1"]').should('be.visible'); }
  PublishWorksParticipation() { cy.get('#CUR-NyBJbDRP').should('be.visible'); }
  PublishWorksOwnership() { cy.get('#CUR-glzQOMnn').should('be.visible'); }
  PublishWorksFilter() { cy.get('#CUR-FJnQAzwW').should('be.visible'); }
  PublishWorksTitleHeader() { cy.xpath('//div[@id="CUR-fTPjewUV"]/following::th[@role="button"][1]').should('have.text', 'Title'); }
  PublishWorksComposerHeader() { cy.xpath('//div[@id="CUR-fTPjewUV"]/following::th[@role="button"][2]').should('have.text', 'Composer'); }
  PublishWorksMainIdentifHeader() { cy.xpath('//div[@id="CUR-fTPjewUV"]/following::th[@role="button"][3]').should('be.visible'); }
  PublishWorksCreatedHeader() { cy.xpath('//div[@id="CUR-fTPjewUV"]/following::th[@role="button"][4]').should('have.text', 'Created'); } 
  PublishWorksOwnershipHeader() { cy.xpath('//div[@id="CUR-fTPjewUV"]/following::th[@role="button"][5]').should('have.text', 'Ownership'); }
  // Create a Work
  PublishWorksClickCreate() { cy.get('#CUR-KAaEpThj').click(); }
  PublishWorksTypeTitle() { cy.get('#CUR-lsTRMbuJ').type('A Work Smoke'); }
  PublishWorksAltTitle() { cy.get('#CUR-qxneCfJR').click().wait(1000); }
  PublishWorksAltTitleField() { cy.xpath('//label[@id="CUR-vLICvQZe"]/following::input[@type="text"][1]').type('A Work Smoke test'); }
  PublishWorksLanguageDD() { cy.xpath('//label[@id="CUR-sWfTWOUN"]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  PublishWorksLanguageSelection() { cy.xpath('//span[contains(text(),"English")]').click(); }
  PublishWorksCategory() { cy.xpath('//label[@id="CUR-FamUVQWa"]/following::select[@aria-invalid="false"][1]').select('string:Pop'); }
  PublishWorksLanguage2() { cy.xpath('//label[@id="CUR-ekpzyKQr"]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  PublishWorksLanguageSelection2() { cy.xpath('//span[@id="CUR-qLoefOVU" and contains(text(),"English")]').click({ force: true }); }
  PublishWorksCompositeType() { cy.xpath('//label[@id="CUR-ISpsJBCk"]/following::select[@aria-invalid="false"][1]').select('string:None'); }
  PublishWorksWorkVersion() { cy.xpath('//label[@id="CUR-ljxFbnWk"]/following::select[@aria-invalid="false"][1]').select('string:Original Work'); }
  PublishWorksComposer1() { cy.get('#CUR-VJwHBmur').type('Gelo'); }
  PublishWorksForeignID() { cy.get('#CUR-dxyDcLit').type('AWS1029283'); }
  PublishWorksProjectID() { cy.get('#CUR-projectId-input').type('WS098765'); }
  PublishWorksMainIdentifier1() { cy.get('#CUR-rgfRlRyx').type('W01928192'); }
  // Adding territory
  PublishWorksTerritoriesTab() { cy.get('#CUR-fNRPquyE').click(); }
  PublishWorksWorld1() { cy.xpath('//div[@id="CUR-xhqhrNoY"]/following::input[1]').check(); }
  // Adding IP Chain
  PublishWorksIPChainTab() { cy.get('#CUR-gsehYTpY').click(); }
  PublishWorksAddTerritory() { cy.get('#CUR-BsaeqULR').click().wait(1000); }
  // Publisher
  PublishWorksAddPub() { cy.xpath('//label[contains(text(),"Territory")]/following::button[contains(text(),"+ Pub")][1]').click({ force: true }).wait(1000); }
  PublishWorksPubSearch() { cy.xpath('//label[contains(text(),"Publisher")]/following::input[1]').clear().type('publisher 2').wait(1000); }
  PublishWorksPubSelect() { cy.get('#CUR-iudiqUJH strong').contains('publisher 2').click().wait(200); }
  PublishWorksCategory1() { cy.xpath('//label[contains(text(),"Publisher")]/following::select[1]').select('string:Admin').wait(200); }
  PublishWorksOwnMech() { cy.xpath('//label[contains(text(),"Own Mech.")]/following::input[@type="number"][1]').type('100').wait(200); }
  PublishWorksOwnPerf() { cy.xpath('//label[contains(text(),"Own Perf.")]/following::input[1]').type('50').wait(200); }
  // Composer
  PublishWorksAddComp() { cy.xpath('//label[contains(text(),"Territory")]/following::button[contains(text(),"+ Comp")][1]').click().wait(1000); }
  PublishWorksCompSearch() { cy.xpath('//label[contains(text(),"Publisher")]/following::input[@type="text"][2]').type('composer 2').wait(1000); }
  PublishWorksCompSelect() { cy.xpath('//strong[contains(text(),"composer")]').contains('composer 2').click().wait(1000); }
  PublishWorksCategoryDD1() { cy.xpath('//span[contains(text(),"World")]/following::select[2]').select('string:Arranger').wait(2000); }
  PublishWorksCheckBox() { cy.xpath('//label[contains(text(),"Territory")]/following::input[@type="checkbox"][2]').check().wait(2000); }
  PublishWorksOwnPerf2() { cy.xpath('//label[contains(text(),"Territory")]/following::input[@type="number"][6]').type('50').wait(200); }
  PublishWorksColPerf() { cy.xpath('//label[contains(text(),"Territory")]/following::input[@type="number"][8]').type('50').wait(1000); }
  PublishWorksSave1() { cy.get('#CUR-krbtirMF').click().wait(5000); }
  // Validate Created Data
  PublishWorksLink1() { cy.get('#CUR-zUiMHZJq').click().wait(3000); }
  PublishWorksValidateCreated() { cy.get('#CUR-KHaNLiQh a').contains('A Work Smoke').should('be.visible'); }
  PublishValidateComposer() { cy.get('#CUR-KHaNLiQh span').contains('Gelo').should('be.visible'); }
  PublishValidateMainIdentifier() { cy.get('#CUR-KHaNLiQh span').contains('W01928192').should('be.visible'); }
  // Update Works
  PublishWorksClickCreated() { cy.get('#CUR-KHaNLiQh a').contains('A Work Smoke').click(); }
  PublishWorksUpdateTitle() { cy.get('#CUR-lsTRMbuJ').clear().type('A Work Smoke Update'); }
  PublishWorksUpdateComposer() { cy.get('#CUR-VJwHBmur').clear().type('Zafra'); }
  PublishWorksUpdateMainIdentif() { cy.get('#CUR-rgfRlRyx').clear().type('BB00099998'); }
  PublishWorksClickSave2() { cy.get('#CUR-krbtirMF').click().wait(2000); }
  // Validated Updated Data
  PublishWorksValidateUpdatedTitle() { cy.get('#CUR-lsTRMbuJ').should('have.value', 'A Work Smoke Update'); }
  PublishWorksValidateUpdatedComposer() { cy.get('#CUR-VJwHBmur').should('have.value', 'Zafra'); }
  PublishWorksValidateUpdatedMainID() { cy.get('#CUR-rgfRlRyx').should('have.value', 'BB00099998'); }
  PublishWorksUpdatedLink() { cy.get('#CUR-zUiMHZJq').click().wait(2000); }

  PublishWorksValidate1() { cy.get('#CUR-KHaNLiQh a').contains('A Work Smoke Update').should('be.visible'); }
  PublishWorksValidate2() { cy.get('#CUR-KHaNLiQh span').contains('Zafra').should('be.visible'); }
  PublishWorksValidate3() { cy.get('#CUR-KHaNLiQh span').contains('BB00099998').should('be.visible'); }
  // Delete Works
  PublishWorksDeleteCreated() { cy.get('#CUR-KHaNLiQh a').contains('A Work Smoke Update').click(); }
  PublishWorksClickDelete() { cy.get('#CUR-XJkFoQlq').click(); }
  PublishWorksClickDelete2() { cy.get('#CUR-AzjXhskq').click(); }
  PublishWorksDelete3() { cy.get('#CUR-JjRYoFWa').click().wait(5000); }





  // COMPOSER TC
  CompoCatalogueMenu() { cy.get('#sidebar-catalogue > a').click(); }
  CompoSubMenu() { cy.get('#sidebar-composers > a').click(); }
  // Composer index page Validation
  CompoExport() { cy.get('#CUR-uUKVnFba').should('be.visible'); }
  CompoImport() { cy.get('#CUR-eTaahVPO').should('be.visible'); }
  CompoDelete() { cy.get('#CUR-FuVciLZH').should('be.visible'); }
  CompoCreate() { cy.get('#CUR-KSqmmqMO').should('be.visible'); }
  CompoSearch() { cy.get('#CUR-ucZUtjNV').should('be.visible'); }
  CompoNameHeader() { cy.get('#CUR-OuUVLroh th').contains('Name').should('be.visible'); }
  CompoCAEHeadr() { cy.get('#CUR-OuUVLroh th').contains('CAE').should('be.visible'); }
  CompoCreatedHeader() { cy.get('#CUR-OuUVLroh th').contains('Created').should('be.visible'); }
  // Create on Composer Edit Page
  CompoCreateClick() { cy.get('#CUR-KSqmmqMO').click(); }
  CompoName() { cy.get('#CUR-xsBQITjy').type('A Composer Smoke'); }
  CompoForeignId() { cy.get('#CUR-PznCFrfI').type('Gelo12345'); }
  CompoFName() { cy.get('#CUR-TegBJoBK').type('Gelo'); }
  CompoMName() { cy.get('#CUR-DrmeRXPD').type('T'); }
  CompoLName() { cy.get('#CUR-JRzrthyU').type('Zafra'); }
  CompoCAENumber() { cy.get('#CUR-BbMNJqNK').type('Gelo1243'); }
  CompoNotes() { cy.get('#CUR-CDkYswGc').type('This is a test'); }
  CompoMainSociety() { cy.xpath('//label[@id="CUR-APHDmvLu"]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  CompoMainSelection() { cy.get('#CUR-UGpikDDg span').contains('PRS').click(); }
  CompoMainSocIdentif() { cy.get('#CUR-sioshbFW').type('PRS'); }
  CompoMechSoc() { cy.xpath('//label[contains(text(),"Mechanical Society")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); } 
  CompoMechSocSel() { cy.xpath('//span[contains(text(),"ASCAP")]').click({ force: true }) }
  CompoMechSocIdentif() { cy.get('#CUR-uOsxyaYM').type('ASCAP'); }
  CompoPerfSoc() { cy.xpath('//label[contains(text(),"Performance Society")]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  CompoPerfSocSel() { cy.xpath('//span[contains(text(),"BMI")]').click({ force: true }); }
  CompoPerfSocIdentif() { cy.get('#CUR-qRIrDLBk').type('BMI'); }
  CompoSyncSociety() { cy.xpath('//label[contains(text(),"Sync Society")]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  CompoSyncSocSel() { cy.xpath('//span[contains(text(),"SOCAN")]').click({ force: true }).wait(1000); }
  CompoSyncSocIdentif() { cy.get('#CUR-meFMQkiN').type('SOCAN'); }
  CompoClickSave() { cy.get('#CUR-rExQKhmY').click(); } // Save
  // Edit Page data validation
  CompoSuccessMsg() { cy.xpath('//div[@class="alert alert-success"]').should('be.visible'); }
  CompoValidateName() { cy.get('#CUR-xsBQITjy').should('have.value', 'A Composer Smoke'); }
  CompoValidateCAE() { cy.get('#CUR-BbMNJqNK').should('have.value', 'Gelo1243'); }
  CompoValidateForeignID() { cy.get('#CUR-PznCFrfI').should('have.value', 'Gelo12345'); }
  // Index Page data validation
  CompoLink() { cy.get('#CUR-NycXRuxX').click(); }
  CompoValidateCreated() { cy.xpath('//div[@id="CUR-BHqUuhJj"]/following::a[contains(text(),"A Composer Smoke")]').should('be.visible'); }
  CompoValidateCreatedCAE() { cy.get('#CUR-OuUVLroh span').contains('Gelo1243').should('be.visible'); }
  // Updated edit page Composer
  CompoClickCreated() { cy.get('#CUR-OuUVLroh a').contains('A Composer Smoke').click(); }
  CompoUpdateName() { cy.get('#CUR-xsBQITjy').clear().type('A Composer Smoke Update'); }
  CompoUpdateCAE() { cy.get('#CUR-BbMNJqNK').clear().type('Smoke1234'); }
  CompoClickSave1() { cy.get('#CUR-rExQKhmY').click(); }
  // Validate Updated Data
  CompoSuccessMSg() { cy.xpath('//div[@class="alert alert-success"]').should('be.visible'); }
  ComposersLinkClick() { cy.get('#CUR-NycXRuxX').click(); }
  CompoValidateUpdated() { cy.xpath('//div[@id="CUR-BHqUuhJj"]/following::a[contains(text(),"A Composer Smoke Update")]').should('be.visible'); }
  CompoValidateUpdatedCae() { cy.get('#CUR-OuUVLroh span').contains('Smoke1234').should('be.visible'); }
  // Delete Composer
  CompoDeleteCreated() { cy.xpath('//div[@id="CUR-BHqUuhJj"]/following::a[contains(text(),"A Composer Smoke Update")]').click(); }
  CompoDeleteClick() { cy.get('#CUR-JaWdFtZJ').click(); }
  CompoDeleteModal() { cy.get('#CUR-bcgdhSSZ').click(); }
  CompoDeleteMsG() { cy.xpath('//div[@class="alert alert-success"]').should('be.visible'); }



  // PUBLISHERS TC
  PublishersCatalogueMenu() { cy.get('#sidebar-catalogue > a').click(); }
  PublishersSubMenu() { cy.get('#sidebar-publishers > a').click(); }
  // Index Page Content validations
  PublishersLink() { cy.get('#CUR-WPeTuqhB').should('be.visible'); }
  PublisherExportButton() { cy.get('#CUR-qSMNNTsL').should('be.visible'); }
  PublishersDelete() { cy.get('#CUR-cUnwntgQ').should('be.visible'); }
  PublishersImport() { cy.get('#CUR-cRnLChHq').should('be.visible'); }
  PublishersCreate() { cy.get('#CUR-gzVjvyDf').should('be.enabled'); }
  PublishersHeader() { cy.get('#CUR-IdTyYZVz').should('be.visible'); }
  PublishersHeaderName() { cy.xpath('//div[@id="CUR-IdTyYZVz"]/following::th[@tabindex="0"][1]').contains('Name').should('be.visible'); }
  PublishersCAE() { cy.xpath('//div[@id="CUR-IdTyYZVz"]/following::th[@tabindex="0"][2]').contains('CAE').should('be.visible'); }
  PublishersCreated() { cy.xpath('//div[@id="CUR-IdTyYZVz"]/following::th[@tabindex="0"][3]').contains('Created').should('be.visible'); }
  PublishersShowingPage25() { cy.get('#CUR-UyCYXogv').should('be.visible'); }
  PublisherShowAll() { cy.get('#CUR-ZlQYpBSV').should('be.visible'); }
  // Input on edit page (create data)
  PublishersClickCreate() { cy.get('#CUR-gzVjvyDf').click(); }
  PublishersTypeName() { cy.get('#CUR-uwDhIFdL').type('A Publisher Smoke'); }
  PublishersForeignIDField() { cy.get('#CUR-jBtFftsd').type('1245678'); }
  PublishersCAEField() { cy.get('#CUR-YGFKkpxE').type('098765'); }
  PublishersNotes() { cy.get('#CUR-FQUAyOOe').type('This is a Test'); }
  PublishersMainSoc() { cy.xpath('//label[contains(text(),"Main Society")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  PublishersMainSocSel() { cy.xpath('//label[contains(text(),"Main Society")]/following::span[contains(text(),"PRS")][1]').click({ force: true }) }
  PublishersMainSocIdentif() { cy.get('#CUR-qxmuYAKg').type('PRS'); }
  PublishersMechSoc() { cy.xpath('//label[contains(text(),"Mechanical Society")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  PublishersMecgSocSel() { cy.xpath('//span[contains(text(),"ASCAP")]').click({ force: true }) }
  PublishersMechSocIdentif() { cy.get('#CUR-eFOUNyYv').type('ASCAP'); }
  PublishersPerfSoc() { cy.xpath('//label[contains(text(),"Performance Society")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  PublishersPerfSocSel() { cy.xpath('//span[contains(text(),"BMI")]').click({ force: true }); }
  PublishersPerfSocIdentif() { cy.get('#CUR-kyQBlQUX').type('BMI'); }
  PublishersSyncSoc() { cy.xpath('//label[contains(text(),"Sync Society")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000); }
  PublishersSyncSocSel() { cy.xpath('//span[contains(text(),"SOCAN")]').click({ force: true }).wait(1000); }
  PublishersSyncSocIdentif() { cy.get('#CUR-XmoSHHoD').type('SOCAN'); }
  // Save and validate on edit page
  PublishersClickSaveButton() { cy.get('#CUR-dWTsVAEi').click().wait(1000); }
  PublishersValidateName() { cy.get('#CUR-uwDhIFdL').should('have.value', 'A Publisher Smoke'); }
  PublishersForeignName() { cy.get('#CUR-jBtFftsd').should('have.value', '1245678'); }
  PublishersCAENumber() { cy.get('#CUR-YGFKkpxE').should('have.value', '098765'); }
  // Validate data on index page
  PublishersClickLink() { cy.get('#CUR-kftJkCAH').click(); }
  PublishersValidateCreated() { cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke').should('be.visible'); }
  PublishersValidateCAE() { cy.get('#CUR-UBgtBBTg span').contains('098765').should('be.visible'); }
  // update data on edit page
  PublishersClickCreatedPub() { cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke').click(); }
  PublishersNameUpdate() { cy.get('#CUR-uwDhIFdL').clear().type('A Publisher Smoke Update'); }
  PublishersUpdateForeignID() { cy.get('#CUR-jBtFftsd').clear().type('ABC1245678'); }
  PublishersupdateCAE() { cy.get('#CUR-YGFKkpxE').clear().type('ABC098765'); }
  // save and validate updated data on edit page
  PublishersUpdateSave() { cy.get('#CUR-dWTsVAEi').click().wait(1000); }
  PublisherSuccessMsg() { cy.xpath('//div[@class="alert alert-success"]').should('be.visible'); }
  PublishersValidateUpdatedName() { cy.get('#CUR-uwDhIFdL').should('have.value', 'A Publisher Smoke Update'); }
  PublishersValidateUpdatedForeignID() { cy.get('#CUR-jBtFftsd').should('have.value', 'ABC1245678'); }
  PublishersValidateUpdatedCAE() { cy.get('#CUR-YGFKkpxE').should('have.value', 'ABC098765'); }
  // validate updayed data on index page
  PublishersLinkClick2() { cy.get('#CUR-kftJkCAH').click(); }
  PublishersValidateUpdated2() { cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke Update').should('be.visible'); }
  PublishersValidateA() { cy.get('#CUR-UBgtBBTg span').contains('ABC098765').should('be.visible'); }
  // delete data
  PublishersDeleteCreated() { cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke Update').click({ force: true }); }
  PublishersClickDelete() { cy.get('#CUR-mvVYCWXR').click(); }
  PublishersClickDeleteModal() { cy.get('#CUR-LnaBreyR').click(); }



  // PERIODS TC
  PeriodStatementsMenu() { cy.get('#sidebar-statements > a').click({ force: true }); }
  PeriodSubmenu() { cy.get('#sidebar-periods > a').click(); }
  PeriodCreate() { cy.get('#CUR-gYxIZkCO').click({ force: true }); }
  // create page
  PeriodNameField() { cy.xpath('//input[@type="text" and @ng-model="period.name"]').clear().type('A Period Test'); }
  PeriodAccountingPeriodTypeDD1() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@tabindex="-1"][1]').wait(1000).click(); }
  // LabelPeriodAccountingPeriodTypeDD() { cy.get(':nth-child(3) > .ui-select-container > .ui-select-match > .btn-default').wait(3000).click(); }
  // LabelPeriodAccountingPeriodTypeDDSelection1() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::div[@id="ui-select-choices-row-2-0"]').click({ force: true }); }
  PeriodAccountingPeriodTypeDDSelection2() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@class="ui-select-choices-row-inner"][1]').click({ force: true }); }
  PeriodYear() { cy.xpath('//label[contains(text(),"Year")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(1000) }
  PeriodYearDDSelection() { cy.xpath('//a[contains(text(),"Setup")]/following::span[@class="ui-select-choices-row-inner"][2]').click({ force: true }) }
  PeriodAccountingPeriod1() { cy.xpath('//label[contains(text(),"Year")]/following::span[@tabindex="-1"][2]').click().wait(1000) }
  // LabelPeriodAccountingPeriod() { cy.get('//label[contains(text(),"Year")]/following::span[contains(text(),"H1")]').click({ force: true }).wait(3000); }
  PeriodAccountingPeriodDDSelection() { cy.xpath('//label[contains(text(),"Accounting Period")]/following::span[@class="ui-select-choices-row-inner"][2]').click().wait(2000); }
  // Start Date
  PeriodStartDateClick() { cy.xpath('//input[@is-open="startDatePopup"]').click(); }
  PeriodStartDateClick1() { cy.xpath('//input[@is-open="startDatePopup"]').click(); }
  PeriodStartDateType() { cy.xpath('//input[@is-open="startDatePopup"]').type('01/07/2022'); }
  // End Date
  PeriodEndDateClick() { cy.xpath('//input[@is-open="endDatePopup"]').click(); }
  PeriodEndDateClick1() { cy.xpath('//input[@is-open="endDatePopup"]').click(); }
  PeriodEndDateType() { cy.xpath('//input[@is-open="endDatePopup"]').type('31/12/2022'); }
  // Sales Date
  PeriodAccountingDateClick() { cy.xpath('//input[@is-open="accountingDatePopup"]').click(); }
  PeriodAccountingDateClick1() { cy.xpath('//input[@is-open="accountingDatePopup"]').click(); }
  PeriodAccountingDateType() { cy.xpath('//input[@is-open="accountingDatePopup"]').type('31/12/2022'); }
  PeriodNextButton() { cy.xpath('//a[@ng-click="validateSetup()"]').click().wait(25000); }
  // Select Sales
  // LabelPeriodSelectAllRB1() { cy.xpath('//button[@ng-click="filterExcludedSales()"]/following::input[@ng-click="selectAll(excludedSalesFiles)"]').click(); }
  PeriodSelectAllRB() { cy.xpath('//input[@ng-click="selectAll(excludedSalesFiles)"]').click({ froce: true }); }
  PeriodIncludeSelected() { cy.xpath('//button[@ng-click="includeSelectedSales()"]').click().wait(3000); }
  PeriodCalc() { cy.xpath('//a[contains(text(),"Calculate")]').click({ force: true }); }
 
  // validate created data on index page
  PeriodOutsideClick() { cy.get('#CUR-juUorLcH').click(); }
  PeriodValidateCreatedName() { cy.get('#CUR-FpasAYSv a').contains('A Period Test').should('be.visible'); }
  PeriodValidateCreatedYear() { cy.get('#CUR-FpasAYSv td').contains('2023').first().should('be.visible'); }
  PeriodValidateCreatedPeriod() { cy.get('#CUR-FpasAYSv td').contains('H1').should('be.visible'); }
  
  // validate created data on period page
  PeriodClickCreated() { cy.get('#CUR-FpasAYSv a').contains('A Period Test').click(); }
  // Insert conditional statement here

  StatementsPeriodProcessing(status) { cy.get('body').then(($wait) => {
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
  // LabelPeriodWaitAfterClick() { cy.get('#CUR-AkesVxMP'); }
  PeriodGrossRevenue() { cy.get('#CUR-ZJRXUPwP').contains('Gross Revenue').should('be.visible'); }
  PeriodNetPayout() { cy.get('#CUR-dseIvKpY').contains('Net Payout').should('be.visible'); }
  PeriodInputUnits() { cy.get('#CUR-tTpIJdmf').contains('Input Units').should('be.visible'); }
  
  // update on edit page period
  PeriodClickEdit() { cy.get('#CUR-HLUNTSif').click().wait(5000); }
  PeriodEditName() { cy.xpath('//label[contains(text(),"Name")]/following::input[@ng-model="period.name"]').click().clear().type('A Period Test Update'); }
  PeriodEditNext() { cy.xpath('//a[@ng-click="validateSetup()"]').click(); }
  PeriodEditCalculation() { cy.xpath('//a[@ng-click="runCalculation()"]').click(); }
  // validate updated data on period page
  PeriodClickUpdated() { cy.get('#CUR-iXFdMjLD a').contains('A Period Test Update').first().click(); }
  PeriodValidateHeader() { cy.get('#CUR-TRIZDfAQ').should('be.visible'); }
  // validate updated data on index page
  PeriodsClickLink() { cy.get('#CUR-cxqkIWfA').click().wait(3000); }
  PeriodClickUpdatedIndex() { cy.get('#CUR-FpasAYSv a').contains('A Period Test Update').should('be.visible'); }
  PeriodValidateStatus() { cy.get('#CUR-FpasAYSv span').contains('Complete').should('be.visible'); }
  // delete data
  PeriodDeleteClickCreated() { cy.get('#period-select-0').check(); }
  PeriodClickDeleteButton() { cy.get('#CUR-knYbtmzh').click(); }
  PeriodClickDeleteModal() { cy.get('#CUR-bsqGxjeL').click().wait(5000); }



  // STATEMENTS TC
  StatementsMenu() { cy.get('#sidebar-statements > a').click(); }
  StatementsSubMenu() { cy.get('#sidebar-statements-submenu > a').click(); }
  // index page validation
  StatementsSearchBar() { cy.get('#CUR-WBKJWKoQ').should('be.visible'); }
  StatementsPeriodDD() { cy.xpath('//label[@id="CUR-cRIQfQMq"]/following::span[@tabindex="-1"][1]').should('be.visible'); }
  StatementsTypeDD() { cy.xpath('//label[@id="CUR-MQMEexwv"]/following::span[@tabindex="-1"]').should('be.visible'); }
  StatementsFilter() { cy.get('#CUR-NsfLNPuP').should('be.visible'); }
  StatementsGrossSalesHeader() { cy.get('#CUR-YxdjgveE th').contains('Gross Sales').should('be.visible'); }
  StatementsCreatedHeader() { cy.get('#CUR-YxdjgveE th').contains('Created').should('be.visible'); }
  StatementsStatusHeader() { cy.get('#CUR-YxdjgveE th').contains('Status').should('be.visible'); }
  // create statement via period
  StatementsClickPeriod() { cy.get('#sidebar-periods > a').click(); }
  StatementsPeriodClickCreate() { cy.get('#CUR-gYxIZkCO').click(); }
  StatementsNameField() { cy.xpath('//input[@type="text" and @ng-model="period.name"]').clear().type('A Statement Smoke'); }
  StatementsAccountingPeriodTypeDD() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@tabindex="-1"][1]').wait(3000).click(); }
  StatementsAccountingPeriodTypeDDSelection() { cy.xpath('//label[contains(text(),"Accounting Period Type")]/following::span[@class="ui-select-choices-row-inner"][4]').click(); }
  StatementsYear() { cy.xpath('//label[contains(text(),"Year")]/following::span[@tabindex="-1"][1]').click({ force: true }).wait(3000) }
  StatementsYearDDSelection() { cy.xpath('//a[contains(text(),"Setup")]/following::span[@class="ui-select-choices-row-inner"][2]').click(); }
  StatementsAccountingPeriod() { cy.xpath('//label[contains(text(),"Year")]/following::span[@tabindex="-1"][2]').click(); }
  StatementsAccountingPeriodDD() { cy.xpath('//label[contains(text(),"Accounting Period")]/following::span[@class="ui-select-choices-row-inner"][2]').click(); }
  // Date Picker
  StatementsStartDateType() { cy.xpath('//input[@is-open="startDatePopup"]').click({ force: true }).clear().type('01/07/2022'); }
  StatementsEndDateType() { cy.xpath('//input[@is-open="endDatePopup"]').click({ force: true }).clear().type('31/12/2022'); }
  StatementsAccountingDateType() { cy.xpath('//input[@is-open="accountingDatePopup"]').click({ force: true }).clear().type('31/12/2022'); }
  StatementsNextButton() { cy.xpath('//a[contains(text(),"Next")]').click({ force: true }).wait(10000); }
  // Selecting sales
  StatementCheckAllCB() { cy.xpath('//input[@ng-click="selectAll(excludedSalesFiles)"]').click({ froce: true }); }
  StatementsIncludeSelected() { cy.xpath('//button[@ng-click="includeSelectedSales()"]').click().wait(3000); }
  StatementsPeriodCalc() { cy.xpath('//a[contains(text(),"Calculate")]').click({ force: true }); }
  StatementsClickCreated() { cy.get('#CUR-FpasAYSv a').contains('A Statement Smoke').click().wait(3000); }
  // Validate Created Data on period
  StatementsClickStatementsTab() { cy.get('#CUR-wkHjTyNE').click().wait(1000); }
  StatementsValidateStatement() { cy.get('#CUR-HNSDHMbl a').contains('2023 - H1: Test Gelo 100').should('be.visible'); }
  StatementsClick1() { cy.get('#CUR-NNFknldc').click().wait(1000); }
  // Validate Created Data on statement index page
  StatementsClickStatementsSub() { cy.get('#sidebar-statements-submenu > a').click().wait(2000); }
  StatementsTypeSearch() { cy.get('#CUR-WBKJWKoQ').clear().type('Test Gelo 100'); }
  StatementsSearchIconClick() { cy.get('#CUR-bzBwwprg').click().wait(2000); }
  StatementsVerifySearch() { cy.get('#CUR-bkUowpSN a').contains('2023 - H1: Test Gelo 100').should('be.visible'); }
  // adding statement in period
  StatementsPeriodSub() { cy.get('#sidebar-periods > a').click().wait(2000); }
  StatementsPeriodClickCreated() { cy.get('#CUR-FpasAYSv a').contains('A Statement Smoke').click().wait(3000); }
  StatementsClickStatementsTab1() { cy.get('#CUR-yJluSXBB').click().wait(2000); }
  StatementsClickCreateStmt() { cy.get('#CUR-FYPxzvoA').click().wait(2000); }
  StatementsContract() { cy.xpath('//input[@type="text" and @ng-model="getterSetter"]').clear().type('Contract Test').wait(3000); }
  StatementsContractClick() { cy.xpath('//label[@id="CUR-ieyhkgSk"]/following::a[@tabindex="-1"][1]').click({ force: true }) }
  StatementsContractCreate() { cy.get('#CUR-nqObrHgU').click().wait(3000); }
  // validate added data on period
  StatementsValidateCreatedStmt() { cy.get('#CUR-IxnzJpGe a').contains('2023 - H1: Contract Test').should('be.visible'); }
  StatementsValidateClickCreated() { cy.get('#CUR-IxnzJpGe a').contains('2023 - H1: Contract Test').click().wait(2000); }
  // validate on statement index page
  StatementsClickStatementSubm() { cy.get('#sidebar-statements-submenu > a').click().wait(2000); }
  StatementsSearchCreated() { cy.get('#CUR-WBKJWKoQ').clear().type('Contract Test{enter}').wait(3000); }
  StatementsSearchValidteResult() { cy.get('#CUR-bDVEURjD a').contains('2023 - H1: Contract Test').should('be.visible'); }
  StatementSearchClickResult() { cy.get('#CUR-VFrbmBtF').click().wait(2000); }
  // Delete Period
  StatementsPeriod1() { cy.get('#sidebar-periods > a').click().wait(1000); }
  StatementsDeletePeriod() { cy.get('#period-select-0').check(); }
  StatementsDeleteButton() { cy.get('#CUR-knYbtmzh').click().wait(2000); }
  StatementsDeleteModal() { cy.get('#CUR-bsqGxjeL').click().wait(5000); }



  // SALES INGESTION TC
  SalesIncomeMenu() { cy.xpath('//span[@class="title ng-scope"]').click({ force: true }).wait(15000); }
  SalesIncomeSubmenu() { cy.xpath('//a[@class="go-to ng-scope"]').click(); }
  // index page content validation
  SalesValidHeader() { cy.get('#CUR-FHufgwGM').should('have.text', 'Valid'); }
  SalesStatusHeader() { cy.get('#CUR-vwBFXAWO').should('have.text', 'Status'); }
  SalesReported() { cy.get('#CUR-sSeLfdFL').should('have.text', 'Reported'); }
  SalesArhived() { cy.get('#CUR-gTNhalNj').should('have.text', 'Archived'); }
  SalesNew() { cy.get('#CUR-ZYheIwqI').should('have.text', 'New'); }
  SalesFilter() { cy.get('#CUR-NlTTzTrO').should('be.visible'); }
  SalesExport() { cy.get('#CUR-ivKvGcQl').should('be.visible'); }
  SalesRerun() { cy.get('#CUR-nBTrboeS').should('be.visible'); }
  SalesDelete() { cy.get('#CUR-riqaSlSH').should('be.visible'); }
  SalesArchiveButton() { cy.get('#CUR-ofnmYZwF').should('be.visible'); }
  SalesCreate() { cy.get('#CUR-PNdYcPxE').should('be.visible'); }
  SalesNameHeader() { cy.get('#CUR-yprfVOlM th').contains('Name').should('be.visible'); }
  SalesnvoiceHeader() { cy.get('#CUR-yprfVOlM th').contains('Invoice').should('be.visible'); }
  SalesTargetHeader() { cy.get('#CUR-yprfVOlM th').contains('Target').should('be.visible'); }
  SalesAccountHeader() { cy.get('#CUR-yprfVOlM th').contains('Account').should('be.visible'); }
  SalesGrossHeader() { cy.get('#CUR-yprfVOlM th').contains('Gross').should('be.visible'); }
  SalesNetHeader() { cy.get('#CUR-yprfVOlM th').contains('Net').should('be.visible'); }
  SalesInvalidLinesHeader() { cy.get('#CUR-yprfVOlM th').contains('Invalid Lines').should('be.visible').wait(5000); }
  SalesDeleteIfExist() { cy.get('body').then(($body) => {
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
  SalesClickCreate() { cy.get('#CUR-PNdYcPxE').click(); }
  SalesChooseFile() { cy.xpath('//input[@type="file"]').attachFile('smoke-sales-publishing.xlsx').wait(10000); }
  SalesClickComplete() { cy.get('#CUR-aEbJeVnL').click({ force: true }).wait(20000); }
  // validate data on index page
  SalesValidateUploadedFile() { cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').should('be.visible'); }
  SalesValidateAcctNo() { cy.get('#CUR-RKtAMVsX td').contains('456').should('be.visible'); }
  // sales page
  SalesClickUploaded() { cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').click().wait(10000); }
  SalesClickComplete1() { cy.get('#CUR-tSDxRqMQ').click({ force: true }); }
  SalesClickRevalidate() { cy.get('#CUR-DUdWDnqe').click(60000); }
  // update sales
  SalesValidateProcessed() { cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').should('be.visible'); }
  SalesValidatedClick() { cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').click(); }
  SalesHeaderValidation() { cy.get('#CUR-CormnEei').should('be.visible'); }
  SalesClickEdit() { cy.get('#CUR-JntuUeyO').click().wait(3000); }
  SalesUpdateName() { cy.get('#CUR-uOyLTZEv').clear().type('smoke-sales-publishing testing'); }
  SalesClickSave() { cy.get('#CUR-VcrTkCcj').click(); }
  SalesClickSalesLink() { cy.get('#CUR-QkoCHvTt').click().wait(2000); }
  SalesValidateUpdated() { cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing testing').should('be.visible').wait(5000); }
  // delete sales
  SalesDeleteUpdated() { cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing testing').click().wait(5000); }
  SalesClickDeleteEdit() { cy.get('#CUR-JntuUeyO').click().wait(5000); }
  SalesClickDelete() { cy.get('#CUR-dYQCkJmQ').click().wait(5000); }
  SalesClickDeleteModal() { cy.get('#CUR-alQhgDPu').click().wait(5000); }



  // TEMPLATES TC
  TemplatesSalesMenu() { cy.get('#sidebar-sales-files > a').click(); }
  TemplatesSubMenu() { cy.get('#sidebar-templates > a').click(); }
  TemplatesCreateButton() { cy.xpath('//button[@id="CUR-RYumwoor"]/following::a[@data-toggle="dropdown"]').click(); }
  TemplatesCreateFromNew() { cy.get('#CUR-tHSGHnBz').click(); }
  // Calculation Tab
  TemplatesClickCalculationsTab() { cy.get('#CUR-xxVHzJFg').click(); }
  TemplatesAddCalculation() { cy.get('#CUR-NJDqEPhR').click().wait(2000); }
  TemplatesWhenDD() { cy.xpath('//label[contains(text(),"When")]/following::select[@ng-model="calculation.conditionType"]').select('string:Any'); }
  TemplatesAddCondition() { cy.xpath('//label[contains(text(),"When")]/following::button[@ng-click="addCondition()"]').click().wait(5000); }
  // LabelTemplatesInputeTypeDD1() { cy.xpath('//label[contains(text(),"When")]/following::span[@tabindex="-1" and @role="button"][1]').click().wait(1000); }
  // LabelTemplatesInputTypeDDSelection1() { cy.xpath('//label[contains(text(),"When")]/following::span[@class="ui-select-choices-row-inner"][1]').click(); }
  TemplatesInputTypeDD() { cy.xpath('//label[contains(text(),"When")]/following::span[@tabindex="-1"][1]').click().wait(1000); }
  TemplatesInputTypeDDSelection() { cy.xpath('//label[contains(text(),"When")]/following::span[@class="ui-select-choices-row-inner"][1]').click({ force: true }); }
  TemplatesInputValue() { cy.xpath('//label[contains(text(),"When")]/following::input[@type="number"]').clear().type('1'); }
  TemplatesComparisonDD() { cy.xpath('//label[contains(text(),"Comparison")]/following::span[@tabindex="-1"][2]').click().wait(1000); }
  TemplatesComparisonSelectionDD() { cy.xpath('//span[contains(text(),"Is Blank")]').click({ force: true }); }
  TemplatesOutputFieldDD() { cy.xpath('//label[contains(text(),"Output Field")]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  TemplatesOutputFieldDDSelection() { cy.xpath('//label[contains(text(),"Output Field")]/following::span[contains(text(),"Skip Row")]').click({ force: true }); }
  // Overview Tab
  TemplatesClickOverviewTab() { cy.get('#CUR-EtCgEaNp').click(); }
  TemplatesNameField() { cy.get('#CUR-lDUnDkZE').type('A Template Smoke'); }
  TemplatesSource() { cy.get('#CUR-DVIVtmuI').type('ATS'); }
  TemplatesTabNumber() { cy.get('#CUR-GHphjaeq').type('1'); }
  TemplatesHeaderRow() { cy.get('#CUR-SeOCdrpE').type('1'); }
  TemplatesStartingRow() { cy.get('#CUR-qXfqrZTK').type('2'); }
  TemplatesUploadFile() { cy.get('input[type=file]').attachFile('smoke-sales-template.xlsx'); }
  TemplatesClickSaveButton() { cy.get('#CUR-MVMxRkBl').click().wait(8000); } // Save Button
  // Setting Example Lines
  Templates1stField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][1]').click(); }
  Templates1stFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][1]').type('sale date').wait(1000); }
  Templates1stFieldSelect(text) { cy.get('#CUR-bMXYoMFH').contains(text).click(); }

  Templates2ndField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][2]').click(); }
  Templates2ndFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][2]').type('source').wait(1000); }
  Templates22ndFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Source').first().click(); }

  Templates3rdField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][3]').click(); }
  Templates3rdFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][3]').type('sub source').wait(1000); }
  Templates3rdFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Sub Source').click(); }

  Templates4thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][4]').click(); }
  Templates4thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][4]').type('territory').wait(1000); }
  Templates4thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Territory').click(); }

  // Templates5thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][5]').click(); }
  // Templates5thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][5]').type('distribution').wait(1000); }
  // Templates5thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Distribution Channel').click(); }

  Templates6thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][6]').click(); }
  Templates6thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][6]').type('configuration').wait(1000); }
  Templates6thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Configuration').click(); }

  Templates7thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][7]').click(); }
  Templates7thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][7]').type('Cat No').wait(1000); }
  Templates7thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Cat No').click(); }

  Templates8thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][8]').click(); }
  Templates8thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][8]').type('units').wait(1000); }
  Templates8thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Units').click(); }

  Templates9thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][9]').click(); }
  Templates9thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][9]').type('gross').wait(1000); }
  Templates9thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Gross Amount').click(); }

  Templates10thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][10]').click(); }
  Templates10thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][10]').type('net amount').wait(1000); }
  Templates10thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Net Amount').click(); }

  // Templates11thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][11]').click(); }
  // Templates11thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][11]').type('per unit rate').wait(1000); }
  // Templates11thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Per Unit Rate').click(); }

  Templates12thField() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::span[@tabindex="-1"][12]').click(); }
  Templates12thFieldType() { cy.xpath('//label[@id="CUR-dZEZtEtt"]/following::input[@type="search"][12]').type('transaction date').wait(1000); }
  Templates12thFieldSelect() { cy.get('#CUR-bMXYoMFH').contains('Transaction Date').click(); }

  TemplatesClickSave2() { cy.get('#CUR-MVMxRkBl').click().wait(2000); }
  // validate on index page
  TemplatesClickTemplateLink() { cy.get('#CUR-pOyCFpuZ').click().wait(4000); }
  TemplatesValidateCreated() { cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke').should('be.visible'); }
  TemplatesValidateSource() { cy.get('#CUR-WNCyYxcz span').contains('ATS').should('be.visible'); }
  // update template
  TemplatesClickCreated() { cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke').click(); }
  TemplatesUpdateName() { cy.get('#CUR-lDUnDkZE').clear().type('A Template Smoke Update'); }
  TemplatesUpdateSource() { cy.get('#CUR-DVIVtmuI').clear().type('STA'); }
  // save and validate on edit page
  TemplatesClickSave3() { cy.get('#CUR-MVMxRkBl').click().wait(2000); }
  TemplatesValidateEditedName() { cy.get('#CUR-lDUnDkZE').should('have.value', 'A Template Smoke Update'); }
  TemplatesValidateEditedSource() { cy.get('#CUR-DVIVtmuI').should('have.value', 'STA'); }
  // validate on index page
  TemplatesClickTemplatesLink2() { cy.get('#CUR-pOyCFpuZ').click().wait(2000); }
  TemplatesValidateEditedName1() { cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke Update').should('be.visible'); }
  TemplatesValidateEditedSource1() { cy.get('#CUR-WNCyYxcz span').contains('STA').should('be.visible'); }
  // delete
  TemplatesDeleteCreated() { cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke Update').click().wait(2000); }
  TemplatesClickDelete() { cy.get('#CUR-mZEcFCVq').click(); }
  TemplatesClickDeleteModal() { cy.get('#CUR-GWPyNhGt').click(); }



  // PAYMENTS TC
  PPaymentsMenu() { cy.get('#sidebar-payments > a').click(); }
  // payment groups index page validation
  PPaymentsSearchBar() { cy.get('#CUR-HojkyIsW').should('be.visible'); }
  PPaymentsDeleteButton() { cy.get('#CUR-kXoADWjR').should('be.visible'); }
  PPaymentsCreateButton() { cy.get('#CUR-INWUtDqr').should('be.visible'); }
  PPaymentsNameHeader1() { cy.get('#CUR-oTADdvMB th').contains('Name').should('be.visible'); }
  PPaymentsStatusHeader() { cy.get('#CUR-oTADdvMB th').contains('Status').should('be.visible'); }
  PPaymentsCreatedHeader() { cy.get('#CUR-oTADdvMB th').contains('Created').should('be.visible'); }
  // payment index page validation
  PPaymentsClickCreate() { cy.get('#CUR-INWUtDqr').click(); }
  PPaymentsOverviewHeader() { cy.get('#CUR-EnfXLjHD').contains('Overview').should('be.visible'); }
  PPaymentsNameHeader() { cy.get('#CUR-XBVbaFCZ').contains('Name').should('be.visible'); }
  PPaymentsSaveButton() { cy.get('#CUR-LzsfBxoh').should('be.visible'); }
  PPaymentsPayeeHeader() { cy.xpath('//th[contains(text(),"Payee")]').contains('Payee').should('be.visible'); }
  PPaymentsNameHeader2() { cy.xpath('//th[contains(text(),"Name")]').contains('Name').should('be.visible'); }
  PPaymentsCurrencyHeader() { cy.xpath('//th[contains(text(),"Currency")]').contains('Currency').should('be.visible'); }
  PPaymentsAmountHeader() { cy.xpath('//th[contains(text(),"Amount")]').contains('Amount').should('be.visible'); }
  PPaymentsStatusHeader1() { cy.xpath('//th[contains(text(),"Status")]').contains('Status').should('be.visible'); }
  // Add Payment
  PPaymentsEnterName() { cy.get('#CUR-eAKxeLbd').type('A Smoke Test'); }
  PPaymentsClickSave() { cy.get('#CUR-LzsfBxoh').click(); }
  PPaymentsClickCreate1() { cy.get('#CUR-sovaMLmn').click(); }
  PPaymentsEnterName1() { cy.get('#CUR-XHhdnPOg').type('A Smoke Payment'); }
  PPaymentsEnterAmount() { cy.get('#CUR-eFDNZivS').type('0123'); }
  PPaymentsPayee() { cy.get('#CUR-payee-select-field').type('z standard').wait(2000); }
  PPaymentsPayeeTypeAdvance() { cy.xpath('//strong[contains(text(),"Z Standard")]').contains('Z Standard').click({ force: true }); }
  PPaymentsPayeeClickSave() { cy.get('#CUR-vzLwJXME').click().wait(2000); }
  // Validate Created Data
  PPaymentsValidatePayee() { cy.xpath('//a[contains(text(),"Z Standard")]').contains('Z Standard').should('be.visible'); }
  PPaymentsValidateName() { cy.xpath('//td[contains(text(),"A Smoke Payment")]').contains('A Smoke Payment').should('be.visible'); }
  PPaymentsValidateCurrency() { cy.xpath('//td[contains(text(),"GBP")]').contains('GBP').should('be.visible'); }
  PPaymentsValidateAmount() { cy.get('#CUR-BAKorZom td').contains('123.00').should('be.visible'); }
  PPaymentsValidateStatus() { cy.xpath('//span[contains(text(),"Pending")]').contains('Pending').should('be.visible'); }
  // Update Payment
  PPaymentsClickCreated() { cy.xpath('//a[contains(text(),"Z Standard")]').contains('Z Standard').click(); }
  PPaymentsUpdateName() { cy.get('#CUR-XHhdnPOg').clear().type('A Payment Smoke Updated'); }
  PPaymentsUpdateAmount() { cy.get('#CUR-eFDNZivS').clear().type('121'); }
  PPaymentsClickSave2() { cy.get('#CUR-vzLwJXME').click(); }
  PPaymentsGroupsLink() { cy.get('#CUR-nwSFNGwm').click(); }
  // Validate Updated Data
  PPaymentsUpdatedPayee() { cy.xpath('//a[contains(text(),"Z Standard")]').contains('Z Standard').should('be.visible'); }
  PPaymentsUpdatedName() { cy.xpath('//td[contains(text(),"A Payment Smoke Updated")]').contains('A Payment Smoke Updated').should('be.visible'); }
  PPaymentsUpdatedCurrency() { cy.xpath('//td[contains(text(),"GBP")]').contains('GBP').should('be.visible'); }
  PPaymentsUpdatedAmount() { cy.get('#CUR-BAKorZom td').contains('121.00').should('be.visible'); }
  // delete payment
  PPaymentsClickCreated1() { cy.get('#CUR-BAKorZom a').contains('Z Standard').click(); }
  PPaymentsClickDelete() { cy.get('#CUR-fjzEPjoB').click(); }
  PPaymentsClickDeleteModal() { cy.get('#CUR-OSFxsxNc').click(); }
  // delete payment groups
  PPaymentsClickDeleteGroup() { cy.get('#CUR-cwYxrxYN').click(); }
  PPaymentsClickDeleteGroupModal() { cy.get('#CUR-kcQIXvUd').click(); }


  // DELIVERIES TC
  DlvrsMenu() { cy.get('#sidebar-deliveries > a').click(); }
  DlvrsSubmenu() { cy.get('#sidebar-deliveries-submenu > a').click(); }
  // Page content validation
  DlvrsSearch() { cy.get('#CUR-izubuMLP').should('be.visible'); }
  DlvrsDelete() { cy.get('#CUR-hJlVPICP').should('be.visible'); }
  DlvrsCreate() { cy.get('#CUR-AQqGZbDe').should('be.visible'); }
  DlvrsName() { cy.get('#CUR-fpvNBkOw th').contains('Name').should('be.visible'); }
  DlvrsType() { cy.get('#CUR-fpvNBkOw th').contains('Type').should('be.visible'); }
  DlvrsPRO() { cy.get('#CUR-fpvNBkOw th').contains('PRO').should('be.visible'); }
  DlvrsCreated() { cy.get('#CUR-fpvNBkOw th').contains('Created').should('be.visible'); }
  // Create Delivery
  DlvrsClickCreate() { cy.get('#CUR-AQqGZbDe').click().wait(2000); }
  DlvrsName1() { cy.get('#CUR-ioaJMTae').type('A Delivery Smoke Test'); }
  DlvrsRcvngParty() { cy.xpath('//label[@id="CUR-ULwnVkqB"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  DlvrsRcvngPTSel() { cy.xpath('//label[@id="CUR-ULwnVkqB"]/following::span[contains(text(),"PRS")][1]').click({ force: true }); }
  DlvrsTerritory() { cy.xpath('//label[@id="CUR-XBQGThHp"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  DlvrsTerritorySel() { cy.xpath('//label[@id="CUR-XBQGThHp"]/following::span[contains(text(),"World")]').click({ force: true }); }
  DlvrsDeliveryPartner() { cy.xpath('//label[@id="CUR-FvVSACYr"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  DlvrsDeliveryPartnerSel() { cy.get('#CUR-cKgGPuta').click({ force: true }); }
  DlvrsOutputFormat() { cy.xpath('//label[@id="CUR-EeTXCCzS"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  DlvrsOutputFormatSel() { cy.xpath('//label[@id="CUR-EeTXCCzS"]/following::span[@id="CUR-VMPwQrzc"][1]').click({ force: true }); }
  DlvrsIncludesTerritory() { cy.xpath('//label[@id="CUR-bsDkdooQ"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  DlvrsIncTrtrySel() { cy.xpath('//label[@id="CUR-bsDkdooQ"]/following::span[contains(text(),"World")]').click({ force: true }); }
  DlvrsNotDelvrd() { cy.xpath('//label[@id="CUR-qksaMXjb"]//following::span[@tabindex="-1"][1]').click().wait(2000); }
  DlvrsNotDlvrdSel() { cy.xpath('//label[@id="CUR-qksaMXjb"]//following::span[contains(text(),"BMI")]').click({ force: true }); }
  DlvrsClickSave() { cy.get('#CUR-lqyqHcFC').click().wait(16000); }
  // Validate created data
  DlvrsClickDlvryLink() { cy.get('#CUR-wPSDAvKb').click().wait(8000); }
  DlvrsValidatedName() { cy.get('#CUR-fpvNBkOw a').contains('A Delivery Smoke Test').should('be.visible'); }
  DlvrsValidateType() { cy.get('#CUR-fpvNBkOw span').contains('CWR').should('be.visible'); }
  DlvrsValidatePro() { cy.get('#CUR-fpvNBkOw span').contains('PRS').should('be.visible'); }
  // Update Delivery
  DlvrsClickCreated() { cy.get('#CUR-fpvNBkOw a').contains('A Delivery Smoke Test').click().wait(12000); }
  DlvrsUpdateName() { cy.get('#CUR-ioaJMTae').clear().type('A Delivery Smoke Update'); }
  DlvryClickSave() { cy.get('#CUR-lqyqHcFC').click().wait(16000); }
  // Validate updated data index page
  DlvryClickDeliveryLink() { cy.get('#CUR-wPSDAvKb').click().wait(8000); }
  DlvryValidateUpdatedName() { cy.xpath('//a[contains(text(),"A Delivery Smoke Update")]').contains('A Delivery Smoke Update').should('be.visible'); }
  DlvryValidateType() { cy.get('#CUR-fpvNBkOw span').contains('CWR').should('be.visible'); }
  // Delete data 
  DlvryDeleteCreated() { cy.xpath('//a[contains(text(),"A Delivery Smoke Update")]').click().wait(12000); }
  DlvryDelete() { cy.get('#CUR-tRfCZRkf').click(); }
  DlvryDeleteModal() { cy.get('#CUR-IcExkQDi').click(); }


  // Configuration TC 
  CConfigSettings() { cy.get('#sidebar-settings > a').click(); }
  CConfigGeneral() { cy.get('#sidebar-settings-general > a').click(); }
  // configuration page content validation
  CConfigTab() { cy.get('#CUR-zfwLctsq').click(); }
  CConfigCurrencyHeader() { cy.get('#CUR-RUMGcfIR').contains('Currency').should('be.visible'); }
  CConfigAccountingPeriodTypesHeader() { cy.get('#CUR-SygJfpJW').contains('Accounting Period Types').should('be.visible'); }
  CConfigDistribChannelsHeader() { cy.get('#CUR-WiTwKpln').contains('Distribution Channels').should('be.visible'); }
  CConfigConfigurationsHeader() { cy.get('#CUR-NcIEqMey').contains('Configurations').should('be.visible'); }
  CConfigCatalogueGroupsHeader() { cy.get('#CUR-JtjtHBvs').contains('Catalogue Groups').should('be.visible'); }
  CConfigSourcesHeader() { cy.get('#CUR-dBjmMSky').contains('Sources').should('be.visible'); }
  CConfigPayeeCategoriesHeader() { cy.get('#CUR-FhiBtVul').contains('Payee Categories').should('be.visible'); }
  CConfigContractCategoriesHeader() { cy.get('#CUR-uIpxoudN').contains('Contract Categories').should('be.visible'); }
  // configuration page add data
  CConfigClickAdd() { cy.get('#CUR-UXciuPMi').click().wait(3000); }
  CConfigAccountingPeriodNewField() { cy.xpath('//div[@id="CUR-SygJfpJW"]/following::input[@ng-model="type.name" and @type="text"][5]').type('Smoke test'); }
  CConfigAddCatalogueGroups() { cy.get('#CUR-KIJKDlFj').click().wait(3000); }
  CConfigCatalogueGroups() { cy.xpath('//div[@id="CUR-JtjtHBvs"]/following::input[@type="text"][4]').type('Smoke test'); }
  CConfigAddPayeeCategories() { cy.get('#CUR-GLPJtuem').click().wait(3000); }
  CConfigPayeeCategoriesNewField() { cy.xpath('//div[@id="CUR-uXxvxmvN"]/following::input[@type="text"][4]').type('Smoke Test'); }
  CConfigAddContractCategories() { cy.get('#CUR-gVVhjIam').click().wait(3000); }
  CConfigContractCategories() { cy.xpath('//div[@id="CUR-uIpxoudN"]/following::input[@type="text"][4]').type('Smoke test'); }
  // Save and validate added data
  CConfigClickSaveButton() { cy.get('#CUR-XbCaWLaC').click().wait(1000); } // Save Button 
  CConfigSuccessMessage() { cy.get('.alert').should('be.visible'); }
  // added content validation
  CConfigAccountingPeriodValidation() { cy.xpath('//div[@id="CUR-SygJfpJW"]/following::input[@type="text"][5]').should('have.value', 'Smoke test'); }
  CConfigCatalogueGroupsValidation() { cy.xpath('//div[@id="CUR-JtjtHBvs"]/following::input[@type="text"][4]').should('have.value', 'Smoke test'); }
  CConfigPayeeCategories() { cy.xpath('//div[@id="CUR-FhiBtVul"]/following::input[@type="text"][4]').should('have.value', 'Smoke Test'); }
  CConfigContractCategories1() { cy.xpath('//div[@id="CUR-uIpxoudN"]/following::input[@type="text"][4]').should('have.value', 'Smoke test'); }
  // deletion of added data
  CConfigDelete2() { cy.xpath('//div[@id="CUR-SygJfpJW"]/following::button[5]').click().wait(3000); }
  CConfigDelete4() { cy.xpath('//div[@id="CUR-JtjtHBvs"]/following::button[4]').click().wait(3000); }
  CConfigDelete6() { cy.xpath('//div[@id="CUR-FhiBtVul"]/following::button[4]').click().wait(3000); }
  CConfigDelete7() { cy.xpath('//div[@id="CUR-uIpxoudN"]/following::button[4]').click().wait(3000); }

  CConfigClickSave1() { cy.get('#CUR-XbCaWLaC').click(); }
  CConfigClickSave2() { cy.get('#CUR-tVJNiQMy').click(); }


  // USER TC
  Pub1() { cy.get('#sidebar-settings > a').click(); }
  PubUserSubmenu() { cy.get('#sidebar-users > a').click(); }
  // create admin user
  PubUserCreateButton() { cy.get('#CUR-MEXvNKZp').click(); } // Create Button 
  PubUserUserTypeDD() { cy.xpath('//label[@id="CUR-rCWHNKVr"]/following::span[@tabindex="-1"][1]').click().wait(2000); }
  PubUserUserTypeDDSelection() { cy.xpath('//label[@id="CUR-rCWHNKVr"]/following::span[@class="ui-select-choices-row-inner"][1]').click({ force: true }); }
  PubUserEmailField() { cy.get('#CUR-uDjOsHCe').clear().type('aausertest@curve.com'); }
  PubUserSaveButton() { cy.get('#CUR-RxSOwcRN').click(); } // Save Button

  // save and validate created admin user on index page
  PubUserSaveModal() { cy.get('#CUR-xQRKRMjR').click().wait(1000); }
  PubUsersValidateCreated() { cy.get('#CUR-AArHwreX a').contains('aausertest@curve.com').should('be.visible'); }
  PubUserValidateAdminTag() { cy.get('#CUR-AArHwreX span').contains('Admin').should('be.visible'); }
  // delete admin data
  PubUserClickCheckButton() { cy.get('#user-select-0').check(); }
  PubUserClickDeleteButton() { cy.get('#CUR-RWlxftDS').click(); }
  PubUserClickDeleteModal() { cy.get('#CUR-qmXpxFpo').click(); }
  // create standard user
  PubUserClickCreate2() { cy.get('#CUR-MEXvNKZp').click(); }
  PubUserEnterEmail() { cy.get('#CUR-uDjOsHCe').clear().type('aausertest@curve.com'); }
  // save validate created standard user on index page
  PubUserClickSave2() { cy.get('#CUR-RxSOwcRN').click(); }
  PubUserClickSaveModal2() { cy.get('#CUR-xQRKRMjR').click().wait(1000); }
  PubValidateCreated() { cy.get('#CUR-AArHwreX a').contains('aausertest@curve.com').should('be.visible'); }
  // delete standard user 
  PubUserClickCheckButton1() { cy.get('#user-select-0').check(); }
  PubUserClickDeleteButton1() { cy.get('#CUR-RWlxftDS').click(); }
  PubUserClickDeleteModal2() { cy.get('#CUR-qmXpxFpo').click().wait(2000); }

  


























}
export default publisherpageobject;

























