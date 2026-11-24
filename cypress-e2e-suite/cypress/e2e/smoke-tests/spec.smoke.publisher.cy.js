describe('Publisher Smoke Tests', () => {
  beforeEach(() => {
    const username = null;
    const password = null;
    cy.login(username, password);
    cy.selectClientMulti('Gelo Publisher For New Features');
  })

  afterEach(() => {
    cy.logout();
  })

  // COMPLETED Testing Payees Create, Read, Update and Delete Functions
  it('Smoke-Payees-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-contracts > a').click();
      cy.get('#sidebar-payees > a').click();

      // Payee Index Page Content Validation
      cy.get('#CUR-hzouaqxY').should('be.visible');
      cy.get('#CUR-rYmCZlqH').should('be.visible');
      cy.get('#CUR-hzouaqxY').should('be.visible');
      cy.get('#CUR-rZPDYyzN').should('be.visible');
      cy.get('#CUR-GAGrmAkQ').should('be.visible');
      cy.get('#CUR-GkhgAJde').click();
      cy.get('#CUR-jYYixChE').should('be.visible');
      cy.get('.full-width > .ui-select-match > .btn-default').should('be.visible');
      cy.get('#CUR-qJVOIKBD').should('be.visible');
      cy.get('#CUR-CsnuAETh th').contains('Name').should('be.visible');
      cy.get('#CUR-CsnuAETh th').contains('Categories').should('be.visible');
      cy.get('#CUR-CsnuAETh th').contains('Created').should('be.visible');
      // cy.get('#CUR-CsnuAETh th').contains('Status').should('be.visible');

      // Create Page Fields and Inputs
      cy.get('#CUR-jYYixChE').click();
      cy.get('#CUR-vNACcVKV').type('A Payee Smoke');
      cy.get('#CUR-CJyhlJZW').type('Smoke Test');
      cy.get('#CUR-GRdOwpVU').type('P12352783');
      cy.get('#CUR-projectId-input').type('APS0298372');
      cy.get('#CUR-MnQDkMSC').type('test@curve.com');
      cy.get('#CUR-LGVopfOj > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('#CUR-LGVopfOj > .ui-select-container > .ui-select-search').clear().type('GBP');
      cy.get('#CUR-qnidqazH').click();
      cy.get('#CUR-yyhcuPTu').type('Lloyds');
      cy.get('#CUR-fjfsuHQg > .form-control').type('This is a Test');
      cy.get('#CUR-SkgjMnBW input').click().wait(1000);
      cy.get('#CUR-SkgjMnBW span').contains('Cat 1').click();
      cy.get('#CUR-NaYgFDcA').type('test@curve.com');
      cy.get('#CUR-xJpyMOcS').type('0987654321');
      cy.get('#CUR-XVRkUxZq').type('446677');
      cy.get('#CUR-xbtHjbhy').type('LL09876543');
      cy.get('#CUR-RVHhAHbs').type('UK09865432123');
      cy.get('#CUR-GfnUxdBv > .form-control').click();
      cy.get('#CUR-FScRJsWN > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('#CUR-FScRJsWN  span').contains('World').click();
      cy.get('#CUR-MuenDpiw').type('UK0987653');
      cy.get('#CUR-qMPSYmVs').type('Test');
      cy.get('#CUR-viqCfpXo').type('1.1');
      cy.get('#CUR-uEYmidLa').type('Test');
      cy.get('#CUR-vhAOhxOf').type('1.2');
      cy.get('#CUR-QiMJZhFy').type('1.3');
      cy.get('#CUR-aOdlBPEr').type('Test Notes');

      // Save and Validate Created Data
      cy.get('#CUR-dJtpHGja').click().wait(1000); // Save Button
      // cy.get('.alert-success').should('be.visible').contains('Payee successfully saved');
      cy.get('#CUR-vNACcVKV').should('have.value', 'A Payee Smoke');
      cy.get('#CUR-projectId-input').should('have.value', 'APS0298372');

      // Index page created data validation
      cy.get('#CUR-jbbBXmfV').click().wait(1000);
      cy.get('#CUR-CsnuAETh a').contains('A Payee Smoke').should('be.visible');
      cy.get('#CUR-CsnuAETh span').contains('Cat 1').first().should('be.visible');

      // Edit Page Update data and input
      cy.get('#CUR-CsnuAETh a').contains('A Payee Smoke').click();
      cy.get('#CUR-vNACcVKV').clear().type('A Payee Smoke Update');
      cy.get('.ui-select-match-item > .close').click();
      cy.get('#CUR-SkgjMnBW input').click().wait(1000);
      cy.get('#CUR-SkgjMnBW span').contains('Cat 3').click();

      // Save and Validate Updated Data
      cy.get('#CUR-dJtpHGja').click(); // Save Button
      // cy.get('.alert-success').should('be.visible').contains('Payee successfully saved');
      cy.get('#CUR-vNACcVKV').should('have.value', 'A Payee Smoke Update');

      // Index page updated data validation
      cy.get('#CUR-jbbBXmfV').click();
      cy.get('#CUR-CsnuAETh a').contains('A Payee Smoke Update').should('be.visible');
      cy.get('#CUR-CsnuAETh span').contains('Cat 3').first().should('be.visible');

      // Delete Composer
      cy.get('#CUR-CsnuAETh a').contains('A Payee Smoke Update').click();
      cy.get('#CUR-DkcbEfDr').click();
      cy.get('#CUR-vGcbzDYC').click().wait(1000);
      // cy.get('.alert-success').should('be.visible').contains('Payee successfully deleted');
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Contracts Create, Read, Update and Delete Functions
  it('Smoke-Contracts-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-contracts > a').click();
      cy.get('#sidebar-contract-submenu > a').click();

      // Contracts Index Page Content Validation
      cy.get('#CUR-rmJHDCfY').should('be.visible');
      cy.get('#CUR-IPEEOupo').should('be.visible');
      cy.get('#CUR-UDpJJUhA').should('be.visible');
      cy.get('#CUR-GqETKmnj').should('be.visible');
      cy.get('#CUR-xqVjxuMZ').should('be.visible');
      cy.get('#CUR-SOZjjcnO').should('be.visible');
      cy.get('#CUR-VmJCQpXn').should('be.visible');
      cy.get('.full-width > .ui-select-match > .btn-default').should('be.visible');
      cy.get('#contract-company-search-select > :nth-child(1) > .ui-select-search').should('be.visible');
      cy.get('#contract-contractCategories-search-select > :nth-child(1) > .ui-select-search').should('be.visible');
      cy.get('#CUR-uGIsUwPG').should('be.visible');
      cy.get('#CUR-FmLOyUsD th').contains('Name').should('be.visible');
      cy.get('#CUR-FmLOyUsD th').contains('Type').should('be.visible');
      cy.get('#CUR-FmLOyUsD th').contains('Categories').should('be.visible');
      cy.get('#CUR-FmLOyUsD th').contains('Created').should('be.visible');
      // cy.get('#CUR-FmLOyUsD th').contains('Status').should('be.visible');

      // Create Page Input Fields
      cy.get('#CUR-UDpJJUhA').click();
      cy.get('#CUR-payee-select-field').type('Z Standard');
      cy.get('.ng-binding > strong').click();
      cy.get('#CUR-GcRTTdNA > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('#CUR-PSCMXGVw').click();
      cy.get('#CUR-tYltRUcS').type('A Smoke Contract');
      cy.get('#CUR-gaQtKgcB').type('ASC098765');
      cy.get('#CUR-projectId-input').type('ASC098765');
      cy.get('#CUR-isvSrjLA').click();
      cy.get('#CUR-isvSrjLA span').contains('Home Currency').click();
      cy.get('#CUR-ZxtyZCPP').click();
      cy.get('#CUR-ZxtyZCPP span').contains('Yearly').first().click();
      cy.get('#CUR-BIaDTDYH > .form-control').click();
      cy.get('#CUR-XAgXnZFz').type('50');
      cy.get('#CUR-pLtIIIAd').type('10');
      cy.get('#CUR-aXNqZBBZ').click();
      cy.get('#CUR-idpDiiuB').click();
      cy.get('contract-sales-row .row.ng-scope > :nth-child(1) > .form-control').select('string:Net Receipts');
      cy.get('contract-sales-row .row.ng-scope > :nth-child(2) > .form-control').type('100');

      // Save and Validate created data
      cy.get('#CUR-TinbGPNU').click();
      // cy.get('.alert-success').should('be.visible').contains('Contract successfully created');
      cy.get('#CUR-tYltRUcS').should('have.value', 'A Smoke Contract');
      cy.get('#CUR-GcRTTdNA > .ui-select-container > .ui-select-match > .btn-default').contains('Test Pixel 1').should('be.visible');
      cy.get('#CUR-payee-select-field').should('have.value', 'Z Standard');
      cy.get('#CUR-gaQtKgcB').should('have.value', 'ASC098765');
      cy.get('#CUR-projectId-input').should('have.value', 'ASC098765');

      // Index Page created data validation
      cy.get('#CUR-wOfZbPpM').click();
      cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract').should('be.visible');
      cy.get('#contract-0').should('have.text', 'A Smoke Contract');
      cy.get('[index="0"] > :nth-child(3) > .label').should('have.text', 'Royalty');

      // Update Contract
      cy.get('#contract-0').click();
      cy.get('#CUR-tYltRUcS').clear().type('A Smoke Contract Update');
      cy.get('#CUR-nxGGltrV input').click();
      cy.get('#CUR-nxGGltrV span').contains('Bandcamp').click();

      // Save and Validate updated data
      cy.get('#CUR-TinbGPNU').click();// Save button
      // cy.get('.alert-success').should('be.visible').contains('Contract successfully saved');

      // Index page data validation
      cy.get('#CUR-wOfZbPpM').click();
      cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract Update').should('be.visible');
      cy.get('#CUR-EcVRXuaF span').contains('Royalty').should('be.visible');
      cy.get('#CUR-EcVRXuaF span').contains('Bandcamp').should('be.visible');

      // Delete Contract
      cy.get('#CUR-EcVRXuaF a').contains('A Smoke Contract Update').click();
      cy.get('#CUR-EDDJtFXV').click();
      cy.get('#CUR-SIepMXur').click();
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Releases Create, Read, Update and Delete Functions
  it('Smoke-Releases-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-catalogue > a').click();
      cy.get('#sidebar-releases > a').click();

      // Release Index Page Content Validation
      cy.get('#CUR-cFpKxgfD').should('be.visible');
      cy.get('#CUR-TCRcrdqE').should('be.visible');
      cy.get('#CUR-zWopaSgP').should('be.visible');
      cy.get('#CUR-qIHIFTHv').should('be.visible');
      cy.get('#CUR-wACALinu').should('be.visible');
      cy.get('#CUR-nsurszij > .ui-select-container > :nth-child(1) > .ui-select-search').should('be.visible');
      cy.get('#CUR-hrSUzIbD').should('be.visible');
      cy.get('#CUR-qonjDtEo').should('be.visible');
      cy.get('.full-width > .ui-select-match > .btn-default').should('be.visible');
      cy.get('#CUR-filter-label-textbox').should('be.visible');
      cy.get('#CUR-filter-artist-textbox').should('be.visible');
      cy.get('#CUR-filter-distributionChannel-select > :nth-child(1) > .ui-select-search').should('be.visible');
      cy.get('#CUR-filter-format-select > :nth-child(1) > .ui-select-search').should('be.visible');
      cy.get('#CUR-nVfWuehA').should('be.visible');
      cy.get('#CUR-VtMGALPT th').contains('Title').should('be.visible');
      cy.get('#CUR-VtMGALPT th').contains('Artist').should('be.visible');
      cy.get('#CUR-VtMGALPT th').contains('Cat No').should('be.visible');
      cy.get('#CUR-VtMGALPT th').contains('Barcode').should('be.visible');
      cy.get('#CUR-VtMGALPT th').contains('Format').should('be.visible');
      cy.get('#CUR-VtMGALPT th').contains('Created').should('be.visible');

      // Create page inputs and fields
      cy.get('#CUR-wACALinu').click();
      cy.get('#CUR-jJwVtlIr').type('A Release Smoke');
      cy.get('#CUR-bhQcVumh').type('v1234');
      cy.get('#CUR-fzTwggPi').type('Gelo1234');
      cy.get('#CUR-gjpsiQTF').type('ARS12345');
      cy.get('#CUR-projectId-input').type('ARS12345');
      cy.get('#CUR-FjplwIxU').click().wait(1000);
      cy.get('#ui-select-choices-row-10-0 > .ui-select-choices-row-inner').click();
      cy.get('#CUR-YIiKGOHt').click();
      cy.get('#CUR-gOZQKkGZ').click();
      cy.get('#CUR-LsLPGmQZ').type('ARS0001');
      cy.get('#CUR-QkNcjbSR').type('90999990009986');
      cy.get('#CUR-SEeQyaaO').type('Test');
      cy.get('.ui-select-container > :nth-child(1) > .ui-select-search').click();
      cy.get('#CUR-FjplwIxU span').contains('Television').click();

      // Save and validate Created release
      cy.get('#CUR-NVcvbMbM').click().wait(2000); // Save Button
      cy.get('.alert-success').should('be.visible').contains('Release successfully created');

      // Index page created data validation
      cy.get('#CUR-NVopGmjV').click();
      cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('Gelo1234').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('ARS0001').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('90999990009986').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('Television').should('be.visible');

      // Udpate Release
      cy.get('#CUR-VtMGALPT a').contains('A Release Smoke').click();
      cy.get('#CUR-jJwVtlIr').clear().type('A Release Smoke Update');
      cy.get('#CUR-fzTwggPi').clear().type('Test0099');
      cy.get('#CUR-LsLPGmQZ').clear().type('ARS9999');
      cy.get('#CUR-QkNcjbSR').clear().type('1111118888888');

      // Save and validate Updated release
      cy.get('#CUR-NVcvbMbM').click().wait(1000); // Save Button
      // cy.get('.alert-success').should('be.visible').contains('Release successfully saved');
      cy.get('#CUR-jJwVtlIr').should('have.value', 'A Release Smoke Update');
      cy.get('#CUR-fzTwggPi').should('have.value', 'Test0099');
      cy.get('#CUR-LsLPGmQZ').should('have.value', 'ARS9999');
      cy.get('#CUR-QkNcjbSR').should('have.value', '1111118888888');

      // Index page updated data validation
      cy.get('#CUR-NVopGmjV').click();
      cy.get('#CUR-VtMGALPT a').contains('A Release Smoke Update').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('Test0099').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('ARS9999').should('be.visible');
      cy.get('#CUR-VtMGALPT span').contains('1111118888888').should('be.visible');


      // Delete Release
      cy.get('#CUR-VtMGALPT a').contains('A Release Smoke Update').click();
      cy.get('#CUR-IORvSKtL').click();
      cy.get('#CUR-NOYiTdFv').click().wait(2000);
      // cy.get('.alert-success').should('be.visible').contains('Release successfully deleted');
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Tracks Create, Read, Update and Delete Functions
  it('Smoke-Tracks-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-catalogue > a').click();
      cy.get('#sidebar-tracks > a').click();

      // Tracks Page Content Validation
      cy.get('#CUR-KcppnpIT').should('be.visible');
      cy.get('#CUR-FOxFDCYV').should('be.visible');
      cy.get('#CUR-qPFhbvpu').should('be.visible');
      cy.get('#CUR-DsaOOCyn').should('be.visible');
      cy.get('#CUR-ImZPJRMB').should('be.visible');
      cy.get('#CUR-IsGbEGAi').should('be.visible');
      cy.get('#CUR-DbLvGukz').should('be.visible');
      cy.get('#CUR-rfxIOvip').should('be.visible');
      cy.get('#CUR-oAtZYPEc').should('be.visible');
      cy.get('#CUR-filter-label-textbox').should('be.visible');
      cy.get('#CUR-filter-artist-textbox').should('be.visible');
      cy.get('#CUR-uiaJvCvp').should('be.visible');
      cy.get('#CUR-MSfnkrEY th').contains('Title').should('be.visible');
      cy.get('#CUR-MSfnkrEY th').contains('Version').should('be.visible');
      cy.get('#CUR-MSfnkrEY th').contains('Artist').should('be.visible');
      cy.get('#CUR-MSfnkrEY th').contains('ISRC').should('be.visible');
      cy.get('#CUR-MSfnkrEY th').contains('Created').should('be.visible');
      cy.get('#CUR-MSfnkrEY th').contains('Participation').should('be.visible');

      // Create Tracks
      cy.get('#CUR-ImZPJRMB').click();
      cy.get('#CUR-aJwaQxhr').type('A Tracks Smoke');
      cy.get('#CUR-kQslEfhD').type('V1234');
      cy.get('#CUR-MbNpDepo').type('Gelo12345');
      cy.get('#CUR-YwEVxbHr').type('ATS12345');
      cy.get('#CUR-projectId-input').type('ATS12345');
      cy.get('#CUR-cOegSfmz').type('ATS0001');
      cy.get('#CUR-XGvXfkQh').type('Gelo1234');
      cy.get('#CUR-FALBZvqH').type('LINE2');
      cy.get('#CUR-egOoZEpB').type('120');
      cy.get('#CUR-vcYOVxje input').click();
      cy.get('#CUR-vcYOVxje span').contains('CAT 1').click();
      cy.get('#CUR-UaNimHCt').click();// Save Button

      // Validate Created Data
      cy.get('.pgn > .alert').should('be.visible');
      cy.get('.pgn > .alert').should('have.text', '×CloseTrack successfully created');
      cy.get('#CUR-aJwaQxhr').should('have.value', 'A Tracks Smoke');
      cy.get('#CUR-MbNpDepo').should('have.value', 'Gelo12345');
      cy.get('#CUR-YwEVxbHr').should('have.value', 'ATS12345');
      cy.get('#CUR-cOegSfmz').should('have.value', 'ATS0001');
      cy.get('#CUR-MwPfmXzd').click();
      cy.get('#CUR-sjDhJtnO > .pg-search').click();
      cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke').should('be.visible');
      cy.get('#CUR-MSfnkrEY span').contains('V1234').should('be.visible');
      cy.get('#CUR-MSfnkrEY span').contains('Gelo12345').should('be.visible');
      cy.get('#CUR-MSfnkrEY span').contains('ATS0001').should('be.visible');

      // Update Tracks
      cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke').click();
      cy.get('#CUR-aJwaQxhr').clear().type('A Tracks Smoke Update');
      cy.get('#CUR-MbNpDepo').clear().type('Test12345');
      cy.get('#CUR-YwEVxbHr').clear().type('ATS00001');
      cy.get('#CUR-projectId-input').clear().type('ATS00001');
      cy.get('#CUR-cOegSfmz').clear().type('ATS0099');
      cy.get('#CUR-XGvXfkQh').clear().type('Test12345');
      cy.get('#CUR-UaNimHCt').click(); // Save Button

      // Validate Updated Data
      cy.get('.pgn > .alert').should('be.visible');
      cy.get('.pgn > .alert').should('have.text', '×CloseTrack successfully saved');
      cy.get('#CUR-aJwaQxhr').should('have.value', 'A Tracks Smoke Update');
      cy.get('#CUR-MbNpDepo').should('have.value', 'Test12345');
      cy.get('#CUR-YwEVxbHr').should('have.value', 'ATS00001');
      cy.get('#CUR-projectId-input').should('have.value', 'ATS00001');
      cy.get('#CUR-cOegSfmz').should('have.value', 'ATS0099');
      cy.get('#CUR-MwPfmXzd').click();
      cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke Update').should('be.visible');
      cy.get('#CUR-MSfnkrEY span').contains('V1234').should('be.visible');
      cy.get('#CUR-MSfnkrEY span').contains('Test12345').should('be.visible');
      cy.get('#CUR-MSfnkrEY span').contains('ATS0099').should('be.visible');

      // Delete Tracks
      cy.get('#CUR-MSfnkrEY a').contains('A Tracks Smoke Update').click();
      cy.get('#CUR-YLCMDySu').click();
      cy.get('#CUR-tOCyBdOF').click();
      cy.get('.alert').should('be.visible');
      cy.get('.alert').should('have.text', '×CloseTrack successfully deleted');
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Works Create, Read, Update and Delete Functions
  it('Smoke-Works-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-catalogue > a').click();
      cy.get('#sidebar-works > a').click();

      // Works Page content validation
      cy.get('#CUR-UGPXLwcU').should('be.visible');
      cy.get('#CUR-NnJJRmNQ').should('be.visible');
      cy.get('#CUR-EQmlyZrK').should('be.visible');
      cy.get('#CUR-fqGIIWLl').should('be.visible');
      cy.get('#CUR-EXKAKmlJ').should('be.visible');
      cy.get('#CUR-HAmSUhwK').should('be.visible');
      cy.get('#CUR-KAaEpThj').should('be.visible');
      cy.get('#CUR-dhRBPydv').should('be.visible');
      cy.get('#CUR-WXUZHcuG').should('be.enabled');
      cy.get('#CUR-BnuXKbhL').should('be.enabled');
      cy.get('#CUR-bAUCyIWd').should('be.visible');
      cy.get('#CUR-PfLfmdpd').should('be.visible');
      cy.get('.full-width > .ui-select-match > .btn-default').should('be.visible');
      cy.get('#CUR-NyBJbDRP').should('be.visible');
      cy.get('#CUR-glzQOMnn').should('be.visible');
      cy.get('#CUR-FJnQAzwW').should('be.visible');
      cy.get('.sorting_asc').should('have.text', 'Title');
      cy.get('thead > tr > :nth-child(3)').should('have.text', 'Composer');
      cy.get('thead > tr > :nth-child(4)').should('have.text', 'Main identifier');
      cy.get('thead > tr > :nth-child(5)').should('have.text', 'Created');
      cy.get('thead > tr > :nth-child(6)').should('have.text', 'Ownership');

      // Create a Work
      cy.get('#CUR-KAaEpThj').click();
      cy.get('#CUR-lsTRMbuJ').type('A Work Smoke');
      cy.get('#CUR-qxneCfJR').click().wait(1000);
      cy.get('.col-xs-6 > .form-control').type('A Work Smoke test');
      cy.get('.col-xs-4 > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#CUR-lHDrAyON div span').contains('English').click();
      cy.get('#CUR-UZAtFjrI > .form-control').select('string:Pop');
      cy.get('#CUR-fhXAVIbZ > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#CUR-fhXAVIbZ span').contains('English').click();
      cy.get('#CUR-FfzdVYfJ > .form-control').select('string:None');
      cy.get('#CUR-bWxomjQp > .form-control').select('string:Original Work');
      cy.get('#CUR-VJwHBmur').type('Gelo');
      cy.get('#CUR-dxyDcLit').type('AWS1029283');
      cy.get('#CUR-projectId-input').type('WS098765');
      cy.get('#CUR-rgfRlRyx').type('W01928192');

      // Adding territory
      cy.get('#CUR-fNRPquyE').click();
      cy.get('.world-group > div > label > .ng-pristine').check();

      // Adding IP Chain
      cy.get('#CUR-gsehYTpY').click();
      cy.get('#CUR-BsaeqULR').click().wait(1000); // +Territory

      // Publisher
      cy.get('#CUR-iudiqUJH button').contains('+ Pub').click().wait(1000);
      cy.get('publisher-select-field.ng-isolate-scope > .row > .form-group > .form-control').clear().type('publisher 2').wait(1000);
      cy.get('#CUR-iudiqUJH strong').contains('publisher 2').click();
      cy.get('.contract-row-layout > :nth-child(3) > .form-control').select('string:Admin');
      cy.get('.contract-row-layout > :nth-child(5) > .form-control').type('100');
      cy.get('.contract-row-layout > :nth-child(6) > .form-control').type('50');
      // Composer
      cy.get('#CUR-iudiqUJH tip-cont button').last().contains('+ Comp').click().wait(1000);
      cy.get('composer-select-field.ng-isolate-scope > .row > .form-group > .form-control').type('composer 2').wait(1000);
      cy.get('#CUR-iudiqUJH li a strong').contains('composer 2').click().wait(1000);
      cy.get('.contract-row-layout > :nth-child(3) > .form-control').last().select('string:Arranger');
      cy.get('.col-xs-12.ng-scope > .contract-row-layout > .ip-chain-checkbox-col > .ip-chain-checkbox').last().check();
      cy.get('.contract-row-layout > :nth-child(6) > .form-control').last().type('50');
      cy.get('.contract-row-layout > :nth-child(8) > .form-control').last().type('50').wait(1000);
      cy.get('#CUR-krbtirMF').click().wait(5000); // Save Button


      // Validate Created Data
      cy.get('#CUR-zUiMHZJq').click().wait(3000);
      cy.get('#CUR-KHaNLiQh a').contains('A Work Smoke').should('be.visible');
      cy.get('#CUR-KHaNLiQh span').contains('Gelo').should('be.visible');
      cy.get('#CUR-KHaNLiQh span').contains('W01928192').should('be.visible');

      // Update Works
      cy.get('#CUR-KHaNLiQh a').contains('A Work Smoke').click();
      cy.get('#CUR-lsTRMbuJ').clear().type('A Work Smoke Update');
      cy.get('#CUR-VJwHBmur').clear().type('Zafra');
      cy.get('#CUR-rgfRlRyx').clear().type('BB00099998');
      cy.get('#CUR-krbtirMF').click().wait(2000); // Save Button

      // Validated Updated Data
      cy.get('#CUR-lsTRMbuJ').should('have.value', 'A Work Smoke Update');
      cy.get('#CUR-VJwHBmur').should('have.value', 'Zafra');
      cy.get('#CUR-rgfRlRyx').should('have.value', 'BB00099998');
      cy.get('#CUR-zUiMHZJq').click().wait(2000);

      cy.get('#CUR-KHaNLiQh a').contains('A Work Smoke Update').should('be.visible');
      cy.get('#CUR-KHaNLiQh span').contains('Zafra').should('be.visible');
      cy.get('#CUR-KHaNLiQh span').contains('BB00099998').should('be.visible');

      // Delete Works

      cy.get('#CUR-KHaNLiQh a').contains('A Work Smoke Update').click();
      cy.get('#CUR-XJkFoQlq').click();
      cy.get('#CUR-AzjXhskq').click();
      cy.get('#CUR-JjRYoFWa').click().wait(5000);
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Composers Create, Read, Update and Delete Functions
  it('Smoke-Composers-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-catalogue > a').click();
      cy.get('#sidebar-composers > a').click();

      // Composer index page Validation
      cy.get('#CUR-uUKVnFba').should('be.visible');
      cy.get('#CUR-eTaahVPO').should('be.visible');
      cy.get('#CUR-FuVciLZH').should('be.visible');
      cy.get('#CUR-KSqmmqMO').should('be.visible');
      cy.get('#CUR-ucZUtjNV').should('be.visible');
      cy.get('#CUR-OuUVLroh th').contains('Name').should('be.visible');
      cy.get('#CUR-OuUVLroh th').contains('CAE').should('be.visible');
      cy.get('#CUR-OuUVLroh th').contains('Created').should('be.visible');

      // Create on Composer Edit Page
      cy.get('#CUR-KSqmmqMO').click();
      cy.get('#CUR-xsBQITjy').type('A Composer Smoke');
      cy.get('#CUR-PznCFrfI').type('Gelo12345');
      cy.get('#CUR-TegBJoBK').type('Gelo');
      cy.get('#CUR-DrmeRXPD').type('T');
      cy.get('#CUR-JRzrthyU').type('Zafra');
      cy.get('#CUR-BbMNJqNK').type('Gelo1243');
      cy.get('#CUR-CDkYswGc').type('This is a test');
      cy.get('#CUR-UGpikDDg > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#CUR-UGpikDDg span').contains('PRS').click();
      cy.get('#CUR-sioshbFW').type('PRS');
      cy.get('#CUR-AtfDvtjU > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#CUR-AtfDvtjU span').contains('ASCAP').click();
      cy.get('#CUR-uOsxyaYM').type('ASCAP');
      cy.get('#CUR-qThsRUio > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#CUR-qThsRUio span').contains('BMI').click();
      cy.get('#CUR-qRIrDLBk').type('BMI');
      cy.get('#CUR-GScuKnXx > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#CUR-GScuKnXx span').contains('SOCAN').click();
      cy.get('#CUR-meFMQkiN').type('SOCAN');
      cy.wait(1000);
      cy.get('#CUR-rExQKhmY').click();// Save Buttom

      // Edit Page data validation
      cy.get('.pgn > .alert').should('have.text', '×Closecomposer successfully created');
      cy.get('.pgn > .alert').should('be.visible');
      cy.get('#CUR-xsBQITjy').should('have.value', 'A Composer Smoke');
      cy.get('#CUR-BbMNJqNK').should('have.value', 'Gelo1243');
      cy.get('#CUR-PznCFrfI').should('have.value', 'Gelo12345');
      // Indax Page data validation
      cy.get('#CUR-NycXRuxX').click();
      cy.get('#CUR-OuUVLroh a').contains('A Composer Smoke').should('be.visible');
      cy.get('#CUR-OuUVLroh span').contains('Gelo1243').should('be.visible');

      // Updated edit page Composer
      cy.get('#CUR-OuUVLroh a').contains('A Composer Smoke').click();
      cy.get('#CUR-xsBQITjy').clear().type('A Composer Smoke Update');
      cy.get('#CUR-BbMNJqNK').clear().type('Smoke1234');
      cy.get('#CUR-rExQKhmY').click(); // Save Button

      // Validate Updated Data
      cy.get('.pgn > .alert').should('be.visible');
      cy.get('.pgn > .alert').should('have.text', '×CloseComposer successfully saved');
      cy.get('#CUR-NycXRuxX').click();
      cy.get('#CUR-OuUVLroh a').contains('A Composer Smoke Update').should('be.visible');
      cy.get('#CUR-OuUVLroh span').contains('Smoke1234').should('be.visible');

      // Delete Composer
      cy.get('#CUR-OuUVLroh a').contains('A Composer Smoke Update').click();
      cy.get('#CUR-JaWdFtZJ').click();
      cy.get('#CUR-bcgdhSSZ').click();
      cy.get('.alert').should('be.visible');
      cy.get('.alert').should('have.text', '×CloseComposer successfully deleted');
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Publishers Create, Read, Update and Delete Functions
  it('Smoke-Publishers-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-catalogue > a').click();
      cy.get('#sidebar-publishers > a').click();

      // Publisher Index Page Content Validation
      cy.get('#CUR-JnoepRFN').should('be.visible');
      cy.get('#CUR-qSMNNTsL').should('be.visible');
      cy.get('#CUR-cRnLChHq').should('be.visible');
      cy.get('#CUR-cUnwntgQ').should('be.visible');
      cy.get('#CUR-gzVjvyDf').should('be.visible');
      cy.get('#CUR-UBgtBBTg th').contains('Name').should('be.visible');
      cy.get('#CUR-UBgtBBTg th').contains('CAE').should('be.visible');
      cy.get('#CUR-UBgtBBTg th').contains('Created').should('be.visible');

      // Create Publisher on Edit Page
      cy.get('#CUR-gzVjvyDf').click();
      cy.get('#CUR-uwDhIFdL').type('A Publisher Smoke');
      cy.get('#CUR-jBtFftsd').type('APS12345');
      cy.get('#CUR-YGFKkpxE').type('12345APS');
      cy.get('#CUR-FQUAyOOe').type('This is a Test');
      cy.get('#CUR-BJYWMDiX > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#CUR-BJYWMDiX span').contains('PRS').click();
      cy.get('#CUR-qxmuYAKg').type('PRS');
      cy.get('#CUR-BDOzWIyn > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#CUR-BDOzWIyn span').contains('ASCAP').click();
      cy.get('#CUR-eFOUNyYv').type('ASCAP');
      cy.get('#CUR-eheCTMkY > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#CUR-eheCTMkY span').contains('BMI').click();
      cy.get('#CUR-kyQBlQUX').type('BMI');
      cy.get('#CUR-FRXPPtBN > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.get('#CUR-FRXPPtBN span').contains('SOCAN').click();
      cy.get('#CUR-XmoSHHoD').type('SOCAN');
      cy.get('#CUR-dWTsVAEi').click(); // Save Button

      // Validate Created Data on edit page
      cy.get('.pgn > .alert').should('be.visible');
      cy.get('.pgn > .alert').should('have.text', '×Closepublisher successfully created');
      cy.get('#CUR-uwDhIFdL').should('have.value', 'A Publisher Smoke');
      cy.get('#CUR-jBtFftsd').should('have.value', 'APS12345');
      cy.get('#CUR-YGFKkpxE').should('have.value', '12345APS');
      // Validate Created Data on index page
      cy.get('#CUR-kftJkCAH').click().wait(1000);
      cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke').should('be.visible');
      cy.get('#CUR-UBgtBBTg span').contains('12345APS').should('be.visible');

      // Update Publisher on edit page
      cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke').click();
      cy.get('#CUR-uwDhIFdL').clear().type('A Publisher Smoke Update');
      cy.get('#CUR-jBtFftsd').clear().type('APS00001');
      cy.get('#CUR-YGFKkpxE').clear().type('APS09876');
      cy.get('#CUR-dWTsVAEi').click(); // Save Button

      // Validate Updated Data on edit page
      cy.get('.pgn > .alert').should('be.visible');
      cy.get('.pgn > .alert').should('have.text', '×ClosePublisher successfully saved');
      cy.get('#CUR-uwDhIFdL').should('have.value', 'A Publisher Smoke Update');
      cy.get('#CUR-jBtFftsd').should('have.value', 'APS00001');
      cy.get('#CUR-YGFKkpxE').should('have.value', 'APS09876');
      // Validate Updated Data on index page
      cy.get('#CUR-kftJkCAH').click().wait(1000);
      cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke Update').should('be.visible');
      cy.get('#CUR-UBgtBBTg span').contains('APS09876').should('be.visible');

      // Delete Publisher
      cy.get('#CUR-UBgtBBTg a').contains('A Publisher Smoke Update').click();
      cy.get('#CUR-mvVYCWXR').click();
      cy.get('#CUR-LnaBreyR').click();
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Periods Create, Read, Update and Delete Functions
  it('Smoke-Periods-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-statements > a').click();
      cy.get('#sidebar-periods > a').click();

      // Period Page Content Validation
      cy.get('#CUR-GnwMOudf').should('be.visible');
      cy.get('#CUR-knYbtmzh').should('be.visible');
      cy.get('#CUR-gYxIZkCO').should('be.visible');
      cy.get('#CUR-aVjKYsxb > .ui-select-container > .ui-select-match > .btn-default').should('be.visible');
      cy.get('#CUR-jUYSebzK > .ui-select-container > .ui-select-match > .btn-default').should('be.visible');
      cy.get('#CUR-jhJPPLlZ').should('be.visible');
      cy.get('#CUR-FpasAYSv th').contains('Name').should('be.visible');
      cy.get('#CUR-FpasAYSv th').contains('Year').should('be.visible');
      cy.get('#CUR-FpasAYSv th').contains('Period').should('be.visible');
      cy.get('#CUR-FpasAYSv th').contains('Gross Sales').should('be.visible');
      cy.get('#CUR-FpasAYSv th').contains('Created').should('be.visible');
      cy.get('#CUR-FpasAYSv th').contains('Status').should('be.visible');

      // Create Period page and input fields
      cy.get('#CUR-gYxIZkCO').click();
      cy.get(':nth-child(2) > .col-xs-12 > :nth-child(1) > .form-control').type('A Period Smoke'); // Name
      cy.xpath('//a[@id="CUR-UKddbSie"]/following::span[@aria-label="Select box activate"][1]').click(); // Accounting period
      cy.xpath('//a[@id="CUR-UKddbSie"]/following::span[contains(text(),"Yearly")][1]').click(); // Accounting Type DD Selection
      cy.xpath('//a[@id="CUR-UKddbSie"]/following::span[@class="btn btn-default form-control ui-select-toggle"][2]').click(); // year
      cy.xpath('//a[@id="CUR-UKddbSie"]/following::span[@class="ui-select-choices-row-inner"][2]').click(); // year DD selection
      cy.xpath('//a[@id="CUR-UKddbSie"]/following::span[@class="btn btn-default form-control ui-select-toggle"][3]').click(); // Accounting period DD
      // cy.xpath('//a[@id="CUR-UKddbSie"]/following::span[@class="ui-select-choices-row-inner"][1]').click(); // Accounting period DD Selection
      cy.xpath('//a[@id="CUR-UKddbSie"]/following::span[@class="ui-select-choices-row-inner"][2]').click();
      // cy.get('#ui-select-choices-row-7-1 > .ui-select-choices-row-inner').click();

      // Start Date
      cy.get('.form-group:nth-child(5) .form-control').click();
      cy.get('.form-group:nth-child(5) .form-control').click();
      cy.get('.form-group:nth-child(5) .form-control').type('01/01/2022');
      // End Date
      cy.get('.form-group:nth-child(6) .form-control').click();
      cy.get('.form-group:nth-child(6) .form-control').click();
      cy.get('.form-group:nth-child(6) .form-control').type('30/06/2022');
      // Sales Date
      cy.get('.form-group:nth-child(7) .form-control').click();
      cy.get('.form-group:nth-child(7) .form-control').click();
      cy.get('.form-group:nth-child(7) .form-control').type('12/12/2022');

      cy.get('.row.m-t-20 > .col-xs-12 > .btn').click(); // Click Next

      // Select Sales
      cy.get('.table-responsive:nth-child(5) .select-all').click();
      cy.get('.btn-success').click().wait(3000);
      cy.get('.col-xs-12 > .btn-primary').click(); // Calculate Button

      // Validate Created Data
      cy.get('#CUR-iXFdMjLD a').contains('A Period Smoke').first().should('be.visible');
      cy.get('#CUR-iXFdMjLD td').contains('2023').first().should('be.visible');
      cy.get('#CUR-iXFdMjLD td').contains('H1').first().should('be.visible');

      // Vaildate created data page content
      cy.get('#CUR-iXFdMjLD a').contains('A Period Smoke').first().click();
      cy.get('#CUR-TRIZDfAQ').contains('A Period Smoke').should('be.visible').then(($period) => {

        if ($period.is(':visible')) {
          cy.log('Processing Button is still Visible').wait(user.time);
        } else {
          cy.get('#CUR-TRIZDfAQ').should('be.visible').wait(user.time);

        }
      })

      cy.get('#CUR-ZJRXUPwP').contains('Gross Revenue').should('be.visible');
      cy.get('#CUR-dseIvKpY').contains('Net Payout').should('be.visible');
      cy.get('#CUR-tTpIJdmf').contains('Input Units').should('be.visible');

      // Update Period
      cy.get('#CUR-HLUNTSif').click().wait(3000);
      cy.get(':nth-child(2) > .col-xs-12 > :nth-child(1) > .form-control').click().clear().type('A Period Smoke Update');
      cy.get('.row.m-t-20 > .col-xs-12 > .btn').click();
      cy.get('.col-xs-12 > .btn-primary').click();

      // Validated updated data on index page
      cy.get('#CUR-iXFdMjLD a').contains('A Period Smoke Update').should('be.visible');
      cy.get('#CUR-iXFdMjLD td').contains('2023').should('be.visible');
      cy.get('#CUR-iXFdMjLD td').contains('H1').should('be.visible');

      // Validate updated data period page
      cy.get('#CUR-iXFdMjLD a').contains('A Period Smoke Update').first().click();
      cy.get('#CUR-TRIZDfAQ').contains('A Period Smoke Update').should('be.visible').then(($smoke) => {

        if ($smoke.is(':visible')) {
          cy.log('A period smoke is visible').wait(user.time);
        } else {
          cy.get('#CUR-TRIZDfAQ').should('be.visible').wait(user.time);

        }
      })
      // Delete Period
      cy.get('#CUR-cxqkIWfA').click();
      cy.get('#period-select-0').check();
      cy.get('#CUR-knYbtmzh').click();
      cy.get('#CUR-bsqGxjeL').click().wait(7000);
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Statements Create, Read, Update and Delete Functions
  it('Smoke-Statements-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-statements > a').click();
      cy.get('#sidebar-statements-submenu > a').click();

      // index page validation
      cy.get('#CUR-WBKJWKoQ').should('be.visible');
      cy.get('#CUR-OvtHLYJe').should('be.visible');
      cy.get('#CUR-DqaNLEOm').should('be.visible');
      cy.get('#CUR-NsfLNPuP').should('be.visible');
      cy.get('#CUR-YxdjgveE th').contains('Name').should('be.visible');
      cy.get('#CUR-YxdjgveE th').contains('Gross Sales').should('be.visible');
      cy.get('#CUR-YxdjgveE th').contains('Sales').should('be.visible');
      cy.get('#CUR-YxdjgveE th').contains('Created').should('be.visible');
      cy.get('#CUR-YxdjgveE th').contains('Status').should('be.visible');

      // create statement via period
      cy.get('#sidebar-periods > a').click();
      cy.get('#CUR-gYxIZkCO').click();
      cy.get(':nth-child(2) > .col-xs-12 > :nth-child(1) > .form-control').type('A Statement Smoke');
      cy.get('.col-xs-12 > :nth-child(2) > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('.col-xs-12 > :nth-child(2) > .ui-select-container > .ui-select-search').type('monthly');
      cy.get('.ui-select-choices-row-inner > .ng-binding').click();
      cy.get(':nth-child(3) > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(3) > .ui-select-container > .ui-select-search').type('2023');
      cy.get('.ui-select-choices-row-inner').click();
      cy.get(':nth-child(4) > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(4) > .ui-select-container > .ui-select-search').type('h1');
      cy.get('.ui-select-choices-row-inner').click();
      // Date Pickers
      cy.get(':nth-child(5) > #datepicker-component > .form-control').click().clear().type('01/01/2022');
      cy.get(':nth-child(6) > #datepicker-component > .form-control').click().clear().type('30/06/2022');
      cy.get(':nth-child(7) > #datepicker-component > .form-control').click().clear().type('12/12/2022');
      // selecting sales
      cy.get('period-new.ng-scope > .container-fluid > :nth-child(1)').click();
      cy.get('.row.m-t-20 > .col-xs-12 > .btn').click();
      cy.get('.m-t-50 > :nth-child(1) > .table-responsive > .table > thead > tr > .table-checkbox > .select-all').check();
      cy.get('.btn-success').contains('Include Selected').click();
      cy.get('.col-xs-12 > .btn-primary').contains('Calculate').click();
      cy.get('#CUR-FpasAYSv a').contains('A Statement Smoke').click().wait(70000);

      // Validate Created Data on period
      cy.get('#CUR-wkHjTyNE').click();
      cy.get('#CUR-HNSDHMbl a').contains('2023 - H1: Test Gelo 100').should('be.visible');
      cy.get('#CUR-NNFknldc').click();

      // Validate Created Data on statement index page
      cy.get('#sidebar-statements-submenu > a').click();
      cy.get('#CUR-WBKJWKoQ').clear().type('Test Gelo 100');
      cy.get('#CUR-bzBwwprg').click();
      cy.get('#CUR-bkUowpSN a').contains('2023 - H1: Test Gelo 100').should('be.visible');

      // adding statement in period
      cy.get('#sidebar-periods > a').click();
      cy.get('#CUR-FpasAYSv a').contains('A Statement Smoke').click().wait(3000);
      cy.get('#CUR-yJluSXBB').click();
      cy.get('#CUR-FYPxzvoA').click();
      cy.get('.row > .form-group > .form-control').clear().type('Contract Test').wait(3000);
      cy.get('.ng-binding > strong').contains('Contract Test').click();
      cy.get('#CUR-nqObrHgU').click().wait(3000);

      // validate added data on period
      cy.get('#CUR-IxnzJpGe a').contains('2023 - H1: Contract Test').should('be.visible');
      cy.get('#CUR-IxnzJpGe a').contains('2023 - H1: Contract Test').click();
      cy.get('#CUR-QwnGZauH').contains('2023 - H1: Contract Test').should('be.visible').then(($contract) => {

        if ($contract.is(':visible')) {
          cy.log('2023 - H1: Contract Test').wait(user.time);
        } else {
          cy.get('#CUR-QwnGZauH').should('be.visible').wait(user.time);

        }
      })

      // validate on statement index page
      cy.get('#sidebar-statements-submenu > a').click();
      cy.get('#CUR-WBKJWKoQ').clear().type('Contract Test');
      cy.get('#CUR-bzBwwprg > .pg-search').click().wait(3000);
      cy.get('#CUR-bDVEURjD a').contains('2023 - H1: Contract Test').should('be.visible');
      cy.get('#CUR-VFrbmBtF').click();

      // Delete Period
      cy.get('#sidebar-periods > a').click();
      cy.get('#period-select-0').check();
      cy.get('#CUR-knYbtmzh').click();
      cy.get('#CUR-bsqGxjeL').click().wait(5000);
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Sales Ingestion Create, Read, Update and Delete Functions
  it('Smoke-Sales-Ingestion-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-sales-files > a').click();
      cy.get('#sidebar-sales-file-submenu > a').click();

      // index page content validation
      cy.get('#CUR-FHufgwGM').should('have.text', 'Valid');
      cy.get('#CUR-vwBFXAWO').should('have.text', 'Status');
      cy.get('#CUR-sSeLfdFL').should('have.text', 'Reported');
      cy.get('#CUR-gTNhalNj').should('have.text', 'Archived');
      cy.get('#CUR-ZYheIwqI').should('have.text', 'New');
      cy.get('#CUR-NlTTzTrO').should('be.visible');
      cy.get('#CUR-ivKvGcQl').should('be.visible');
      cy.get('#CUR-nBTrboeS').should('be.visible');
      cy.get('#CUR-riqaSlSH').should('be.visible');
      cy.get('#CUR-ofnmYZwF').should('be.visible');
      cy.get('#CUR-PNdYcPxE').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Name').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Invoice').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Target').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Account').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Gross').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Net').should('be.visible');
      cy.get('#CUR-yprfVOlM th').contains('Invalid Lines').should('be.visible');
      cy.wait(5000);
      // create sales ingestion
      cy.get('body').then(($body) => {
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
      })
      cy.get('#CUR-PNdYcPxE').click();
      cy.get('input[type=file]').attachFile('smoke-sales-publishing.xlsx');
      cy.wait(10000)
      cy.get('#CUR-aEbJeVnL').click({ force: true });

      // validate data on index page
      cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').should('be.visible');
      cy.get('#CUR-RKtAMVsX td').contains('456').should('be.visible');

      // sales page
      cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').click().wait(user.time);
      cy.get('#CUR-tSDxRqMQ').click({ force: true });
      cy.get('#CUR-DUdWDnqe').click();

      // update sales
      cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').should('be.visible').then(($publishing) => {

        if ($publishing.is(':visible')) {
          cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').click()
          cy.log('2023 - H1: Contract Test').wait(user.time);
        } else {
          cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing').click()
          cy.log('2023 - H1: Contract Test').wait(user.time);

        }
      })
      cy.get('#CUR-CormnEei').should('be.visible');
      cy.get('#CUR-JntuUeyO').click();
      cy.get('#CUR-uOyLTZEv').clear().type('smoke-sales-publishing testing');
      cy.get('#CUR-VcrTkCcj').click();

      cy.get('#CUR-QkoCHvTt').click().wait(2000);
      cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing testing').should('be.visible').wait(5000);

      // delete sales
      cy.get('#CUR-RKtAMVsX a').contains('smoke-sales-publishing testing').click().wait(5000);
      cy.get('#CUR-JntuUeyO').click().wait(5000);
      cy.get('#CUR-dYQCkJmQ').click().wait(5000);
      cy.get('#CUR-alQhgDPu').click().wait(5000);
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Sales Template Create, Read, Update and Delete Functions
  it('Smoke-Sales-Template-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-sales-files > a').click();
      cy.get('#sidebar-templates > a').click();


      cy.get('#CUR-kiMpkCSP > .btn').click();
      cy.get('#CUR-tHSGHnBz').click();

      // Calculation Tab
      cy.get('#CUR-xxVHzJFg').click();
      cy.get('#CUR-NJDqEPhR').click();
      cy.get('.col-sm-4 > .form-group > .form-control').select('string:Any');
      cy.get('.panel-body > .btn').click();
      cy.get('.ng-isolate-scope > .row > :nth-child(1) > .form-group > .ui-select-container > .ui-select-match > .btn-default').click().wait(1000);
      cy.xpath('//label[contains(text(),"When")]/following::span[@class="ui-select-choices-row-inner"][1]').click();
      cy.get('.ng-isolate-scope > .row > :nth-child(2) > .form-group > .form-control').clear('1');
      cy.get('.ng-isolate-scope > .row > :nth-child(2) > .form-group > .form-control').type('1');
      cy.get('.ng-isolate-scope > .row > :nth-child(3) > .form-group > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('#ui-select-choices-row-12-8 > .ui-select-choices-row-inner').click();
      cy.get(':nth-child(5) > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('#ui-select-choices-row-9-0 > .ui-select-choices-row-inner').click();


      cy.get('#CUR-EtCgEaNp').click();
      cy.get('#CUR-lDUnDkZE').type('A Template Smoke');
      cy.get('#CUR-DVIVtmuI').type('ATS');
      cy.get('#CUR-GHphjaeq').type('1');
      cy.get('#CUR-SeOCdrpE').type('1');
      cy.get('#CUR-qXfqrZTK').type('2');
      cy.get('input[type=file]').attachFile('smoke-sales-template.xlsx');
      cy.get('#CUR-MVMxRkBl').click().wait(8000); // Save Button

      // Setting Example Lines
      cy.get(':nth-child(2) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(2) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('sale date').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Sale Date').click();

      cy.get(':nth-child(3) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(3) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('source').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Source').first().click();

      cy.get(':nth-child(4) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(4) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('sub source').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Sub Source').click();

      cy.get(':nth-child(5) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(5) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('territory').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Territory').click();

      // cy.get(':nth-child(6) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      // cy.get(':nth-child(6) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('distribution').wait(1000);
      // cy.get('#CUR-bMXYoMFH').contains('Distribution Channel').click();

      cy.get(':nth-child(7) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(7) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('configuration').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Configuration').click();

      cy.get(':nth-child(8) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(8) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('Cat No').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Cat No').click();

      cy.get(':nth-child(9) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(9) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('units').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Units').last().click();

      cy.get(':nth-child(10) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(10) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('gross').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Gross Amount').first().click();

      cy.get(':nth-child(11) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(11) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('net amount').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Net Amount').first().click();

      // cy.get(':nth-child(12) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      // cy.get(':nth-child(12) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('per unit rate').wait(1000);
      // cy.get('#CUR-bMXYoMFH').contains('Per Unit Rate').click();

      cy.get(':nth-child(13) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(13) > #CUR-ZeGSlAdC > .ui-select-container > .ui-select-search').type('transaction date').wait(1000);
      cy.get('#CUR-bMXYoMFH').contains('Transaction Date').click();

      cy.get('#CUR-MVMxRkBl').click().wait(2000); // Save Button

      // validate on index page
      cy.get('#CUR-pOyCFpuZ').click().wait(4000);
      cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke').should('be.visible');
      cy.get('#CUR-WNCyYxcz span').contains('ATS').should('be.visible');

      // update template
      cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke').click();
      cy.get('#CUR-lDUnDkZE').clear().type('A Template Smoke Update');
      cy.get('#CUR-DVIVtmuI').clear().type('STA');

      // save and validate on edit page
      cy.get('#CUR-MVMxRkBl').click().wait(2000);
      cy.get('#CUR-lDUnDkZE').should('have.value', 'A Template Smoke Update');
      cy.get('#CUR-DVIVtmuI').should('have.value', 'STA');

      // validate on index page
      cy.get('#CUR-pOyCFpuZ').click().wait(2000);
      cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke Update').should('be.visible');
      cy.get('#CUR-WNCyYxcz span').contains('STA').should('be.visible');

      // delete
      cy.get('#CUR-WNCyYxcz a').contains('A Template Smoke Update').click().wait(2000);
      cy.get('#CUR-mZEcFCVq').click();
      cy.get('#CUR-GWPyNhGt').click();
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Payments Create, Read, Update and Delete Functions
  it('Smoke-Payments-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-payments').click();

      // payment groups index page validation
      cy.get('#CUR-HojkyIsW').should('be.visible');
      cy.get('#CUR-kXoADWjR').should('be.visible');
      cy.get('#CUR-INWUtDqr').should('be.visible');
      cy.get('#CUR-oTADdvMB th').contains('Name').should('be.visible');
      cy.get('#CUR-oTADdvMB th').contains('Status').should('be.visible');
      cy.get('#CUR-oTADdvMB th').contains('Created').should('be.visible');

      // payment index page validation
      cy.get('#CUR-INWUtDqr').click();
      cy.get('#CUR-EnfXLjHD').contains('Overview').should('be.visible');
      cy.get('#CUR-XBVbaFCZ').contains('Name').should('be.visible');
      cy.get('#CUR-LzsfBxoh').should('be.visible');
      cy.get('#CUR-McqILDtO th').contains('Payee').should('be.visible');
      cy.get('#CUR-McqILDtO th').contains('Name').should('be.visible');
      cy.get('#CUR-McqILDtO th').contains('Currency').should('be.visible');
      cy.get('#CUR-McqILDtO th').contains('Amount').should('be.visible');
      cy.get('#CUR-McqILDtO th').contains('Status').should('be.visible');

      // Add Payment
      cy.get('#CUR-eAKxeLbd').type('A Smoke Test');
      cy.get('#CUR-LzsfBxoh').click();
      cy.get('#CUR-sovaMLmn').click();
      cy.get('#CUR-XHhdnPOg').type('A Smoke Payment');
      cy.get('#CUR-eFDNZivS').type('0123');
      cy.get('#CUR-payee-select-field').type('z standard').wait(2000);
      cy.get('#CUR-hqUJePRw a').contains('Z Standard').click();
      cy.get('#CUR-vzLwJXME').click().wait(2000);

      // Validate Created Data
      cy.get('#CUR-BAKorZom a').contains('Z Standard').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('A Smoke Payment').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('GBP').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('123.00').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('Pending').should('be.visible');

      // Update Payment
      cy.get('#CUR-BAKorZom a').contains('Z Standard').click();
      cy.get('#CUR-XHhdnPOg').clear().type('A Payment Smoke Updated');
      cy.get('#CUR-eFDNZivS').clear().type('121');
      cy.get('#CUR-vzLwJXME').click();
      cy.get('#CUR-nwSFNGwm').click();

      // Validate Updated Data
      cy.get('#CUR-BAKorZom a').contains('Z Standard').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('A Payment Smoke Updated').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('GBP').should('be.visible');
      cy.get('#CUR-BAKorZom td').contains('121.00').should('be.visible');

      // delete payment
      cy.get('#CUR-BAKorZom a').contains('Z Standard').click();
      cy.get('#CUR-fjzEPjoB').click();
      cy.get('#CUR-OSFxsxNc').click();


      // delete payment groups
      cy.get('#CUR-cwYxrxYN').click();
      cy.get('#CUR-kcQIXvUd').click();
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Deliveries Create, Read, Update and Delete Functions
  it('Smoke-Deliveries-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-deliveries > a').click();
      cy.get('#sidebar-deliveries-submenu > a').click();

      // Page content validation
      cy.get('#CUR-izubuMLP').should('be.visible');
      cy.get('#CUR-hJlVPICP').should('be.visible');
      cy.get('#CUR-AQqGZbDe').should('be.visible');
      cy.get('#CUR-fpvNBkOw th').contains('Name').should('be.visible');
      cy.get('#CUR-fpvNBkOw th').contains('Type').should('be.visible');
      cy.get('#CUR-fpvNBkOw th').contains('PRO').should('be.visible');
      cy.get('#CUR-fpvNBkOw th').contains('Created').should('be.visible');

      // Create Delivery
      cy.get('#CUR-AQqGZbDe').click();
      cy.get('#CUR-ioaJMTae').type('A Delivery Smoke Test');
      cy.get('#CUR-UFgcTwDa > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('#ui-select-choices-row-3-0 > .ui-select-choices-row-inner').click();
      cy.get('#CUR-HneqZmKD > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(1) > #ui-select-choices-row-4-0 > .ui-select-choices-row-inner').click();
      cy.get('#CUR-aZiHAHjd > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('#CUR-cKgGPuta').click();
      cy.get('#CUR-TVEdFXWN > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('#ui-select-choices-row-6-0 > .ui-select-choices-row-inner').click();
      cy.get('#CUR-yiiDjTaM > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get(':nth-child(1) > #ui-select-choices-row-9-0 > .ui-select-choices-row-inner').click();
      cy.get('#CUR-hMWUFqRl > .ui-select-container > .ui-select-match > .btn-default').click();
      cy.get('#ui-select-choices-row-10-0 > .ui-select-choices-row-inner').click();
      cy.get('#CUR-lqyqHcFC').click().wait(16000); // Save Button

      // Validate created data
      // cy.get('#CUR-rkmrmRLD').should('be.visible');
      // cy.get('#CUR-SkBUNVua').should('be.visible');
      cy.get('#CUR-wPSDAvKb').click().wait(8000);
      cy.get('#CUR-fpvNBkOw a').contains('A Delivery Smoke Test').should('be.visible');
      cy.get('#CUR-fpvNBkOw span').contains('CWR').should('be.visible');
      cy.get('#CUR-fpvNBkOw span').contains('PRS').should('be.visible');

      // Update Delivery
      cy.get('#CUR-fpvNBkOw a').contains('A Delivery Smoke Test').click().wait(12000);
      cy.get('#CUR-ioaJMTae').clear().type('A Delivery Smoke Update');
      cy.get('#CUR-aZiHAHjd > .ui-select-container > .ui-select-match > .btn-default > .btn > .glyphicon').click();
      cy.get('#CUR-lqyqHcFC').click().wait(16000); // Save Button

      // Validate updated data index page
      cy.get('#CUR-wPSDAvKb').click().wait(8000);
      cy.get('#CUR-fpvNBkOw a').contains('A Delivery Smoke Update').should('be.visible');
      cy.get('#CUR-fpvNBkOw span').contains('CWR').should('be.visible');

      // Delete data      
      cy.get('#CUR-fpvNBkOw a').contains('A Delivery Smoke Update').click().wait(12000);
      cy.get('#CUR-tRfCZRkf').click();
      cy.get('#CUR-IcExkQDi').click();
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Configuration Create, Read, Update and Delete Functions
  it('Smoke-Configuration-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-settings > a').click();
      cy.get('#sidebar-settings-general > a').click();

      cy.get('#CUR-zfwLctsq').click();

      // Configuration Page Content Validation
      cy.get('#CUR-RUMGcfIR').contains('Currency').should('be.visible');
      cy.get('#CUR-SygJfpJW').contains('Accounting Period Types').should('be.visible');
      cy.get('#CUR-WiTwKpln').contains('Distribution Channels').should('be.visible');
      cy.get('#CUR-NcIEqMey').contains('Configurations').should('be.visible');
      cy.get('#CUR-JtjtHBvs').contains('Catalogue Groups').should('be.visible');
      cy.get('#CUR-dBjmMSky').contains('Sources').should('be.visible');
      cy.get('#CUR-FhiBtVul').contains('Payee Categories').should('be.visible');
      cy.get('#CUR-uIpxoudN').contains('Contract Categories').should('be.visible');

      // Create Configs
      cy.get('#CUR-UXciuPMi').click().wait(1000);
      cy.get('[ng-repeat="type in displayAccountingPeriodTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').clear().type('Smoke Test');

      cy.get('#CUR-vanqVexK').click().wait(1000);
      cy.get('[ng-repeat="channel in displayDistributionChannels track by $index"][style=""] > .row > .col-xs-8 > .form-control').clear().type('Smoke Test');

      cy.get('#CUR-PVapdTUI').click().wait(1000);
      cy.get('[ng-repeat="configuration in displayConfigurations track by $index"][style=""] > .row > .col-xs-8 > .form-control').clear().type('Smoke test');

      cy.get('#CUR-KIJKDlFj').click().wait(1000);
      cy.get('[ng-repeat="group in displayCatalogueGroups track by $index"][style=""] > .row > .col-xs-8 > .form-control').clear().type('Smoke Test');

      cy.get('#CUR-VkmnVCYN').click().wait(1000);
      cy.get('[ng-repeat="source in displaySources track by $index"][style=""] > .row > .col-xs-8 > .form-control').clear().type('Smoke Test');

      cy.get('#CUR-GLPJtuem').click().wait(1000);
      cy.get('[ng-repeat="type in displayPayeeTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').clear().type('Smoke test');

      cy.get('#CUR-gVVhjIam').click().wait(1000);
      cy.get('[ng-repeat="type in displayContractTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').clear().type('Smoke Test');


      // save and validate created data
      cy.get('#CUR-XbCaWLaC').click();

      cy.get('.alert').should('be.visible');
      cy.get('.alert').should('have.text', '×CloseSettings successfully saved');

      cy.get('[ng-repeat="type in displayAccountingPeriodTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke Test');
      cy.get('[ng-repeat="channel in displayDistributionChannels track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke Test');
      cy.get('[ng-repeat="configuration in displayConfigurations track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke test');
      cy.get('[ng-repeat="group in displayCatalogueGroups track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke Test');
      cy.get('[ng-repeat="source in displaySources track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke Test');
      cy.get('[ng-repeat="type in displayPayeeTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke test');
      cy.get('[ng-repeat="type in displayContractTypes track by $index"][style=""] > .row > .col-xs-8 > .form-control').should('have.value', 'Smoke Test');
      cy.get('[ng-repeat="type in displayContractTypes track by $index"][style=""] > .row > .col-xs-4 > .btn').click();
      cy.get('[ng-repeat="type in displayPayeeTypes track by $index"][style=""] > .row > .col-xs-4 > .btn > .fa').click();
      cy.get('[ng-repeat="source in displaySources track by $index"][style=""] > .row > .col-xs-4 > .btn').click();
      cy.get('[ng-repeat="group in displayCatalogueGroups track by $index"][style=""] > .row > .col-xs-4 > .btn').click();
      cy.get('[ng-repeat="configuration in displayConfigurations track by $index"][style=""] > .row > .col-xs-4 > .btn > .fa').click();
      cy.get('[ng-repeat="channel in displayDistributionChannels track by $index"][style=""] > .row > .col-xs-4 > .btn').click();
      cy.get('[ng-repeat="type in displayAccountingPeriodTypes track by $index"][style=""] > .row > .col-xs-4 > .btn').click();

      cy.get('#CUR-XbCaWLaC').click();
      cy.get('.alert').should('be.visible');
      cy.get('.alert').should('have.text', '×CloseSettings successfully saved');
      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

  // COMPLETED Testing Users Create, Read, Update and Delete Functions
  it('Smoke-Users-E2E-CRUD', () => {
    cy.fixture('condition.json').then(user => {
      cy.get('#sidebar-settings > a').click();
      cy.get('#sidebar-users > a').click();

      // Index Page Content Validation
      cy.get('#CUR-jpCBXdGb').contains('Users').should('be.visible');
      cy.get('#CUR-felYBGVK th').contains('Email').should('be.visible');
      cy.get('#CUR-felYBGVK th').contains('Created').should('be.visible');
      cy.get('#CUR-felYBGVK th').contains('Last Login').should('be.visible');
      cy.get('#CUR-felYBGVK th').contains('Status').should('be.visible');

      // Create User
      cy.get('#CUR-MEXvNKZp').click();
      cy.get('#CUR-uDjOsHCe').type('aausertest@curve.com');
      cy.get('#CUR-NfuxyaRV > .ui-select-container > .ui-select-match > .btn-default').click();
      // cy.get('#ui-select-choices-row-3-0 > .ui-select-choices-row-inner').click();
      cy.get('#CUR-NfuxyaRV span').contains('Admin').click();
      cy.get('#CUR-RxSOwcRN').click();// Save Button

      // Validate Created Data
      cy.get('#CUR-xQRKRMjR').click().wait(1000);
      // cy.get('.alert-success').should('be.visible').contains('User successfully created and invite sent to their email');
      cy.get('#CUR-tLNaUhsg a').contains('aausertest@curve.com').should('be.visible');
      cy.get('#CUR-felYBGVK span').contains('Admin').first().should('be.visible');

      // Update from Admin to Standard
      cy.get('#CUR-MEXvNKZp').click();
      cy.get('#CUR-uDjOsHCe').clear().type('aausertest@curve.com');
      cy.get('#CUR-RxSOwcRN').click();

      // save and validate
      cy.get('#CUR-xQRKRMjR').click().wait(1000);
      cy.get('.alert-success').should('be.visible').contains('User successfully created and invite sent to their email');
      cy.get('#CUR-tLNaUhsg a').contains('aausertest@curve.com').should('be.visible');

      // Delete User
      cy.get('#user-select-0').check();
      cy.get('#CUR-RWlxftDS').click();
      cy.get('#CUR-qmXpxFpo').click();


      cy.xpath('//a[@id=\'logout-button\']').then(($logout) => {
        if ($logout.is(':visible')) {
          cy.log('Logout button is found').wait(user.time);
        } else {
          cy.xpath('//a[@id=\'logout-button\']').wait(user.time);

        }
      })
    })
  });

})