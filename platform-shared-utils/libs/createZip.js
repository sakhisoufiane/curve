const async = require('async');
const fs = require('fs');
const archiver = require('archiver');
const sanitize = require('sanitize-filename');
const logger = require('./logger');
const fileManager = require('./fileManager');

// console.log('===========Running createZip in local platform-shared-utils');

module.exports = {
  localFiles(files, targetLocation, callback) {
    const createZip = this;
    // Convert any file strings into objects
    let fileObjects = createZip.checkFilesAreObjects(files);
    // Fix any duplicates with a number on the end
    fileObjects = createZip.checkForDuplicateFiles(fileObjects);
    // create a file to stream archive data to.
    const output = fs.createWriteStream(targetLocation);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Sets the compression level.
    });

    // pipe archive data to the file
    archive.pipe(output);

    async.eachSeries(fileObjects, (file, cb) => {
      // append a file
      logger.debug(file.filename);
      const readStream = fs.createReadStream(file.localFile);
      archive.append(readStream, { name: file.filename });
      readStream.on('end', () => {
        logger.debug(`File added: ${file.filename}`);
        cb();
      });
    }, (err) => {
      archive.finalize(() => {
        logger.debug('Archive Finalised');
      });
      output.on('close', () => {
        logger.debug('Zip closed');
        callback(null, targetLocation);
      });
    });
  },
  s3Files(files, bucket, targetLocation, callback) {
    const createZip = this;
    const downloadedFiles = [];
    const s3Options = {
      addTimestamp: true,
    };
    async.eachSeries(files, (file, cb) => {
      fileManager.downloadFromS3(file, bucket, s3Options, (err, localFile) => {
        downloadedFiles.push(localFile);
        cb(err);
      });
    }, (err) => {
      if (err) {
        callback(err);
      } else {
        createZip.localFiles(downloadedFiles, targetLocation, (zipErr, file) => {
          createZip.deleteLocalFiles(downloadedFiles, () => {
            callback(zipErr, file);
          });
        });
      }
    });
  },
  deleteLocalFiles(files, callback) {
    async.each(files, (file, cb) => {
      if (file.localFile && fs.existsSync(file.localFile)) {
        fs.unlinkSync(file.localFile);
      } else if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
      cb();
    }, callback);
  },
  checkForDuplicateFiles(files) {
    const processedFiles = {};
    return files.map((file) => {
      if (!processedFiles[file.filename]) {
        processedFiles[file.filename] = 0;
      }

      processedFiles[file.filename] += 1;

      if (processedFiles[file.filename] > 1) {
        const filename = file.filename.substr(0, file.filename.lastIndexOf('.'));
        const fileExtension = file.filename.substr(file.filename.lastIndexOf('.') + 1);
        file.filename = `${filename} ${processedFiles[file.filename]}.${fileExtension}`;
      }
      return file;
    });
  },
  checkFilesAreObjects(files) {
    // If a file is a string, turn into an object keeping the filename and localFile the same.
    return files.map((file) => {
      let fileObj = file;
      if (typeof file === 'string') {
        fileObj = { filename: sanitize(file.split('/').pop()), localFile: file };
      }
      return fileObj;
    });
  },
};
