# Platform Shared Utils

Central Repository for shared functionality across the Curve Platform

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

**_Exposed_**

- Logger
- Database Utils
- Big Query Lib
- File Opener
- Template Matcher
- File Manager
- Create Zip
- Testing Utils
- Tipalti
- Wise
- Curve Pay
- FTP
- SFTP
- Bucket
- Error
- Exchange Rates

**_Internal_**

- CRD Reader
- AXF Reader
- EDI Reader

**_Road map_**

- Mappings (in API this seems to only be used in an old test)
- Model Schema Definitions

## Changelog

### 5.9.2
- Adding currencies list
### 5.9.1

- BigQuery: Add method `createTempTable` to allow creation of temporary table with an expiry date

### 5.7.1 (Beta)

- BigQuery: Enhanced `calculationQuery` for accurate aggregation of `reportedContractIds`. This new field, `reportedContractIds`, is derived from `contractId` in the sales output table and renamed within the Period Output View.

### 5.7.0 (Beta)

- BigQuery: `queryJobPromise` New Query Jobs function that uses Promises and takes in new `labels` argument

### 5.6.0 (Beta)

- NEW calculation queries for BigQuery Views

### 5.4.6

- Fixing logger, to stop using a shared winston instance and prevent duplicate logs to cloudwatch

### 5.4.5

- Fixing incorrect endpoint for curvepay payabale payees

### 5.4.4

- Curvepay async payments now also send client home currency

### 5.4.3

- Curvepay async payments now also send client home currency

### 5.4.2

- Modified curvePay to now send to async endpoint if async payments are enabled

### 5.4.1

- Modified filterTypes, so that = now searches case insensitively

### 5.4.0

- Added new functionality to queries, handling is_blank, is_not_blank and contains

### 5.3.0

- Adds new Structured Logger class for printing logs in JSON format with context information

### 5.2.2

- Fixes reading of v2.x CRD file where no MWN lines are present

### 5.2.1

- Restores mochaFixtures.js class removed in 5.1.2

### 5.2.0

- Added functionality to handle PRS custom formats for CRD v4

### 5.1.4

- BETA: New Big Query, callback fix

### 5.1.3

- BETA: New Big Query join function for sales calculation

### 5.1.2

- Added Husky pre-push hook

### 5.1.0

- Exchange Rates: Added new `getHistoricalExchangeRates` method for fetching historical exchange rates

### 5.0.0

- MAJOR RELEASE: MongoDB and Mongoose upgrades for V6.

### 4.0.1

- Increase Job Timeout on Big Query when running jobs for a mechanical period

### 4.0.0

- Upgrades Sinon to major version 19.
  - Introduces a number of breaking changes in sinon and sinon-test, mostly around configuration. Your project must be upgraded to Sinon 19 to match.
  - Support for Node 16 has been dropped.

### 3.3.0

- Created and exposed new CurveError class, with enumerated error codes, for consistent error handling between front-end, API and processor.

### 3.2.30

- Updated payments api call to use payee_id and added Github PR template

### 3.2.29

- Add another optional to RPI when recordedProductNumber does not exist on a WER line

### 3.2.28

- Add optional to RPI when recordedProductNumber does not exist on a WER line

### 3.2.27

- Moved Exchange Rate Logic to shared utils as it's now used in period calculation as well as period creation (front-end/api)

### 3.2.26

- Added Curve Pay process payments

### 3.2.25

- Fix @aws-sdk/client-s3 vulnerability

### 3.2.24

- Changing functionality of CRD Reader channel logic to include any value in the MDR lines.

### 3.2.23

- Fixed missing paramter from getChannel in the CRD Reader.

### 3.2.22

- Update CRD reader to read channel from SDN line in case of MDR line failure.

### 3.2.21

- Update CRD reader to properly read Channel off of MDR line instead of line type.

### 3.2.20

- Restore BQ version

### 3.2.19

- Update BQ version

### 3.2.18

- Destructure import of promisify in main so export is not a nested mess.

### 3.2.17

- Fixed missing promisify export from main.js.

### 3.2.16

- Promisify: Updated promisify to resolve with an array of values passed to the callback. This allows for the promisification
  of dyadic+ callbacks. It does mean however that single values resolved from promisify will have to be destructured.

