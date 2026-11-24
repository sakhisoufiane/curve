# Changelog

## 1.10.0 Scalability / Stellify / Publishing / Support & Mon. Improvements

* CUR-1622 - Automatically include Track Titles as Alternate Titles in CWR deliveries
* CUR-1769 - Maestro Cat Shipment Like CWR Format - Importer
* CUR-1950 - Node Upgrade (18)
* CUR-1971 - BigQuery Resilience
* CUR-2069 - Replace Request Library with Axios in FE & API
* CUR-2070 - Upgrade xml2js to v0.6.0
* CUR-2084 - Enable Users to delete manually generated Transactions
* CUR-2085 - Allow Deleting or changing opening balances manually, but not in bulk
* CUR-2086 - Bulk Edit Catalogue Groups, Territory Groups, Channels, Configurations and Categories
* CUR-2089 - AWS SDK Major Upgrade - Application
* CUR-2165 - Ensure files are removed from tmp directory after use
* CUR-2229 - Upgrade xlsx and VM2 packages
* CUR-2369 - Support Tools Upgrade
* CUR-2424 - Send user notification for Fuga Cat Sync

## 1.9.11 Scheduled

* CUR-1969 - Change end of Lite trial email and platform notifications
* CUR-1124 - Unable to set a Payee Currency on a Payee that doesn't match a currency in the client's settings
* CUR-1155 - Work/Track/Release Validation - Participation Displays at 100%, but no Contract is selected
* CUR-1338 - Territory Groups Displaying as Curve IDs in Work Export
* CUR-1644 - Validation requiring Distribution statement design for Fees Tax not required on Distribution clients
* CUR-1786 - Last ingested - invalid date
* CUR-1818 - Large-Format Release Export Mechanicals Tab Incorrectly Labeled
* CUR-1857 - Wise - Allow Autopayment

## 1.9.10

* CUR-1638 - Filter search dropdown menus only show 25 values
* CUR-1525 - Update DDEX Ingestion to Allow ERN 4.3
* CUR-1784 - You can assign mechanical contracts as an artist contract
* CUR-1805 - payee import template not working
* CUR-1902 - cwr not calculating trl record correctly

## 1.9.9 Scheduled

* CUR-747  - Remove Deliveries From Works
* CUR-1009 - Include Unmapped Area in Masters Side - Add Sales File ID for Internal Users
* CUR-1010 - Payee Addresses on multiple lines are messed up in export & import
* CUR-1014 - Data Maintenance - Transactions
* CUR-1040 - Reports - Costs Tables
* CUR-1146 - Include Unmapped Area in Masters Side - Back end development
* CUR-1147 - Include Unmapped Area in Masters Side - Front End Development
* CUR-1256 - Surface info to users - What are they paying and why
* CUR-1281 - Soften the wording of the warning when creating/validating a Payee with no user associated
* CUR-1410 - Hipgnosis Publishing alternate titles not showing
* CUR-1413 - Add Payee to Cost Output Report
* CUR-1565 - Add Arabic to the Language list in Works

=== 11/01/23-17:52 npm audit security report === found 0 vulnerabilities (5 moderate severity devDependency vulnerabilities)

## 1.9.8 Scheduled

* CUR-103 - Limit costs to be assigned to only one Track, Release or Contract
* CUR-108 - Disallow certain cross-contract combos that always cause trouble
* CUR-1022 - Sales Lines Report Updates
* CUR-1216 - Deleting Sales File from Edit Page Doesn't Delete Data in BigQuery
* CUR-1227 - Statement displays an exponential value on advance remaining
* CUR-1324 - Display Track Contracts on the Release Edit Page
* CUR-1256 - Surface info to users what are they paying and why
* CUR-1014 - Data maintenance transactions

=== 28/11/22-17:57 npm audit security report === found 0 vulnerabilities (5 moderate severity devDependency vulnerabilities)

## 1.9.7 Scheduled

