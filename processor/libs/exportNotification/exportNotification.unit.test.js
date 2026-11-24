const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');

const Client = require('../../models/client');
const Notification = require('../../models/notification');
const ExportNotification = require('./exportNotification');

describe('exportNotification', () => {
  beforeEach(() => {
    jest.spyOn(Notification, 'generate').mockImplementation((name, description, link, options, cb) => cb());
  });

  describe('sendBulkExportNotification', () => {
    it('should use linkAvailabilityText in the mainText instead of the default', async () => {
      // Arrange
      const periodName = randomString();
      const urls = [{ name: randomString(), url: randomString() }];
      const client = new Client();
      const email = randomString();
      // Act
      await ExportNotification.sendBulkExportNotification({
        exportName: 'All Sales',
        periodName,
        exportScope: 'period',
        urls,
        client,
        email,
        identifier: 'salesExportZips',
        linkAvailabilityText: '24 hours',
      });
      // Assert
      expect(Notification.generate.mock.calls[0][3]).toMatchObject({
        mainText: 'Your download is ready, and will be available for the next 24 hours.',
      });
    });

    it('should include the period name in the subject when exportScope is "period"', async () => {
      // Arrange
      const exportScope = 'period';
      const periodName = randomString();
      const urls = [{ name: randomString(), url: randomString() }];
      const client = new Client();
      // Act
      await ExportNotification.sendBulkExportNotification({
        exportName: 'All Sales',
        periodName,
        exportScope,
        urls,
        client,
        email: randomString(),
        identifier: 'salesExportZips',
      });
      // Assert
      const subject = `Your All Sales Export for ${periodName} is Ready For Download`;
      expect(Notification.generate.mock.calls[0][1]).toBe(subject);
    });

    it('should not include the period name in the subject when exportScope is not "period"', async () => {
      // Arrange
      const exportScope = 'selectedStatements';
      const periodName = randomString();
      const urls = [{ name: randomString(), url: randomString() }];
      const client = new Client();
      // Act
      await ExportNotification.sendBulkExportNotification({
        exportName: 'All Sales',
        periodName,
        exportScope,
        urls,
        client,
        email: randomString(),
        identifier: 'salesExportZips',
      });
      // Assert
      const subject = 'Your All Sales Export is Ready For Download';
      expect(Notification.generate.mock.calls[0][1]).toBe(subject);
    });

    describe('when there is a single csv file', () => {
      it('should send a notification with a single url', async () => {
        // Arrange
        const periodName = randomString();
        const urls = [{ name: randomString(), url: randomString() }];
        const client = new Client();
        const email = randomString();
        // Act
        await ExportNotification.sendBulkExportNotification({
          exportName: 'All Sales',
          periodName,
          exportScope: 'period',
          urls,
          client,
          email,
          identifier: 'salesExportZips',
        });
        // Assert
        const subject = `Your All Sales Export for ${periodName} is Ready For Download`;
        expect(Notification.generate).toHaveBeenCalled();
        expect(Notification.generate.mock.calls[0][0]).toBe('All Sales Export Ready');
        expect(Notification.generate.mock.calls[0][1]).toBe(subject);
        expect(Notification.generate.mock.calls[0][2]).toBe(urls[0].url);
        expect(Notification.generate.mock.calls[0][3]).toMatchObject({
          identifier: 'salesExportZips',
          client,
          subject,
          email,
          link: urls[0].url,
          mainText: 'Your download is ready, and will be available for the next 7 days.',
        });
        expect(Notification.generate.mock.calls[0][3]).not.toHaveProperty('urls');
      });
    });

    describe('when there are multple files', () => {
      it('should send a notification with all urls included', async () => {
        // Arrange
        const periodName = randomString();
        const urls = [
          { name: randomString(), url: randomString() },
          { name: randomString(), url: randomString() },
        ];
        const client = new Client();
        const email = randomString();
        // Act
        await ExportNotification.sendBulkExportNotification({
          exportName: 'All Sales',
          periodName,
          exportScope: 'period',
          urls,
          client,
          email,
          identifier: 'salesExportZips',
        });
        // Assert
        const subject = `Your All Sales Export for ${periodName} is Ready For Download`;
        expect(Notification.generate).toHaveBeenCalled();
        expect(Notification.generate.mock.calls[0][0]).toBe('All Sales Export Ready');
        expect(Notification.generate.mock.calls[0][1]).toBe(subject);
        // No single link field should exist in this case
        expect(Notification.generate.mock.calls[0][2]).toBe('');
        expect(Notification.generate.mock.calls[0][3]).toMatchObject({
          identifier: 'salesExportZips',
          client,
          subject,
          email,
          urls,
          mainText: expect.stringContaining('Your download is ready, and will be available for the next 7 days.'),
        });
        expect(Notification.generate.mock.calls[0][3]).not.toHaveProperty('link');
      });
    });
  });

  describe('sendReportExportNotification', () => {
    it('should send a notification for a report', async () => {
      // Arrange
      const reportName = randomString();
      const subject = `Your Report for ${reportName} is Ready for Download`;
      const url = randomString();
      const client = new Client();
      const email = randomString();
      // Act
      await ExportNotification.sendReportExportNotification({
        reportName,
        url,
        client,
        email,
      });
      // Assert
      expect(Notification.generate).toHaveBeenCalled();
      expect(Notification.generate.mock.calls[0][0]).toEqual('Report Ready');
      expect(Notification.generate.mock.calls[0][1]).toEqual(subject);
      expect(Notification.generate.mock.calls[0][2]).toEqual(url);
      expect(Notification.generate.mock.calls[0][3]).toMatchObject({
        identifier: 'reportDownload',
        client,
        subject,
        email,
        link: url,
      });
    });
  });

  describe('sendSonglistExportNotification', () => {
    it('should send a notification for a songlist export', async () => {
      // Arrange
      const deliveryName = randomString();
      const subject = `Your Songlist Export for ${deliveryName} is Ready for Download`;
      const url = randomString();
      const client = new Client();
      const email = randomString();
      // Act
      await ExportNotification.sendSonglistExportNotification({
        deliveryName,
        url,
        client,
        email,
      });
      // Assert
      expect(Notification.generate).toHaveBeenCalled();
      expect(Notification.generate.mock.calls[0][0]).toEqual('Songlist Export Ready');
      expect(Notification.generate.mock.calls[0][1]).toEqual(subject);
      expect(Notification.generate.mock.calls[0][2]).toEqual(url);
      expect(Notification.generate.mock.calls[0][3]).toMatchObject({
        identifier: 'songlistDownload',
        client,
        subject,
        email,
        link: url,
      });
    });
  });

  describe('sendCwrExportNotification', () => {
    it('should send a notification for a CWR export', async () => {
      // Arrange
      const deliveryFormat = randomString();
      const url = randomString();
      const client = new Client();
      const email = randomString();
      const subject = `Your ${deliveryFormat} Export for ${client.name} is Ready to Download`;
      // Act
      await ExportNotification.sendCwrExportNotification({
        url,
        client,
        email,
        deliveryFormat,
      });
      // Assert
      expect(Notification.generate).toHaveBeenCalled();
      expect(Notification.generate.mock.calls[0][0]).toEqual(`${deliveryFormat} Export Ready`);
      expect(Notification.generate.mock.calls[0][1]).toEqual(subject);
      expect(Notification.generate.mock.calls[0][2]).toEqual(url);
      expect(Notification.generate.mock.calls[0][3]).toMatchObject({
        identifier: 'cwrExportDownload',
        client,
        subject,
        email,
        link: url,
      });
    });
  });

  describe('sendWorksExportNotification', () => {
    describe('when isError is false', () => {
      it('should send a success notification for a works export', async () => {
      // Arrange
        const client = new Client({ name: randomString() });
        const subject = `Your Works Export for ${client.name} is Ready to Download`;
        const url = randomString();
        const email = randomString();

        // Act
        await ExportNotification.sendWorksExportNotification({
          url,
          client,
          email,
        });

        // Assert
        expect(Notification.generate).toHaveBeenCalled();
        expect(Notification.generate.mock.calls[0][0]).toEqual('Works Export Ready');
        expect(Notification.generate.mock.calls[0][1]).toEqual(subject);
        expect(Notification.generate.mock.calls[0][2]).toEqual(url);
        expect(Notification.generate.mock.calls[0][3]).toMatchObject({
          identifier: 'worksExportDownload',
          client: expect.objectContaining({ name: client.name }),
          subject,
          email,
          link: url,
        });
      });
    });

    describe('when isError is true', () => {
      it('should send an error notification for a works export', async () => {
      // Arrange
        const client = new Client({ name: randomString() });
        const subject = `Your Works Export for ${client.name} Has Errored`;
        const url = randomString();
        const email = randomString();

        // Act
        await ExportNotification.sendWorksExportNotification({
          url,
          client,
          email,
          isError: true,
        });

        // Assert
        expect(Notification.generate).toHaveBeenCalled();
        expect(Notification.generate.mock.calls[0][0]).toEqual(subject);
        expect(Notification.generate.mock.calls[0][1]).toEqual(subject);
        expect(Notification.generate.mock.calls[0][2]).toEqual(null);
        expect(Notification.generate.mock.calls[0][3]).toMatchObject({
          identifier: 'genericError',
          client: expect.objectContaining({ name: client.name }),
          subject,
          email,
        });
      });
    });
  });
});
