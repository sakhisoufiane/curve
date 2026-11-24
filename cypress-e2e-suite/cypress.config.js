
 
const { defineConfig } = require('cypress');
// const baseURL = 'http://localhost:8082';
// const baseURL = 'https://dev.curveroyaltysystems.com';
// const baseURL = 'https://staging.curveroyaltysystems.com';

module.exports = defineConfig({
  projectId: '7hko1m',
  env: {
    baseUrl: 'https://app.curveroyaltysystems.com',
    default_login_email: 'gelo+5@curveroyaltysystems.com',
    default_login_password: 'Abc@12345',
    default_client: 'Gelo Label For New Features',
    qa_mode_code: 'R4d2fNWthcyw5X8F'
  },
  e2e: {
    defaultCommandTimeout: 60000,
    // setupNodeEvents(on, config) {
    //   // implement node event listeners here
    // },
    // https://docs.cypress.io/guides/references/cypress-studio#What-you-ll-learn
    experimentalStudio: true,
    watchForFileChanges: false,
    videoUploadOnPasses: false,
  },
  viewportWidth: 1420,
  viewportHeight: 980
});
