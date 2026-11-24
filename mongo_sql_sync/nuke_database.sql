-- Drop tables first
-- Drop dependent child tables first
DROP TABLE track_tags;
DROP TABLE track_mechanical_licenses;
DROP TABLE track_mechanical_contracts;
DROP TABLE track_catalogue_groups;
DROP TABLE track_aliases;

DROP TABLE release_track_mechanical_licenses;
DROP TABLE release_track_ids;
DROP TABLE release_mechanical_licenses;
DROP TABLE release_catalogue_groups;
DROP TABLE release_aliases;

DROP TABLE contract_term_escalation_conditions;
DROP TABLE contract_term_escalation_trackers;
DROP TABLE contract_term_escalations;
DROP TABLE contract_terms;
DROP TABLE contract_cross_contracts;
DROP TABLE contract_auto_payment_conditions;
DROP TABLE contract_categories;
DROP TABLE contract_reserves;
DROP TABLE contract_aliases;
DROP TABLE contract_payees;

DROP TABLE catalogue_rights;

-- Drop main entity tables last
DROP TABLE tracks;
DROP TABLE releases;
DROP TABLE contracts;
DROP TABLE input_sales;



-- catalogue_rights
CREATE TABLE catalogue_rights (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  track_id VARCHAR(24),
  release_id VARCHAR(24),
  contract_id VARCHAR(24),
  percentage NUMERIC(18,0),
  display_percentage NUMERIC(18,0),
  right_type VARCHAR(255),
  catalogue_type VARCHAR(255)
);

-- contract_aliases
CREATE TABLE contract_aliases (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  contract_id VARCHAR(24),
  alias VARCHAR(255)
);

-- contract_auto_payment_conditions
CREATE TABLE contract_auto_payment_conditions (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  contract_id VARCHAR(24),
  payment_contract_id VARCHAR(255),
  condition TEXT
);

-- contract_categories
CREATE TABLE contract_categories (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  contract_id VARCHAR(24),
  category VARCHAR(255)
);

-- contract_cross_contracts
CREATE TABLE contract_cross_contracts (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  contract_id VARCHAR(24),
  cross_contract_id VARCHAR(24),
  condition TEXT,
  process TEXT,
  percentage NUMERIC(18,0),
  when_auto_payment_triggered BIT DEFAULT 0
);

-- contract_payees
CREATE TABLE contract_payees (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  contract_id VARCHAR(24),
  payee_id VARCHAR(24),
  percentage NUMERIC(18,0) DEFAULT 100
);

-- contract_reserves
CREATE TABLE contract_reserves (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  contract_id VARCHAR(24),
  contract_name VARCHAR(255),
  rate NUMERIC(18,0)
);

-- contract_term_escalation_conditions
CREATE TABLE contract_term_escalation_conditions (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  escalation_id INT,
  escalation_tracker VARCHAR(255),
  threshold_type VARCHAR(255),
  threshold NVARCHAR(MAX),
  [when] VARCHAR(255)
);

-- contract_term_escalation_trackers
CREATE TABLE contract_term_escalation_trackers (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  term_id INT,
  tracker VARCHAR(255)
);

-- contract_term_escalations
CREATE TABLE contract_term_escalations (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  term_id INT,
  rate NUMERIC(18,0),
  type VARCHAR(255),
  unit_rate NUMERIC(18,0),
  rate_basis VARCHAR(255),
  multiplier NUMERIC(18,0),
  reduction_rate NUMERIC(18,0),
  reserve NUMERIC(18,0)
);

-- contract_terms
CREATE TABLE contract_terms (
  id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  contract_id VARCHAR(24),
  term_type VARCHAR(255),
  contract_name VARCHAR(255),
  cat_type VARCHAR(255),
  catalogue_group VARCHAR(255),
  territory VARCHAR(255),
  channel VARCHAR(255),
  configuration VARCHAR(255),
  price_category VARCHAR(255),
  source VARCHAR(255),
  type VARCHAR(255),
  deduction_type VARCHAR(255),
  deduction_basis VARCHAR(255),
  rate_basis VARCHAR(255) DEFAULT 'US',
  rate NUMERIC(18,0),
  unit_rate NUMERIC(18,0),
  reserve NUMERIC(18,0),
  currency VARCHAR(255),
  multiplier NUMERIC(18,0),
  reduction_rate NUMERIC(18,0)
);

-- contracts
CREATE TABLE contracts (
	id INT IDENTITY(1,1) PRIMARY KEY,
  contract_id VARCHAR(24),
  accounting_period VARCHAR(255),
  active BIT DEFAULT 1,
  advance NUMERIC(18,0),
  auto_payment BIT,
  client_id VARCHAR(24),
  collection_end_date DATE,
  company_id VARCHAR(24),
  complete BIT,
  contract_type VARCHAR(255),
  currency VARCHAR(255) DEFAULT 'Home Currency',
  current_balance NUMERIC(18,0) DEFAULT 0,
  deduct_withholding BIT,
  end_date DATE,
  fees_invoice BIT,
  foreign_id VARCHAR(255),
  license_no VARCHAR(255),
  min_payout NUMERIC(18,0) DEFAULT 0,
  name VARCHAR(255),
  opening_balance NUMERIC(18,0) DEFAULT 0,
  partition_no INT,
  payee_balance_condition VARCHAR(255) DEFAULT 'Never',
  primary_contract BIT,
  profit_share_percentage NUMERIC(18,0) DEFAULT 0,
  project_id VARCHAR(255),
  reserve_basis VARCHAR(255) DEFAULT 'Post-Calculation',
  retention_period_end_date DATE,
  self_billing BIT,
  status VARCHAR(255),
  start_date DATE,
  statement_design VARCHAR(255),
  summary_contract_totals BIT,
  type VARCHAR(255) DEFAULT 'Royalty',
  valid BIT DEFAULT 0,
  sub_client_id INT,
  is_main_sub_client_contract BIT DEFAULT 0
);

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

