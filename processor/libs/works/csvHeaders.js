// Headers for the main Works CSV export
const workHeaders = [
  'ID',
  'Title',
  'Composers',
  'Foreign ID',
  'Project ID',
  'Party No',
  'Main Identifier',
  'ISWC',
  'Tunecode',
  'Copyright Date',
  'Label Copy',
  'Priority Work',
  'Production Library Work',
  'Category', 'Language',
  'Composite Type',
  'No. of Composite Works',
  'Work Version',
  'Arrangement Type',
  'Lyric Adaption',
  'Performers',
  'Track ISRCs',
  'Territories',
  'Catalogue Groups',
  'Aliases', 'Notes',
];

// Headers for the lite Works CSV export
const workLiteHeaders = [
  'ID',
  'Title',
  'Composers',
  'Foreign ID',
  'Project ID',
  'Party No',
  'Main Identifier',
  'ISWC',
  'Tunecode',
  'Copyright Date',
  'Label Copy',
  'Performers',
  'Track ISRCs',
  'Territories',
  'Catalogue Groups',
  'Aliases',
  'Notes',
];

const alternateTitlesHeaders = [
  'Work ID', 'Work Title', 'Work Main Identifier', 'Work Tunecode', 'Alternate Title', 'Language',
];

const participatorsHeaders = [
  'Work ID', 'Work Title', 'Work Main Identifier', 'Work Tunecode', 'Contract', 'Rate',
];

const specificParticipationRatesHeaders = [
  'Work ID', 'Work Title', 'Work Main Identifier', 'Work Tunecode', 'Contract', 'Distribution Channel', 'Source', 'Territory', 'Rate',
];

const societyIdentifiersHeaders = [
  'Work ID', 'Work Title', 'Work Main Identifier', 'Work Tunecode', 'Society', 'Identifier',
];

// Headers for the Rights Chains CSV export
const ipChainHeaders = [
  'Work ID', 'Work Title', 'Work Main Identifier', 'Work Tunecode', 'Territory', 'Participant 1 Type', 'Participant 1 Name', 'Participant 1 First Name', 'Participant 1 Middle Name', 'Participant 1 Surname', 'Participant 1 CAE Number', 'Participant 1 Controlled', 'Participant 1 Mechanical Owned', 'Participant 1 Mechanical Collected', 'Participant 1 Performance Owned', 'Participant 1 Performance Collected', 'Participant 1 Capacity', 'Participant 2 Type', 'Participant 2 Name', 'Participant 2 First Name', 'Participant 2 Middle Name', 'Participant 2 Surname', 'Participant 2 CAE Number', 'Participant 2 Controlled', 'Participant 2 Mechanical Owned', 'Participant 2 Mechanical Collected', 'Participant 2 Performance Owned', 'Participant 2 Performance Collected', 'Participant 2 Capacity', 'Participant 3 Type', 'Participant 3 Name', 'Participant 3 First Name', 'Participant 3 Middle Name', 'Participant 3 Surname', 'Participant 3 CAE Number', 'Participant 3 Controlled', 'Participant 3 Mechanical Owned', 'Participant 3 Mechanical Collected', 'Participant 3 Performance Owned', 'Participant 3 Performance Collected', 'Participant 3 Capacity', 'Participant 4 Type', 'Participant 4 Name', 'Participant 4 First Name', 'Participant 4 Middle Name', 'Participant 4 Surname', 'Participant 4 CAE Number', 'Participant 4 Controlled', 'Participant 4 Mechanical Owned', 'Participant 4 Mechanical Collected', 'Participant 4 Performance Owned', 'Participant 4 Performance Collected', 'Participant 4 Capacity', 'Participant 5 Type', 'Participant 5 Name', 'Participant 5 First Name', 'Participant 5 Middle Name', 'Participant 5 Surname', 'Participant 5 CAE Number', 'Participant 5 Controlled', 'Participant 5 Mechanical Owned', 'Participant 5 Mechanical Collected', 'Participant 5 Performance Owned', 'Participant 5 Performance Collected', 'Participant 5 Capacity', 'Participant 6 Type', 'Participant 6 Name', 'Participant 6 First Name', 'Participant 6 Middle Name', 'Participant 6 Surname', 'Participant 6 CAE Number', 'Participant 6 Controlled', 'Participant 6 Mechanical Owned', 'Participant 6 Mechanical Collected', 'Participant 6 Performance Owned', 'Participant 6 Performance Collected', 'Participant 6 Capacity', 'Participant 7 Type', 'Participant 7 Name', 'Participant 7 First Name', 'Participant 7 Middle Name', 'Participant 7 Surname', 'Participant 7 CAE Number', 'Participant 7 Controlled', 'Participant 7 Mechanical Owned', 'Participant 7 Mechanical Collected', 'Participant 7 Performance Owned', 'Participant 7 Performance Collected', 'Participant 7 Capacity', 'Participant 8 Type', 'Participant 8 Name', 'Participant 8 First Name', 'Participant 8 Middle Name', 'Participant 8 Surname', 'Participant 8 CAE Number', 'Participant 8 Controlled', 'Participant 8 Mechanical Owned', 'Participant 8 Mechanical Collected', 'Participant 8 Performance Owned', 'Participant 8 Performance Collected', 'Participant 8 Capacity', 'Participant 9 Type', 'Participant 9 Name', 'Participant 9 First Name', 'Participant 9 Middle Name', 'Participant 9 Surname', 'Participant 9 CAE Number', 'Participant 9 Controlled', 'Participant 9 Mechanical Owned', 'Participant 9 Mechanical Collected', 'Participant 9 Performance Owned', 'Participant 9 Performance Collected', 'Participant 9 Capacity', 'Participant 10 Type', 'Participant 10 Name', 'Participant 10 First Name', 'Participant 10 Middle Name', 'Participant 10 Surname', 'Participant 10 CAE Number', 'Participant 10 Controlled', 'Participant 10 Mechanical Owned', 'Participant 10 Mechanical Collected', 'Participant 10 Performance Owned', 'Participant 10 Performance Collected', 'Participant 10 Capacity',
];

// Headers for the Partner Rights Chains CSV export
const partnerIpChainsHeaders = [...ipChainHeaders.slice(0, 5), 'Delivery Partner', ...ipChainHeaders.slice(5)];

module.exports = {
  workHeaders,
  workLiteHeaders,
  alternateTitlesHeaders,
  participatorsHeaders,
  specificParticipationRatesHeaders,
  societyIdentifiersHeaders,
  ipChainHeaders,
  partnerIpChainsHeaders,
};
