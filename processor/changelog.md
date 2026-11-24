# Changelog

## 1.10.1 Calculation Batching Improvements

* CUR-2278 - Set up blocking process for batch worker pickups in calculation (SQS on the fly)
* CUR-2385 - Calculation: Optimise the batching of large catalogues

## 1.10.0 Scalability / Stellify / Publishing / Support & Mon. Improvements

* CUR-394 - Resolve errored tasks discrepancy - ie period errors but task doesn't so not shown in ui
* CUR-1093 - Copy Client script should copy reports as well
* CUR-1950 - Node Upgrade (18)
* CUR-1971 - BigQuery Resilience
* CUR-2089 - AWS SDK Major Upgrade - Application
* CUR-2165 - Ensure files are removed from tmp directory after use
* CUR-2229 - Upgrade xlsx and VM2 packages
* CUR-2369 - Support Tools Upgrade
* CUR-2424 - Send user notification for Fuga Cat Sync

## 1.9.8 Scheduled

* CUR-1857 - Wise - Allow Autopayment

## 1.9.7 Scheduled

* CUR-1009 - Include Unmapped Area in Masters Side - Add Sales File ID for Internal Users
* CUR-1040 - Reports - Costs Tables
* CUR-1146 - Include Unmapped Area in Masters Side - Back end development
* CUR-1147 - Include Unmapped Area in Masters Side - Front End Development
* CUR-1232 - Mechanical Reporting Question
* CUR-1502 - Domino: Reproduce Statements for Period
* CUR-1579 - Mad Decent Statement Stuck

=== 11/01/23-17:52 npm audit security report === found 0 vulnerabilities

## 1.9.6 Scheduled

* CUR-742 - Update Statement Partition Nos
* CUR-1004 - Codes - Project ID
* CUR-1102 - Calculation Unit Tests: Release
* CUR-1103 - Calculation Unit Tests: Track
* CUR-1211 - Add Project ID Field in Analytics and Reports
* CUR-1334 - 'Sale Price' implementation

=== 16/11/22-14:31 npm audit security report === found 0 vulnerabilities

## 1.9.5 Scheduled

* CUR-732 - Self Bill should not be created when balance has a FALSE payment condition
* CUR-1101 - Calculation Unit Tests: Cost Updates

=== 26/10/22-15:37 npm audit security report === found 0 vulnerabilities

## 1.9.4 Hotfix

* Upgrade PSU@3.0.14 to remove inherited vulnerabilities
* Move jsdoc-to-markdown to devDependencies and update linting rules

## 1.9.3 Scheduled

* CUR-660 - Calculation Refactor & Unit Tests
* CUR-157 - Re-visit costs calculation causing strain on Mongo

=== 12/09/22-11:43 npm audit security report === found 0 vulnerabilities (CUR-660 deployed Sun 11/09/22 19:50)

## 1.9.2 Scheduled

* CUR-851 - Flush contracts to works process set to what is filtered

=== 18/08/22-09:52 npm audit security report === found 0 vulnerabilities

## 1.9.1 Scheduled Technical Updates

* CUR-126 - Add logging during sales files processing
* CUR-160 - Add more logging to Sales file reingestion
* CUR-165 - Replace Mongo logic to Mongoose logic in createStatement.js
* CUR-326 - Finish Sales Ingestion Testing
* CUR-329 - Calculation Unit & Integration Testing
* CUR-330 - Calculation End to End Canary Testing
* CUR-389 - Set Up functionality for copyclient to run in UI
* CUR-390 - Set up client flushing scripts
* CUR-718 - Upgrade packages

=== 21/07/22-19:17 npm audit security report === found 0 vulnerabilities

## 1.9.0 Scheduled

* Upgrade node v14 - v16
* Upgrade mongodb v3 - v4
* Upgrade mongoose v5 - v6
* Upgrade PSU v2 - v3
* Upgrade eslint v7 - v8
* Upgrade eslint-config-airbnb-base v14 - v15
* Upgrade mocha v9 - v10
* Upgrade sinon v10 - v14

=== 09/07/22-04:50 npm audit security report === found 0 vulnerabilities

## 1.8.0 Scheduled 

* CUR-559 - Deploy Curve Lite to Production

=== 01/07/22-11:25 npm audit security report === found 0 vulnerabilities in 981 scanned packages

## 1.7.1 

* CUR-76 - Cross-contracts between contracts with different accounting period type not working
* CUR-88 - Allow '.tab' files to be uploaded as Sales files

=== 10/06/22-13:58 npm audit security report === found 0 vulnerabilities in 981 scanned packages

## 1.7.0

* CUR-91 - Payments encryption and restriction

## 1.6.35

* CUR-89 - Create a custom statement for Platoon

## 1.6.34

* CUR-71 - Set 'Mechanical Rate %' as 100% by default if left blank on Track/Release
* CUR-202 - Payment Currencies to Come From Statement Currency
* CUR-203 - Recalculating individual statements is not clearing the previous payment
* CUR-205 - Partial Recalculation - when recalculating only changing one contract, all other payments disappear

=== 23/05/22-23:02 npm audit security report === found 0 vulnerabilities in 982 scanned packages


## 1.6.33

* CUR-46 - Add Currency column to our default statements
* CUR-74 - Addition of 'Calculation Type' to filters on Reports

=== 09/05/22-19:08 npm audit security report === found 0 vulnerabilities in 982 scanned packages

## 1.6.32

* Update PSU to 2.0.30
  * Remove direct dependencies to winston
  * (Resolve issues with the Apple templates)
  * (Add Transferwise library)

=== 04/04/22-20:28 npm audit security report === found 0 vulnerabilities in 981 scanned packages

## 1.6.31

