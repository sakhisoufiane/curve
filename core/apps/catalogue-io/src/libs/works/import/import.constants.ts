// @ts-expect-error — no type declarations for platform-shared-utils
import { TerritoryHelper } from '@curveroyaltysystems/curve-shared-logic';
import type { TemplateEntry } from './import.types';

export const allTerritories: string[] = [
  ...(TerritoryHelper.allTerritories as string[]),
  'WW', 'World', 'Europe', 'Asia', 'Oceania', 'Americas', 'Africa',
];

export const IMPORT_FILES = {
  WORKS: 'works',
  ALTERNATE_TITLES: 'alternate_titles',
  IP_CHAINS: 'ip_chains',
  PARTICIPATORS: 'participators',
  PARTNER_IP_CHAINS: 'partner_ip_chains',
  SOCIETY_IDENTIFIERS: 'society_identifiers',
  SPECIFIC_PARTICIPATION_RATES: 'specific_participation_rates',
} as const;

export type ImportFileName = (typeof IMPORT_FILES)[keyof typeof IMPORT_FILES];

// ---------------------------------------------------------------------------
// CSV import templates
// ---------------------------------------------------------------------------

export const WORKS_TEMPLATE: TemplateEntry[] = [
  { key: '_id' }, { key: 'title' }, { key: 'composer' }, { key: 'foreignId' }, { key: 'projectId' },
  { key: 'partyNo', ignore: true }, { key: 'identifier' }, { key: 'iswc' }, { key: 'tunecode' },
  { key: 'copyrightDate', type: 'Date' }, { key: 'labelCopy' }, { key: 'priority', type: 'Boolean' },
  { key: 'productionLibrary', type: 'Boolean' }, { key: 'workDescriptionCategory' }, { key: 'workLanguage' },
  { key: 'compositeType' }, { key: 'compositeCount' }, { key: 'versionType' }, { key: 'arrangementType' },
  { key: 'lyricAdaptionType' }, { key: 'performers', type: 'Array', separator: ';' },
  { key: 'trackIsrcs', type: 'Array', separator: ';' }, { key: 'territories', type: 'Array', separator: ';' },
  { key: 'catalogueGroups', type: 'Array', separator: ';' }, { key: 'aliases', type: 'Array', separator: ';' },
  { key: 'notes' },
];

export const LITE_WORKS_TEMPLATE: TemplateEntry[] = [
  { key: '_id' }, { key: 'title' }, { key: 'composer' }, { key: 'foreignId' }, { key: 'projectId' },
  { key: 'partyNo', ignore: true }, { key: 'identifier' }, { key: 'iswc' }, { key: 'tunecode' },
  { key: 'copyrightDate', type: 'Date' }, { key: 'labelCopy' },
  { key: 'performers', type: 'Array', separator: ';' }, { key: 'trackIsrcs', type: 'Array', separator: ';' },
  { key: 'territories', type: 'Array', separator: ';' }, { key: 'catalogueGroups', type: 'Array', separator: ';' },
  { key: 'aliases', type: 'Array', separator: ';' }, { key: 'notes' },
];

export const ALTERNATE_TITLES_TEMPLATE: TemplateEntry[] = [
  { key: '_id' }, { key: 'title' }, { key: 'identifier' }, { key: 'tunecode' },
  { key: 'altTitle' }, { key: 'language' },
];

export const PARTICIPATORS_TEMPLATE: TemplateEntry[] = [
  { key: '_id' }, { key: 'title' }, { key: 'identifier' }, { key: 'tunecode' },
  { key: 'contractName' }, { key: 'percentage', type: 'Number' },
];

export const SPECIFIC_RATES_TEMPLATE: TemplateEntry[] = [
  { key: '_id' }, { key: 'title' }, { key: 'identifier' }, { key: 'tunecode' },
  { key: 'contractName' }, { key: 'distributionChannel' }, { key: 'source' },
  { key: 'territory' }, { key: 'percentage', type: 'Number' },
];

export const SOCIETY_IDENTIFIERS_TEMPLATE: TemplateEntry[] = [
  { key: '_id' }, { key: 'title' }, { key: 'identifier' }, { key: 'tunecode' },
  { key: 'society' }, { key: 'societyIdentifier' },
];

