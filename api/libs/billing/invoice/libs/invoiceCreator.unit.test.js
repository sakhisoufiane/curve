const EventEmitter = require('events');
const Statement = require('./invoiceCreator');

describe('invoiceCreator', () => {
  describe('closePdf', () => {
    let statement;
    let writeStream;

    beforeEach(() => {
      statement = new Statement({ billingInfo: {}, usage: {} });
      statement.location = '/tmp/fake-invoice.pdf';
      statement.pdf = { end: jest.fn() };
      writeStream = new EventEmitter();
      statement.writeStream = writeStream;
    });

    it('calls back with the file location when only "finish" fires', () => {
      const callback = jest.fn();
      statement.closePdf(callback);

      writeStream.emit('finish');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(null, '/tmp/fake-invoice.pdf');
    });

    it('calls back with the error when only "error" fires', () => {
      const callback = jest.fn();
      const err = new Error('disk full');
      statement.closePdf(callback);

      writeStream.emit('error', err);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(err, undefined);
    });

    it('only calls back once when both "finish" and "error" fire', () => {
      const callback = jest.fn();
      const err = new Error('ENOSPC: no space left on device');
      statement.closePdf(callback);

      // Simulates the write-stream race where all data flushes ('finish')
      // but the underlying fd still errors on close.
      writeStream.emit('finish');
      writeStream.emit('error', err);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(null, '/tmp/fake-invoice.pdf');
    });

    it('only calls back once when "error" fires before "finish"', () => {
      const callback = jest.fn();
      const err = new Error('EIO');
      statement.closePdf(callback);

      writeStream.emit('error', err);
      writeStream.emit('finish');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(err, undefined);
    });
  });
});
