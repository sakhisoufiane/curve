/* eslint-disable no-await-in-loop */
const fs = require('fs');
const archiver = require('archiver');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');

async function addFileToZip(filePath, zipStream, fileNamesInZip) {
  let fileName = filePath.split('/').pop();
  // This is needed for the edge case where Contracts share the same name and therefore generate the same statement file name
  // ZIPs only allow unique file names, so without this some files will be skipped
  if (fileNamesInZip.includes(fileName)) {
    const extIndex = fileName.lastIndexOf('.');
    const baseName = extIndex !== -1 ? fileName.substring(0, extIndex) : fileName;
    const ext = extIndex !== -1 ? fileName.substring(extIndex) : '';
    const existing = fileNamesInZip.filter((f) => f.startsWith(baseName));
    const existingCount = (existing.length + 1).toString().padStart(2, '0');
    fileName = `${baseName} ${existingCount}${ext}`;
  }
  const fileAdded = new Promise((resolve, reject) => {
    const onError = (err) => {
      zipStream.removeListener('entry', onEntry);
      reject(err);
    };
    const onEntry = () => {
      zipStream.removeListener('error', onError);
      resolve();
    };
    zipStream.once('error', onError);
    zipStream.once('entry', onEntry);
  });
    // Add to zip and wait for entry event to confirm it has finished writing
  zipStream.file(filePath, { name: fileName });
  await fileAdded;
  // Remove file once it's been added to the zip
  fs.unlinkSync(filePath);
  return fileName;
}

function createZipStream(filePath) {
  const outputStream = fs.createWriteStream(filePath);
  const zipStream = archiver('zip', { zlib: { level: 9 } });
  zipStream.pipe(outputStream);
  return { outputStream, zipStream };
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  const fileSizeBytes = stats.size;
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  return Math.round(fileSizeMB);
}

async function closeStream(outputStream, zipStream) {
  await new Promise((resolve, reject) => {
    const onError = (err) => {
      outputStream.removeListener('close', onClose);
      reject(err);
    };
    const onClose = () => {
      outputStream.removeListener('error', onError);
      resolve();
    };
    outputStream.once('error', onError);
    outputStream.once('close', onClose);
    zipStream.finalize();
  });
}

async function uploadFile(fileLocation, fileKey) {
  await new Promise((resolve, reject) => {
    fileManager.uploadToS3(fileKey, fileLocation, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

async function getSignedS3Urls(fileKeys) {
  const urls = [];
  for (const fileKey of fileKeys) {
    const signedUrl = await new Promise((resolve, reject) => {
      fileManager.publicLink7Days(fileKey, (err, signedUrl) => {
        if (err) reject(err);
        else resolve(signedUrl);
      });
    });
    urls.push({ name: fileKey.split('/').pop(), url: signedUrl });
  }
  return urls;
}

module.exports = {
  addFileToZip,
  createZipStream,
  getFileSize,
  closeStream,
  uploadFile,
  getSignedS3Urls,
};
