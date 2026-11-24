require('../models/db');
const { ObjectId } = require('mongodb');

const AuditReport = require('../libs/fixedReports/auditReport');

try {
  AuditReport({ reportId: '123', clientId: ObjectId('64e33c2a0512109481ef6af6'), startDate: new Date('2023-01-01'), endDate: new Date('2024-01-02') });
} catch(err) {
  console.log(err)
}