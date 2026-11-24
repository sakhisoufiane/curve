# curve-shared-logic
Repository for shared logic across the Curve ecosystem.

## Setup

Install the dependencies with NPM once the repo has been cloned:
```
npm install
```

**Run all tests:**
```
npm run test
```

**Run all tests with coverage reporting:**
```
npm run test:coverage
```

## Git Hooks

[Husky](https://typicode.github.io/husky/get-started.html) has been used to configure a `pre-push` hook that will run ESLint and all tests before push to remote

## Branching Strategy

CLS branching strategy now mirrors the approach used in the API, Processor and Frontend
to keep a consistent approach across all Curve repositories.

* Create feature branch from `main` branch
* Feature branches should be named appropriately based on Jira ticket number and short description e.g. `CUR-3551-csl-publish-automation`
* Commits messages should follow a similar format e.g. `git commit -m "CUR-3551: added some code...."`
* When code changes are complete:
    * Create PR against `develop` branch and request review from `CurveRoyalties/core-team` - this will randomly request review from two devs
    * Create PR against `main` branch
    * Add PR links to Jira ticket in appropriate sections
    * PR's must pass all checks and have two approvals before they can be merged
    * When ready the `develop` branch PR can be merged by the developer, then check deployment is successful and move the Jira ticket to QA

> Note. The `main` branch PR will be merged separately when preparing for a production release

### Merge Conflicts

When encountering merge conflicts on the `main` branch PR:
* Rebase the feature branch from `main`
* Manually resolve conflicts and push changes to feature branch

When encountering merge conflicts on the `develop` branch PR:
* Create a new temporary feature branch from the existing feature branch e.g. `TMP-CUR-3551-csl-publish-automation`
* Pull latest `develop` branch changes
* Merge `develop` into the new temporary feature branch
* Manually resolve conflicts and push changes to the temporary feature branch

> Note. Ensure `develop` changes are not merge into the `main` feature branch


## Publish

The publishing of the package is handled in the `merge-pipeline` Github Action.  
The process below outlines the steps required when making a change to CSL, all versioning and publishing steps are automated.

* Create feature branch from main, current version unchanged e.g. 0.68.0
* Make required code changes for feature
* Create PR on `develop` branch
    * Merge PR to `develop` when approved
    * Version will be incremented as prerelease e.g. 0.68.1-develop.0
    * Published and tagged with `develop`
* Create PR on `main` branch
    * Merge PR to `main` when approved
    * Version will be incremented as patch e.g. 0.68.1
    * Published and tagged with `latest`
* Consuming the package from the API/Processor/Frontend requires no further changes for features, based on the following initial setup:
    * On the `develop` branch the latest prerelease version tagged with `develop` should be used, this requires a script update to the package.json dependencies in develop (as the dependecy will be marked as `latest` in the branch)
    * On the `main` branch the latest version tagged with 'latest' should be used
    * Update the deployment process to run `npm update @curveroyaltysystems/curve-shared-logic` (as `npm i` will not check NPM for latest version but use local cache and `npm ci` will install the specific version from the package-lock.json)
    * Redeploy the consuming repo after publishing


## Changelog


### 1.0.46
* Adds UserAccess.allowWriteAccessToAll to use in api routes with write access permissions

### 1.0.22
* Adds `identifiers` as a possible filter for `works`, which when added (as an array of strings), filters `identifier` on `work` as exact matches

### 1.0.8
* Added Husky pre-push hook

### 1.0.3
* added fugaId to the model get projection index for tracks

### 1.0.2
* Auto increment of the below

### 1.0.1
* Merge Main updates into Mongo Branch

### 1.0.0
* MAJOR RELEASE: MongoDB and Mongoose upgrades for V6.

### 0.0.67
* When generating a CWR and the publisher is "Acquirer" then export the mechanical ownership value

### 0.0.66
* Change strong password requirement to be 12 instead of 8
  
### 0.0.65
* Templates: Removed Partner Chains tab from Lite > Works template
* Templates: Ensure Works tab is the default when opening Works templates

### 0.0.64
* CWR: Ported `CwrController.export` from API to CSL, and converted to async/await
* Works: Added various tests
* Works: Added `partnerRightsChains` to model projection (Partner Rights Chains feature)

### 0.0.63
* CWR: Refactored `publisherChain` method and conditions for deciding what/when to write Publisher lines to the CWR output
* CWR: Refactored `composerChain` method, fixed conditions for writing territory lines and removed callbacks
* CWR: Fixed various CWR outputs (duplicated SPU lines, missing SPT lines, missing inserted sub publishers)
* CWR: Added new test suite for Delivery Partner P3 (US + NL territory)
* CWR: Added more tests to existing suite (P4 - World territory)
* CWR: Updated test works JSON files to include latest works
* CWR: Added work debugging log function

### 0.0.62
* CWR: Added new Publisher module with ContractType type
* CWR: Refactored legacy callback functions to use async/await
* CWR: Various fixes for Publisher Sequence No. on export

### 0.0.61
* CWR: Convert Performer name to string before replacing special characters
* CWR: Fix Publisher chains not importing correctly

### 0.0.60
* Update Work validation

### 0.0.59
* Parents: Fix internal users access

### 0.0.58
* CWR: Make sure Composite Count reflects the number of Samples specified in the Work

### 0.0.57
* Add the InterestedPartyId Column to the Composer template

### 0.0.56
* CWR: Use CISAC territories for Composing mapping on ingestion

### 0.0.55
* Add the InterestedPartyId Column to the Publisher template

### 0.0.54
* CWR: Fix Publisher create condition & chain index when building Publisher chains

### 0.0.53
* Adjust validation for IRS Delivery

### 0.0.52
* CWR: Parse collection values as floats to prevent zero conversion

### 0.0.51
* CWR: Added support for Publisher Sequence No. on import & export

### 0.0.50
* Updated cwr.js to use interestedPartyId instead of PartyNo for composers 

### 0.0.49
* Updated cwr.js to use interestedPartyId instead of PartyNo for publishers 

### 0.0.48
* CWR: Only increment owned shares for Original Publishers when writing controlled Publisher lines

### 0.0.47
* Updated Contract Projection - Display UpdatedAt field

### 0.0.46
* Statement Export Template: Tab Name Fixes

### 0.0.45

* CWR: Add logic for Income Participation

### 0.0.44
* Works: Remove invalid territories in new works when checking for significant changes

### 0.0.43
* CWR: Reader - Add ORN line type to lines read

### 0.0.42
* CWR: Submitter Recording ID - should only be 14 chars v2.2

### 0.0.41
* CWR: Only write unique Composer territory lines on export

### 0.0.40
* WorkController: Passing missing params to bulkUpdateDeliveryStatus

### 0.0.39
* CWR: Fix create Publisher in IP Chain conditional

### 0.0.38
* Works: Added ISWC related logic to controller

### 0.0.37
* CWR: Increment group lines when composite of samples used

### 0.0.36
* Add missing DeliveryLog arg to addLog.

### 0.0.35
* Added testing setup
* CWR: Only import most specific territory groups
* CWR: Fix territories not being excluded in SPT lines on export in some cases
* CWR: Remove unecessary SPT exclude lines when applicable
* Deps: Update platform-shared-utils to fix issues when detecting encoding type of large CWR files

### 0.0.34
* CWR: Update the composer chain to use the chain specific territories.

### 0.0.33
* CWR Utils: Agreement numbers logic expanded to include publishers across all areas of logic. Missed on the previous update.

### 0.0.32
* CWR Utils: Agreement numbers update to only pick up publisher specific agreement, previously was not limited by publisher, so was picking any agreement number up

### 0.0.31
* Works: Prevent invalid territories from flagging work significant changes

### 0.0.30
* CWR: Custom Lodash merge method to prevent array value overwrites when merging IP chain territories

### 0.0.29
* Period Statement Contract Closing Balance Column removal from Payee Transfers Col

### 0.0.28
* Templates: Use CISAC approved territories list on Reference tab

### 0.0.27
* CWR: Use approved territories count
* CWR: Fix territories error handling

### 0.0.26
* Fix NPM vulnerabilities

### 0.0.25
* Contract Import/Export Fix for Payee Balances

### 0.0.24
* CWR: Fix missing DeliveryPartner model dependency injection

### 0.0.23
* Statement Export Template for Payee Balances

### 0.0.22
* Payee User Access updates

### 0.0.21
* CWR: Fix include/exclude logic for deliveries
* CWR: Consolidation of territories and related constants & utils

### 0.0.20
* Fix missing compositeWorks on work model

### 0.0.19
* CWR: Add support for Composition of Samples

### 0.0.18
* New Payee Export for Payee Balances

### 0.0.17
* User Access Updates for Payee Users

### 0.0.11

* Fix userAccess contract requirement

### 0.0.10

* Update templates and other fixes

### 0.0.9

* User Access Updates

### 0.0.8

* Add changes from ticket SUP-1030 to the CWR libs

### 0.0.7

* Fix excel templates path.

### 0.0.6

* Add excel templates.

### 0.0.5

* Expose more controllers and libs.

### 0.0.4

* Github actions configuration.

### 0.0.3

* Change exposed controllers naming format.

### 0.0.2

* Expose DeliveredWork controller.

### 0.0.1

* Initial repository and npm package setup.