### 3.2.15

- Promisify: Added a new functionality to wrap functions that require callbacks with promise based behavior.

### 3.2.14

- File Manager: Created FileManager.publicLink7DaysPromisify(key) for async links.

### 3.2.13

- Big Query: Revert Job Timeout to 20 mins

### 3.2.12

- Big Query: Increase Job Timeout to 40 mins

### 3.2.11

- Big Query: Increase Job Timeout

### 3.2.10

- Added BigQuery.queryPromisify(query) for async BQ queries.
- Fixed test suite to auto-generate tmp folder.

### 3.2.9

- Fix xlsx vulnerability

### 3.2.8

- File Opener: Better support for large files when choosing sample size for detecting file encoding

### 3.2.7

- Fix .xls sales file import

### 3.2.6

- Fix NPM vulnerabilities

### 3.2.5

- File Opener: Use dynamic sample size when detecting file encoding for better accuracy and performance

### 3.2.4

- File Opener: add file extenion support '.220', '.210', '.220'

### 3.2.2

- File manager: added multipart copying when copied object is larger then 4GB.

### 3.2.1

- Wise: Change hardcoded amount in Wise URL for API request

### 3.2.0

- Add bucket pattern library.

### 3.1.30

- Fix package vulnerabilities

### 3.1.29

- Utils: Final tweak for EU Formatting to allow for 20 decimal values in reports and statements CSV files

### 3.1.28

- Utils: Further tweak for EU Formatting to allow for larger decimal values in reports and statements CSV files

### 3.1.27

- Utils: EU Formatting, allow for larger decimal values

### 3.1.26

- Wise: Add support for webhooks

### 3.1.25

- Retry with different method, when parser fails on .xls

### 3.1.24

- Extended compatibility with .xls for fileOpener method.

### 3.1.23

- Extra logging in txt reader

### 3.1.22

- Verbose logging on Big Query Delete Data method

### 3.1.21

- Add retires to Big Query Deletion method

### 3.1.20

- Detect File Type text regular expression

### 3.1.19

- CRD Reader validation update

### 3.1.18

- Tipalti: iFrame to return to Payee in the Tipalti Payee ID field

### 3.1.17

- Tipalti: Fetch payment statuses

### 3.1.16

- EU Number Formatter in Utils

### 3.1.15

- Expanded utils library

### 3.1.14

- Re initialised tmp folder clean down

### 3.1.13

- Catch errors from AWSS3.send

### 3.1.12

- Expose Wise.createRecipientAccount

### 3.1.11

- Upgrade vm2 package

### 3.1.9

- Comment out tmp clear down temporarily

### 3.1.8

- check crd object in crdReader looks like a valid crd file

### 3.1.7

- Hard coded var in file manager fix, now pointing to ENV file

### 3.1.6

- Merge in updates from 3.0.x

### 3.1.5

- Updated conditon when removing file locally after S3 upload

### 3.1.4

- BigQuery retry all errors. Increase timeout on each retry.

### 3.1.3

- Centralising local file deletion, once file has been uploaded to S3

### 3.1.2

- Force VM2 version 3.9.17

### 3.1.1

- Update xml2js to 0.6.0

### 3.1.0

- Bumping version to 3.1.0 - includes updates for node & AWS SDK upgrades

-------------------------------3.0.x

### 3.0.36

- Fix No2 for EDI file format

### 3.0.35

- Fix for EDI file format

-------------------------------3.0.x

### 3.0.34

- TestUtils: add support for tests in parallel

### 3.0.33

- Tipalti: add support for income type

### 3.0.32

- Tipalti: add payment submitted status

### 3.0.31

- Log all payment responses

### 3.0.29

- Fix vulnerbilities

### 3.0.28

- Add support for calculation Wise sourceAmount when fees are paid by the Payee

### 3.0.27

- Get currency-pair rate from Wise

### 3.0.26

- Enable autopayments for Wise

### 3.0.25

- Snyk: Fix @aws-sdk/client-cloudwatch-logs vulnerability

### 3.0.24

- Scale BQ up when jobs are in the queue.

### 3.0.23

- Add FTP and SFTP libs

### 3.0.22

- BigQuery use API for BigQuery slots

### 3.0.21