* PDF Statement Headers Only Appear on the First Page
* Blank pages in the pdf statements, can we avoid these
* Not applying a unit rate on Apple Cloud revenue from territory NA
* Add Contract Profit Share Percentage to Report Fields
* Remove Sale Date & Transaction Date as default fields in a template
* Alias search doesn't always work

=== 28/03/22-18:22 npm audit security report === found 0 vulnerabilities in 985 scanned packages

## 1.6.30

* Upgrade Platform Shared Utils @2.0.25
* Resolve minimist vulnerabilities

=== 24/03/22-12:40 npm audit security report === found 0 vulnerabilities in 986 scanned packages

## 1.6.29

* Added extra negative path logging to period.getData (unticketed)
* Payments added separately at the top of a combined royalty statement
* Update to Costs calculation causing slow queries

=== 21/03/22-17:00  npm audit security report === found 0 vulnerabilities in 915 scanned packages

!!! 21/03/22-19:00 4 high severity vulnerabilities in 915 scanned packages !!!
!!! Note: All the vulnerabilities have been detected in 'minimist' package in the last couple of hours before deployment
!!! Will observe this week for a patch or seek alternative remedy

## 1.6.28

* Two Templates, One Sales File
* Add cost type descriptor to PDF detail of costs
* Change S3 download error

=== npm audit security report === found 0 vulnerabilities in 915 scanned packages

## 1.6.27

* Period Recalculation fixes and updates
* Resolve filters for dual sales runs
* Limit sales calculation to required contracts (fix)
* Add `overrideAlwaysRunFull` flag in appSettings model (new)

## 1.6.26

* Deductions Gross/Net
* New Profit Share Statement
* Allow Extra Report Fields in Statement Outputs
* Deductions Display on PDF Statement


## 1.6.25

* Update `platform-shared-utils` to 2.0.14

## 1.6.24

* Update `platform-shared-utils` to 2.0.12

## 1.6.23

* Update `platform-shared-utils` to 2.0.11
* Include composer and publisher strings in output
* Include original track and release info in publishing statements

## 1.6.22

* Change pagination in loading catalogue for calculation to `{ $gt: _id }`
* Transferring royalties between two contracts that have different exchange rates, it now exchanges the amount
* Withholding tax transfers now get transferred at the time, and are not left on the account
* Original currenies mapped if they don't match one of the standard exchange rates

## 1.6.21

* Update `platform-shared-utils` to 2.0.9
* When no sales file or cost is selected, it now skips calculating anything - previously this was calculating everything but nothing matched filter so resulted in 0 value over a long time
* Optimise any final indexes

## 1.6.20

* Update queries for MongoDB index updates

## 1.6.19

* Update Extended PDF output to right align numbers

## 1.6.18

* Update `platform-shared-utils` to 2.0.7, updating log stream names

## 1.6.17

* Add calculation error notes to period model - nothing displayed yet, but we're starting storing
* Only use Library Templates when they are published
* Delete S3 files on deletion of Sales File
* When using the same sales files with multiple templates, and creating a copy, it now copies the file on S3 also
* Update Shared Utils to v2.0.6
* Add Partition Nos on statement headline figures

## 1.6.16

* Add auto payment text to the PDF statements when auto payment will not take place
* Set tax amount based on auto payment conditions
* Prevent self billing invoices from creating when auto payment prevented

## 1.6.15

* Add Min Statutory Rate to calculations

## 1.6.14

* Reduced loading limits for improved MongoDB performance

## 1.6.13

* Update Auto Payments to have conditions
* Update Cross Contracts to check whether Auto Payments will kick in before crossing contract

## 1.6.12

* Update profit shares calculation with negative balances and payments
* Update recouping of advances, where a positive opening balance exists, and an advance has been issued, deducting the opening balance from the advance

## 1.6.11

* CRD reader updated to accept V4.01
* Txt files reading using batched process to bring in line with CSV reader
* Sales Ingestion - overwrite fields only kicking in when other fields are blank
* Sales Ingestion - Sale Date and Transaction Date are now required fields
* Sales Ingestion - overwrite catalogue in revalidation process
* Calculation - Total rows and analytics to ignore 0% royalties
* Unreported CSV to ignore contracts that aren't in the same accounting period
* Statements - Display mechanical deductions as a transaction for distribution, do not include in distribution fee
* Company's includes full set of statement configurations

## 1.6.10

* Update Shared Utils to 1.4.17 to manage large CSV files better

## 1.6.9

* Update Shared Utils to 1.4.16 to remove double quotes surrounding text and to fall back to another library on excel files that contain less than 10% of strings in the data (indicating it's read incorrectly)

## 1.6.8

* Update the track loading to prevent the loading of release specific tracks for single statement processing

## 1.6.7

* Update Shared Utils to 1.4.14 to better manage UTF-16 encodings and load speech marks around numbers

## 1.6.6

* Update company name in top right of statement files
* Costs 0 rate calculations to include the 0 value in the royalty rate in the statement CSV - this was previously missing
* Change the font in the statement outputs for numerical values to include the € sign
* Royalty rate to display properly as 0
* Unique file names in zip of statements and holding each of the local machine with a unique timestamp

# 1.6.5

* Optimisation in publishing calculations to load works and skip channel specific works if none exist
* Upgrade shared-utils lib to 1.4.12 to update sales ingestion validating excels aren't text files in disguise - using a few more strings to identify it as a txt file

# 1.6.4

* Change extended statement detail pages to always display 4 decimal places, and to include those lines less than 0.01 which had previously been stripped from the data

## 1.6.3

* Update Platform Shared Utils verison to 1.4.11
* This update contained updates to the sales ingestion process to allow ="Data" fields to be read properly and read txt files disguised as xls files