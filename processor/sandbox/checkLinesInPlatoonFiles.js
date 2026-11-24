const fs = require('fs');
const readline = require('readline');
const path = require('path');

let totalLines = 0;

fs.readdir('./tmp/Platoon SAP Files 1720640734', (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  const playDataFiles = files.filter(file => file.includes('PLAYDATA'));

  let filesProcessed = 0;

  playDataFiles.forEach(file => {
    const rl = readline.createInterface({
      input: fs.createReadStream(path.join('./tmp', file)),
      crlfDelay: Infinity
    });

    let lineCount = 0;

    rl.on('line', (line) => {
      if (lineCount > 0) { // ignore the title row
        totalLines++;
      }
      lineCount++;
    });

    rl.on('close', () => {
      console.log(lineCount);
      filesProcessed++;
      if (filesProcessed === playDataFiles.length) {
        console.log('Total lines:', totalLines);
      }
    });
  });
});