* CUR-797 - Allow access to payee history for non admin users once all payee patches data has been encrypted
* CUR-783  - show self billing invoice no and payment ref in excel
* CUR-820 - Response URLs for Tipalti
* CUR-1004 - Codes - Project ID
* CUR-1011 - Cost index filters
* CUR-1036 - Reports - Transactions Report
* CUR-1151 - As Curve Internal Sales Team Users, we need more data included in the Client Export
* CUR-1211 - Add Project ID Field in Analytics and Reports
* CUR-1259 - Option for client management to extend trial
* CUR-1268 - Payments Transaction has Duplicate on its name
* CUR-1300 - When Updating a Payee User by adding a Payee, Rights are set in the DB under all conditions
* CUR-1325 - When a User sets Catalogue Inheritance on new User, settings are not being saved
* CUR-1323 - Remove the "All" Cost Type from the Costs area
* CUR-1334 - 'Sale Price' implementation

=== 16/11/22-14:45 npm audit security report === found 5 moderate severity vulnerabilities !!!

## 1.9.6 Scheduled

* CUR-224 - Looks like edit rights and admin status are not cleared when a admin user is deleted from client
* CUR-216 - Create a transaction when manual payment is created
* CUR-279 - Payment Buttons and Payments in sidebar should only appear to Admin Users
* CUR-615 - Payments - If I delete a payment, it does not delete transaction on the Contract
* CUR-797 - Allow access to payee history for non admin users once all payee patches data has been encrypted
* CUR-850 - Add Bulk Create to Mapping Manager
* CUR-860 - Add Contract Balances on the Contract Export files
* CUR-879 - On click of payment, status to be updated to 'Processing', and prevent second payment
* CUR-1006 - Contract Index Filters
* CUR-1029 - Data Maintenance - Catalogue search filters
* CUR-1042 - Reports - Statement index export
* CUR-1126 - Saving billing info has impact on different fields
* CUR-1127 - Ensure payees' valid status is checked when saving a User with associated Payee
* CUR-1128 - Create a transaction when manual payment is created
* CUR-1162 - Client admin rights seem to get doubled up when a user is removed and added again as client admin
* CUR-1285 - Exported Contract has value on column O on excel
* CUR-615 - Payments - If I delete a payment, it does not delete transaction on the Contract

=== 26/10/22-16:05 npm audit security report === found 0 vulnerabilities

## 1.9.5 Scheduled

* CUR-113 - Reject an imported resaved csv file with faulty barcodes (due to scientific notation)
* CUR-616 - Add Swift number to payee details
* CUR-863 - Add validation of Payee and record valid status and any errors
* CUR-864 - Validate Artist Contracts
* CUR-865 - Validate Tracks
* CUR-866 - Validate Releases
* CUR-981 - Validate Mechanical Contracts
* CUR-935 - Add validation to Settings > Sales FTP Ingestions to ensure host is a valid url or IP address

=== 14/09/22-17:14 npm audit security report === found 0 vulnerabilities

## 1.9.4 Scheduled

* CUR-590 - Removing old mapping when changing mapping on Unmapped page
* CUR-851 - Flush contracts to works process set to what is filtered

=== 18/08/22-09:48 npm audit security report === found 0 vulnerabilities

## 1.9.3 Scheduled

* CUR-204 - Release Specific Dealer Prices do not save input on Dealer Price Field

=== 08/08/22-14:57 npm audit security report === found 0 vulnerabilities

## 1.9.2 Scheduled Technical Updates

* CUR-388 - Setup UI pages and structure for new tooling pages
* CUR-389 - Set Up functionality for copyclient to run in UI
* CUR-390 - Set up client flushing scripts
* CUR-460 - Remove test.helpers.lib from API
* CUR-718 - Upgrade packages

=== 21/07/22-19:17 npm audit security report === found 0 vulnerabilities

## 1.9.1 Scheduled PEN Updates

* CUR-184 - Pen - Broken Access Control – Import Page Loads List of Imports for Payee Users
* CUR-186 - Pen - Identification and Authentication Failures – Current Password Not Required to Change Email
* CUR-187 - Pen - Identification and Authentication Failures – Current Password Not Required to Change Password
* CUR-188 - Pen - Cryptographic Failures – Session Token in URL
* CUR-335 - Pen - Insecure Design – Method to Bypass Frontend Validation

