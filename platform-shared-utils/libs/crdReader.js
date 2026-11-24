const detectVersion = require('./crd/versionDetector');
const V2Reader = require('./crd/v2Reader');
const V4Reader = require('./crd/v4Reader');

const crdReaderObject = function () {
  this.readCrdFile = function (file, encoding, callback) {
    // Determine which CRD version the file is
    detectVersion(file, encoding)
      .then(({ version, prs }) => {
        // Create the correct reader based on the detected version
        let reader;
        if (version.startsWith('2')) {
          reader = new V2Reader();
        } else if (version.startsWith('4')) {
          reader = new V4Reader(version, prs);
        } else {
          callback(new Error(`Unsupported CRD version: ${version}`));
        }

        // Delegate to the reader to read the file
        reader.readCrdFile(file, encoding, callback);
      })
      .catch((error) => callback(error));
  };
};

module.exports = crdReaderObject;