-- releases
CREATE TABLE releases (
	id INT IDENTITY(1,1) PRIMARY KEY,
  release_id VARCHAR(24),
  client_id VARCHAR(24),
  title VARCHAR(255),
  version VARCHAR(255),
  artist VARCHAR(255),
  foreign_id VARCHAR(255),
  project_id VARCHAR(255),
  cat_no VARCHAR(255),
  barcode VARCHAR(255),
  label VARCHAR(255),
  release_date DATE,
  distribution_channel VARCHAR(255),
  format VARCHAR(255),
  price_category VARCHAR(255),
  dealer_price NUMERIC(18,0),
  mcps_id VARCHAR(255),
  mcps_tv_advertised BIT,
  fuga_id VARCHAR(255),
  all_tracks_contracts BIT,
  contract_validation VARCHAR(255),
  duplicated_from VARCHAR(255),
  mechanical_track_cap NUMERIC(18,0),
  controlled_composition_clause BIT,
  mechanical_basis_percentage NUMERIC(18,0) DEFAULT 100,
  mechanical_licenses VARCHAR(255),
  mechanical_amount VARCHAR(255),
  total_mechanical_amount NUMERIC(18,0),
  total_participation NUMERIC(18,0) DEFAULT 0,
  external_ingestion_id VARCHAR(255),
  spotify_id VARCHAR(255),
  skip_post_save_hook BIT DEFAULT 0,
  skip_pre_save_hook BIT DEFAULT 0,
  created_by_user_id INT,
  last_modified_by_user_id INT,
  valid BIT DEFAULT 0
);

-- release_aliases
CREATE TABLE release_aliases (
  id INT IDENTITY(1,1) PRIMARY KEY,
  release_id VARCHAR(24),
  alias VARCHAR(255)
);

-- release_catalogue_groups
CREATE TABLE release_catalogue_groups (
  id INT IDENTITY(1,1) PRIMARY KEY,
  release_id VARCHAR(24),
  group_name VARCHAR(255)
);

-- release_mechanical_licenses
CREATE TABLE release_mechanical_licenses (
  id INT IDENTITY(1,1) PRIMARY KEY,
  release_id VARCHAR(24) NOT NULL,
  report_mechanicals INT DEFAULT 0 NOT NULL,
  track_id VARCHAR(24) NOT NULL
);

-- release_track_ids
CREATE TABLE release_track_ids (
  id INT IDENTITY(1,1) PRIMARY KEY,
  release_id VARCHAR(24),
  track_id VARCHAR(24)
);

-- release_track_mechanical_licenses
CREATE TABLE release_track_mechanical_licenses (
  id INT IDENTITY(1,1) PRIMARY KEY,
  license_id VARCHAR(24) NOT NULL,
  contract_id VARCHAR(24),
  composer_id VARCHAR(24),
  publisher_id VARCHAR(24),
  license_no VARCHAR(255),
  rate NUMERIC(18,0),
  share NUMERIC(18,0),
  controlled INT
);

-- track_aliases
CREATE TABLE track_aliases (
  id INT IDENTITY(1,1) PRIMARY KEY,
  track_id VARCHAR(24),
  alias VARCHAR(255)
);

-- track_catalogue_groups
CREATE TABLE track_catalogue_groups (
  id INT IDENTITY(1,1) PRIMARY KEY,
  track_id VARCHAR(24),
  group_name VARCHAR(255)
);

-- track_mechanical_contracts
CREATE TABLE track_mechanical_contracts (
  id INT IDENTITY(1,1) PRIMARY KEY,
  track_id VARCHAR(24),
  contract_id VARCHAR(24)
);

-- track_mechanical_licenses
CREATE TABLE track_mechanical_licenses (
  id INT IDENTITY(1,1) PRIMARY KEY,
  track_id VARCHAR(24) NOT NULL,
  contract_id VARCHAR(24),
  composer_id VARCHAR(24),
  publisher_id VARCHAR(24),
  license_no VARCHAR(255),
  rate NUMERIC(18,0),
  share NUMERIC(18,0)
);

-- track_tags
CREATE TABLE track_tags (
  id INT IDENTITY(1,1) PRIMARY KEY,
  track_id VARCHAR(24),
  tag VARCHAR(255)
);

-- tracks
CREATE TABLE tracks (
	id INT IDENTITY(1,1) PRIMARY KEY,
  track_id VARCHAR(24),
  client_id VARCHAR(24),
  title VARCHAR(255),
  version VARCHAR(255),
  artist VARCHAR(255),
  foreign_id VARCHAR(255),
  project_id VARCHAR(255),
  isrc VARCHAR(255),
  label VARCHAR(255),
  p_line VARCHAR(255),
  fuga_id VARCHAR(255),
  default_release_id VARCHAR(255),
  contract_validation VARCHAR(255),
  duplicated_from VARCHAR(255),
  duration NUMERIC(18,0),
  statutory_rate NUMERIC(18,0),
  canadian_statutory_rate NUMERIC(18,0),
  report_mechanicals BIT DEFAULT 1,
  total_participation NUMERIC(18,0) DEFAULT 0,
  mechanical_calculation_basis VARCHAR(255) DEFAULT 'Custom',
  external_ingestion_id VARCHAR(255),
  spotify_id VARCHAR(255),
  skip_post_save_hook BIT DEFAULT 0,
  skip_pre_save_hook BIT DEFAULT 0,
  created_by_user_id INT,
  last_modified_by_user_id INT,
  valid BIT DEFAULT 0
);