=== 19/07/22-00:41 npm audit security report === found 5 vulnerabilities (devDependencies -  glob-parent - awaiting fix)

## 1.9.0 Scheduled

* Upgrade node v14 - v16
* Upgrade mongodb v3 - v4
* Upgrade mongoose v5 - v6
* Upgrade PSU v2 - v3
* Sidestep `multer > busboy > dicer` vulnerability isses - resolution in v2 pending
* Upgrade eslint v7 - v8
* Upgrade eslint-config-airbnb-base v14 - v15
* Upgrade mocha v9 - v10
* Upgrade sinon v10 - v14
* CUR-161 - Add projection to tracks and works routes
* Temporarily removes `"apidoc": "^0.50.4"`& `"apidoc-markdown": "^7.0.4"` pending vulnerability investigation and resolution

=== 09/07/22-04:41 npm audit security report === found 0 vulnerabilities

## 1.8.0 Scheduled

* CUR-559 - Deploy Curve Lite to Production

=== 30/06/22-16:19 npm audit security report === found 3 vulnerabilities in 1327 scanned packages
=== Known vulnerability in multer > busboy > dicer - Resolved in stellify-main - In testing
=== Known vulnerabilities in dev dependencies  apidoc/apidoc-markdown > got - Only installed in
dev & can be resolved with force-resolutions but prefer to wait for resolution in apidoc packages

## 1.7.2 Scheduled

* CUR-76 - Cross-contracts between contracts with different accounting period type not working
* CUR-88 - Allow '.tab' files to be uploaded as Sales files
* CUR-109 - Display list of works not included in CWR because of invalid status
* CUR-193 - Add Retail Price and Per Unit Rate on Sales Data on Page and in Exports
* CUR-268 - Unable to save General Settings [deployed previously but retest due to confusion on release merge]
* CUR-381 - Issue on Transfer Wise address [deployed previously but retest due to confusion on release merge]

=== 10/06/22-13:58 npm audit security report === found 1 vulnerabilities in 1255 scanned packages
=== Known vulnerability in multer > busboy > dicer - No fix currently available - Consider replacing multer

## 1.7.1 Hotfix

* CUR-400 - When importing a template with a blank value, it overwrites any TRUE to FALSE (even with "overwrite blanks" disabled)
* CUR-407 - Allow an Internal User to have Admin Access

## 1.7.0

* CUR-91 - Payments encryption and restriction

=== 02/06/22-16:29 npm audit security report === found 0 vulnerabilities in 1264 scanned packages
=== Known vulnerability in multer > busboy > dicer - No fix currently available - Consider replacing multer

## 1.6.44

* CUR-89 - Create a custom statement for Platoon

## 1.6.43

* CUR-202 - Payment Currencies to Come From Statement Currency
* CUR-254 - Issues with payment details refresh on payee page

=== 23/05/22-23:29 npm audit security report === found 0 vulnerabilities in 1263 scanned packages

## 1.6.42

* CUR-70 - Additional fields needed on Client Export
* CUR-73 - Copy Client Functionality should have added selects

=== 09/05/22-19:16 npm audit security report === found 0 vulnerabilities in 1263 scanned packages

## 1.6.41

* Analytics still being blocked by ad-blockers sometimes
* Make release specific sales returns part of Release template
* Update PSU to 2.0.30
  * Resolve issues with the Apple templates
  * Add Transferwise library
  * Change winston-cloudwatch package definition to restrict to patch updates

=== 04/04/22-20:28 npm audit security report === found 0 vulnerabilities in 1261 scanned packages

## 1.6.40

* Make release specific sales returns part of track template
* When importing a mechanical contract that is named exactly like an artist contract, the artist contract disappears
* Add Contract Profit Share Percentage to Report Fields
* Remove Sale Date & Transaction Date as default fields in a template
* Alias search doesn't always work

=== 28/03/22-18:22 npm audit security report === found 0 vulnerabilities in 1261 scanned packages

## 1.6.39

