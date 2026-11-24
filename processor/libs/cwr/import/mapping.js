const { CwrUtils, Territories } = require('@curveroyaltysystems/curve-shared-logic');

const { CISAC_ALL_TERRITORIES, CISAC_APPROVED_COUNTRIES_COUNT } = Territories;

/**
 * Maps a CWR work description code to a human-readable string.
 * @param {string} value - CWR work description code (e.g. 'POP', 'JAZ').
 * @returns {string|null} Human-readable description, or null if unrecognised.
 */
function mapWorkDescription(value) {
  switch (value) {
    case 'POP':
      return 'Pop';
    case 'JAZ':
      return 'Jazz';
    case 'SER':
      return 'Classical';
    case 'UNC':
      return 'Undefined';
    default:
      return null;
  }
}

/**
 * Maps a two-letter language code to its full language name.
 * @param {string} value - ISO-style two-letter language code (e.g. 'EN', 'FR').
 * @returns {string} Full language name, or empty string if unrecognised.
 */
function mapLanguage(value) {
  const languages = {
    // eslint-disable-next-line max-len
    AR: 'Arabic',
    AS: 'Assamese',
    AY: 'Aymara',
    AZ: 'Azerbaijani',
    BA: 'Bashkir',
    EU: 'Basque',
    BN: 'Bengali',
    DZ: 'Bhutani',
    BH: 'Bihari',
    BI: 'Bislama',
    BR: 'Breton',
    BG: 'Bulgarian',
    MY: 'Burmese',
    BE: 'Byelorussian',
    KM: 'Cambodian',
    CA: 'Catalan',
    ZH: 'Chinese',
    CO: 'Corsican',
    HR: 'Croatian',
    CS: 'Czech',
    DA: 'Danish',
    NL: 'Dutch',
    EN: 'English',
    EO: 'Esperanto',
    ET: 'Estonian',
    FO: 'Faeroese',
    FA: 'Farsi',
    FJ: 'Fiji',
    FI: 'Finnish',
    FR: 'French',
    FY: 'Frisian',
    GL: 'Galician',
    KA: 'Georgian',
    DE: 'German',
    EL: 'Greek',
    KL: 'Greenlandic',
    GN: 'Guarani',
    GU: 'Gujarati',
    HA: 'Hausa',
    HW: 'Hawaii',
    IW: 'Hebrew',
    HI: 'Hindi',
    HU: 'Hungarian',
    IS: 'Icelandic',
    IN: 'Indonesian',
    IA: 'Interlingua',
    IE: 'Interlingue',
    IK: 'Inupiak',
    GA: 'Irish',
    IT: 'Italian',
    JA: 'Japanese',
    JW: 'Javanese',
    KN: 'Kannada',
    KS: 'Kashmiri',
    KK: 'Kazakh',
    RW: 'Kinyarwanda',
    KY: 'Kirghiz',
    RN: 'Kirundi',
    KO: 'Korean',
    KU: 'Kurdish',
    LO: 'Laothian',
    LA: 'Latin',
    LV: 'Latvian',
    LN: 'Lingala',
    LT: 'Lithuanian',
    MK: 'Macedonian',
    MG: 'Malagasy',
    MS: 'Malay',
    ML: 'Malayalam',
    MT: 'Maltese',
    MI: 'Maori',
    MR: 'Marathi',
    MO: 'Moldavian',
    MN: 'Mongolian',
    NA: 'Nauru',
    ND: 'Ndebele',
    NE: 'Nepali',
    'otho NS': 'North',
    NO: 'Norwegian',
    OC: 'Occitan',
    OR: 'Oriya',
    OM: 'Oromo',
    PM: 'Papiamento',
    PS: 'Pashto',
    PL: 'Polish',
    PT: 'Portuguese',
    PA: 'Punjabi',
    QU: 'Quechua',
    'omance RM': 'Rhaeto',
    RO: 'Romanian',
    RU: 'Russian',
    SM: 'Samoan',
    SG: 'Sangro',
    SA: 'Sanskrit',
    'aelic GD': 'Scots',
    SR: 'Serbian',
    'roatian SH': 'Serbo',
    ST: 'Sesotho',
    TN: 'Setswana',
    SN: 'Shona',
    SD: 'Sindhi',
    SI: 'Singhalese',
    SS: 'Siswati',
    SK: 'Slovak',
    SL: 'Slovenian',
    SO: 'Somali',
    ES: 'Spanish',
    SU: 'Sudanese',
    SW: 'Swahili',
    SV: 'Swedish',
    TL: 'Tagalog',
    TG: 'Tajik',
    TA: 'Tamil',
    TT: 'Tatar',
    TE: 'Telugu',
    TH: 'Thai',
    BO: 'Tibetan',
    TI: 'Tigrinya',
    TO: 'Tonga',
    TS: 'Tsonga',
    TR: 'Turkish',
    TK: 'Turkmen',
    TW: 'Twi',
    UK: 'Ukranian',
    UR: 'Urdu',
    UZ: 'Uzbek',
    VE: 'Venda',
    VI: 'Vietnamese',
    VO: 'Volapuk',
    CY: 'Welsh',
    WO: 'Wolof',
    XH: 'Xhosa',
    JI: 'Yiddish',
    YO: 'Yoruba',
    ZU: 'Zulu',
  };
  return languages[value] || '';
}

