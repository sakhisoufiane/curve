const { randomId, randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');

const Client = require('../../models/client');
const Period = require('../../models/period');
const Escalation = require('../../models/escalation');
const Notification = require('../../models/notification');
const User = require('../../models/user');
const Task = require('../../models/task');
const PeriodController = require('./period');

jest.mock('../../models/task', () => {
  const mockTask = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
  });
  mockTask.prototype.save = jest.fn().mockResolvedValue(true);
  mockTask.countDocuments = jest.fn().mockResolvedValue(0);
  return mockTask;
});
describe('removePeriod', () => {
  let period;
  let curveUser;

  beforeEach(() => {
    period = new Period({ name: randomString() });
    curveUser = { clientId: randomId(), periodId: period._id };
    jest.spyOn(Period.prototype, 'deleteOne').mockResolvedValue();
    jest.spyOn(Escalation, 'deleteMany').mockResolvedValue();
    jest.spyOn(Client, 'findById').mockResolvedValue();
    jest.spyOn(Notification, 'generate').mockReturnValue();
  });

  it('should call period.deleteOne', async () => {
    await PeriodController.removePeriod({ period, curveUser });
    expect(period.deleteOne).toHaveBeenCalled();
  });

  it('should call Escalation.deleteMany with the right args', async () => {
    await PeriodController.removePeriod({ period, curveUser });
    expect(Escalation.deleteMany).toHaveBeenCalledWith({ clientId: curveUser.clientId, periodId: period._id });
  });

  it('should call Client.findById with the right args', async () => {
    await PeriodController.removePeriod({ period, curveUser });
    expect(Client.findById).toHaveBeenCalledWith(curveUser.clientId, 'name');
  });

  it('should call Notification.generate with the right args', async () => {
    const client = { _id: randomId() };
    jest.spyOn(Client, 'findById').mockResolvedValue(client);

    const generateOptions = {
      identifier: 'genericComplete',
      curveUser,
      client,
      subject: 'Period has been deleted',
      mainText: `Period - ${period.name} - has been deleted`,
    };
    await PeriodController.removePeriod({ period, curveUser });

    expect(Notification.generate).toHaveBeenCalledWith(generateOptions.subject, `Period - ${period.name} - has been deleted`, null, curveUser, generateOptions);
  });
});

describe('publishFugaStatements', () => {
  let period;
  let periodId;
  let curveUser;

  beforeEach(() => {
    const clientId = randomId();
    period = new Period({ name: randomString(), clientId });
    periodId = period._id.toString();
    curveUser = { clientId, periodId, id: randomId() };
  });

  it('should throw an error if the period could not be found', async () => {
    // Arrange
    jest.spyOn(Period, 'findById').mockResolvedValue(null);
    // Act
    await expect(PeriodController.publishFugaStatements({ curveUser, periodId }))
      .rejects
      .toThrow('Could not find period');
  });

  it('should throw an error if the user could not be found', async () => {
    // Arrange
    jest.spyOn(Period, 'findById').mockResolvedValue(period);
    jest.spyOn(User, 'findById').mockResolvedValue(null);
    // Act
    await expect(PeriodController.publishFugaStatements({ curveUser, periodId }))
      .rejects
      .toThrow('User not found');
  });

  it('should throw an error if the user does not have the correct access rights', async () => {
    // Arrange
    jest.spyOn(Period, 'findById').mockResolvedValue(period);
    jest.spyOn(User, 'findById').mockResolvedValue({});
    jest.spyOn(UserAccess, 'isUserForbidden').mockResolvedValue(true);
    // Act
    await expect(PeriodController.publishFugaStatements({ curveUser, periodId }))
      .rejects
      .toThrow('Forbidden');
  });

  it('should throw an error if the client has the publish statements feature flag disabled', async () => {
    // Arrange
    jest.spyOn(Period, 'findById').mockResolvedValue(period);
    jest.spyOn(User, 'findById').mockResolvedValue({});
    jest.spyOn(UserAccess, 'isUserForbidden').mockResolvedValue(false);
    jest.spyOn(Client, 'findById').mockResolvedValue({ features: { fugaPublishStatementsToCloudStorage: false } });
    // Act
    await expect(PeriodController.publishFugaStatements({ curveUser, periodId }))
      .rejects
      .toThrow('setting is disabled');
  });

  it('should throw an error if a publish statements task is already running', async () => {
    // Arrange
    jest.spyOn(Period, 'findById').mockResolvedValue(period);
    jest.spyOn(User, 'findById').mockResolvedValue({});
    jest.spyOn(UserAccess, 'isUserForbidden').mockResolvedValue(false);
    jest.spyOn(Client, 'findById').mockResolvedValue({ features: { fugaPublishStatementsToCloudStorage: true } });
    jest.spyOn(Task, 'countDocuments').mockResolvedValue(1);
    // Act
    await expect(PeriodController.publishFugaStatements({ curveUser, periodId }))
      .rejects
      .toThrow('Statements are currently being published');
  });

  it('should create a publish statements task and send it to the queue', async () => {
    // Arrange
    jest.spyOn(Period, 'findById').mockResolvedValue(period);
    const email = randomString();
    const newTask = {
      name: 'Fuga Publish Statements',
      clientId: period.clientId,
      value: { periodId },
      email,
    };
    jest.spyOn(User, 'findById').mockResolvedValue({ email });
    jest.spyOn(UserAccess, 'isUserForbidden').mockResolvedValue(false);
    jest.spyOn(Client, 'findById').mockResolvedValue({ features: { fugaPublishStatementsToCloudStorage: true } });
    jest.spyOn(Task, 'countDocuments').mockResolvedValue(0);
    jest.spyOn(TaskHelpers, 'createTaskAndSendMessage').mockResolvedValue();

    // Act
    await PeriodController.publishFugaStatements({ curveUser, periodId });

    // Assert
    expect(TaskHelpers.createTaskAndSendMessage).toHaveBeenCalledWith(Task, expect.objectContaining({
      ...newTask,
    }));
  });
});