- BigQuery join query to return aggregate of track isrcs instead of ids

### 3.0.20

- BigQuery join query to return aggregate of release and track ids

### 3.0.19

- Add Sale Price to BQ Input/Output tables

### 3.0.18

- Remove 'profileId' from Wise recipients request

### 3.0.17

- Remove 'active' limitation when getting list of Wise recipients

### 3.0.16

- Replace Wise deprecated profiles and balances endpoints

### 3.0.15

- Add BigQuery auto scaler functions

### 3.0.14

Resolve vulnerabilities:

- Vulnerability | CVE-2022-36067 | CWE-265 | CVSS 9.9 | SNYK-JS-VM2-3018201 - Cloudwatch-vm2
- Vulnerability | CVE-2019-10790 | CWE-642 | CVSS 7.5 | SNYK-JS-TAFFYDB-2992450 - JSDOC-taffy

=== 21/09/21-00:08 npm & snyk analysis === found 0 vulnerabilities

### 3.0.13

- Add support for selecting Wise recipients

### 3.0.12

- Add Tipalti IPN support

### 3.0.11

- Add `swiftCode` to payee encrypted fields

### 3.0.10

- Add `fileManager.deleteFromS3async` to return promises whilst allowing an alternative s3 config to be supplied. Maintains backwards compatability with `deleteFromS3`
- Add `fileManager.deleteFromS3Path` to allow cleaup of virtual s3 directory - returns promise and allows alternative s3 config to be supplied
- Add `crossEnvironmentConfig` which provide both staging and production configs for atlas and s3. Used in copy/delete clients functionality

### 3.0.9

- Update `fileOpener.readXlsxFile` to error if no results are returned by lib, also when `returnAllTabs` is set

### 3.0.8

- Add `getEncryptionKey` method to `encryptionUtils`

### 3.0.7

- Refactored `logger` to parse full Errors to strings when logging to AWS, even when passing multiple arguments
- Changed `logger` so that any arguments passed to it are passed to `console.log` unchanged when called in `development` environment

### 3.0.6

- Refactored `templateMatcher.addIdentificationToTemplate` to check for `salesTemplate.identification` instead of assigning to self when it exists
- Added try/catch to `templateMatcher.addIdentificationToTemplate` to handle any errors encountered
- Modified `templateMatcher.addIdentificationToTemplate` to only add identification if it is defined and not `null`

### 3.0.5

- `testUtils.randomString` to return only `a-zA-Z` characters
- `testUtils.randomString` now takes in an optional `length` parameter to set the string length. Defaulting to 20 characters length.
- refactored code for `testUtils.randomArray` and `testUtils.randomMappingsArray`

=== 15/07/22-15:08 npm audit security report === found 0 vulnerabilities in 772 scanned packages

### 3.0.4

- Add check for table exists
- Add dataset id to biq query dataset delete function
- Upgrade moment from 2.29.2 to 2.29.4 - remove vulnerability Regular Expression Denial of Service (ReDoS)-SNYK-JS-MOMENT-2944238

=== 12/07/22-01:40 npm audit security report === found 0 vulnerabilities in 772 scanned packages

### 3.0.3

- Added from 2.0.48 : Add `utils` library, containing `safeName`, `safeNameWithRandomString`
- Set up functionality for copyclient to run on UI

=== 05/07/22-14:22 npm audit security report === found 0 vulnerabilities in 772 scanned packages

### 3.0.2

- databaseUtils.getMongoUrl to return an empty authentication string in test mode.

### 3.0.1

- Added from 2.0.47 hotfix : Add new error 'An internal error occurred...' to the list of retried errors

### 3.0.0

- Bumping version to 3.0.0 - includes updates for node/mogo upgrades previously included in v2.0.45

---

### 2.0.48

- Add `utils` library, containing `safeName`, `safeNameWithRandomString`

### 2.0.47

- Add new error 'An internal error occurred...' to the list of retried errors

### 2.0.46

- Add latin1 encoding to the list of encodings returned by file opener

### 2.0.45 **_DEPRECATED_** \* This version should not be used in any context. It contains node/mongo upgrade work which is available in versions 3.x