* Upgrade Platform Shared Utils @2.0.25
* Resolve minimist vulnerabilities

=== 24/03/22-12:05 npm audit security report === found 0 vulnerabilities in 1260 scanned packages

## 1.6.38

* Update copy client script to only include archived sales files (Unticketed)
* GEMA CWR - Lyrics vs Music share in CWR - validation
* Works filter on Delivery page does not work for World
* Remove corresponding mechanicalLicenses from release when tracks are removed
* Track import stalls when Default Release Cat No is provided that doesn't match to a Release
* Sales DB Export to include Work Information
* Unit Test libs/exportStatementToOtherClient.js
* Update Acknowledgement Registration Statuses
* Ensure removal of contract data added via mongoose populate for typeahead functionality
* Prevent a locked sales file from being deleted
* CWR Import to Ignore Works When They Don't Include Territory
* Adding a new payee to a category on creation does not stick

=== 21/03/22-17:00 npm audit security report === found 0 vulnerabilities in 1195 scanned packages

!!! 21/03/22-19:00 7 high severity vulnerabilities in 1195 scanned packages !!!
!!! Note: All the vulnerabilities have been detected in 'minimist' package in the last couple of hours before deployment
!!! Will observe this week for a patch or seek alternative remedy

## 1.6.37

* Two Templates, One Sales File
* SAMRO doesn't accept Admin
* Disallow the same currency being selected twice in the multicurrency Settings
* Convert Composers and Publishers under Agreements to Typeaheads
* Remove Sales File Name from the Sales File Export
* Reports Erroring When Table Not Selected - Needs some validation
* Make target period filter on period creation not caps sensitive
* Change S3 download error

=== npm audit security report === found 0 vulnerabilities in 1221 scanned packages

## 1.6.36

* Prevent people from deleting Composers or Publishers that are part of an IP Chain
* Prevent deletion of linked publishers
* Adding a composer or publisher with a duplicate name should display correct error
* Expose ACK status of Duplicate in the Front End
* Possible bug in combined Release import
* Work validation ensure composer and publishers are included on each row and have category assigned
* CWR export crashes with unassigned Composer and Publisher in chain
* [Regression Bug] Was able to save empty name on cost
* [Regression Bug] Unable to accept Cost type


## 1.6.35

* Deductions Gross/Net
* New Profit Share Statement
* Monitoring - Fetch Errored Period for last 3 Days
* New Profit Share Statement
* Add a Production filter in Delivery
* Deductions Display on PDF Statement
* Add Extra Capacities in IP Chain
* Remove Works Search Items (Sandbox)
* Update Works import error wording

## 1.6.34

* Update `platform-shared-utils` to 2.0.14
* Set ARI lines in CWR when delivery partner is marked as Split Election
* Transferring statement from mechanical statement into publishing, creates works and tracks accordingly
* Composers and Publishers limited on their returned values in API responses
* Work validations includes version type and composite type validations
* Work export and delivery using Atlas search to filter

## 1.6.33

* Update `platform-shared-utils` to 2.0.12
* Add route `/tasks/errored` for displaying errored tasks on monitoring pages
* Update `Payee` search to include `alternateName`

## 1.6.32

* Update `platform-shared-utils` to 2.0.11
* Create process for flushing BigQuery table schemas in `processes/flushBigQueryTables.js`
* Update Composer and Publisher models to allow for territories
* Composer and Publisher import and export excels include territories
* CWR updates territories based on composer and publisher territories

## 1.6.31

* Allow the transfer of statements from one account to another
* Original currenies mapped if they don't match one of the standard currency strings

## 1.6.30

* Update `platform-shared-utils` to 2.0.9
* Add payeeName to `contracts` index endpoint
* Allow filtering based on date on `notifications` endpoint
* Remove error responses on periods and statements being delivered to user
* Populate contracts, mechancial contracts, composers and publishers on load of catalogue data
* Move createXlsx to shared utils
* Optimise any final indexes for Mongo

## 1.6.29

* Update queries for MongoDB index updates

## 1.6.28

* Update `platform-shared-utils` to 2.0.7, updating log stream names

