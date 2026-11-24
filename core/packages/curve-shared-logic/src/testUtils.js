const fs = require('fs');
const appRootDir = require('app-root-dir').get();

const tmpDir = `${appRootDir}/tmp`;

function makeTmpDir() {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
}

module.exports = {
  makeTmpDir,
};