- This version should not be used in any context. It contains node/mongo upgrade work which is available in versions 3.x
- Update dependencies: `mongodb: ^4.7.0`, `mongoose: ^6.3.6`, `sinon: ^14.0.0`
- Remove legacy db options in `databaseUtils`
- Update how we clear all database collections in `testUtils.cleanUp`
- Update dev dependencies: `eslint: ^8.17.0` , `eslint-config-airbnb-base: ^15.0.0`,`eslint-plugin-import: ^2.26.0`, `mocha: ^10.0.0`
- fix linting errors which were introduced by `eslint-config-airbnb-base` update

### 2.0.44

- Package lock file wasn't updated in previous build

### 2.0.43

- Add support for files with extension `.tab` to `fileOpener`

### 2.0.42

- `EncrytionUtils` ensure properties in arrays of objects are cleared

### 2.0.41

- `Encryption Plugin` clear added fields if not requested
- `EncrytionUtils.decryptField` - skip fields that do not need decrypting

### 2.0.40

- Add wise.paymentFields to payee encryption
- Change how we check for client admin in encryption

=== 24/05/22-10:16 npm audit security report === found 0 vulnerabilities in 786 scanned packages

### 2.0.39

- Fix issue with Mongoose Documents not behaving as a JS object when used with `_.has()` (Lodash)
- Make parent users non-Client Admin as well

=== 16/05/22-14:52 npm audit security report === found 0 vulnerabilities in 786 scanned packages

### 2.0.38

- Refactored payee encryption script to use shared encryption methods
- Modified encryption to add support for arrays of objects as well as properties for objects (e.g. 'arrayOfObjects.property', 'object.property.childProperty')
- Updated so that only unencrypted values of encrypted fields are updated, meaning if a field is already encrypted it will not be re-encrypted. So the script can be run to encrypt a newly added field to encrypted fields list or if the script fails for some reason it can be safely run again.

=== 13/05/22-17:09 npm audit security report === found 0 vulnerabilities in 786 scanned packages

### 2.0.37

- Add support for findOneAndUpdate to encryption plugin
- Add support for client encryption
- Add support for object property encryption to encryption plugin
- Refactoring and small changes to encryption plugin and encryption utilities

=== 12/05/22-19:07 npm audit security report === found 0 vulnerabilities in 786 scanned packages

### 2.0.36

- Add paymentEmail to payee encrypted fields

=== 06/05/22-01:20 npm audit security report === found 0 vulnerabilities in 787 scanned packages

### 2.0.35

- Add encryption plugin and utilities libraries
- Add shared config file

=== 04/05/22-11:25 npm audit security report === found 0 vulnerabilities in 787 scanned packages

### 2.0.34

Tipalti payee payable status now accepts the payment amount as a param

=== 25/04/22-15:18 npm audit security report === found 0 vulnerabilities in 785 scanned packages

### 2.0.33

- Add 'Invalid Credentials' to list of BQ error messages to retry

=== 21/04/22-14:47 npm audit security report === found 0 vulnerabilities in 785 scanned packages

### 2.0.32

