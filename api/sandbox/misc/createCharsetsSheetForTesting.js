const appRootDir = require('app-root-dir').get();
const config = require('../config.json');
const { createXlsx } = require('@curveroyaltysystems/platform-shared-utils');

const charsets = [
  { name: 'Latin Extended-A', start: 0x0100, end: 0x017F },
  { name: 'Latin Extended-B', start: 0x0180, end: 0x024F },
  { name: 'Greek', start: 0x0370, end: 0x03FF },
  { name: 'Cyrillic', start: 0x0400, end: 0x04FF },
  { name: 'Greek Extended', start: 0x1F00, end: 0x1FFF },
  { name: '0370-0FFF', start: 0x0370, end: 0x0FFF },
  { name: '1000-1FFF', start: 0x1000, end: 0x1FFF },
  { name: '2000-2FFF', start: 0x2000, end: 0x2FFF },
  { name: '3000-3FFF', start: 0x3000, end: 0x3FFF },
  { name: '4000-4FFF', start: 0x4000, end: 0x4DBF },
  { name: '5000-5FFF', start: 0x5000, end: 0x5FFF },
  { name: '6000-6FFF', start: 0x6000, end: 0x6FFF },
  { name: '7000-7FFF', start: 0x7000, end: 0x7FFF },
  { name: '8000-8FFF', start: 0x8000, end: 0x8FFF },
  { name: '9000-9FFF', start: 0x9000, end: 0x9FFF },
  { name: 'A000-AFFF', start: 0xA000, end: 0xAFFF },
  { name: 'B000-BFFF', start: 0xB000, end: 0xBFFF },
  { name: 'C000-CFFF', start: 0xC000, end: 0xCFFF },
  { name: 'D000-DFFF', start: 0xD000, end: 0xDFFF },
];

const data = charsets.map((charset) => {
  let chars = '';
  for (let i = charset.start; i <= charset.end; i+=1) {
    chars += String.fromCharCode(i);
  }
  return ['', charset.name, chars, '', '', `${charset.start}-${charset.end}`];
});

createXlsx.createInTemplate([data], appRootDir + config.exportExcelTemplates.release, (err, filePath) => {
  if (err) { console.error(err) }
  else {
    console.log(`\nCharsets: ${charsets.map((charset) => charset.name).join(', ')}\nwritten to Release Template Combined: ${filePath}`);
    console.log('\nNote: This includes some undefined chars, which is expected as some charset ranges are not completely filled.');
  }
});
