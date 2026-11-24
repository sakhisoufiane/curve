import { invert } from 'lodash';

// All country codes defined here are for CISAC approved territories ONLY
// This does not represent all countries in the world and shouldn't be used as so
// For anything CWR <> territories related, use these lists

// Taken from https://members.cisac.org/CisacPortal/documentPack20.do?method=detail&id=21
// Last updated from file: ISTIS-0184a 2022-02-21 "TIS database: full data - Appendix a : list of territories"
// Key   =  TIS-N
// Value =  TIS-A

export const CISAC_COUNTRIES_AFRICA = {
  12: 'DZ', // ALGERIA
  24: 'AO', // ANGOLA
  72: 'BW', // BOTSWANA
  108: 'BI', // BURUNDI
  120: 'CM', // CAMEROON
  132: 'CV', // CAPE VERDE
  140: 'CF', // CENTRAL AFRICAN REPUBLIC
  148: 'TD', // CHAD
  174: 'KM', // COMOROS
  178: 'CG', // CONGO
  180: 'CD', // CONGO, THE DEMOCRATIC REPUBLIC OF THE
  204: 'BJ', // BENIN
  226: 'GQ', // EQUATORIAL GUINEA
  231: 'ET', // ETHIOPIA
  232: 'ER', // ERITREA
  262: 'DJ', // DJIBOUTI
  266: 'GA', // GABON
  270: 'GM', // GAMBIA
  288: 'GH', // GHANA
  324: 'GN', // GUINEA
  384: 'CI', // COTE D'IVOIRE
  404: 'KE', // KENYA
  426: 'LS', // LESOTHO
  430: 'LR', // LIBERIA
  434: 'LY', // LIBYA
  450: 'MG', // MADAGASCAR
  454: 'MW', // MALAWI
  466: 'ML', // MALI
  478: 'MR', // MAURITANIA
  480: 'MU', // MAURITIUS
  504: 'MA', // MOROCCO
  508: 'MZ', // MOZAMBIQUE
  516: 'NA', // NAMIBIA
  562: 'NE', // NIGER
  566: 'NG', // NIGERIA
  624: 'GW', // GUINEA-BISSAU
  646: 'RW', // RWANDA
  678: 'ST', // SAO TOME AND PRINCIPE
  686: 'SN', // SENEGAL
  690: 'SC', // SEYCHELLES
  694: 'SL', // SIERRA LEONE
  706: 'SO', // SOMALIA
  710: 'ZA', // SOUTH AFRICA
  716: 'ZW', // ZIMBABWE
  728: 'SS', // SOUTH SUDAN
  729: 'SD', // SUDAN
  732: 'EH', // WESTERN SAHARA
  748: 'SZ', // ESWATINI
  768: 'TG', // TOGO
  788: 'TN', // TUNISIA
  800: 'UG', // UGANDA
  818: 'EG', // EGYPT
  834: 'TZ', // TANZANIA, UNITED REPUBLIC OF
  854: 'BF', // BURKINA FASO
  894: 'ZM', // ZAMBIA
};

export const CISAC_COUNTRIES_AMERICAS = {
  28: 'AG', // ANTIGUA AND BARBUDA
  32: 'AR', // ARGENTINA
  44: 'BS', // BAHAMAS
  52: 'BB', // BARBADOS
  68: 'BO', // BOLIVIA
  76: 'BR', // BRAZIL
  84: 'BZ', // BELIZE
  124: 'CA', // CANADA
  152: 'CL', // CHILE
  170: 'CO', // COLOMBIA
  188: 'CR', // COSTA RICA
  192: 'CU', // CUBA
  212: 'DM', // DOMINICA
  214: 'DO', // DOMINICAN REPUBLIC
  218: 'EC', // ECUADOR
  222: 'SV', // EL SALVADOR
  308: 'GD', // GRENADA
  320: 'GT', // GUATEMALA
  328: 'GY', // GUYANA
  332: 'HT', // HAITI
  340: 'HN', // HONDURAS
  388: 'JM', // JAMAICA
  484: 'MX', // MEXICO
  558: 'NI', // NICARAGUA
  591: 'PA', // PANAMA
  600: 'PY', // PARAGUAY
  604: 'PE', // PERU
  630: 'PR', // PUERTO RICO
  659: 'KN', // SAINT KITTS AND NEVIS
  662: 'LC', // SAINT LUCIA
  670: 'VC', // SAINT VINCENT AND THE GRENADINES
  740: 'SR', // SURINAME
  780: 'TT', // TRINIDAD AND TOBAGO
  840: 'US', // UNITED STATES
  858: 'UY', // URUGUAY
  862: 'VE', // VENEZUELA
};

