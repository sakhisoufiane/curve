const curvePayWebhookTypes = {
  success: 'v1/payment-success',
  oldFailed: 'v1/payment-failed',
  failed: 'v1.payment.failed',
  validationFailed: 'v1.payment.validation.failed',
  submitted: 'v1.payment.submitted',
  submissionFailed: 'v1.payment.submission.failed',
  completed: 'v1.payment.completed',
  payeeCreated: 'v1.payee.created',
  payeeUpdated: 'v1.payee.updated',
  kycDecision: 'v1.kyc.decision',
  transactionCompleted: 'v1.transaction.completed',
};

const clientNotificationType = {
  [curvePayWebhookTypes.payeeCreated]: 'payeePaymentDetailsAdded',
  [curvePayWebhookTypes.payeeUpdated]: 'payeePaymentDetailsUpdated',
  [curvePayWebhookTypes.failed]: 'paymentFailed',
  [curvePayWebhookTypes.validationFailed]: 'paymentFailed',
  [curvePayWebhookTypes.submissionFailed]: 'paymentFailed',
  [curvePayWebhookTypes.transactionCompleted]: 'fundsAdded',
};

const notificationDetails = {
  [curvePayWebhookTypes.payeeCreated]: {
    payee: {
      subject: ({ name }) => `Your Payout Details were added for ${name}`,
      mainText: ({ payeeName, clientName }) => `<div>Hi ${payeeName},</div>
        <div>Your payment details have recently been added.</div>
        <div>If you did not make this change, then make sure to review the change, and if it is incorrect, please contact ${clientName}.</div>
        <div><a href="${process.env.frontEndUrl}/#/paymentDetails">View Payment Details</a></div>
        <br />`,
      link: () => '#/paymentDetails',
      eventName: 'Payment details updated',
    },
    client: {
      subject: ({ name }) => `Payout Details were added for ${name}`,
      mainText: ({ payeeName, clientName, payeeId }) => `<div>Hi ${clientName},</div>
        <div>The payout details for ${payeeName} have recently been added.</div>
        <div>If you did not make this change, then make sure to review the change and confirm the change with your payee if the recipient’s account name does not match what you are expecting.</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${payeeId.toString()}/edit">View Payee's Details</a></div>
        <br />`,
      link: ({ payeeId }) => `#/payees/${payeeId}/edit`,
      eventName: 'Payment details updated',
    },
  },
  [curvePayWebhookTypes.payeeUpdated]: {
    payee: {
      subject: ({ name }) => `Your Payout Details were updated for ${name}`,
      mainText: ({ payeeName, clientName }) => `<div>Hi ${payeeName},</div>
        <div>Your payment details have recently been updated.</div>
        <div>If you did not make this change, then make sure to review the change, and if it is incorrect, please contact ${clientName}.</div>
        <div><a href="${process.env.frontEndUrl}/#/paymentDetails">View Payment Details</a></div>
        <br />`,
      link: () => '#/paymentDetails',
      eventName: 'Payment details updated',
    },
    client: {
      subject: ({ name }) => `Payout Details were updated for ${name}`,
      mainText: ({ payeeName, clientName, payeeId }) => `<div>Hi ${clientName},</div>
        <div>The payout details for ${payeeName} have recently been updated.</div>
        <div>If you did not make this change, then make sure to review the change and confirm the change with your payee if the recipient’s account name does not match what you are expecting.</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${payeeId.toString()}/edit">View Payee's Details</a></div>
        <br />`,
      link: ({ payeeId }) => `#/payees/${payeeId}/edit`,
      eventName: 'Payment details updated',
    },
  },
  [curvePayWebhookTypes.failed]: {
    payee: {
      subject: ({ name }) => `A Payment Attempt from ${name} has Failed`,
      mainText: ({ payeeName, clientName, originCurrency, originAmount, paymentReason, message }) => `<div>Hi ${payeeName},</div>
        <div>A payment attempt of ${originCurrency}${originAmount} to you for ${paymentReason} from ${clientName} recently failed.</div>
        <div>The error received is as follows: ${message}</div>
        <div>Please review and update your details so that you continue to receive future royalty payments successfully.</div>
        <div><a href="${process.env.frontEndUrl}/#/paymentDetails">View your payment details</a></div>
        <br />
        <div>Why did the payment fail? In most cases, a payment might fail because:</div>
        <div>1. Your bank account has been closed</div>
        <div>2. Your payment details were entered incorrectly</div>
        <div>3. Your bank account or address is based in a restricted territory</div>
        <div>4. The currency sent was not supported by your bank account</div>
        <br />`,
      link: () => '#/paymentDetails',
      eventName: 'Payment failed',
    },
    client: {
      subject: ({ name }) => `A Payment to ${name} has Failed`,
      mainText: ({ payeeName, clientName, payeeId, paymentGroupId, originCurrency, originAmount, paymentReason, message, paymentId }) => `<div>Hi ${clientName},</div>
        <div>We could not process your payment of ${originCurrency}${originAmount} to ${payeeName} for ${paymentReason}.</div>
        <div>The error received is as follows: ${message}</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${payeeId.toString()}/edit">Review Payee's Details</a></div>
        <br />
        <div>Why do payments fail? In most cases, a payment might fail because:</div>
        <div>1. The payee's bank account has been closed</div>
        <div>2. The payee's payout details were incorrect</div>
        <div>3. The payee’s account or address is in a restricted territory</div>
        <div>4. The currency sent was not supported by the payee's bank account</div>
        <br />
        <div><a href="${process.env.frontEndUrl}/#/payments/${paymentId.toString()}/edit?paymentGroupId=${paymentGroupId}">You can see more details on why the payment failed on the payment details page</a></div>
        <br />`,
      link: ({ payeeId }) => `#/payees/${payeeId}/edit`,
      eventName: 'Payment failed',
    },
  },
  [curvePayWebhookTypes.validationFailed]: {
    client: {
      subject: ({ name }) => `A Payment to ${name} has Failed Validation`,
      mainText: ({ payeeName, clientName, payeeId, paymentGroupId, originCurrency, originAmount, paymentReason, message, paymentId }) => `<div>Hi ${clientName},</div>
        <div>We could not process your payment of ${originCurrency}${originAmount} to ${payeeName} for ${paymentReason}.</div>
        <div>The error received is as follows: ${message}</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${payeeId.toString()}/edit">Review Payee's Details</a></div>
        <br />
        <div>Why do payments fail? In most cases, a payment might fail because:</div>
        <div>1. A payee’s payment details are missing.</div>
        <div>2. A payee needs admin verification.</div>
        <div>3. The payment appears to be a duplicate request.</div>
        <div>4. Your payment account has not been configured correctly.</div>
        <br />
        <div><a href="${process.env.frontEndUrl}/#/payments/${paymentId.toString()}/edit?paymentGroupId=${paymentGroupId}">You can see more details on why the payment failed on the payment details page</a></div>
        <br />`,
      link: ({ payeeId }) => `#/payees/${payeeId}/edit`,
      eventName: 'Payment failed',
    },
  },
  [curvePayWebhookTypes.submissionFailed]: {
    client: {
      subject: ({ name }) => `A Payment to ${name} has Failed Submission`,
      mainText: ({ payeeName, clientName, payeeId, paymentGroupId, originCurrency, originAmount, paymentReason, message, paymentId }) => `<div>Hi ${clientName},</div>
        <div>We could not process your payment of ${originCurrency}${originAmount} to ${payeeName} for ${paymentReason}.</div>
        <div>The error received is as follows: ${message}</div>
        <div><a href="${process.env.frontEndUrl}/#/payees/${payeeId.toString()}/edit">Review Payee's Details</a></div>
        <br />
        <div>Why do payments fail during submission? In most cases, a payment might fail because:</div>
        <div>1. You have insufficient balance to cover the payment, conversion, or fee.</div>
        <div>2. A payment partner is experiencing a temporary outage.</div>
        <br />
        <div><a href="${process.env.frontEndUrl}/#/payments/${paymentId.toString()}/edit?paymentGroupId=${paymentGroupId}">You can see more details on why the payment failed on the payment details page</a></div>
        <br />`,
      link: ({ payeeId }) => `#/payees/${payeeId}/edit`,
      eventName: 'Payment failed',
    },
  },
  [curvePayWebhookTypes.transactionCompleted]: {
    client: {
      subject: ({ clientName, currency }) => `Funds Added to ${clientName} ${currency} Balance`,
      mainText: ({ clientName, currency, amount, balanceAmount }) => `<div>Hi ${clientName},</div>
        <div>Your account has been topped up with ${currency}${amount}, leaving you with a balance of ${currency}${balanceAmount}.</div>
        <br />
        <div><a href="${process.env.frontEndUrl}/#/curvePay/balances">View Your Account Balances</a></div>
        <br />`,
      eventName: 'Funds added',
      link: () => '#/curvePay/balances',
    },
  },
};

const getNotificationDetails = ({ type, email, curveUser, client, payee, clientNotification = false, additionalInfo }) => {
  const typeNotification = clientNotification ? notificationDetails[type].client : notificationDetails[type].payee;

  const generateOptions = {
    identifier: 'genericEmail',
    email,
    curveUser,
    client,
    subject: typeNotification.subject({ name: clientNotification ? payee?.name : client?.name, clientName: client?.name, currency: additionalInfo?.currency }),
    mainText: typeNotification.mainText({ payeeName: payee?.name, clientName: client?.name, payeeId: payee?._id, ...additionalInfo }),
  };

  return {
    generateOptions,
    link: typeNotification.link({ payeeId: payee?._id }) || '',
    eventName: typeNotification.eventName || '',
  };
};

module.exports = {
  curvePayWebhookTypes,
  clientNotificationType,
  notificationDetails,
  getNotificationDetails,
};
