-- @block
SELECT contracts.id, name, accounting_period, term_type, cat_type
FROM contracts
LEFT JOIN contract_terms
	ON contracts.id = contract_terms.contract_id

-- @block
-- Get total contracts
SELECT COUNT(*) as TotalContract
FROM contracts

-- @block
SELECT name FROM contracts 

-- @block

CREATE TABLE input_sales (
  id VARCHAR(255) PRIMARY KEY,
  salesFileId VARCHAR(255),
  ignore VARCHAR(255),
  status VARCHAR(255),
  catType VARCHAR(255),
  releaseId VARCHAR(255),
  trackId VARCHAR(255),
  workId VARCHAR(255),
  contractId VARCHAR(255),
  distributionChannel VARCHAR(255),
  configuration VARCHAR(255),
  priceCategory VARCHAR(255),
  territory VARCHAR(255),
  originalDistributionChannel VARCHAR(255),
  originalConfiguration VARCHAR(255),
  originalPriceCategory VARCHAR(255),
  originalReleaseTitle VARCHAR(255),
  originalReleaseArtist VARCHAR(255),
  originalTrackTitle VARCHAR(255),
  originalTrackArtist VARCHAR(255),
  catNo VARCHAR(255),
  barcode VARCHAR(255),
  isrc VARCHAR(255),
  originalWorkTitle VARCHAR(255),
  originalComposers VARCHAR(255),
  originalIdentifier VARCHAR(255),
  iswc VARCHAR(255),
  tunecode VARCHAR(255),
  songCode VARCHAR(255),
  contractIdentifier VARCHAR(255),
  titleMapper VARCHAR(255),
  originalTerritory VARCHAR(255),
  saleDate DATE,
  transactionDate DATE,
  source VARCHAR(255),
  subSource VARCHAR(255),
  description VARCHAR(255),
  multiplier FLOAT,
  units FLOAT,
  sharePercentage FLOAT,
  returnUnits FLOAT,
  salePrice FLOAT,
  originalCurrency VARCHAR(255),
  positiveNegative VARCHAR(255),
  exchangeRate FLOAT,
  grossAmount FLOAT,
  netAmount FLOAT,
  discountAmount FLOAT,
  mechanicalAtSource FLOAT,
  returnGrossAmount FLOAT,
  returnNetAmount FLOAT,
  perUnitRate FLOAT,
  retailPrice FLOAT,
  homeCurrencyGrossAmount FLOAT,
  homeCurrencyNetAmount FLOAT,
  homeCurrencyDiscountAmount FLOAT,
  homeCurrencyMechanicalAtSource FLOAT,
  homeCurrencyReturnGrossAmount FLOAT,
  homeCurrencyReturnNetAmount FLOAT,
  homeCurrencyPerUnitRate FLOAT,
  homeCurrencyRetailPrice FLOAT,
  currency2ExchangeRate FLOAT,
  currency2GrossAmount FLOAT,
  currency2NetAmount FLOAT,
  currency2DiscountAmount FLOAT,
  currency2MechanicalAtSource FLOAT,
  currency2ReturnGrossAmount FLOAT,
  currency2ReturnNetAmount FLOAT,
  currency2PerUnitRate FLOAT,
  currency2RetailPrice FLOAT,
  currency3ExchangeRate FLOAT,
  currency3GrossAmount FLOAT,
  currency3NetAmount FLOAT,
  currency3DiscountAmount FLOAT,
  currency3MechanicalAtSource FLOAT,
  currency3ReturnGrossAmount FLOAT,
  currency3ReturnNetAmount FLOAT,
  currency3PerUnitRate FLOAT,
  currency3RetailPrice FLOAT,
  currency4ExchangeRate FLOAT,
  currency4GrossAmount FLOAT,
  currency4NetAmount FLOAT,
  currency4DiscountAmount FLOAT,
  currency4MechanicalAtSource FLOAT,
  currency4ReturnGrossAmount FLOAT,
  currency4ReturnNetAmount FLOAT,
  currency4PerUnitRate FLOAT,
  currency4RetailPrice FLOAT,
  originalPositiveNegative VARCHAR(255),
  duration VARCHAR(255),
  temp1 VARCHAR(255),
  temp2 VARCHAR(255),
  temp3 VARCHAR(255),
  temp4 VARCHAR(255),
  temp5 VARCHAR(255),
  production VARCHAR(255),
  episode VARCHAR(255),
  dateFrom DATE,
  dateTo DATE,
  party1 VARCHAR(255),
  party2 VARCHAR(255),
  party3 VARCHAR(255),
  party4 VARCHAR(255),
  party5 VARCHAR(255),
  catalogueReleaseTitle VARCHAR(255),
  catalogueReleaseVersion VARCHAR(255),
  catalogueReleaseArtist VARCHAR(255),
  catalogueReleaseLabel VARCHAR(255),
  catalogueCatNo VARCHAR(255),
  catalogueReleaseForeignId VARCHAR(255),
  catalogueBarcode VARCHAR(255),
  ppd FLOAT,
  proRataAmount FLOAT,
  priceCategoryDealerPrices VARCHAR(MAX),  -- REPEATED field as comma-separated string
  catalogueFormat VARCHAR(255),
  mechanicalBasisPercentage FLOAT,
  totalMechanicalAmount FLOAT,
  catalogueTrackTitle VARCHAR(255),
  catalogueTrackVersion VARCHAR(255),
  catalogueTrackArtist VARCHAR(255),
  catalogueTrackLabel VARCHAR(255),
  catalogueIsrc VARCHAR(255),
  catalogueTrackForeignId VARCHAR(255),
  mechanicalRate FLOAT,
  catalogueWorkTitle VARCHAR(255),
  catalogueWorkComposer VARCHAR(255),
  catalogueIdentifier VARCHAR(255),
  catalogueWorkForeignId VARCHAR(255),
  catalogueIswc VARCHAR(255),
  catalogueTunecode VARCHAR(255),
  catalogueContractIds VARCHAR(MAX),
  partitionNo INT,
  homeCurrencySalePrice FLOAT,
  currency2SalePrice FLOAT,
  currency3SalePrice FLOAT,
  currency4SalePrice FLOAT
);

