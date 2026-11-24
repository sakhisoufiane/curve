const csv = require('fast-csv');
const fs = require('fs');

const logger = require('./logger');

const axfReader = function () {
  // TODO: remove axf = this and replace axf with axfReader?
  const axf = this;
  axf.axfData = {}; // TODO: this doesn't seem to be used anywhere?
  axf.amountDecimalPlaces = 3; // TODO: this doesn't seem to be used anywhere?

  this.readAxfFile = function (file, encoding, callback) {
    axf.workDistIdx = 0; // TODO: this doesn't seem to be used anywhere?
    try {
      const options = encoding ? { encoding } : {};
      const stream = fs.createReadStream(file, options);

      const outputData = [];
      let r01Data = {};
      let r02Data = {};
      let r04Data = {};
      const csvStream = csv.parse({ delimiter: ',' })
        .on('data', (line) => {
          // Read lines based on specific data
          if (line[0] === 'R01') {
            r01Data = axf.readR01Line(line);
          } else if (line[0] === 'R02') {
            r02Data = axf.readR02Line(line);
          } else if (line[0] === 'R03') {
            r02Data = axf.readR03Line(line);
          } else if (line[0] === 'R04') {
            r04Data = axf.readR04Line(line);
            // Build row in data for each R04 line
            const row = [
              r01Data.dateFrom,
              r01Data.dateFrom,
              r01Data.dateTo,
              r01Data.territory,
              r01Data.subSource,
              r04Data.workTitle,
              r04Data.composers,
              r04Data.publishers,
              r04Data.composers,
              null,
              null,
              null,
              r02Data.description,
              r04Data.ownershipType,
              null,
              r04Data.identifier,
              r04Data.songcode,
              r04Data.iswc,
              r04Data.isrc,
              r02Data.barcode,
              r02Data.catNo,
              r04Data.units,
              r04Data.netAmount,
              null,
              r04Data.netAmount,
              r01Data.currency,
              r04Data.sharePercentage,
            ];
            outputData.push(row);
          }
        })
        .on('end', () => {
          callback(null, outputData);
        })
        .on('error', (err) => {
          logger.error(err);
          callback(err);
        });

      stream.pipe(csvStream, { delimiter: ',' });
    } catch (err) {
      if (err.message === 'path must be a string or Buffer') {
        callback(new Error('File does not exist'));
      } else {
        logger.error(err);
        callback(new Error('There was an error reading the AXF file. Check file is valid.'));
      }
    }
  };
  this.readR01Line = function (line) {
    return {
      subSource: line[1],
      dateFrom: axf.formatDate(line[2]),
      dateTo: axf.formatDate(line[3]),
      currency: line[4],
      territory: line[5],
      reference: line[6],
      saleDate: line[7],
      totalValue: line[8],
      cae: line[9],
      publisherName: line[10],
      publisherType: line[11],
    };
  };
  this.readR02Line = function (line) {
    return {
      dateFrom: axf.formatDate(line[1]),
      dateTo: axf.formatDate(line[2]),
      catNo: line[3],
      releaseTitle: line[4],
      formatCode: line[5],
      packagingCode: line[6],
      noOfSongsOnProduct: line[7],
      calculationBasis: line[8],
      duration: line[9],
      basePrice: line[10],
      royaltyRate: line[11],
      royaltyRebate: line[12],
      royaltyPerSong: line[13],
      durationOfVideo: line[14],
      productionCode: line[15],
      artists: line[16],
    };
  };
  this.readR03Line = function (line) {
    return {
      dateFrom: axf.formatDate(line[1]),
      dateTo: axf.formatDate(line[2]),
      description: line[3],
    };
  };
  this.readR04Line = function (line) {
    return {
      identifier: line[1],
      workTitle: line[2],
      units: line[3],
      sharePercentage: axf.addDecimalpoint(line[4], 3),
      netAmount: axf.addDecimalpoint(line[5], 2),
      ownershipType: axf.mapOwnership(line[6]),
      retentions: line[7],
      songcode: line[8],
      internationalCode: line[9],
      isrc: line[10],
      composers: line[11],
      publishers: line[12],
      duration: line[13],
      background: line[14],
      license: line[15],
      reference: line[16],
    };
  };
  this.addDecimalpoint = function (str, decimalPlaces) {
    if (!str || str === '') return 0;
    let formatted = Number(str) / (10 ** decimalPlaces);
    formatted = Number(formatted).toFixed(decimalPlaces);
    return formatted;
  };
  this.formatDate = function (dateStr) {
    if (!dateStr || dateStr === '') return '00/00/0000';
    return `${dateStr.substr(0, 2)}/${dateStr.substr(2, 2)}/${dateStr.substr(4, 4)}`;
  };
  this.mapOwnership = function (value) {
    const mappings = {
      MEC: 'Mechanical',
      PER: 'Performance',
      SYN: 'Synchronisation',
      PRI: 'Print',
      COV: 'Cover',
      FIL: 'Film Performance',
      SHE: 'Sheet Sales',
    };
    if (mappings[value]) {
      return mappings[value];
    }
    return value;
  };
};

module.exports = axfReader;