function participantTemplateEntries(count: number): TemplateEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const p = `participant${i + 1}`;
    return [
      { key: `${p}Type` }, { key: `${p}Name` }, { key: `${p}FirstName` },
      { key: `${p}MiddleName` }, { key: `${p}Surname` }, { key: `${p}CaeNumber` },
      { key: `${p}Controlled`, type: 'Boolean' as const },
      { key: `${p}MechanicalOwned` }, { key: `${p}MechanicalCollected` },
      { key: `${p}PerformanceOwned` }, { key: `${p}PerformanceCollected` },
      { key: `${p}Capacity` },
    ];
  }).flat();
}

export const IP_CHAINS_TEMPLATE: TemplateEntry[] = [
  { key: '_id' }, { key: 'title' }, { key: 'identifier' }, { key: 'tunecode' }, { key: 'territory' },
  ...participantTemplateEntries(10),
];

export const PARTNER_IP_CHAINS_TEMPLATE: TemplateEntry[] = [
  { key: '_id' }, { key: 'title' }, { key: 'identifier' }, { key: 'tunecode' }, { key: 'territory' }, { key: 'partnerName' },
  ...participantTemplateEntries(10),
];

// ---------------------------------------------------------------------------
// Field validation lists (used in importWork)
// ---------------------------------------------------------------------------

export const WORK_DESCRIPTION_CATEGORIES = ['Pop', 'Jazz', 'Classical', 'Undefined'];

export const WORK_LANGUAGES = [
  'English', 'Arabic', 'Assamese', 'Aymara', 'Azerbaijani', 'Bashkir', 'Basque', 'Bengali', 'Bhutani', 'Bihari', 'Bislama', 'Breton', 'Bulgarian', 'Burmese', 'Byelorussian',
  'Cambodian', 'Catalan', 'Chinese', 'Corsican', 'Croatian', 'Czech', 'Danish', 'Dutch', 'Esperanto', 'Estonian', 'Faeroese', 'Farsi', 'Fiji', 'Finnish', 'French',
  'Frisian', 'Galician', 'Georgian', 'German', 'Greek', 'Greenlandic', 'Guarani', 'Gujarati', 'Hausa', 'Hawaii', 'Hebrew', 'Hindi', 'Hungarian', 'Icelandic',
  'Indonesian', 'Interlingua', 'Interlingue', 'Inupiak', 'Irish', 'Italian', 'Japanese', 'Javanese', 'Kannada', 'Kashmiri', 'Kazakh', 'Kinyarwanda', 'Kirghiz',
  'Kirundi', 'Korean', 'Kurdish', 'Laothian', 'Latin', 'Latvian', 'Lingala', 'Lithuanian', 'Macedonian', 'Malagasy', 'Malay', 'Malayalam', 'Maltese', 'Maori',
  'Marathi', 'Moldavian', 'Mongolian', 'Nauru', 'Ndebele', 'Nepali', 'North Sotho', 'Norwegian', 'Occitan', 'Oriya', 'Oromo', 'Papiamento', 'Pashto', 'Polish',
  'Portuguese', 'Punjabi', 'Quechua', 'Rhaeto-Romance', 'Romanian', 'Russian', 'Samoan', 'Sangro', 'Sanskrit', 'Scots Gaelic', 'Serbian', 'Serbo-Croatian',
  'Sesotho', 'Setswana', 'Shona', 'Sindhi', 'Singhalese', 'Siswati', 'Slovak', 'Slovenian', 'Somali', 'Spanish', 'Sudanese', 'Swahili', 'Swedish', 'Tagalog',
  'Tajik', 'Tamil', 'Tatar', 'Telugu', 'Thai', 'Tibetan', 'Tigrinya', 'Tonga', 'Tsonga', 'Turkish', 'Turkmen', 'Twi', 'Ukranian', 'Urdu', 'Uzbek', 'Venda',
  'Vietnamese', 'Volapuk', 'Welsh', 'Wolof', 'Xhosa', 'Yiddish', 'Yoruba', 'Zu', 'Zulu',
];

export const COMPOSITE_TYPES = ['None', 'Composite of Samples', 'Medley', 'Potpourri', 'Unspecified'];

export const VERSION_TYPES = ['Original Work', 'Modification'];

export const ARRANGEMENT_TYPES = ['Original', 'New Music Added', 'Arrangement', 'Addition of Music to Text', 'Unspecified'];

export const LYRIC_ADAPTION_TYPES = ['Original', 'None', 'New Lyrics Added', 'Modification', 'Replaced', 'Addition of Lyrics to Music', 'Translation', 'Unspecified'];
