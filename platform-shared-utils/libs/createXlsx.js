const fs = require('fs');
const XlsxPopulate = require('xlsx-populate');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');

module.exports = {
  createInTemplate(array, template, callback) {
    if (!array && !template) {
      callback('Data and a template are required', null);
    } else if (!array || array instanceof Array !== true) {
      callback('Data is required to be passed as an array', null);
    } else if (!template) {
      callback('A template is required', null);
    } else if (!fs.existsSync(template)) {
      callback('The passed template does not exist', null);
    } else {
      const output = `${appRootDir}/tmp/createInTemplate-${moment().format('X')}.xlsx`;
      XlsxPopulate.fromFileAsync(template)
        .then((workbook) => {
          for (let i = 0; i < array.length; i += 1) {
            const endRow = array[i].length + 2;
            workbook.sheet(i).range(`A3:ZZ${endRow}`).value(array[i]);
          }
          workbook.find(/[^\x20-\xFF\u0100-\u024F\u0370-\uDFFF]+/g, '');
          workbook.toFileAsync(output).then(() => {
            callback(null, output);
          });
        });
    }
  },
  deliverFile(filePath, res) {
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Length': stat.size,
    });
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    readStream.on('end', () => {
      // Delete file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  },
};