export const CISAC_COUNTRIES_ASIA = {
  4: 'AF', // AFGHANISTAN
  31: 'AZ', // AZERBAIJAN
  48: 'BH', // BAHRAIN
  50: 'BD', // BANGLADESH
  51: 'AM', // ARMENIA
  64: 'BT', // BHUTAN
  96: 'BN', // BRUNEI DARUSSALAM
  104: 'MM', // MYANMAR
  116: 'KH', // CAMBODIA
  144: 'LK', // SRI LANKA
  156: 'CN', // CHINA
  158: 'TW', // TAIWAN, PROVINCE OF CHINA
  268: 'GE', // GEORGIA
  344: 'HK', // HONG KONG
  356: 'IN', // INDIA
  360: 'ID', // INDONESIA
  364: 'IR', // IRAN, ISLAMIC REPUBLIC OF
  368: 'IQ', // IRAQ
  376: 'IL', // ISRAEL
  392: 'JP', // JAPAN
  398: 'KZ', // KAZAKHSTAN
  400: 'JO', // JORDAN
  408: 'KP', // KOREA, DEMOCRATIC PEOPLE'S REPUBLIC OF
  410: 'KR', // KOREA, REPUBLIC OF
  414: 'KW', // KUWAIT
  417: 'KG', // KYRGYZSTAN
  418: 'LA', // LAO PEOPLE'S DEMOCRATIC REPUBLIC
  422: 'LB', // LEBANON
  446: 'MO', // MACAO
  458: 'MY', // MALAYSIA
  462: 'MV', // MALDIVES
  496: 'MN', // MONGOLIA
  512: 'OM', // OMAN
  524: 'NP', // NEPAL
  586: 'PK', // PAKISTAN
  608: 'PH', // PHILIPPINES
  626: 'TL', // TIMOR-LESTE
  634: 'QA', // QATAR
  682: 'SA', // SAUDI ARABIA
  702: 'SG', // SINGAPORE
  704: 'VN', // VIET NAM
  760: 'SY', // SYRIAN ARAB REPUBLIC
  762: 'TJ', // TAJIKISTAN
  764: 'TH', // THAILAND
  784: 'AE', // UNITED ARAB EMIRATES
  792: 'TR', // TURKEY
  795: 'TM', // TURKMENISTAN
  860: 'UZ', // UZBEKISTAN
  887: 'YE', // YEMEN
};

export const CISAC_COUNTRIES_EUROPE = {
  8: 'AL', // ALBANIA
  20: 'AD', // ANDORRA
  40: 'AT', // AUSTRIA
  56: 'BE', // BELGIUM
  70: 'BA', // BOSNIA AND HERZEGOVINA
  100: 'BG', // BULGARIA
  112: 'BY', // BELARUS
  191: 'HR', // CROATIA
  196: 'CY', // CYPRUS
  203: 'CZ', // CZECH REPUBLIC
  208: 'DK', // DENMARK
  233: 'EE', // ESTONIA
  246: 'FI', // FINLAND
  250: 'FR', // FRANCE
  276: 'DE', // GERMANY
  300: 'GR', // GREECE
  336: 'VA', // HOLY SEE (VATICAN CITY STATE)
  348: 'HU', // HUNGARY
  352: 'IS', // ICELAND
  372: 'IE', // IRELAND
  380: 'IT', // ITALY
  428: 'LV', // LATVIA
  438: 'LI', // LIECHTENSTEIN
  440: 'LT', // LITHUANIA
  442: 'LU', // LUXEMBOURG
  470: 'MT', // MALTA
  492: 'MC', // MONACO
  498: 'MD', // MOLDOVA, REPUBLIC OF
  499: 'ME', // MONTENEGRO
  528: 'NL', // NETHERLANDS
  578: 'NO', // NORWAY
  616: 'PL', // POLAND
  620: 'PT', // PORTUGAL
  642: 'RO', // ROMANIA
  643: 'RU', // RUSSIAN FEDERATION
  674: 'SM', // SAN MARINO
  688: 'RS', // SERBIA
  703: 'SK', // SLOVAKIA
  705: 'SI', // SLOVENIA
  724: 'ES', // SPAIN
  752: 'SE', // SWEDEN
  756: 'CH', // SWITZERLAND
  804: 'UA', // UKRAINE
  807: 'MK', // NORTH MACEDONIA
  826: 'GB', // UNITED KINGDOM
};