-- @block
-- Delete contracts data
DELETE FROM contract_term_escalation_conditions;
DELETE FROM contract_term_escalations;
DELETE FROM contract_term_escalation_trackers;
DELETE FROM contract_terms;
DELETE FROM contract_cross_contracts;
DELETE FROM contract_auto_payment_conditions;
DELETE FROM contract_categories;
DELETE FROM contract_reserves;
DELETE FROM contract_aliases;
DELETE FROM contract_payees;
DELETE FROM contracts;

-- @block
-- Delete releases data
DELETE FROM release_track_mechanical_licenses;
DELETE FROM release_mechanical_licenses;
DELETE FROM release_catalogue_groups;
DELETE FROM release_aliases;
DELETE FROM release_track_ids;
DELETE FROM catalogue_rights WHERE catalogue_type = 'release';
DELETE FROM releases;

-- @block
-- Delete tracks data
DELETE FROM track_tags;
DELETE FROM track_mechanical_contracts;
DELETE FROM track_catalogue_groups;
DELETE FROM track_aliases;
DELETE FROM track_mechanical_licenses;
DELETE FROM catalogue_rights WHERE catalogue_type = 'track';
DELETE FROM tracks;

-- @block
-- Delete sales data
DELETE FROM input_sales;

-- @block
-- Clear sales table
DROP TABLE input_sales;

