/**
 * @module salesTemplate
 */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { SalesTemplate: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');
const async = require('async');
const Client = require('./client');
const MappingsForIngestion = require('../libs/mappingsForIngestion');

/**
 * salesTemplateSchema schema
 * @constructor salesTemplateSchema
 */
const salesTemplateSchema = schema;

salesTemplateSchema.plugin(mongoosePaginate);

/**
 * Returns Standard Territory Mappings
 *
 * @method
 * @returns {object} Standard Territory Mappings
 */
salesTemplateSchema.statics.getStandardTerritoryMappings = function () {
  return [
    // Standard Set of ISO2 Codes
    { name: 'WW', map: 'WW' },
    { name: 'DZ', map: 'DZ' },
    { name: 'AO', map: 'AO' }, { name: 'BJ', map: 'BJ' }, { name: 'BW', map: 'BW' }, { name: 'BF', map: 'BF' }, { name: 'BI', map: 'BI' }, { name: 'CM', map: 'CM' }, { name: 'CV', map: 'CV' }, { name: 'CF', map: 'CF' }, { name: 'TD', map: 'TD' }, { name: 'KM', map: 'KM' }, { name: 'CG', map: 'CG' }, { name: 'CD', map: 'CD' }, { name: 'CI', map: 'CI' }, { name: 'DJ', map: 'DJ' }, { name: 'EG', map: 'EG' }, { name: 'GQ', map: 'GQ' }, { name: 'ER', map: 'ER' }, { name: 'ET', map: 'ET' }, { name: 'GA', map: 'GA' }, { name: 'GM', map: 'GM' }, { name: 'GH', map: 'GH' }, { name: 'GN', map: 'GN' }, { name: 'GW', map: 'GW' }, { name: 'KE', map: 'KE' }, { name: 'LS', map: 'LS' }, { name: 'LR', map: 'LR' }, { name: 'LY', map: 'LY' }, { name: 'MG', map: 'MG' }, { name: 'MW', map: 'MW' }, { name: 'ML', map: 'ML' }, { name: 'MR', map: 'MR' }, { name: 'MU', map: 'MU' }, { name: 'YT', map: 'YT' }, { name: 'MA', map: 'MA' }, { name: 'MZ', map: 'MZ' }, { name: 'NA', map: 'NA' }, { name: 'NE', map: 'NE' }, { name: 'NG', map: 'NG' }, { name: 'RE', map: 'RE' }, { name: 'RW', map: 'RW' }, { name: 'SH', map: 'SH' }, { name: 'ST', map: 'ST' }, { name: 'SN', map: 'SN' }, { name: 'SC', map: 'SC' }, { name: 'SL', map: 'SL' }, { name: 'SO', map: 'SO' }, { name: 'ZA', map: 'ZA' }, { name: 'SS', map: 'SS' }, { name: 'SD', map: 'SD' }, { name: 'SZ', map: 'SZ' }, { name: 'TZ', map: 'TZ' }, { name: 'TG', map: 'TG' }, { name: 'TN', map: 'TN' }, { name: 'UG', map: 'UG' }, { name: 'EH', map: 'EH' }, { name: 'ZM', map: 'ZM' }, { name: 'ZW', map: 'ZW' }, { name: 'AW', map: 'AW' }, { name: 'AI', map: 'AI' }, { name: 'AG', map: 'AG' }, { name: 'AR', map: 'AR' }, { name: 'BS', map: 'BS' }, { name: 'BB', map: 'BB' }, { name: 'BZ', map: 'BZ' }, { name: 'BM', map: 'BM' }, { name: 'BO', map: 'BO' }, { name: 'BR', map: 'BR' }, { name: 'VG', map: 'VG' }, { name: 'CA', map: 'CA' }, { name: 'KY', map: 'KY' }, { name: 'CL', map: 'CL' }, { name: 'CO', map: 'CO' }, { name: 'CR', map: 'CR' }, { name: 'CU', map: 'CU' }, { name: 'DM', map: 'DM' }, { name: 'DO', map: 'DO' }, { name: 'EC', map: 'EC' }, { name: 'SV', map: 'SV' }, { name: 'FK', map: 'FK' }, { name: 'GF', map: 'GF' }, { name: 'GL', map: 'GL' }, { name: 'GD', map: 'GD' }, { name: 'GP', map: 'GP' }, { name: 'GT', map: 'GT' }, { name: 'GY', map: 'GY' }, { name: 'HT', map: 'HT' }, { name: 'HN', map: 'HN' }, { name: 'JM', map: 'JM' }, { name: 'MQ', map: 'MQ' }, { name: 'MX', map: 'MX' }, { name: 'MS', map: 'MS' }, { name: 'AN', map: 'AN' }, { name: 'NI', map: 'NI' }, { name: 'PA', map: 'PA' }, { name: 'PY', map: 'PY' }, { name: 'PE', map: 'PE' }, { name: 'PR', map: 'PR' }, { name: 'BL', map: 'BL' }, { name: 'KN', map: 'KN' }, { name: 'LC', map: 'LC' }, { name: 'MF', map: 'MF' }, { name: 'PM', map: 'PM' }, { name: 'VC', map: 'VC' }, { name: 'SR', map: 'SR' }, { name: 'TT', map: 'TT' }, { name: 'TC', map: 'TC' }, { name: 'US', map: 'US' }, { name: 'UY', map: 'UY' }, { name: 'VE', map: 'VE' }, { name: 'VI', map: 'VI' }, { name: 'AF', map: 'AF' }, { name: 'AM', map: 'AM' }, { name: 'AZ', map: 'AZ' }, { name: 'BH', map: 'BH' }, { name: 'BD', map: 'BD' }, { name: 'BT', map: 'BT' }, { name: 'BN', map: 'BN' }, { name: 'KH', map: 'KH' }, { name: 'CN', map: 'CN' }, { name: 'GE', map: 'GE' }, { name: 'HK', map: 'HK' }, { name: 'IN', map: 'IN' }, { name: 'ID', map: 'ID' }, { name: 'IR', map: 'IR' }, { name: 'IQ', map: 'IQ' }, { name: 'IL', map: 'IL' }, { name: 'JP', map: 'JP' }, { name: 'JO', map: 'JO' }, { name: 'KZ', map: 'KZ' }, { name: 'KP', map: 'KP' }, { name: 'KR', map: 'KR' }, { name: 'KW', map: 'KW' }, { name: 'KG', map: 'KG' }, { name: 'LA', map: 'LA' }, { name: 'LB', map: 'LB' }, { name: 'MO', map: 'MO' }, { name: 'MY', map: 'MY' }, { name: 'MV', map: 'MV' }, { name: 'MN', map: 'MN' }, { name: 'MM', map: 'MM' }, { name: 'NP', map: 'NP' }, { name: 'OM', map: 'OM' }, { name: 'PK', map: 'PK' }, { name: 'PS', map: 'PS' }, { name: 'PH', map: 'PH' }, { name: 'QA', map: 'QA' }, { name: 'SA', map: 'SA' }, { name: 'SG', map: 'SG' }, { name: 'LK', map: 'LK' }, { name: 'SY', map: 'SY' }, { name: 'TW', map: 'TW' }, { name: 'TJ', map: 'TJ' }, { name: 'TH', map: 'TH' }, { name: 'TL', map: 'TL' }, { name: 'TR', map: 'TR' }, { name: 'TM', map: 'TM' }, { name: 'AE', map: 'AE' }, { name: 'UZ', map: 'UZ' }, { name: 'VN', map: 'VN' }, { name: 'YE', map: 'YE' }, { name: 'AL', map: 'AL' }, { name: 'AD', map: 'AD' }, { name: 'AT', map: 'AT' }, { name: 'BY', map: 'BY' }, { name: 'BE', map: 'BE' }, { name: 'BA', map: 'BA' }, { name: 'BG', map: 'BG' }, { name: 'HR', map: 'HR' }, { name: 'CY', map: 'CY' }, { name: 'CZ', map: 'CZ' }, { name: 'DK', map: 'DK' }, { name: 'EE', map: 'EE' }, { name: 'FO', map: 'FO' }, { name: 'FI', map: 'FI' }, { name: 'FR', map: 'FR' }, { name: 'DE', map: 'DE' }, { name: 'GI', map: 'GI' }, { name: 'GR', map: 'GR' }, { name: 'GG', map: 'GG' }, { name: 'VA', map: 'VA' }, { name: 'HU', map: 'HU' }, { name: 'IS', map: 'IS' }, { name: 'IE', map: 'IE' }, { name: 'IM', map: 'IM' }, { name: 'IT', map: 'IT' }, { name: 'JE', map: 'JE' }, { name: 'LV', map: 'LV' }, { name: 'LI', map: 'LI' }, { name: 'LT', map: 'LT' }, { name: 'LU', map: 'LU' }, { name: 'MK', map: 'MK' }, { name: 'MT', map: 'MT' }, { name: 'MD', map: 'MD' }, { name: 'MC', map: 'MC' }, { name: 'ME', map: 'ME' }, { name: 'XK', map: 'XK' }, { name: 'NL', map: 'NL' }, { name: 'NO', map: 'NO' }, { name: 'PL', map: 'PL' }, { name: 'PT', map: 'PT' }, { name: 'RO', map: 'RO' }, { name: 'RU', map: 'RU' }, { name: 'SM', map: 'SM' }, { name: 'RS', map: 'RS' }, { name: 'SK', map: 'SK' }, { name: 'SI', map: 'SI' }, { name: 'ES', map: 'ES' }, { name: 'SJ', map: 'SJ' }, { name: 'SE', map: 'SE' }, { name: 'CH', map: 'CH' }, { name: 'UA', map: 'UA' }, { name: 'GB', map: 'GB' }, { name: 'AX', map: 'AX' }, { name: 'AS', map: 'AS' }, { name: 'AQ', map: 'AQ' }, { name: 'AU', map: 'AU' }, { name: 'BV', map: 'BV' }, { name: 'IO', map: 'IO' }, { name: 'CX', map: 'CX' }, { name: 'CC', map: 'CC' }, { name: 'CK', map: 'CK' }, { name: 'FJ', map: 'FJ' }, { name: 'PF', map: 'PF' }, { name: 'TF', map: 'TF' }, { name: 'GU', map: 'GU' }, { name: 'HM', map: 'HM' }, { name: 'KI', map: 'KI' }, { name: 'MH', map: 'MH' }, { name: 'FM', map: 'FM' }, { name: 'NR', map: 'NR' }, { name: 'NC', map: 'NC' }, { name: 'NZ', map: 'NZ' }, { name: 'NU', map: 'NU' }, { name: 'NF', map: 'NF' }, { name: 'MP', map: 'MP' }, { name: 'PW', map: 'PW' }, { name: 'PG', map: 'PG' }, { name: 'PN', map: 'PN' }, { name: 'SB', map: 'SB' }, { name: 'GS', map: 'GS' }, { name: 'TK', map: 'TK' }, { name: 'TO', map: 'TO' }, { name: 'TV', map: 'TV' }, { name: 'UM', map: 'UM' }, { name: 'VU', map: 'VU' }, { name: 'WF', map: 'WF' }, { name: 'WS', map: 'WS' }, { name: 'SX', map: 'SX' }, { name: 'BQ', map: 'BQ' }, { name: 'CW', map: 'CW' },
    // ISO3 Mappings
    { name: 'AF', map: 'AFG' }, { name: 'AX', map: 'ALA' }, { name: 'AL', map: 'ALB' }, { name: 'DZ', map: 'DZA' }, { name: 'AS', map: 'ASM' }, { name: 'AD', map: 'AND' }, { name: 'AO', map: 'AGO' }, { name: 'AI', map: 'AIA' }, { name: 'AQ', map: 'ATA' }, { name: 'AG', map: 'ATG' }, { name: 'AR', map: 'ARG' }, { name: 'AM', map: 'ARM' }, { name: 'AW', map: 'ABW' }, { name: 'AU', map: 'AUS' }, { name: 'AT', map: 'AUT' }, { name: 'AZ', map: 'AZE' }, { name: 'BS', map: 'BHS' }, { name: 'BH', map: 'BHR' }, { name: 'BD', map: 'BGD' }, { name: 'BB', map: 'BRB' }, { name: 'BY', map: 'BLR' }, { name: 'BE', map: 'BEL' }, { name: 'BZ', map: 'BLZ' }, { name: 'BJ', map: 'BEN' }, { name: 'BM', map: 'BMU' }, { name: 'BT', map: 'BTN' }, { name: 'BO', map: 'BOL' }, { name: 'BA', map: 'BIH' }, { name: 'BW', map: 'BWA' }, { name: 'BV', map: 'BVT' }, { name: 'BR', map: 'BRA' }, { name: 'IO', map: 'IOT' }, { name: 'BN', map: 'BRN' }, { name: 'BG', map: 'BGR' }, { name: 'BF', map: 'BFA' }, { name: 'BI', map: 'BDI' }, { name: 'KH', map: 'KHM' }, { name: 'CM', map: 'CMR' }, { name: 'CA', map: 'CAN' }, { name: 'CV', map: 'CPV' }, { name: 'KY', map: 'CYM' }, { name: 'CF', map: 'CAF' }, { name: 'TD', map: 'TCD' }, { name: 'CL', map: 'CHL' }, { name: 'CN', map: 'CHN' }, { name: 'CX', map: 'CXR' }, { name: 'CC', map: 'CCK' }, { name: 'CO', map: 'COL' }, { name: 'KM', map: 'COM' }, { name: 'CG', map: 'COG' }, { name: 'CD', map: 'COD' }, { name: 'CK', map: 'COK' }, { name: 'CR', map: 'CRI' }, { name: 'CI', map: 'CIV' }, { name: 'HR', map: 'HRV' }, { name: 'CU', map: 'CUB' }, { name: 'CY', map: 'CYP' }, { name: 'CZ', map: 'CZE' }, { name: 'DK', map: 'DNK' }, { name: 'DJ', map: 'DJI' }, { name: 'DM', map: 'DMA' }, { name: 'DO', map: 'DOM' }, { name: 'EC', map: 'ECU' }, { name: 'EG', map: 'EGY' }, { name: 'SV', map: 'SLV' }, { name: 'GQ', map: 'GNQ' }, { name: 'ER', map: 'ERI' }, { name: 'EE', map: 'EST' }, { name: 'ET', map: 'ETH' }, { name: 'FK', map: 'FLK' }, { name: 'FO', map: 'FRO' }, { name: 'FJ', map: 'FJI' }, { name: 'FI', map: 'FIN' }, { name: 'FR', map: 'FRA' }, { name: 'GF', map: 'GUF' }, { name: 'PF', map: 'PYF' }, { name: 'TF', map: 'ATF' }, { name: 'GA', map: 'GAB' }, { name: 'GM', map: 'GMB' }, { name: 'GE', map: 'GEO' }, { name: 'DE', map: 'DEU' }, { name: 'GH', map: 'GHA' }, { name: 'GI', map: 'GIB' }, { name: 'GR', map: 'GRC' }, { name: 'GL', map: 'GRL' }, { name: 'GD', map: 'GRD' }, { name: 'GP', map: 'GLP' }, { name: 'GU', map: 'GUM' }, { name: 'GT', map: 'GTM' }, { name: 'GG', map: 'GGY' }, { name: 'GN', map: 'GIN' }, { name: 'GW', map: 'GNB' }, { name: 'GY', map: 'GUY' }, { name: 'HT', map: 'HTI' }, { name: 'HM', map: 'HMD' }, { name: 'VA', map: 'VAT' }, { name: 'HN', map: 'HND' }, { name: 'HK', map: 'HKG' }, { name: 'HU', map: 'HUN' }, { name: 'IS', map: 'ISL' }, { name: 'IN', map: 'IND' }, { name: 'ID', map: 'IDN' }, { name: 'IR', map: 'IRN' }, { name: 'IQ', map: 'IRQ' }, { name: 'IE', map: 'IRL' }, { name: 'IM', map: 'IMN' }, { name: 'IL', map: 'ISR' }, { name: 'IT', map: 'ITA' }, { name: 'JM', map: 'JAM' }, { name: 'JP', map: 'JPN' }, { name: 'JE', map: 'JEY' }, { name: 'JO', map: 'JOR' }, { name: 'KZ', map: 'KAZ' }, { name: 'KE', map: 'KEN' }, { name: 'KI', map: 'KIR' }, { name: 'KP', map: 'PRK' }, { name: 'KR', map: 'KOR' }, { name: 'KW', map: 'KWT' }, { name: 'KG', map: 'KGZ' }, { name: 'LA', map: 'LAO' }, { name: 'LV', map: 'LVA' }, { name: 'LB', map: 'LBN' }, { name: 'LS', map: 'LSO' }, { name: 'LR', map: 'LBR' }, { name: 'LY', map: 'LBY' }, { name: 'LI', map: 'LIE' }, { name: 'LT', map: 'LTU' }, { name: 'LU', map: 'LUX' }, { name: 'MO', map: 'MAC' }, { name: 'MK', map: 'MKD' }, { name: 'MG', map: 'MDG' }, { name: 'MW', map: 'MWI' }, { name: 'MY', map: 'MYS' }, { name: 'MV', map: 'MDV' }, { name: 'ML', map: 'MLI' }, { name: 'MT', map: 'MLT' }, { name: 'MH', map: 'MHL' }, { name: 'MQ', map: 'MTQ' }, { name: 'MR', map: 'MRT' }, { name: 'MU', map: 'MUS' }, { name: 'YT', map: 'MYT' }, { name: 'MX', map: 'MEX' }, { name: 'FM', map: 'FSM' }, { name: 'MD', map: 'MDA' }, { name: 'MC', map: 'MCO' }, { name: 'MN', map: 'MNG' }, { name: 'ME', map: 'MNE' }, { name: 'XK', map: 'XKX' }, { name: 'MS', map: 'MSR' }, { name: 'MA', map: 'MAR' }, { name: 'MZ', map: 'MOZ' }, { name: 'MM', map: 'MMR' }, { name: 'NA', map: 'NAM' }, { name: 'NR', map: 'NRU' }, { name: 'NP', map: 'NPL' }, { name: 'NL', map: 'NLD' }, { name: 'AN', map: 'ANT' }, { name: 'NC', map: 'NCL' }, { name: 'NZ', map: 'NZL' }, { name: 'NI', map: 'NIC' }, { name: 'NE', map: 'NER' }, { name: 'NG', map: 'NGA' }, { name: 'NU', map: 'NIU' }, { name: 'NF', map: 'NFK' }, { name: 'MP', map: 'MNP' }, { name: 'NO', map: 'NOR' }, { name: 'OM', map: 'OMN' }, { name: 'PK', map: 'PAK' }, { name: 'PW', map: 'PLW' }, { name: 'PS', map: 'PSE' }, { name: 'PA', map: 'PAN' }, { name: 'PG', map: 'PNG' }, { name: 'PY', map: 'PRY' }, { name: 'PE', map: 'PER' }, { name: 'PH', map: 'PHL' }, { name: 'PN', map: 'PCN' }, { name: 'PL', map: 'POL' }, { name: 'PT', map: 'PRT' }, { name: 'PR', map: 'PRI' }, { name: 'QA', map: 'QAT' }, { name: 'RE', map: 'REU' }, { name: 'RO', map: 'ROU' }, { name: 'RU', map: 'RUS' }, { name: 'RW', map: 'RWA' }, { name: 'BL', map: 'BLM' }, { name: 'SH', map: 'SHN' }, { name: 'KN', map: 'KNA' }, { name: 'LC', map: 'LCA' }, { name: 'MF', map: 'MAF' }, { name: 'PM', map: 'SPM' }, { name: 'VC', map: 'VCT' }, { name: 'WS', map: 'WSM' }, { name: 'SM', map: 'SMR' }, { name: 'ST', map: 'STP' }, { name: 'SA', map: 'SAU' }, { name: 'SN', map: 'SEN' }, { name: 'RS', map: 'SRB' }, { name: 'SC', map: 'SYC' }, { name: 'SL', map: 'SLE' }, { name: 'SG', map: 'SGP' }, { name: 'SK', map: 'SVK' }, { name: 'SI', map: 'SVN' }, { name: 'SB', map: 'SLB' }, { name: 'SO', map: 'SOM' }, { name: 'ZA', map: 'ZAF' }, { name: 'GS', map: 'SGS' }, { name: 'ES', map: 'ESP' }, { name: 'LK', map: 'LKA' }, { name: 'SD', map: 'SDN' }, { name: 'SR', map: 'SUR' }, { name: 'SJ', map: 'SJM' }, { name: 'SZ', map: 'SWZ' }, { name: 'SE', map: 'SWE' }, { name: 'CH', map: 'CHE' }, { name: 'SY', map: 'SYR' }, { name: 'TW', map: 'TWN' }, { name: 'TJ', map: 'TJK' }, { name: 'TZ', map: 'TZA' }, { name: 'TH', map: 'THA' }, { name: 'TL', map: 'TLS' }, { name: 'TG', map: 'TGO' }, { name: 'TK', map: 'TKL' }, { name: 'TO', map: 'TON' }, { name: 'TT', map: 'TTO' }, { name: 'TN', map: 'TUN' }, { name: 'TR', map: 'TUR' }, { name: 'TM', map: 'TKM' }, { name: 'TC', map: 'TCA' }, { name: 'TV', map: 'TUV' }, { name: 'UG', map: 'UGA' }, { name: 'UA', map: 'UKR' }, { name: 'AE', map: 'ARE' }, { name: 'GB', map: 'GBR' }, { name: 'US', map: 'USA' }, { name: 'UM', map: 'UMI' }, { name: 'UY', map: 'URY' }, { name: 'UZ', map: 'UZB' }, { name: 'VU', map: 'VUT' }, { name: 'VE', map: 'VEN' }, { name: 'VN', map: 'VNM' }, { name: 'VG', map: 'VGB' }, { name: 'VI', map: 'VIR' }, { name: 'WF', map: 'WLF' }, { name: 'EH', map: 'ESH' }, { name: 'YE', map: 'YEM' }, { name: 'ZM', map: 'ZMB' }, { name: 'ZW', map: 'ZWE' }, { name: 'SX', map: 'SXM' }, { name: 'BQ', map: 'BES' }, { name: 'CW', map: 'CUW' },
    // Name Mappings
    { map: 'Algeria', name: 'DZ' }, { map: 'Angola', name: 'AO' }, { map: 'Benin', name: 'BJ' }, { map: 'Botswana', name: 'BW' }, { map: 'Burkina Faso', name: 'BF' }, { map: 'Burundi', name: 'BI' }, { map: 'Cameroon', name: 'CM' }, { map: 'Cape Verde', name: 'CV' }, { map: 'Central African Republic', name: 'CF' }, { map: 'Chad', name: 'TD' }, { map: 'Comoros', name: 'KM' }, { map: 'Congo, Republic of the', name: 'CG' }, { map: 'Congo, The Democratic Republic Of The', name: 'CD' }, { map: "Cote d'Ivoire", name: 'CI' }, { map: 'Djibouti', name: 'DJ' }, { map: 'Egypt', name: 'EG' }, { map: 'Equatorial Guinea', name: 'GQ' }, { map: 'Eritrea', name: 'ER' }, { map: 'Ethiopia', name: 'ET' }, { map: 'Gabon', name: 'GA' }, { map: 'Gambia, The', name: 'GM' }, { map: 'Ghana', name: 'GH' }, { map: 'Guinea', name: 'GN' }, { map: 'Guinea-Bissau', name: 'GW' }, { map: 'Kenya', name: 'KE' }, { map: 'Lesotho', name: 'LS' }, { map: 'Liberia', name: 'LR' }, { map: 'Libya', name: 'LY' }, { map: 'Madagascar', name: 'MG' }, { map: 'Malawi', name: 'MW' }, { map: 'Mali', name: 'ML' }, { map: 'Mauritania', name: 'MR' }, { map: 'Mauritius', name: 'MU' }, { map: 'Mayotte', name: 'YT' }, { map: 'Morocco', name: 'MA' }, { map: 'Mozambique', name: 'MZ' }, { map: 'Namibia', name: 'NA' }, { map: 'Niger', name: 'NE' }, { map: 'Nigeria', name: 'NG' }, { map: 'Reunion', name: 'RE' }, { map: 'Rwanda', name: 'RW' }, { map: 'Saint Helena', name: 'SH' }, { map: 'Sao Tome and Principe', name: 'ST' }, { map: 'Senegal', name: 'SN' }, { map: 'Seychelles', name: 'SC' }, { map: 'Sierra Leone', name: 'SL' }, { map: 'Somalia', name: 'SO' }, { map: 'South Africa', name: 'ZA' }, { map: 'South Sudan', name: 'SS' }, { map: 'Sudan', name: 'SD' }, { map: 'Swaziland', name: 'SZ' }, { map: 'Tanzania', name: 'TZ' }, { map: 'Togo', name: 'TG' }, { map: 'Tunisia', name: 'TN' }, { map: 'Uganda', name: 'UG' }, { map: 'Western Sahara', name: 'EH' }, { map: 'Zambia', name: 'ZM' }, { map: 'Zimbabwe', name: 'ZW' }, { map: '(Netherlands Antilles) Aruba', name: 'AW' }, { map: 'Anguilla', name: 'AI' }, { map: 'Antigua and Barbuda', name: 'AG' }, { map: 'Argentina', name: 'AR' }, { map: 'Bahamas, The', name: 'BS' }, { map: 'Barbados', name: 'BB' }, { map: 'Belize', name: 'BZ' }, { map: 'Bermuda', name: 'BM' }, { map: 'Bolivia', name: 'BO' }, { map: 'Brazil', name: 'BR' }, { map: 'British Virgin Islands', name: 'VG' }, { map: 'Canada', name: 'CA' }, { map: 'Cayman Islands', name: 'KY' }, { map: 'Chile', name: 'CL' }, { map: 'Colombia', name: 'CO' }, { map: 'Costa Rica', name: 'CR' }, { map: 'Cuba', name: 'CU' }, { map: 'Dominica', name: 'DM' }, { map: 'Dominican Republic', name: 'DO' }, { map: 'Ecuador', name: 'EC' }, { map: 'El Salvador', name: 'SV' }, { map: 'Falkland Islands (Islas Malvinas)', name: 'FK' }, { map: 'French Guiana', name: 'GF' }, { map: 'Greenland', name: 'GL' }, { map: 'Grenada', name: 'GD' }, { map: 'Guadeloupe', name: 'GP' }, { map: 'Guatemala', name: 'GT' }, { map: 'Guyana', name: 'GY' }, { map: 'Haiti', name: 'HT' }, { map: 'Honduras', name: 'HN' }, { map: 'Jamaica', name: 'JM' }, { map: 'Martinique', name: 'MQ' }, { map: 'Mexico', name: 'MX' }, { map: 'Montserrat', name: 'MS' }, { map: 'Netherlands Antilles', name: 'AN' }, { map: 'Nicaragua', name: 'NI' }, { map: 'Panama', name: 'PA' }, { map: 'Paraguay', name: 'PY' }, { map: 'Peru', name: 'PE' }, { map: 'Puerto Rico', name: 'PR' }, { map: 'Saint Barthélemy', name: 'BL' }, { map: 'Saint Kitts and Nevis', name: 'KN' }, { map: 'Saint Lucia', name: 'LC' }, { map: 'Saint Martin', name: 'MF' }, { map: 'Saint Pierre and Miquelon', name: 'PM' }, { map: 'Saint Vincent and the Grenadines', name: 'VC' }, { map: 'Surimap', name: 'SR' }, { map: 'Trinidad and Tobago', name: 'TT' }, { map: 'Turks and Caicos Islands', name: 'TC' }, { map: 'United States', name: 'US' }, { map: 'Uruguay', name: 'UY' }, { map: 'Venezuela', name: 'VE' }, { map: 'Virgin Islands', name: 'VI' }, { map: 'Afghanistan', name: 'AF' }, { map: 'Armenia', name: 'AM' }, { map: 'Azerbaijan', name: 'AZ' }, { map: 'Bahrain', name: 'BH' }, { map: 'Bangladesh', name: 'BD' }, { map: 'Bhutan', name: 'BT' }, { map: 'Brunei', name: 'BN' }, { map: 'Cambodia', name: 'KH' }, { map: 'China', name: 'CN' }, { map: 'Georgia', name: 'GE' }, { map: 'Hong Kong', name: 'HK' }, { map: 'India', name: 'IN' }, { map: 'Indonesia', name: 'ID' }, { map: 'Iran', name: 'IR' }, { map: 'Iraq', name: 'IQ' }, { map: 'Israel', name: 'IL' }, { map: 'Japan', name: 'JP' }, { map: 'Jordan', name: 'JO' }, { map: 'Kazakhstan', name: 'KZ' }, { map: 'Korea, North', name: 'KP' }, { map: 'Korea, South', name: 'KR' }, { map: 'Kuwait', name: 'KW' }, { map: 'Kyrgyzstan', name: 'KG' }, { map: 'Laos', name: 'LA' }, { map: 'Lebanon', name: 'LB' }, { map: 'Macao', name: 'MO' }, { map: 'Malaysia', name: 'MY' }, { map: 'Maldives', name: 'MV' }, { map: 'Mongolia', name: 'MN' }, { map: 'Myanmar (Burma)', name: 'MM' }, { map: 'Nepal', name: 'NP' }, { map: 'Oman', name: 'OM' }, { map: 'Pakistan', name: 'PK' }, { map: 'Palestinian Territories', name: 'PS' }, { map: 'Philippines', name: 'PH' }, { map: 'Qatar', name: 'QA' }, { map: 'Saudi Arabia', name: 'SA' }, { map: 'Singapore', name: 'SG' }, { map: 'Sri Lanka', name: 'LK' }, { map: 'Syria', name: 'SY' }, { map: 'Taiwan', name: 'TW' }, { map: 'Tajikistan', name: 'TJ' }, { map: 'Thailand', name: 'TH' }, { map: 'Timor-Leste', name: 'TL' }, { map: 'Turkey', name: 'TR' }, { map: 'Turkmenistan', name: 'TM' }, { map: 'United Arab Emirates', name: 'AE' }, { map: 'Uzbekistan', name: 'UZ' }, { map: 'Vietnam', name: 'VN' }, { map: 'Yemen', name: 'YE' }, { map: 'Albania', name: 'AL' }, { map: 'Andorra', name: 'AD' }, { map: 'Austria', name: 'AT' }, { map: 'Belarus', name: 'BY' }, { map: 'Belgium', name: 'BE' }, { map: 'Bosnia and Herzegovina', name: 'BA' }, { map: 'Bulgaria', name: 'BG' }, { map: 'Croatia', name: 'HR' }, { map: 'Cyprus', name: 'CY' }, { map: 'Czech Republic', name: 'CZ' }, { map: 'Denmark', name: 'DK' }, { map: 'Estonia', name: 'EE' }, { map: 'Faroe Islands', name: 'FO' }, { map: 'Finland', name: 'FI' }, { map: 'France', name: 'FR' }, { map: 'Germany', name: 'DE' }, { map: 'Gibraltar', name: 'GI' }, { map: 'Greece', name: 'GR' }, { map: 'Guernsey', name: 'GG' }, { map: 'Holy See (Vatican City)', name: 'VA' }, { map: 'Hungary', name: 'HU' }, { map: 'Iceland', name: 'IS' }, { map: 'Ireland', name: 'IE' }, { map: 'Isle Of Man', name: 'IM' }, { map: 'Italy', name: 'IT' }, { map: 'Jersey', name: 'JE' }, { map: 'Latvia', name: 'LV' }, { map: 'Liechtenstein', name: 'LI' }, { map: 'Lithuania', name: 'LT' }, { map: 'Luxembourg', name: 'LU' }, { map: 'Macedonia', name: 'MK' }, { map: 'Malta', name: 'MT' }, { map: 'Moldova', name: 'MD' }, { map: 'Monaco', name: 'MC' }, { map: 'Montenegro', name: 'ME' }, { map: 'Kosovo', name: 'XK' }, { map: 'Netherlands', name: 'NL' }, { map: 'Norway', name: 'NO' }, { map: 'Poland', name: 'PL' }, { map: 'Portugal', name: 'PT' }, { map: 'Romania', name: 'RO' }, { map: 'Russia', name: 'RU' }, { map: 'San Marino', name: 'SM' }, { map: 'Serbia', name: 'RS' }, { map: 'Slovakia', name: 'SK' }, { map: 'Slovenia', name: 'SI' }, { map: 'Spain', name: 'ES' }, { map: 'Svalbard', name: 'SJ' }, { map: 'Sweden', name: 'SE' }, { map: 'Switzerland', name: 'CH' }, { map: 'Ukraine', name: 'UA' }, { map: 'United Kingdom', name: 'GB' }, { map: 'Åland Islands', name: 'AX' }, { map: 'American Samoa', name: 'AS' }, { map: 'Antarctica', name: 'AQ' }, { map: 'Australia', name: 'AU' }, { map: 'Bouvet Island', name: 'BV' }, { map: 'British Indian Ocean Territory', name: 'IO' }, { map: 'Christmas Island', name: 'CX' }, { map: 'Cocos (Keeling) Islands', name: 'CC' }, { map: 'Cook Islands', name: 'CK' }, { map: 'Fiji', name: 'FJ' }, { map: 'French Polynesia', name: 'PF' }, { map: 'French Southern Territories', name: 'TF' }, { map: 'Guam', name: 'GU' }, { map: 'Heard and McDonald Islands', name: 'HM' }, { map: 'Kiribati', name: 'KI' }, { map: 'Marshall Islands', name: 'MH' }, { map: 'Micronesia, Federated States of', name: 'FM' }, { map: 'Nauru', name: 'NR' }, { map: 'New Caledonia', name: 'NC' }, { map: 'New Zealand', name: 'NZ' }, { map: 'Niue', name: 'NU' }, { map: 'Norfolk Island', name: 'NF' }, { map: 'Northern Mariana Islands', name: 'MP' }, { map: 'Palau', name: 'PW' }, { map: 'Papua New Guinea', name: 'PG' }, { map: 'Pitcairn Islands', name: 'PN' }, { map: 'Solomon Islands', name: 'SB' }, { map: 'South Georgia and South Sandwich Island', name: 'GS' }, { map: 'Tokelau', name: 'TK' }, { map: 'Tonga', name: 'TO' }, { map: 'Tuvalu', name: 'TV' }, { map: 'US Minor Outlying Islands', name: 'UM' }, { map: 'Vanuatu', name: 'VU' }, { map: 'Wallis and Futuna', name: 'WF' }, { map: 'Western Samoa', name: 'WS' }, { map: 'Sint Maarten', name: 'SX' }, { map: 'Bonaire, Sint Eustatius and Saba', name: 'BQ' }, { map: 'Curaçao', name: 'CW' },
    // Name in Capitals
    { map: 'ALGERIA', name: 'DZ' }, { map: 'ANGOLA', name: 'AO' }, { map: 'BENIN', name: 'BJ' }, { map: 'BOTSWANA', name: 'BW' }, { map: 'BURKINA FASO', name: 'BF' }, { map: 'BURUNDI', name: 'BI' }, { map: 'CAMEROON', name: 'CM' }, { map: 'CAPE VERDE', name: 'CV' }, { map: 'CENTRAL AFRICAN REPUBLIC', name: 'CF' }, { map: 'CHAD', name: 'TD' }, { map: 'COMOROS', name: 'KM' }, { map: 'CONGO, REPUBLIC OF THE', name: 'CG' }, { map: 'CONGO, THE DEMOCRATIC REPUBLIC OF THE', name: 'CD' }, { map: 'COTE D\'IVOIRE', name: 'CI' }, { map: 'DJIBOUTI', name: 'DJ' }, { map: 'EGYPT', name: 'EG' }, { map: 'EQUATORIAL GUINEA', name: 'GQ' }, { map: 'ERITREA', name: 'ER' }, { map: 'ETHIOPIA', name: 'ET' }, { map: 'GABON', name: 'GA' }, { map: 'GAMBIA, THE', name: 'GM' }, { map: 'GHANA', name: 'GH' }, { map: 'GUINEA', name: 'GN' }, { map: 'GUINEA-BISSAU', name: 'GW' }, { map: 'KENYA', name: 'KE' }, { map: 'LESOTHO', name: 'LS' }, { map: 'LIBERIA', name: 'LR' }, { map: 'LIBYA', name: 'LY' }, { map: 'MADAGASCAR', name: 'MG' }, { map: 'MALAWI', name: 'MW' }, { map: 'MALI', name: 'ML' }, { map: 'MAURITANIA', name: 'MR' }, { map: 'MAURITIUS', name: 'MU' }, { map: 'MAYOTTE', name: 'YT' }, { map: 'MOROCCO', name: 'MA' }, { map: 'MOZAMBIQUE', name: 'MZ' }, { map: 'NAMIBIA', name: 'NA' }, { map: 'NIGER', name: 'NE' }, { map: 'NIGERIA', name: 'NG' }, { map: 'REUNION', name: 'RE' }, { map: 'RWANDA', name: 'RW' }, { map: 'SAINT HELENA', name: 'SH' }, { map: 'SAO TOME AND PRINCIPE', name: 'ST' }, { map: 'SENEGAL', name: 'SN' }, { map: 'SEYCHELLES', name: 'SC' }, { map: 'SIERRA LEONE', name: 'SL' }, { map: 'SOMALIA', name: 'SO' }, { map: 'SOUTH AFRICA', name: 'ZA' }, { map: 'SOUTH SUDAN', name: 'SS' }, { map: 'SUDAN', name: 'SD' }, { map: 'SWAZILAND', name: 'SZ' }, { map: 'TANZANIA', name: 'TZ' }, { map: 'TOGO', name: 'TG' }, { map: 'TUNISIA', name: 'TN' }, { map: 'UGANDA', name: 'UG' }, { map: 'WESTERN SAHARA', name: 'EH' }, { map: 'ZAMBIA', name: 'ZM' }, { map: 'ZIMBABWE', name: 'ZW' }, { map: '(NETHERLANDS ANTILLES) ARUBA', name: 'AW' }, { map: 'ANGUILLA', name: 'AI' }, { map: 'ANTIGUA AND BARBUDA', name: 'AG' }, { map: 'ARGENTINA', name: 'AR' }, { map: 'BAHAMAS, THE', name: 'BS' }, { map: 'BARBADOS', name: 'BB' }, { map: 'BELIZE', name: 'BZ' }, { map: 'BERMUDA', name: 'BM' }, { map: 'BOLIVIA', name: 'BO' }, { map: 'BRAZIL', name: 'BR' }, { map: 'BRITISH VIRGIN ISLANDS', name: 'VG' }, { map: 'CANADA', name: 'CA' }, { map: 'CAYMAN ISLANDS', name: 'KY' }, { map: 'CHILE', name: 'CL' }, { map: 'COLOMBIA', name: 'CO' }, { map: 'COSTA RICA', name: 'CR' }, { map: 'CUBA', name: 'CU' }, { map: 'DOMINICA', name: 'DM' }, { map: 'DOMINICAN REPUBLIC', name: 'DO' }, { map: 'ECUADOR', name: 'EC' }, { map: 'EL SALVADOR', name: 'SV' }, { map: 'FALKLAND ISLANDS (ISLAS MALVINAS)', name: 'FK' }, { map: 'FRENCH GUIANA', name: 'GF' }, { map: 'GREENLAND', name: 'GL' }, { map: 'GRENADA', name: 'GD' }, { map: 'GUADELOUPE', name: 'GP' }, { map: 'GUATEMALA', name: 'GT' }, { map: 'GUYANA', name: 'GY' }, { map: 'HAITI', name: 'HT' }, { map: 'HONDURAS', name: 'HN' }, { map: 'JAMAICA', name: 'JM' }, { map: 'MARTINIQUE', name: 'MQ' }, { map: 'MEXICO', name: 'MX' }, { map: 'MONTSERRAT', name: 'MS' }, { map: 'NETHERLANDS ANTILLES', name: 'AN' }, { map: 'NICARAGUA', name: 'NI' }, { map: 'PANAMA', name: 'PA' }, { map: 'PARAGUAY', name: 'PY' }, { map: 'PERU', name: 'PE' }, { map: 'PUERTO RICO', name: 'PR' }, { map: 'SAINT BARTHÉLEMY', name: 'BL' }, { map: 'SAINT KITTS AND NEVIS', name: 'KN' }, { map: 'SAINT LUCIA', name: 'LC' }, { map: 'SAINT MARTIN', name: 'MF' }, { map: 'SAINT PIERRE AND MIQUELON', name: 'PM' }, { map: 'SAINT VINCENT AND THE GRENADINES', name: 'VC' }, { map: 'SURIMAP', name: 'SR' }, { map: 'TRINIDAD AND TOBAGO', name: 'TT' }, { map: 'TURKS AND CAICOS ISLANDS', name: 'TC' }, { map: 'UNITED STATES', name: 'US' }, { map: 'URUGUAY', name: 'UY' }, { map: 'VENEZUELA', name: 'VE' }, { map: 'VIRGIN ISLANDS', name: 'VI' }, { map: 'AFGHANISTAN', name: 'AF' }, { map: 'ARMENIA', name: 'AM' }, { map: 'AZERBAIJAN', name: 'AZ' }, { map: 'BAHRAIN', name: 'BH' }, { map: 'BANGLADESH', name: 'BD' }, { map: 'BHUTAN', name: 'BT' }, { map: 'BRUNEI', name: 'BN' }, { map: 'CAMBODIA', name: 'KH' }, { map: 'CHINA', name: 'CN' }, { map: 'GEORGIA', name: 'GE' }, { map: 'HONG KONG', name: 'HK' }, { map: 'INDIA', name: 'IN' }, { map: 'INDONESIA', name: 'ID' }, { map: 'IRAN', name: 'IR' }, { map: 'IRAQ', name: 'IQ' }, { map: 'ISRAEL', name: 'IL' }, { map: 'JAPAN', name: 'JP' }, { map: 'JORDAN', name: 'JO' }, { map: 'KAZAKHSTAN', name: 'KZ' }, { map: 'KOREA, NORTH', name: 'KP' }, { map: 'KOREA, SOUTH', name: 'KR' }, { map: 'KUWAIT', name: 'KW' }, { map: 'KYRGYZSTAN', name: 'KG' }, { map: 'LAOS', name: 'LA' }, { map: 'LEBANON', name: 'LB' }, { map: 'MACAO', name: 'MO' }, { map: 'MALAYSIA', name: 'MY' }, { map: 'MALDIVES', name: 'MV' }, { map: 'MONGOLIA', name: 'MN' }, { map: 'MYANMAR (BURMA)', name: 'MM' }, { map: 'NEPAL', name: 'NP' }, { map: 'OMAN', name: 'OM' }, { map: 'PAKISTAN', name: 'PK' }, { map: 'PALESTINIAN TERRITORIES', name: 'PS' }, { map: 'PHILIPPINES', name: 'PH' }, { map: 'QATAR', name: 'QA' }, { map: 'SAUDI ARABIA', name: 'SA' }, { map: 'SINGAPORE', name: 'SG' }, { map: 'SRI LANKA', name: 'LK' }, { map: 'SYRIA', name: 'SY' }, { map: 'TAIWAN', name: 'TW' }, { map: 'TAJIKISTAN', name: 'TJ' }, { map: 'THAILAND', name: 'TH' }, { map: 'TIMOR-LESTE', name: 'TL' }, { map: 'TURKEY', name: 'TR' }, { map: 'TURKMENISTAN', name: 'TM' }, { map: 'UNITED ARAB EMIRATES', name: 'AE' }, { map: 'UZBEKISTAN', name: 'UZ' }, { map: 'VIETNAM', name: 'VN' }, { map: 'YEMEN', name: 'YE' }, { map: 'ALBANIA', name: 'AL' }, { map: 'ANDORRA', name: 'AD' }, { map: 'AUSTRIA', name: 'AT' }, { map: 'BELARUS', name: 'BY' }, { map: 'BELGIUM', name: 'BE' }, { map: 'BOSNIA AND HERZEGOVINA', name: 'BA' }, { map: 'BULGARIA', name: 'BG' }, { map: 'CROATIA', name: 'HR' }, { map: 'CYPRUS', name: 'CY' }, { map: 'CZECH REPUBLIC', name: 'CZ' }, { map: 'DENMARK', name: 'DK' }, { map: 'ESTONIA', name: 'EE' }, { map: 'FAROE ISLANDS', name: 'FO' }, { map: 'FINLAND', name: 'FI' }, { map: 'FRANCE', name: 'FR' }, { map: 'GERMANY', name: 'DE' }, { map: 'GIBRALTAR', name: 'GI' }, { map: 'GREECE', name: 'GR' }, { map: 'GUERNSEY', name: 'GG' }, { map: 'HOLY SEE (VATICAN CITY)', name: 'VA' }, { map: 'HUNGARY', name: 'HU' }, { map: 'ICELAND', name: 'IS' }, { map: 'IRELAND', name: 'IE' }, { map: 'ISLE OF MAN', name: 'IM' }, { map: 'ITALY', name: 'IT' }, { map: 'JERSEY', name: 'JE' }, { map: 'LATVIA', name: 'LV' }, { map: 'LIECHTENSTEIN', name: 'LI' }, { map: 'LITHUANIA', name: 'LT' }, { map: 'LUXEMBOURG', name: 'LU' }, { map: 'MACEDONIA', name: 'MK' }, { map: 'MALTA', name: 'MT' }, { map: 'MOLDOVA', name: 'MD' }, { map: 'MONACO', name: 'MC' }, { map: 'MONTENEGRO', name: 'ME' }, { map: 'KOSOVO', name: 'XK' }, { map: 'NETHERLANDS', name: 'NL' }, { map: 'NORWAY', name: 'NO' }, { map: 'POLAND', name: 'PL' }, { map: 'PORTUGAL', name: 'PT' }, { map: 'ROMANIA', name: 'RO' }, { map: 'RUSSIA', name: 'RU' }, { map: 'SAN MARINO', name: 'SM' }, { map: 'SERBIA', name: 'RS' }, { map: 'SLOVAKIA', name: 'SK' }, { map: 'SLOVENIA', name: 'SI' }, { map: 'SPAIN', name: 'ES' }, { map: 'SVALBARD', name: 'SJ' }, { map: 'SWEDEN', name: 'SE' }, { map: 'SWITZERLAND', name: 'CH' }, { map: 'UKRAINE', name: 'UA' }, { map: 'UNITED KINGDOM', name: 'GB' }, { map: 'ÅLAND ISLANDS', name: 'AX' }, { map: 'AMERICAN SAMOA', name: 'AS' }, { map: 'ANTARCTICA', name: 'AQ' }, { map: 'AUSTRALIA', name: 'AU' }, { map: 'BOUVET ISLAND', name: 'BV' }, { map: 'BRITISH INDIAN OCEAN TERRITORY', name: 'IO' }, { map: 'CHRISTMAS ISLAND', name: 'CX' }, { map: 'COCOS (KEELING) ISLANDS', name: 'CC' }, { map: 'COOK ISLANDS', name: 'CK' }, { map: 'FIJI', name: 'FJ' }, { map: 'FRENCH POLYNESIA', name: 'PF' }, { map: 'FRENCH SOUTHERN TERRITORIES', name: 'TF' }, { map: 'GUAM', name: 'GU' }, { map: 'HEARD AND MCDONALD ISLANDS', name: 'HM' }, { map: 'KIRIBATI', name: 'KI' }, { map: 'MARSHALL ISLANDS', name: 'MH' }, { map: 'MICRONESIA, FEDERATED STATES OF', name: 'FM' }, { map: 'NAURU', name: 'NR' }, { map: 'NEW CALEDONIA', name: 'NC' }, { map: 'NEW ZEALAND', name: 'NZ' }, { map: 'NIUE', name: 'NU' }, { map: 'NORFOLK ISLAND', name: 'NF' }, { map: 'NORTHERN MARIANA ISLANDS', name: 'MP' }, { map: 'PALAU', name: 'PW' }, { map: 'PAPUA NEW GUINEA', name: 'PG' }, { map: 'PITCAIRN ISLANDS', name: 'PN' }, { map: 'SOLOMON ISLANDS', name: 'SB' }, { map: 'SOUTH GEORGIA AND SOUTH SANDWICH ISLAND', name: 'GS' }, { map: 'TOKELAU', name: 'TK' }, { map: 'TONGA', name: 'TO' }, { map: 'TUVALU', name: 'TV' }, { map: 'US MINOR OUTLYING ISLANDS', name: 'UM' }, { map: 'VANUATU', name: 'VU' }, { map: 'WALLIS AND FUTUNA', name: 'WF' }, { map: 'WESTERN SAMOA', name: 'WS' }, { map: 'SINT MAARTEN', name: 'SX' }, { map: 'BONAIRE, SINT EUSTATIUS AND SABA', name: 'BQ' }, { map: 'CURACAO', name: 'CW' },
    // Assign N/A to WW
    { map: 'N/A', name: 'WW' },
  ];
};

/**
 * Returns the Tab Index of this Sales Template
 *
 * @method
 * @returns {number} The Tab Index starting at 0
 */
salesTemplateSchema.methods.tabIndex = function () {
  let index = 0;
  if (this.tab && this.tab > 0) {
    index = this.tab - 1;
  }
  return index;
};

/**
 * Returns the Starting Left Index (Column Index) of this Sales Template
 *
 * @method
 * @returns {number} The Starting Left Index starting at 0
 */
salesTemplateSchema.methods.startingLeftIndex = function () {
  let index = 0;
  if (this.startingLeft && this.startingLeft > 0) {
    index = this.startingLeft - 1;
  }
  return index;
};

/**
 * Returns the Starting Line Index of this Sales Template
 *
 * @method
 * @returns {number} The Starting Line Index starting at 0
 */
salesTemplateSchema.methods.startingLineIndex = function () {
  let index = 0;
  if (this.startingLine && this.startingLine > 0) {
    index = this.startingLine - 1;
  }
  return index;
};

/**
 * Returns the Character Separators of this Sales Template
 *
 * @method
 * @returns {Number[]} Array of numbers containing the Character Separators
 */
salesTemplateSchema.methods.characterSeparators = function () {
  if (this.fileType === 'Character') {
    return this.fields.map((field) => field.characters);
  }
  return null;
};

/**
 * Compiles Mappings For Sales Ingestion
 *
 * If the client attached to the Sales Template is found, this adds distributionChannels, configurations, priceCategories and saleTypes from the client to the mappings already contained in the Sales Template
 *
 * * Calls `callback(err, mappings)` with `mappings` containing the various mappings, as well as the Client document in case a client is found
 * * Calls `callback(err, mappings)` with an `err` message if an error occurs
 *
 * @param {boolean} platform - Indicates whether we are generating data for the new platform or not
 * @param {function(string, object)} callback - A callback that handles the response
 */
salesTemplateSchema.methods.fullMappingsForSalesIngestion = function (platform, callback) {
  // Returns full mappings from template and catalogue for sales ingestion
  const salesTemplate = this;
  let catalogueMappings;
  // Get Client
  Client.findOne({ _id: this.clientId }, {
    name: 1, distributionChannels: 1, configurations: 1, priceCategories: 1, saleTypes: 1, features: 1,
  }).then((client) => {
  // Handle client errors
    if (!client) {
      logger.error('Client not found');
      callback(new Error('There was an error loading the client for ingesting sales. Please try again or contact support.'));
    } else {
    // Map client fields to salesTemplate
      async.parallel([
        function (cb) { addToTemplateArray(salesTemplate.distributionChannels, client.distributionChannels, cb); },
        function (cb) { addToTemplateArray(salesTemplate.configurations, client.configurations, cb); },
        function (cb) { addToTemplateArray(salesTemplate.priceCategories, client.priceCategories, cb); },
        function (cb) { addToTemplateArray(salesTemplate.saleTypes, client.saleTypes, cb); }, // @tom: I can't see why saleTypes is included here. It does not exist on client model?
        function (cb) { addToTemplateArray(salesTemplate.positiveNegatives, ['Positive', 'Negative'], cb); },
        function (cb) {
          salesTemplate.territories = salesTemplate.territories.concat(SalesTemplate.getStandardTerritoryMappings());
          cb();
        },
        function (cb) {
          // Get catalogue mappings
          MappingsForIngestion.get(client, { ignoreMainIdentifiers: salesTemplate.ignoreMainIdentifiers, platform }).then((mappings) => {
            // Set to variable for loading below
            catalogueMappings = mappings;
            cb();
          }).catch(cb);
        },
      ], (err) => {
        // Handle any errors
        if (err) {
          logger.error(err);
          callback(new Error('There was an error in preparing the mappings for the template. Please check the template mappings and try again.'));
        } else {
        // Return object of full arrays
          const object = {
            territories: salesTemplate.territories,
            distributionChannels: salesTemplate.distributionChannels,
            configurations: salesTemplate.configurations,
            priceCategories: salesTemplate.priceCategories,
            saleTypes: salesTemplate.saleTypes,
            positiveNegatives: salesTemplate.positiveNegatives,
            sources: salesTemplate.sources,
            subSources: salesTemplate.subSources,
            currencies: salesTemplate.currencies,
            copyFields: salesTemplate.copyFields,
            releases: catalogueMappings.releases,
            tracks: catalogueMappings.tracks,
            contracts: catalogueMappings.contracts,
            works: catalogueMappings.works,
            externalReleases: catalogueMappings.externalReleases,
            externalTracks: catalogueMappings.externalTracks,
            externalContracts: catalogueMappings.externalContracts,
            externalWorks: catalogueMappings.externalWorks,
            releaseExceptions: client.duplicateReleases,
            trackExceptions: client.duplicateTracks,
            workExceptions: client.duplicateWorks,
          };
          callback(null, object);
        }
      });
    }
  })
    .catch((err) => {
      logger.error(err);
      callback(new Error('There was an error in preparing the mappings for the template. Please check the template mappings and try again.'));
    });
};

/**
 * Adds mappings from an array of values to a supplied array of mapping objects. Used by fullMappingsForSalesIngestion
 *
 * * Calls `callback()` if successful
 * * Calls `callback(err)` with an `err` message if an error occurs
 *
 * @param {object[]} array - Array of mapping objects to add to
 * @param {string[]} elementsToAdd - Array of values to add
 * @param {function(string)} callback - A callback that handles the response
 */
function addToTemplateArray(array, elementsToAdd, callback) {
  if (elementsToAdd) {
    try {
      async.each(elementsToAdd, (element, cb) => {
        array.push({ name: element, map: element });
        cb();
      }, callback);
    } catch (err) {
      callback(err);
    }
  } else {
    callback();
  }
}

const SalesTemplate = mongoose.model(name, salesTemplateSchema);

module.exports = SalesTemplate;