export const CISAC_COUNTRIES_OCEANIA = {
  36: 'AU', // AUSTRALIA
  90: 'SB', // SOLOMON ISLANDS
  242: 'FJ', // FIJI
  258: 'PF', // FRENCH POLYNESIA
  296: 'KI', // KIRIBATI
  520: 'NR', // NAURU
  540: 'NC', // NEW CALEDONIA
  548: 'VU', // VANUATU
  554: 'NZ', // NEW ZEALAND
  583: 'FM', // MICRONESIA, FEDERATED STATES OF
  584: 'MH', // MARSHALL ISLANDS
  585: 'PW', // PALAU
  598: 'PG', // PAPUA NEW GUINEA
  776: 'TO', // TONGA
  798: 'TV', // TUVALU
  882: 'WS', // SAMOA
};

// Represents single countries (4 — 894)
export const CISAC_APPROVED_COUNTRIES = {
  ...CISAC_COUNTRIES_AFRICA,
  ...CISAC_COUNTRIES_AMERICAS,
  ...CISAC_COUNTRIES_ASIA,
  ...CISAC_COUNTRIES_EUROPE,
  ...CISAC_COUNTRIES_OCEANIA,
};

// Represents continents, areas and all world (2100 — 2136)
export const CISAC_APPROVED_AREAS_CONTINENTS_WORLD = {
  2100: '2AF', // AFRICA
  2101: '2AM', // AMERICA
  2102: '2AC', // AMERICAN CONTINENT
  2103: '2AN', // ANTILLES
  2104: '2AP', // APEC COUNTRIES
  2105: '2AE', // ASEAN COUNTRIES
  2106: '2AS', // ASIA
  2107: '2AA', // AUSTRALASIA
  2108: '2BA', // BALKANS
  2109: '2BS', // BALTIC STATES
  2110: '2BE', // BENELUX
  2111: '2BI', // BRITISH ISLES
  2112: '2BW', // BRITISH WEST INDIES
  2113: '2CA', // CENTRAL AMERICA
  2114: '2CO', // COMMONWEALTH
  2115: '2CF', // COMMONWEALTH AFRICAN TERRITORIES
  2116: '2CS', // COMMONWEALTH ASIAN TERRITORIES
  2117: '2CU', // COMMONWEALTH AUSTRALASIAN TERRITORIES
  2118: '2CI', // COMMONWEALTH OF INDEPENDENT STATES
  2119: '2EE', // EASTERN EUROPE
  2120: '2EU', // EUROPE
  2121: '2EM', // EUROPEAN ECONOMIC AREA
  2122: '2EC', // EUROPEAN CONTINENT
  2123: '2EN', // EUROPEAN UNION
  2124: '2GC', // GSA COUNTRIES
  2125: '2ME', // MIDDLE EAST
  2126: '2NT', // NAFTA COUNTRIES
  2127: '2NC', // NORDIC COUNTRIES
  2128: '2NF', // NORTH AFRICA
  2129: '2NA', // NORTH AMERICA
  2130: '2OC', // OCEANIA
  2131: '2SC', // SCANDINAVIA
  2132: '2SA', // SOUTH AMERICA
  2133: '2SE', // SOUTH EAST ASIA
  2134: '2WI', // WEST INDIES
  2136: '2WL', // WORLD
};

export const AREA_CODES = {
  WW: 'WW',
  World: 'World',
  Europe: 'Europe',
  Africa: 'Africa',
  Asia: 'Asia',
  Americas: 'Americas',
  Oceania: 'Oceania',
};

export const CONTINENT_CODES = [
  AREA_CODES.Africa,
  AREA_CODES.Americas,
  AREA_CODES.Asia,
  AREA_CODES.Europe,
  AREA_CODES.Oceania,
];

export const ALL_WORLD_CODE = 2136;