- Fix payerName encoding issue and Tipalti api version.
- Fixed one vulnerability in moment (<https://github.com/advisories/GHSA-8hfj-j24r-96c4> )

=== 12/04/22-13:11 npm audit security report === found 0 vulnerabilities in 785 scanned packages

### 2.0.31

- Wise to return the complete error for the error logs

### 2.0.30

- Resolve issues with the Apple templates

### 2.0.29

- Expose Transferwise library

### 2.0.28

- Add Transferwise library

=== 01/04/22-13:44 npm audit security report === found 0 vulnerabilities in 785 scanned packages

### 2.0.27

- Change winston-cloudwatch package definition to restrict to patch updates

=== 31/03/22-17:20 npm audit security report === found 0 vulnerabilities in 784 scanned packages

### 2.0.26

- Revert winston upgrade
- Revert winston-cloudwatch upgrade

=== 28/03/22-09:50 npm audit security report === found 0 vulnerabilities in 784 scanned packages

### 2.0.25

- Upgrade winston
- Upgrade winston-cloudwatch
- Add client-cloudwatch-logs dependency
- Resolve 7 known vulnerabilities

=== 24/03/22-11:40 npm audit security report === found 0 vulnerabilities in 784 scanned packages

### 2.0.24

- Add '499' to Big Query error code retries list

### 2.0.23

- URLs as env variables for Tipalti.

### 2.0.22

- Add support for the payment provider Tipalti.

### 2.0.21

- fileManager: change S3 download error to a generic error, rather than referring to a sales file

=== npm audit security report === found 0 vulnerabilities in 715 scanned packages

### 2.0.20

- `templateMatcher` to return `priorityIngestionSuffix` as part of matched tabs

### 2.0.19

- Support for two templates against one sales file

### 2.0.18

- Revert Sinon to 10.0.0
- Match mogodb and mongoose to api

### 2.0.17

- Update package dependancies - remove vulnerabilities

### 2.0.16

- BigQuery to expose retryErroredQuery

### 2.0.15

- BigQuery to retry on EPIPE errors

### 2.0.14

- Set maximum number of retries on BigQuery

### 2.0.13

- Add two new helper functions for work tests : randomISWC & randomWorkVersionType

### 2.0.12

- BigQuery library centralises the error codes into single function and refactors requests to check for retry

### 2.0.11

- Version update for minor bug fix

### 2.0.10

- Update BigQuery schema to include composer and publisher names, and original track and release values

### 2.0.9

- Add `createXlsx` to library
- Catch errors of file not existing on S3 read

### 2.0.8

- Add 'GDF' as an allowed file type

### 2.0.7

- Update `logger` to match use separate log groups

### 2.0.6

- Update `TemplateMatcher` to copy only _published_ library templates during bulk ingestion

### 2.0.5

- Add `copyS3File` method to `fileManager` - used to copy a file between S3 buckets and/or paths

### 2.0.4

- Add composers and publishers to outputSchema

### 2.0.3

- Catch network errors on BigQuery library

### 2.0.2

- Fix for unit tests on circleCI where env not present

### 2.0.1

- Replace BigQuery private key double slashes - When injected with aws env vars - \n's are escaped

### 2.0.0

- Load BigQuery Credentials from .env instead of credentials file. Contains backwards breaking changes.
  Host applications must now have the following env vars availble at runtime (To run integration tests locally these will also need to be present in a local .env file)
  - BQ_project_id
  - BQ_client_email
  - BQ_private_key

### 1.4.29

- Extend BigQuery timeout on queries to 10 minutes

### 1.4.28

- Allow retry when Big Query is timing out - issue was due to a change in response from Big Query

### 1.4.27

- Ensure bucket owner has full control when writing to S3

### 1.4.26

- Create link available for 7 days function in FileManager

### 1.4.25

- BigQuery error handling updated to ensure retries on 'Resources exceeded', which we see when sending too many delete commands at once

### 1.4.24

- BigQuery error handling updated to ensure retries on connection errors

### 1.4.23

- Reduce batch size in CSV and TXT reader down to 3m lines

### 1.4.22

- Update `templateMatcher` to use Sales File filename to match to either `iTunes` or `iTunes Match` templates if either of those has been matched

### 1.4.21

- Update `crdReader` to add support for version 4.01 CRD files

### 1.4.20

- Update `fileOpener.readTxtFile` to read very large files in chunks

### 1.4.19

- `mochaFixtures` libs to create new bigQuery tables for the tests

### 1.4.18

- Fix `fileOpener` issues with different number of values being returned in callbacks

### 1.4.17

- Update `fileOpener` to read very large csv files in chunks

### 1.4.16

- Update `fileOpener` to replace double quotes `""` with single quotes `"`, when field is surround by quotes

### 1.4.15

- Update `fileOpener.readExcelJs` to error for files that aren't read correctly (reject files where less than 10% `string` values returned)

### 1.4.14

- Update `fileOpener` to remove unwanted quotes around field data
- Update `fileOpener` to detect file encoding if none specified in sales template

### 1.4.13

- Update `downloadFromS3` in `fileManager.js` to take an options param.
- Update `s3Files` in `createZip.js` to call `downloadFromS3` with the addTimestamp option.

### 1.4.12

- Updated `fileOpener.detectFileType` to include other weird file types that are definitely not excel

### 1.4.11

- Issue with missing 1.4.9 in update, so bumping version up to republish

### 1.4.10

- Update `fileOpener.readExcelJs` to error for files that aren't read correctly (`string` values returned as `null`)

### 1.4.9

- Update `fileOpener.readData` to process `.xls, .xlsb, .xlsx` files using `fileOpener.readTxtFile` when these are actually plain text files saved with the wrong extension

### 1.4.8

- Add `bigQuery.integration.test.js` to the tests.
- Add `.mocharc.js` contaning the mocha config.
- Update `package.json` to update the tests scripts.

### 1.4.7

- Update `fileOpener.readExcelJs` to deal with files that can't be read correctly (missing `workbookReader.model`)
- Update `fileOpener.readData` to add 2nd fallback for `readExcelJs`. ( `readExcelJs` -> `readXlsx` -> `readExcelFile` )

### 1.4.6

- Update `fileOpener.readExcelJs` to match sheet index on sheet id instead of name
- Update `fileOpener.readExcelJs` to ensure blank lines are not skipped
- Update `fileOpener.readExcelJs` to return the result of formulas

### 1.4.5 - unpublished

- Update `bigquery` library to fix bug with `catalogueIdsToParams` output not being put into queries

### 1.4.4

- Unit tests clean up

### 1.4.3

- Minor update on tab numbers for `exceljs` file opening

### 1.4.2

- Update `fileOpener` to `stream` data from xlsx files using `exceljs` package
- Leave fallback to `xlsx-extract` in place

### 1.4.1

- Remove `s3-client` dependency

### 1.4.0

- Add `testUtils` library

### 1.3.6

- Update the `S3 upload` in `fileManager.js` to stream the files using `aws-s3` promises, issue with race conditions in previous fix (same outcome as original multipart issue)

### 1.3.5

- Update the `S3 upload` in `fileManager.js` to stream the files, issue with previous fix as fs.openFileSync has a limit of 2GB

### 1.3.4

- Updating the `S3 upload` in `fileManager.js`, after an issue with multipart uploads with the previous client. Now moved to using vanilla S3 client

### 1.3.3

- Allow `endpoint` to be added to `S3 config`, set via the environment variables

### 1.3.2

- Add `getUploaderCredentials` method to `fileManager`
- Cleanup fileManager

### 1.3.1

- Add `downloadStatementLogoFromS3` to file manager

### 1.3.0

- Add `fileManager` library
- Add `createZip` library

### 1.2.0

- Add `sanitise` method to `logger` library and refactor to allow
  multiple arguments on calls to info, debug & error
- Display arguments with type object in CloudWatch logs

### 1.1.1

- Refine eslint rules
- Add processing of .roy files in fileOpener
- Use global var to hold txt file extensions to keep these in line throughout
- Fix an issue with .xls files introduced by the InGrooves fix
- Make sure headerRow is defined even if the selected row does not exist

### 1.1.0

- Issue breaking updating of sales lines in Sales File interface
- Fix issue with null values being added as strings
- add default return to map
- filter out null and undef values on updateData

### 1.0.0

- Increase version number to mark as production ready

------;

> < v1.0.0 should not be considered production ready

### 0.1.2

- Refactoring: Inner functions catalogueIdsToParams are now grouped under one function (bigQuery.catalogueIdsToParams).
- More unit tests.

### 0.1.1

- Merge in ingrooves template fix
- Fixes to fileopener related to node upgrade

### 0.1.0

- Adds **_databaseUtils_** - centralises consistent database configuration
- Semver shift as this and previous versions contain breaking changes
- Updates linting & test suite configs

### 0.0.7

- Adds adjustments processing to crd v2
- Tweaks to test suite config

### 0.0.6

- Added fileOpener and templateMatcher libraries, ready for integration with host applications
- Also added axfReader, crdReader and ediReader libraries - all of which are used by fileOpener internally only and not exposed to host application
- Applied style guide to ALL of the above packages

### 0.0.5

- Updated BigQuery library filterFromObject to allow for AND requests
- Added types to bigQuery.logQuery
- Upgrade winston-cloudwatch
- Add Mocha to eslintrc envs

### 0.0.4

- removed resolutions as it didn't work and broke host install

### 0.0.3

- bigQuery ready for integration with host applications

### 0.0.2

- Add BQ lib first pass and testing - logger ready for integration - BQ is not.

### 0.0.1

- Initial publish. Versions below 1.0.0 should not be considered production ready