/**
 * Maps a CWR version type code to a human-readable string.
 * @param {string} value - CWR version type code (e.g. 'MOD').
 * @returns {string} Human-readable version type.
 */
function mapVersionType(value) {
  switch (value) {
    case 'MOD':
      return 'Modification';
    default:
      return 'Original Work';
  }
}

/**
 * Maps a CWR composite type code to a human-readable string.
 * @param {string} value - CWR composite type code (e.g. 'MED', 'COS').
 * @returns {string|null} Human-readable composite type, or null if unrecognised.
 */
function mapCompositeType(value) {
  switch (value) {
    case 'COS':
      return 'Composite of Samples';
    case 'MED':
      return 'Medley';
    case 'POT':
      return 'Potpourri';
    case 'UCO':
      return 'Unspecified';
    default:
      return null;
  }
}

/**
 * Maps a CWR arrangement type code to a human-readable string.
 * @param {string} value - CWR arrangement type code (e.g. 'ARR', 'ORI').
 * @returns {string|null} Human-readable arrangement type, or null if unrecognised.
 */
function mapArrangementType(value) {
  switch (value) {
    case 'ORI':
      return 'Original';
    case 'NEW':
      return 'New Music Added';
    case 'ARR':
      return 'Arrangement';
    case 'ADM':
      return 'Addition of Music to Text';
    case 'UNS':
      return 'Unspecified';
    default:
      return null;
  }
}

/**
 * Maps a CWR lyric adaption type code to a human-readable string.
 * @param {string} value - CWR lyric adaption type code (e.g. 'TRA', 'MOD').
 * @returns {string|null} Human-readable lyric adaption type, or null if unrecognised.
 */
function mapLyricAdaptionType(value) {
  switch (value) {
    case 'ORI':
      return 'Original';
    case 'NON':
      return 'None';
    case 'NEW':
      return 'New Lyrics Added';
    case 'MOD':
      return 'Modification';
    case 'REP':
      return 'Replaced';
    case 'ADL':
      return 'Addition of Lyrics to Music';
    case 'TRA':
      return 'Translation';
    case 'UNS':
      return 'Unspecified';
    default:
      return null;
  }
}

/**
 * Maps a CWR publisher type code to a human-readable string.
 * @param {string} publisherType - CWR publisher type code (e.g. 'E', 'SE').
 * @returns {string|null} Human-readable publisher type, or null if unrecognised.
 */
function mapPublisherType(publisherType) {
  switch (publisherType) {
    case 'AM':
      return 'Admin';
    case 'E':
      return 'Original Publisher';
    case 'SE':
      return 'Sub Publisher';
    case 'AQ':
      return 'Acquirer';
    case 'PA':
      return 'Income Participant';
    default:
      return null;
  }
}

/**
 * Maps a numeric CISAC society code to its acronym.
 * @param {string|number} societyCode - Numeric CISAC society code.
 * @returns {string|undefined} Society acronym, or undefined if unrecognised.
 */
