describe('Label Smoke Tests', () => {
  beforeEach(() => {
    const username = null;
    const password = null;
    cy.login(username, password);
    cy.selectClientMulti();
    // cy.login_dev();
    // cy.selectClientSingle();
  })

  afterEach(() => {
    cy.logout();
  })

  it('TEST-TEMPLATE', () => {
    /* ==== Generated with Cypress Studio ==== */
    cy.get('#sidebar-settings > .detailed > .title').click();
    cy.get('#sidebar-settings-general > .go-to').click();
    cy.get('#CUR-aHfdrfGV').clear().type('Test');
    cy.get('#CUR-XbCaWLaC').click();
    /* ==== End Cypress Studio ==== */
  });

})