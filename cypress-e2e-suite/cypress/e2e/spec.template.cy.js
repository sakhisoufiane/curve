describe.skip('~~TEMPLATE~~~', () => {
  beforeEach(() => {
    const username = null;
    const password = null;
    cy.login(username, password);
    cy.selectClientMulti();
  })

  afterEach(() => {
    cy.logout();
  })

  it.skip('TEST-TEMPLATE', () => {
    
  });

})