## 1.6.27

* Tracks Should Not Require an ISRC
* Prevent users from processing a period whilst a statement associated with that period is processing
* Prevent users from processing a period whilst it is currently processing
* Add calculation error notes to period model - nothing displayed yet, but we're starting storing
* Prevent user deleting sales file whilst it's running
* Allow filtering on Sales File new status
* Update work IP chain validation, so admin or sub publisher must be before original publisher
* Allow periods index filtering
* Composer and Publisher names to look for other non case-sensitive, so 'TOM ALLEN' will match to 'Tom Allen'. This is specifically on Work Import, CWR, and other Imports
* S3 files being deleted when Sales File object is being deleted

## 1.6.26

* Display Total Participation Rates in the index view on Releases and Tracks and Works, and allow the user to filter on them
* Update the works filters to include the new valid and ownership fields
* Changes to the way works are filtered for database efficiency

## 1.6.25

* Create New Status for Acknowledgement 'No Participation' (front_end@1.6.12)
* Automatically Assign Main Identifier (front_end@1.6.12)
* Don't insert into ip chain when the admin is already the Original Publisher

## 1.6.24

* Update works template to separate participants onto other tabs, and update IP chain
* Add Foreign ID to Composer and Publisher models and excels
* Work validation on save
* CWR email download open for 7 days
* Notification when CWR delivered via FTP
* Excel format on Deliveries

## 1.6.23

* Add Min Statutory Rate to mechancial contract terms and mechanical deductions
* Update client model to hold stat rates changing on specific dates

## 1.6.22

* Include Auto Payment configuration on Contract model
* Update contract import/export template to include Auto Payment configuration

## 1.6.21

* Update users internal setting to be a fixed checkbox rather than assumed
* Minor changes to deleting clients from users

## 1.6.20

* Report name required
* Strip dashes from ISRC on XML import
* Import Aliases notifications to be done within app
* Validate only Mechanical periods for mechanical contracts creating transactions
* Add MLC to list of PROs
* Lock sales file when periods are locked
* Flush mechanicals to not overwrite present contracts
* Pro rata contracts on release to take release specific contracts into consideration
* Transactions on negative profit shares to be raised to the user

## 1.6.19 - Hotfix

* Sales filters are now unescaping `'` and `"` characters to ensure they don't error within the SQL query
* Sales Filters now limit the filter to sales files available on client when one isn't specified - this avoids orphaned sales in the DB that do not have a sales file from appearing

## 1.6.18 - Hotfix

* User login issue, where they were associated with a payee that no longer existed. Checked that payee existed before continuing.

## 1.6.17

* Install `node-cron` package
* Update `ftpRunner` to run the ingestion process at specified time each night using `node-cron`
* Fixed issue with failing FTP Ingestions not returning from callback

## 1.6.16

* All excel imports to allow for partial import errors, returning any 'on save' errors from the final save of the objects. This is set across all imports on each model
* Release imports to ensure distribution channel and format is filled in correctly
* Aliases are no longer overwritten when sharing catalogue between clients - they now combine
* Release date and contract category fields added to reports

## 1.6.15 - Hotfix

* Update to how cwr.mergeChains works, focussing on the publisher, rather than just the chain. Update allows more complex chains to be merged across territories nicely
* Update excel import `importXlsx.getDataByTemplate` and export `createXlsx.createInTemplate` allowed characters to include letters with characters

## 1.6.14 - Hotfix

* Resolves issue with contract import setting dates when they don't exist in the data

## 1.6.13

* Updates the contract import process to ignore the opening balance if blank
* Strip example lines from library templates when copying to a sales templates
* Fixes bug when creating a statement within a mechanical period, which was not setting the correct contractType value on the statement
* Added costs bulk deletion
* CWR Multiterritories - update on the combining of rights chains, combining where a partial match of a chain occurs
* Fixes bug when importing contracts with Overwrite Blanks enabled, and the opening balance can't be updated due to a statement existing for that contract
* Updates the Period Statements export excel, including a few extra columns and forcing numbers into 2 decimal places on the excel