-- input_sales
CREATE TABLE input_sales (
	id INT IDENTITY(1,1) PRIMARY KEY,
  sales_line_id VARCHAR(255),
  salesFileId VARCHAR(255),
  ignore VARCHAR(255),
  status VARCHAR(255),
  catType VARCHAR(255),
  releaseId VARCHAR(255),
  trackId VARCHAR(255),
  workId VARCHAR(255),
  contractId VARCHAR(255),
  distributionChannel VARCHAR(255),
  configuration VARCHAR(255),
  priceCategory VARCHAR(255),
  territory VARCHAR(255),
  originalDistributionChannel VARCHAR(255),
  originalConfiguration VARCHAR(255),
  originalPriceCategory VARCHAR(255),
  originalReleaseTitle VARCHAR(255),
  originalReleaseArtist VARCHAR(255),
  originalTrackTitle VARCHAR(255),
  originalTrackArtist VARCHAR(255),
  catNo VARCHAR(255),
  barcode VARCHAR(255),
  isrc VARCHAR(255),
  originalWorkTitle VARCHAR(255),
  originalComposers VARCHAR(255),
  originalIdentifier VARCHAR(255),
  iswc VARCHAR(255),
  tunecode VARCHAR(255),
  songCode VARCHAR(255),
  contractIdentifier VARCHAR(255),
  titleMapper VARCHAR(255),
  originalTerritory VARCHAR(255),
  saleDate DATE,
  transactionDate DATE,
  source VARCHAR(255),
  subSource VARCHAR(255),
  description VARCHAR(255),
  multiplier FLOAT,
  units FLOAT,
  sharePercentage FLOAT,
  returnUnits FLOAT,
  salePrice FLOAT,
  originalCurrency VARCHAR(255),
  positiveNegative VARCHAR(255),
  exchangeRate FLOAT,
  grossAmount FLOAT,
  netAmount FLOAT,
  discountAmount FLOAT,
  mechanicalAtSource FLOAT,
  returnGrossAmount FLOAT,
  returnNetAmount FLOAT,
  perUnitRate FLOAT,
  retailPrice FLOAT,
  homeCurrencyGrossAmount FLOAT,
  homeCurrencyNetAmount FLOAT,
  homeCurrencyDiscountAmount FLOAT,
  homeCurrencyMechanicalAtSource FLOAT,
  homeCurrencyReturnGrossAmount FLOAT,
  homeCurrencyReturnNetAmount FLOAT,
  homeCurrencyPerUnitRate FLOAT,
  homeCurrencyRetailPrice FLOAT,
  currency2ExchangeRate FLOAT,
  currency2GrossAmount FLOAT,
  currency2NetAmount FLOAT,
  currency2DiscountAmount FLOAT,
  currency2MechanicalAtSource FLOAT,
  currency2ReturnGrossAmount FLOAT,
  currency2ReturnNetAmount FLOAT,
  currency2PerUnitRate FLOAT,
  currency2RetailPrice FLOAT,
  currency3ExchangeRate FLOAT,
  currency3GrossAmount FLOAT,
  currency3NetAmount FLOAT,
  currency3DiscountAmount FLOAT,
  currency3MechanicalAtSource FLOAT,
  currency3ReturnGrossAmount FLOAT,
  currency3ReturnNetAmount FLOAT,
  currency3PerUnitRate FLOAT,
  currency3RetailPrice FLOAT,
  currency4ExchangeRate FLOAT,
  currency4GrossAmount FLOAT,
  currency4NetAmount FLOAT,
  currency4DiscountAmount FLOAT,
  currency4MechanicalAtSource FLOAT,
  currency4ReturnGrossAmount FLOAT,
  currency4ReturnNetAmount FLOAT,
  currency4PerUnitRate FLOAT,
  currency4RetailPrice FLOAT,
  originalPositiveNegative VARCHAR(255),
  duration VARCHAR(255),
  temp1 VARCHAR(255),
  temp2 VARCHAR(255),
  temp3 VARCHAR(255),
  temp4 VARCHAR(255),
  temp5 VARCHAR(255),
  production VARCHAR(255),
  episode VARCHAR(255),
  dateFrom DATE,
  dateTo DATE,
  party1 VARCHAR(255),
  party2 VARCHAR(255),
  party3 VARCHAR(255),
  party4 VARCHAR(255),
  party5 VARCHAR(255),
  catalogueReleaseTitle VARCHAR(255),
  catalogueReleaseVersion VARCHAR(255),
  catalogueReleaseArtist VARCHAR(255),
  catalogueReleaseLabel VARCHAR(255),
  catalogueCatNo VARCHAR(255),
  catalogueReleaseForeignId VARCHAR(255),
  catalogueBarcode VARCHAR(255),
  ppd FLOAT,
  proRataAmount FLOAT,
  priceCategoryDealerPrices VARCHAR(MAX),
  catalogueFormat VARCHAR(255),
  mechanicalBasisPercentage FLOAT,
  totalMechanicalAmount FLOAT,
  catalogueTrackTitle VARCHAR(255),
  catalogueTrackVersion VARCHAR(255),
  catalogueTrackArtist VARCHAR(255),
  catalogueTrackLabel VARCHAR(255),
  catalogueIsrc VARCHAR(255),
  catalogueTrackForeignId VARCHAR(255),
  mechanicalRate FLOAT,
  catalogueWorkTitle VARCHAR(255),
  catalogueWorkComposer VARCHAR(255),
  catalogueIdentifier VARCHAR(255),
  catalogueWorkForeignId VARCHAR(255),
  catalogueIswc VARCHAR(255),
  catalogueTunecode VARCHAR(255),
  catalogueContractIds VARCHAR(MAX),
  partitionNo INT,
  homeCurrencySalePrice FLOAT,
  currency2SalePrice FLOAT,
  currency3SalePrice FLOAT,
  currency4SalePrice FLOAT
);