// All territories (countries, areas, continents, world)
export const CISAC_APPROVED_TERRITORIES: Record<number, string> = {
  ...CISAC_APPROVED_COUNTRIES,
  ...CISAC_APPROVED_AREAS_CONTINENTS_WORLD,
};

// Flipped version of all territories, useful in places where we have only the country code and no number
export const CISAC_APPROVED_TERRITORIES_REVERSED = invert(CISAC_APPROVED_COUNTRIES);

// Total count of approved countries
export const CISAC_APPROVED_COUNTRIES_COUNT = Object.keys(CISAC_APPROVED_COUNTRIES).length;

// Just the codes for countries, no areas + continents etc.
export const CISAC_APPROVED_COUNTRIES_CODES = Object.values(CISAC_APPROVED_COUNTRIES);

// Just the codes for all territories, including areas + continents etc.
export const CISAC_APPROVED_TERRITORIES_CODES = Object.values(CISAC_APPROVED_TERRITORIES);

// Country code arrays for each CISAC area/continent/world territory
// Generated from ISTIS-0184 Edition 11 TIS database (full data), cross-referenced with mapping.js
// Each array is the fully expanded (recursive) membership as of the database validity dates

export const CISAC_AREA_AFRICA = [
  'AO',
  'BF',
  'BI',
  'BJ',
  'BW',
  'CD',
  'CF',
  'CG',
  'CI',
  'CM',
  'CV',
  'DJ',
  'DZ',
  'EG',
  'EH',
  'ER',
  'ET',
  'GA',
  'GH',
  'GM',
  'GN',
  'GQ',
  'GW',
  'KE',
  'KM',
  'LR',
  'LS',
  'LY',
  'MA',
  'MG',
  'ML',
  'MR',
  'MU',
  'MW',
  'MZ',
  'NA',
  'NE',
  'NG',
  'RW',
  'SC',
  'SD',
  'SL',
  'SN',
  'SO',
  'SS',
  'ST',
  'SZ',
  'TD',
  'TG',
  'TN',
  'TZ',
  'UG',
  'ZA',
  'ZM',
  'ZW',
]; // 2100
export const CISAC_AREA_AMERICA = [
  'AG',
  'AR',
  'BB',
  'BO',
  'BR',
  'BS',
  'BZ',
  'CA',
  'CL',
  'CO',
  'CR',
  'CU',
  'DM',
  'DO',
  'EC',
  'GD',
  'GT',
  'GY',
  'HN',
  'HT',
  'JM',
  'KN',
  'LC',
  'MX',
  'NI',
  'PA',
  'PE',
  'PR',
  'PY',
  'SR',
  'SV',
  'TT',
  'US',
  'UY',
  'VC',
  'VE',
]; // 2101
export const CISAC_AREA_AMERICAN_CONTINENT = [
  'AR',
  'BO',
  'BR',
  'BZ',
  'CA',
  'CL',
  'CO',
  'CR',
  'EC',
  'GT',
  'GY',
  'HN',
  'MX',
  'NI',
  'PA',
  'PE',
  'PY',
  'SR',
  'SV',
  'US',
  'UY',
  'VE',
]; // 2102
export const CISAC_AREA_ANTILLES = ['AG', 'BB', 'CU', 'DM', 'DO', 'GD', 'HT', 'JM', 'KN', 'LC', 'PR', 'TT', 'VC']; // 2103
export const CISAC_AREA_APEC = [
  'AU',
  'BN',
  'CA',
  'CL',
  'CN',
  'HK',
  'ID',
  'JP',
  'KR',
  'MO',
  'MX',
  'MY',
  'NZ',
  'PE',
  'PG',
  'PH',
  'PR',
  'RU',
  'SG',
  'TH',
  'TW',
  'US',
  'VN',
]; // 2104
export const CISAC_AREA_ASEAN = ['BN', 'ID', 'KH', 'LA', 'MM', 'MY', 'PH', 'SG', 'TH', 'VN']; // 2105
export const CISAC_AREA_ASIA = [
  'AE',
  'AF',
  'AM',
  'AZ',
  'BD',
  'BH',
  'BN',
  'BT',
  'CN',
  'CY',
  'GE',
  'HK',
  'ID',
  'IL',
  'IN',
  'IQ',
  'IR',
  'JO',
  'JP',
  'KG',
  'KH',
  'KP',
  'KR',
  'KW',
  'KZ',
  'LA',
  'LB',
  'LK',
  'MM',
  'MN',
  'MO',
  'MV',
  'MY',
  'NP',
  'OM',
  'PH',
  'PK',
  'QA',
  'SA',
  'SG',
  'SY',
  'TH',
  'TJ',
  'TL',
  'TM',
  'TW',
  'UZ',
  'VN',
  'YE',
]; // 2106 — TR removed (expired 2025-12-31 per CISAC DB)
export const CISAC_AREA_AUSTRALASIA = ['AU', 'FJ', 'NC', 'NZ', 'SB', 'VU']; // 2107
export const CISAC_AREA_BALKANS = ['AL', 'BA', 'BG', 'GR', 'HR', 'ME', 'MK', 'RO', 'RS', 'SI']; // 2108
export const CISAC_AREA_BALTIC_STATES = ['EE', 'LT', 'LV']; // 2109
export const CISAC_AREA_BENELUX = ['BE', 'LU', 'NL']; // 2110
export const CISAC_AREA_BRITISH_ISLES = ['GB', 'IE']; // 2111
export const CISAC_AREA_BRITISH_WEST_INDIES = ['AG', 'BB', 'BS', 'DM', 'GD', 'JM', 'KN', 'LC', 'TT', 'VC']; // 2112
export const CISAC_AREA_CENTRAL_AMERICA = ['BZ', 'CR', 'GT', 'HN', 'NI', 'PA', 'SV']; // 2113
export const CISAC_AREA_COMMONWEALTH = [
  'AG',
  'AU',
  'BB',
  'BD',
  'BN',
  'BS',
  'BW',
  'BZ',
  'CA',
  'CM',
  'CY',
  'DM',
  'FJ',
  'GA',
  'GB',
  'GD',
  'GH',
  'GM',
  'GY',
  'IN',
  'JM',
  'KE',
  'KI',
  'KN',
  'LC',
  'LK',
  'LS',
  'MT',
  'MU',
  'MV',
  'MW',
  'MY',
  'MZ',
  'NA',
  'NG',
  'NR',
  'NZ',
  'PG',
  'PK',
  'RW',
  'SB',
  'SC',
  'SG',
  'SL',
  'SZ',
  'TG',
  'TO',
  'TT',
  'TV',
  'TZ',
  'UG',
  'VC',
  'VU',
  'WS',
  'ZA',
  'ZM',
]; // 2114
export const CISAC_AREA_COMMONWEALTH_AFRICA = [
  'BW',
  'CM',
  'GA',
  'GH',
  'GM',
  'KE',
  'LS',
  'MU',
  'MW',
  'MZ',
  'NA',
  'NG',
  'RW',
  'SC',
  'SL',
  'SZ',
  'TG',
  'TZ',
  'UG',
  'ZA',
  'ZM',
]; // 2115 — GA/RW/TG added, ZW removed (per CISAC DB)
export const CISAC_AREA_COMMONWEALTH_ASIA = ['BD', 'BN', 'CY', 'IN', 'LK', 'MV', 'MY', 'PK', 'SG']; // 2116 — HK removed (expired 1997 per CISAC DB)
export const CISAC_AREA_COMMONWEALTH_AUSTRALASIA = ['AU', 'FJ', 'NZ', 'SB', 'VU']; // 2117
export const CISAC_AREA_CIS = ['AM', 'AZ', 'BY', 'KG', 'KZ', 'MD', 'RU', 'TJ', 'TM', 'UZ']; // 2118 — GE removed (expired 2009), UA removed (expired 2018) per CISAC DB
export const CISAC_AREA_EASTERN_EUROPE = [
  'AL',
  'BG',
  'BY',
  'CZ',
  'EE',
  'HU',
  'LT',
  'LV',
  'MD',
  'PL',
  'RO',
  'RU',
  'SK',
  'TR',
  'UA',
]; // 2119
export const CISAC_AREA_EUROPE = [
  'AD',
  'AL',
  'AT',
  'BA',
  'BE',
  'BG',
  'BY',
  'CH',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GB',
  'GR',
  'HR',
  'HU',
  'IE',
  'IS',
  'IT',
  'LI',
  'LT',
  'LU',
  'LV',
  'MC',
  'MD',
  'ME',
  'MK',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'RS',
  'RU',
  'SE',
  'SI',
  'SK',
  'SM',
  'TR',
  'UA',
  'VA',
]; // 2120
export const CISAC_AREA_EEA = [
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'HU',
  'IE',
  'IS',
  'IT',
  'LI',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
]; // 2121 — GB removed (Brexit 2020), HR added per CISAC DB
export const CISAC_AREA_EUROPEAN_CONTINENT = [
  'AD',
  'AL',
  'AT',
  'BA',
  'BE',
  'BG',
  'BY',
  'CH',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'HU',
  'IT',
  'LI',
  'LT',
  'LU',
  'LV',
  'MC',
  'MD',
  'ME',
  'MK',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'RS',
  'RU',
  'SE',
  'SI',
  'SK',
  'SM',
  'TR',
  'UA',
  'VA',
]; // 2122
export const CISAC_AREA_EU = [
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
]; // 2123 — GB removed (Brexit, expired 2020-01-31 per CISAC DB)
export const CISAC_AREA_GSA = ['AT', 'CH', 'DE']; // 2124
export const CISAC_AREA_MIDDLE_EAST = [
  'AE',
  'AF',
  'BD',
  'BH',
  'BT',
  'IN',
  'IQ',
  'IR',
  'JO',
  'KW',
  'LK',
  'MN',
  'MV',
  'NP',
  'OM',
  'PK',
  'QA',
  'SA',
  'YE',
]; // 2125
export const CISAC_AREA_NAFTA = ['CA', 'MX', 'PR', 'US']; // 2126
export const CISAC_AREA_NORDIC = ['DK', 'FI', 'IS', 'NO', 'SE']; // 2127
export const CISAC_AREA_NORTH_AFRICA = ['DZ', 'EG', 'LY', 'MA', 'TN']; // 2128
export const CISAC_AREA_NORTH_AMERICA = ['CA', 'MX', 'US']; // 2129
export const CISAC_AREA_OCEANIA = [
  'AU',
  'FJ',
  'FM',
  'KI',
  'MH',
  'NC',
  'NR',
  'NZ',
  'PF',
  'PG',
  'PW',
  'SB',
  'TO',
  'TV',
  'VU',
  'WS',
]; // 2130
export const CISAC_AREA_SCANDINAVIA = ['DK', 'NO', 'SE']; // 2131
export const CISAC_AREA_SOUTH_AMERICA = ['AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'GY', 'PE', 'PY', 'SR', 'UY', 'VE']; // 2132
export const CISAC_AREA_SOUTH_EAST_ASIA = ['BN', 'ID', 'KH', 'LA', 'MM', 'MY', 'PH', 'SG', 'TH', 'TL', 'VN']; // 2133
export const CISAC_AREA_WEST_INDIES = [
  'AG',
  'BB',
  'BS',
  'CU',
  'DM',
  'DO',
  'GD',
  'HT',
  'JM',
  'KN',
  'LC',
  'PR',
  'TT',
  'VC',
]; // 2134
export const CISAC_AREA_WORLD = [...CISAC_APPROVED_COUNTRIES_CODES]; // 2136

// Maps TIS-N area codes (2100–2136) to their member country ISO-2 arrays
export const CISAC_AREAS: Record<number, string[]> = {
  2100: CISAC_AREA_AFRICA,
  2101: CISAC_AREA_AMERICA,
  2102: CISAC_AREA_AMERICAN_CONTINENT,
  2103: CISAC_AREA_ANTILLES,
  2104: CISAC_AREA_APEC,
  2105: CISAC_AREA_ASEAN,
  2106: CISAC_AREA_ASIA,
  2107: CISAC_AREA_AUSTRALASIA,
  2108: CISAC_AREA_BALKANS,
  2109: CISAC_AREA_BALTIC_STATES,
  2110: CISAC_AREA_BENELUX,
  2111: CISAC_AREA_BRITISH_ISLES,
  2112: CISAC_AREA_BRITISH_WEST_INDIES,
  2113: CISAC_AREA_CENTRAL_AMERICA,
  2114: CISAC_AREA_COMMONWEALTH,
  2115: CISAC_AREA_COMMONWEALTH_AFRICA,
  2116: CISAC_AREA_COMMONWEALTH_ASIA,
  2117: CISAC_AREA_COMMONWEALTH_AUSTRALASIA,
  2118: CISAC_AREA_CIS,
  2119: CISAC_AREA_EASTERN_EUROPE,
  2120: CISAC_AREA_EUROPE,
  2121: CISAC_AREA_EEA,
  2122: CISAC_AREA_EUROPEAN_CONTINENT,
  2123: CISAC_AREA_EU,
  2124: CISAC_AREA_GSA,
  2125: CISAC_AREA_MIDDLE_EAST,
  2126: CISAC_AREA_NAFTA,
  2127: CISAC_AREA_NORDIC,
  2128: CISAC_AREA_NORTH_AFRICA,
  2129: CISAC_AREA_NORTH_AMERICA,
  2130: CISAC_AREA_OCEANIA,
  2131: CISAC_AREA_SCANDINAVIA,
  2132: CISAC_AREA_SOUTH_AMERICA,
  2133: CISAC_AREA_SOUTH_EAST_ASIA,
  2134: CISAC_AREA_WEST_INDIES,
  2136: CISAC_AREA_WORLD,
};

// A mapping of all territories (countries, areas, continents, world) to their member country ISO-2 codes or arrays
// Note: this contains areas e.g. EU, Commonwealth - you're probably looking for just CISAC_APPROVED_COUNTRIES if you want single countries only
export const CISAC_ALL_TERRITORIES: Record<number, string | string[]> = {
  ...CISAC_APPROVED_COUNTRIES,
  ...CISAC_AREAS,
};

export default {
  // CISAC Constants
  CISAC_APPROVED_COUNTRIES,
  CISAC_APPROVED_TERRITORIES,
  CISAC_APPROVED_TERRITORIES_CODES,
  CISAC_APPROVED_TERRITORIES_REVERSED,
  CISAC_APPROVED_COUNTRIES_CODES,
  CISAC_APPROVED_COUNTRIES_COUNT,

  // Areas
  CISAC_COUNTRIES_AFRICA,
  CISAC_COUNTRIES_AMERICAS,
  CISAC_COUNTRIES_ASIA,
  CISAC_COUNTRIES_EUROPE,
  CISAC_COUNTRIES_OCEANIA,

  // CISAC Area arrays (TIS-N 2100–2136)
  CISAC_AREAS,
  CISAC_AREA_AFRICA,
  CISAC_AREA_AMERICA,
  CISAC_AREA_AMERICAN_CONTINENT,
  CISAC_AREA_ANTILLES,
  CISAC_AREA_APEC,
  CISAC_AREA_ASEAN,
  CISAC_AREA_ASIA,
  CISAC_AREA_AUSTRALASIA,
  CISAC_AREA_BALKANS,
  CISAC_AREA_BALTIC_STATES,
  CISAC_AREA_BENELUX,
  CISAC_AREA_BRITISH_ISLES,
  CISAC_AREA_BRITISH_WEST_INDIES,
  CISAC_AREA_CENTRAL_AMERICA,
  CISAC_AREA_COMMONWEALTH,
  CISAC_AREA_COMMONWEALTH_AFRICA,
  CISAC_AREA_COMMONWEALTH_ASIA,
  CISAC_AREA_COMMONWEALTH_AUSTRALASIA,
  CISAC_AREA_CIS,
  CISAC_AREA_EASTERN_EUROPE,
  CISAC_AREA_EUROPE,
  CISAC_AREA_EEA,
  CISAC_AREA_EUROPEAN_CONTINENT,
  CISAC_AREA_EU,
  CISAC_AREA_GSA,
  CISAC_AREA_MIDDLE_EAST,
  CISAC_AREA_NAFTA,
  CISAC_AREA_NORDIC,
  CISAC_AREA_NORTH_AFRICA,
  CISAC_AREA_NORTH_AMERICA,
  CISAC_AREA_OCEANIA,
  CISAC_AREA_SCANDINAVIA,
  CISAC_AREA_SOUTH_AMERICA,
  CISAC_AREA_SOUTH_EAST_ASIA,
  CISAC_AREA_WEST_INDIES,
  CISAC_AREA_WORLD,

  // Util Constants
  AREA_CODES,
  CONTINENT_CODES,
  ALL_WORLD_CODE,
  CISAC_ALL_TERRITORIES,
};
