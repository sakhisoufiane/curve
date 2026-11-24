const LineByLineReader = require('line-by-line');

const logger = require('./logger');

const ediReader = function () {
  const edi = this;
  edi.ediData = {}; // TODO: this doesn't seem to be used anywhere?
  edi.amountDecimalPlaces = 3; // TODO: this doesn't seem to be used anywhere?

  this.readEdiFile = function (file, encoding, callback) {
    edi.workDistIdx = 0; // TODO: this doesn't seem to be used anywhere?
    try {
      const outputData = [];
      const options = encoding ? { encoding } : {};
      const lineByLineReader = new LineByLineReader(file, options);
      lineByLineReader
        .on('line', (line) => {
          // Create one row for each type
          // console.log(line);
          // Skip the top row
          if (line[0] === 'P') {
            edi.startDate = line.substr(6, 10).trim();
            edi.endDate = line.substr(16, 10).trim();
            edi.territory = line.substr(77, 2).trim();
            edi.publisherName = line.substr(37, 40).trim();
          }
          if (line[0] !== 'P') {
            const radioAmount = edi.addDecimalpoint(line.substr(20, 8).trim(), 2);
            const tvAmount = edi.addDecimalpoint(line.substr(29, 8).trim(), 2);
            const filmAmount = edi.addDecimalpoint(line.substr(38, 8).trim(), 2);
            const otherAmount = edi.addDecimalpoint(line.substr(47, 8).trim(), 2);
            const nzAmount = edi.addDecimalpoint(line.substr(56, 8).trim(), 2);
            const payTvAmount = edi.addDecimalpoint(line.substr(65, 8).trim(), 2);
            const onlineAmount = edi.addDecimalpoint(line.substr(74, 8).trim(), 2);
            const isNegative = Number(line.substr(13, 5)) === 0;
            [
              { type: 'Radio', amount: radioAmount },
              { type: 'TV', amount: tvAmount },
              { type: 'Film', amount: filmAmount },
              { type: 'Other', amount: otherAmount },
              { type: 'Pay TV', amount: payTvAmount },
              { type: 'Online', amount: onlineAmount },
            ].forEach((amountItem) => {
              amountItem.amount = isNegative ? `-${amountItem.amount}` : amountItem.amount;
              if (amountItem.amount && amountItem.amount !== '0.00') {
                outputData.push([
                  edi.startDate,
                  edi.startDate,
                  edi.endDate,
                  edi.territory,
                  null,
                  line.substr(92, 60).trim(),
                  line.substr(152, 40).trim(),
                  line.substr(192, 40).trim(),
                  line.substr(152, 40).trim(),
                  null,
                  null,
                  null,
                  null,
                  null,
                  amountItem.type,
                  line.substr(1, 10).trim(),
                  null,
                  null,
                  null,
                  null,
                  null,
                  0,
                  amountItem.amount,
                  null,
                  amountItem.amount,
                  null,
                  edi.addDecimalpoint(line.substr(13, 7).trim(), 4),
                ]);
              }
            });
            if (nzAmount && nzAmount !== '0.00') {
              outputData.push([
                edi.startDate,
                edi.startDate,
                edi.endDate,
                'NZ',
                null,
                line.substr(92, 60).trim(),
                line.substr(152, 40).trim(),
                line.substr(192, 40).trim(),
                line.substr(152, 40).trim(),
                null,
                null,
                null,
                null,
                null,
                'Other',
                line.substr(1, 10).trim(),
                null,
                null,
                null,
                null,
                null,
                0,
                nzAmount,
                null,
                nzAmount,
                null,
                edi.addDecimalpoint(line.substr(13, 7).trim(), 4),
              ]);
            }
          }
        })
        .on('end', () => {
          logger.debug(`ediReader output: ${outputData}`);
          callback(null, outputData);
        })
        .on('error', (err) => {
          logger.error(err);
          callback(err);
        });
    } catch (err) {
      if (err.message === 'path must be a string or Buffer') {
        callback(new Error('File does not exist'));
      } else {
        logger.error(err);
        callback(new Error('There was an error reading the EDI file. Check file is valid.'));
      }
    }
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

module.exports = ediReader;