function mapSociety(societyCode) {
  if (societyCode) {
    societyCode = parseInt(societyCode).toString();
    const mappings = {
      0: 'DP',
      1: 'ACUM',
      2: 'ADDAF',
      3: 'AEPI',
      4: 'AGADU',
      5: 'AKM',
      6: 'BUCUDA',
      7: 'APDAYC',
      8: 'APRA',
      9: 'ARTISJUS',
      10: 'ASCAP',
      11: 'AUSTRO-MECHANA',
      12: 'AMCOS',
      13: 'AWA',
      14: 'ARGENTORES',
      15: 'APA',
      16: 'BUMDA',
      17: 'AMRA',
      18: 'BGDA',
      19: 'BMDA',
      20: 'SODRAC',
      21: 'BMI',
      22: 'MCSN',
      23: 'BUMA',
      24: 'BURIDA',
      25: 'BSDA',
      26: 'CASH',
      27: 'CAPAC',
      28: 'LITA',
      29: 'SCD',
      30: 'AMAR',
      31: 'DILIA',
      32: 'FILSCAP',
      33: 'OMDA',
      34: 'HARRY FOX',
      35: 'GEMA',
      36: 'IPRS',
      37: 'BUBEDRA',
      38: 'JASRAC',
      39: 'MUSICAUTOR',
      40: 'KODA',
      41: 'LITERAR-MECHANA',
      42: 'LVG',
      43: 'MCSK',
      44: 'MCPS',
      45: 'BBDA',
      46: 'MRS',
      47: 'BCDA',
      48: 'NCB',
      49: 'ONDA',
      50: 'OSA',
      51: 'PROLITTERIS',
      52: 'PRS',
      53: 'PROCAN',
      54: 'ALCS',
      55: 'SABAM',
      56: 'SACD',
      57: 'SACERAU',
      58: 'SACEM',
      59: 'SACM',
      60: 'SACVEN',
      61: 'SADAIC',
      62: 'SADEMBRA',
      63: 'SAMRO',
      64: 'SOKOJ',
      65: 'SAYCE',
      66: 'SBACEM',
      67: 'SBAT',
      68: 'SDRM',
      69: 'SPA',
      70: 'SOGEM',
      71: 'SESAC',
      72: 'SGAE',
      73: 'SCAM',
      74: 'SIAE',
      75: 'SUISSIMAGE',
      76: 'ACEMLA',
      77: 'STEF',
      78: 'STEMRA',
      79: 'STIM',
      80: 'SUISA',
      81: 'SARRAL',
      82: 'OTPDA',
      83: 'SONECA',
      84: 'SAYCO',
      85: 'SOZA',
      86: 'SICAM',
      87: 'SPACEMF',
      88: 'CMRRA',
      89: 'TEOSTO',
      90: 'TONO',
      91: 'SSA',
      92: 'SOCINADA',
      93: 'UBC',
      94: 'RAO',
      95: 'VG WORT',
      96: 'COTT',
      97: 'ZAIKS',
      98: 'ZIMRA',
      99: 'NS',
      101: 'SOCAN',
      102: 'NASCAM',
      103: 'ACDAM',
      104: 'MACP',
      105: 'MASA',
      106: 'COMPASS',
      107: 'ACAM',
      108: 'CHA',
      109: 'KCI',
      110: 'LATGA-A',
      111: 'HDS-ZAMP',
      112: 'SAZAS',
      113: 'LAA',
      114: 'AGAYC',
      115: 'UCMR-ADA',
      116: 'EAU',
      117: 'MESAM',
      118: 'KOMCA',
      119: 'MCSC',
      120: 'LIRA',
      121: 'VDFS',
      122: 'AKKA/LAA',
      123: 'COSGA',
      124: 'COSOMA',
      125: 'BNDA',
      126: 'MCT',
      127: 'ALBAUTOR',
      128: 'IMRO',
      129: 'SOBODAYCOM',
      130: 'BUTODRA',
      131: 'SADA',
      132: 'BILD-KUNST',
      133: 'ZAMCOPS',
      134: 'SLPRS',
      135: 'SADH',
      136: 'ZAMP - MACÉDOINE',
      137: 'SOFAM',
      138: 'KOPIOSTO',
      139: 'COPY-DAN BILLEDKUNST',
      140: 'UACRR',
      142: 'DALRO',
      143: 'TEATERAUTOR',
      144: 'HAA',
      145: 'DPRS',
      146: 'SPAC',
      147: 'FILMAUTOR',
      148: 'ADAGP',
      149: 'ARS',
      150: 'BEELDRECHT',
      151: 'BONO',
      152: 'BUS',
      153: 'DACS',
      154: 'HUNGART',
      155: 'SOMAAP',
      156: 'VAGA',
      157: 'VBK',
      158: 'VEGAP',
      159: 'VISCOPY',
      160: 'RUPIS',
      161: 'MUST',
      162: 'AMPAL',
      163: 'APG-JAPAN',
      164: 'APSAV',
      165: 'ATN',
      166: 'AUTORARTE',
      167: 'BURAFO',
      168: 'CAL',
      169: 'COSCAP',
      170: 'CPSN',
      171: 'CREAIMAGEN',
      172: 'DGA',
      173: 'DIRECTORES',
      174: 'FLIM JUS',
      175: 'COPYRO',
      176: 'JACAP',
      177: 'KAZAK',
      178: 'KOSA',
      179: 'KUVASTO',
      180: 'MUSIKEDITION',
      181: 'NMPA',
      182: 'PAPPRI',
      183: 'SACK',
      184: 'SARTEC',
      185: 'SESAM',
      186: 'SGDL',
      187: 'SNAC',
      188: 'SOCIETE DE L\u2019IMAGE',
      189: 'SOCINPRO',
      190: 'SOPE',
      191: 'SPACQ',
      192: 'SFF',
      193: 'THE SOCIETY OF AUTHORS',
      194: 'UFFICIO LEGALE',
      195: 'VEVAM',
      196: 'WGA',
      197: 'WGJ',
      198: 'ZAMP ASSOCIATION OF SLOVENIA',
      199: 'ZAPA',
      200: 'MSG',
      201: 'ABRAMUS',
      202: 'ASDAC',
      203: 'AWGACS',
      204: 'SAS',
      205: 'SODART',
      206: 'SUOMEN KIRJAILIJALIITTO',
      207: "THE AUTHOR'S REGISTRY INC.",
      208: 'SGA',
      209: 'ARMAUTHOR',
      210: 'ACCESS',
      212: 'CSCS',
      213: 'DRCC',
      214: 'ECCO',
      215: 'KYRGYZPATENT',
      216: 'SQN',
      217: 'ABRAC',
      218: 'ANACIM',
      219: 'ASSIM',
      220: 'ATIDA',
      221: 'SABEM',
      222: 'FONOPERU',
      223: 'COSOTA',
      224: 'SOMAS',
      225: 'SAIF',
      226: 'AACIMH',
      227: 'SGACEDOM',
      228: 'ROMS',
      229: 'ICG',
      230: 'ADAVIS',
      231: 'AUTVIS',
      232: 'GESTOR',
      233: 'SACEMLUXEMBOURG',
      234: 'UCOSO',
      235: 'SACENC',
      273: 'AMUS',
      300: 'WID CENTRE',
      301: 'GESAC',
      302: 'LATINAUTOR',
      303: 'NORD-DOC',
      304: 'SONGCODE',
      305: 'IMJV',
      306: 'CCL',
      307: 'MISASIA',
      308: 'ECAD',
      309: 'LATINNET',
      310: 'DIVA',
      338: 'EDEM',
      707: 'MUSICMARK',
      708: 'MLC',
      778: 'GMR',
      319: 'ICE',
      275: 'AUTODIA',
      312: 'CISAC',
    };
    return mappings[societyCode];
  }
}

