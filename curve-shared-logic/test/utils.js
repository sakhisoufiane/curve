const fs = require('fs');
const { noop } = require('lodash');
const appRootDir = require('app-root-dir').get();

const tmpDir = `${appRootDir}/tmp`;

// Util method for generating a CWR file with specified works
// Returns path to file for reading
async function generateCWR({ filename, cwr, works = [], groupType = 'REV', territory }) {
  return new Promise((resolve, reject) => {
    cwr.addHeader('REV');
    cwr.addWorks(works, groupType, territory, (addWorksErr) => {
      if (addWorksErr) reject(addWorksErr);
      else {
        cwr.addTrailer();
        cwr.close(() => {
          const location = `${tmpDir}/${filename ?? cwr.fileName()}`;
          cwr.writeToFile(location, (writeErr) => {
            if (writeErr) reject(writeErr);
            else resolve(location);
          });
        });
      }
    });
  });
}

// Open a CWR file and split by newline for convenience
function openCWR(filepath) {
  const file = fs.readFileSync(filepath);
  return file.toString().split(/\r?\n/);
}

// Util method that combines both generation and opening of the CWR file
async function exportCwr(generateCwrArgs) {
  const filepath = await generateCWR(generateCwrArgs);
  return openCWR(filepath);
}

function makeTmpDir() {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
}

// Util for getting work subsections of a CWR file
function getWorkLines(lines, work) {
  const revSections = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith('REV')) {
      const section = [];
      for (let j = i; j < lines.length; j += 1) {
        if (j !== i && lines[j].startsWith('REV')) break;
        section.push(lines[j]);
      }
      revSections.push(section);
      if (lines[i].includes(work?.identifier)) {
        return section;
      }
    }
  }
  return revSections;
}

// Util for parsing CWR lines with CwrReader
function parseLines(lines, cwrReader, originalWork) {
  if (!originalWork) throw new Error('Original work not defined, make sure it exists in works.json');
  const work = {};
  const workLines = getWorkLines(lines, originalWork);
  for (const line of workLines) cwrReader.readWorkLine(line, null, work, noop);
  return work;
}

module.exports = {
  exportCwr,
  makeTmpDir,
  getWorkLines,
  parseLines,
};
