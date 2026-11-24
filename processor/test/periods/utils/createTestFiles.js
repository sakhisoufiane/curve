const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const mongoose = require('@curveroyaltysystems/models/mongoose');

const { ObjectId } = mongoose.Types;

const periodsData = `${appRootDir}/test/periods/data`;
const testFilesFolder = `${appRootDir}/test/periods/test_files__do_not_edit`;
const testTemplate = fs.readFileSync(`${appRootDir}/test/periods/periods.integration.template.js`);
for (const periodId of fs.readdirSync(periodsData)) {
  if (ObjectId.isValid(periodId)) {
    const periodFile = `const periodId = '${periodId}';\n${testTemplate}`;

    fs.writeFileSync(`${testFilesFolder}/${periodId}.integration.test.js`, periodFile);
  }
}