/**
 * Resolves an array of CWR SPT rows into a final list of territory codes.
 * @param {object[]} sptRows - Array of SPT row objects with `territories` and `includeExclusionIndicator` fields.
 * @returns {string[]} Resolved territory codes, collapsed to ['WW'] when worldwide coverage is reached.
 */
function mapTerritories(sptRows) {
  let territories = [];
  if (Array.isArray(sptRows)) {
    sptRows.forEach((sptRow) => {
      let mapping = CISAC_ALL_TERRITORIES[parseInt(sptRow.territories).toString()];
      if (mapping && !Array.isArray(mapping)) {
        mapping = [mapping];
      }
      if (mapping?.length && sptRow.includeExclusionIndicator === 'I') {
        // Add to territories
        territories = [].concat(territories, mapping);
      } else if (sptRow.includeExclusionIndicator === 'E') {
        // Remove from territories (if included)
        mapping.forEach((mappingItem) => {
          const index = territories.indexOf(mappingItem);
          if (index > -1) territories.splice(index, 1);
        });
      }
    });
  }
  territories = CwrUtils.removeUnsupportedTerritories({ territories });
  // keep 2136 as WW and not split down to individual ISO codes
  if (territories.length >= CISAC_APPROVED_COUNTRIES_COUNT) {
    territories = ['WW'];
  }
  return territories;
}

/**
 * Maps a CWR composer/writer role code to a human-readable string.
 * @param {string} composerType - CWR writer role code (e.g. 'A', 'C', 'CA').
 * @returns {string} Human-readable role name, or 'Unknown' if unrecognised.
 */
function mapComposerType(composerType) {
  switch (composerType) {
    case 'A':
      return 'Lyrics';
    case 'C':
      return 'Music';
    case 'CA':
      return 'Lyrics and Music';
    case 'AR':
      return 'Arranger';
    case 'SR':
      return 'Sub Arranger';
    case 'AD':
      return 'Adapter';
    case 'SA':
      return 'Sub Author';
    case 'TR':
      return 'Translator';
    case 'PA':
      return 'Income Participant';
    default:
      return 'Unknown';
  }
}

module.exports = {
  mapWorkDescription,
  mapLanguage,
  mapVersionType,
  mapCompositeType,
  mapArrangementType,
  mapLyricAdaptionType,
  mapPublisherType,
  mapSociety,
  mapTerritories,
  mapComposerType,
};
