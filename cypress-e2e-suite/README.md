# cypress-e2e-suite

Initial Cypress test repo

## Setup

`npm install cypress --save-dev`

Create `cypress.env.json` in the project root and add the following config:

```json
{
  "baseUrl": "https://dev.curveroyaltysystems.com",
  "default_login_email": "<test_user>",
  "default_login_password":""<test_user_password>"
}
```

This file contains private local settings, is ignored in git repo  and si is private to your machine andcan contain sensitive data.

## Run Cypress App

`npx cypress open`

`npm run cypress:open`

## Run Suite

Run the full suite

`npm run cy:run`

Run the smoke suite

`npm run cy:run:smoke`

Run the smoke suite and record the results on cypress cloud

`npm run cy:run:smoke:record`

## Useful Commands

[.pause()](https://docs-vercel.cypress.io/api/commands/pause#Pause-and-step-through-each-click-command) Enable pausing and iteration throuh the steps for debugging

## Issues

Cypress failed to start.

This may be due to a missing library or dependency. https://on.cypress.io/required-dependencies

Please refer to the error below for more details.

----------

/home/curve/.cache/Cypress/11.2.0/Cypress/Cypress: error while loading shared libraries: libatk-1.0.so.0: cannot open shared object file: No such file or directory

----------

Platform: linux-x64 (Amazon Linux - 2018.03)
Cypress Version: 11.2.0

### investigate amazon Extras Library, Failed

https://aws.amazon.com/premiumsupport/knowledge-center/ec2-install-extras-library-software/

#### alt

https://www.redhat.com/sysadmin/add-yum-repository
https://pkgs.org/download/libatk-1.0.so.0()(64bit)

( https://codefather.tech/blog/install-package-yum/ )

-- resolved

-- now :

/home/curve/.cache/Cypress/11.2.0/Cypress/Cypress: error while loading shared libraries: libatk-bridge-2.0.so.0: cannot open shared object file: No such file or directory
