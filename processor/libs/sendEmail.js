require('dotenv').config();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const sgMail = require('@sendgrid/mail');
const Parent = require('../models/parent');

const fromEmail = 'Curve Royalties <noreply@curveroyaltysystems.com>';

sgMail.setApiKey(process.env.sendgridKey);
sgMail.setSubstitutionWrappers('{{', '}}');

/**
 * Used to get the current date which we pass to the email template for the footer
 *
 * @returns {String} The current year
 */
const getCurrentYear = () => {
  const date = new Date();
  return `${date.getFullYear()}`;
};

function detailsFromParent(client, callback) {
  const values = {
    logo: 'https://app.curveroyaltysystems.com/assets/img/curvetypwhite2x.png',
    supportEmail: 'support@curveroyaltysystems.com',
    name: 'Curve',
    address: '7 Bell Yard<br/>London<br/>WC2A 2JR',
    url: process.env.frontEndUrl,
    fromEmail,
  };

  if (client) {
    Parent.findById(client.parentId)
      .then((parent) => {
        if (parent && parent.whiteLabelCommunication) {
          if (parent.publicLightLogo) { values.logo = parent.publicLightLogo; }
          if (parent.supportEmail) { values.supportEmail = parent.supportEmail; }
          if (parent.name) { values.name = parent.name; }
          if (parent.address) { values.address = parent.address; }
          if (parent.customDomain) { values.url = parent.customDomain; }
          if (parent.supportEmail) { values.fromEmail = parent.supportEmail; }
        } else if (!parent?.whiteLabelCommunication && client?.fugaIntegration?.statementNotifications) {
          values.supportEmail = 'royalties-support@fuga.com';
        }

        callback(null, values);
      })
      .catch((err) => {
        logger.error(err);
        callback(null, values);
      });
  } else {
    callback(null, values);
  }
}

module.exports = {
  scriptCompleteEmail(script, userEmail, callback) {
    const msg = {
      to: userEmail,
      from: fromEmail,
      subject: `Support Script: ${script} : Complete`,
      html: `Support Script: ${script} has completed`,
      templateId: 'ca132040-44b6-4421-aa9e-86d56022dea1',
      substitutions: {
        logo: 'https://app.curveroyaltysystems.com/assets/img/curvetypwhite2x.png',
        supportEmail: 'support@curveroyaltysystems.com',
        parentName: 'Curve Support',
        parentAddress: '150 Tooley Street',
        allRightsReservedDate: getCurrentYear(),
      },
    };
    sgMail.send(msg, callback);
  },
  scriptErrorEmail(script, userEmail, callback) {
    const msg = {
      to: userEmail,
      from: fromEmail,
      subject: `Support Script: ${script} : Errored`,
      html: `Support Script: ${script} has errored`,
      templateId: 'ca132040-44b6-4421-aa9e-86d56022dea1',
      substitutions: {
        logo: 'https://app.curveroyaltysystems.com/assets/img/curvetypwhite2x.png',
        supportEmail: 'support@curveroyaltysystems.com',
        parentName: 'Curve Support',
        parentAddress: '150 Tooley Street',
        allRightsReservedDate: getCurrentYear(),
      },
    };
    sgMail.send(msg, callback);
  },
  reportError(email, client, subject, error, callback) {
    detailsFromParent(client, (err, values) => {
      const msg = {
        to: email,
        from: values.fromEmail,
        subject,
        html: `We're sorry, but your export request has errored.<br/><br/>The error message is: <br/><br/>${error}`,
        templateId: '065286e8-49c5-488b-be99-a6ab17aed421',
        substitutions: {
          logo: values.logo,
          supportEmail: values.supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          allRightsReservedDate: getCurrentYear(),
        },
      };
      sgMail.send(msg, callback);
    });
  },
  reportDownload(email, client, subject, link, mainText, callback) {
    detailsFromParent(client, (err, values) => {
      const msg = {
        to: email,
        from: values.fromEmail,
        subject,
        html: mainText ?? 'Your download is ready, and will be available for the next 24 hours.',
        templateId: 'de8d2af0-2046-40f6-9f93-245e2ff855d0',
        substitutions: {
          link,
          logo: values.logo,
          supportEmail: values.supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          allRightsReservedDate: getCurrentYear(),
        },
      };
      sgMail.send(msg, callback);
    });
  },
  genericCompleteNoUser(email, client, mainText, callback) {
    detailsFromParent(client, (err, values) => {
      const msg = {
        to: email,
        from: values.fromEmail,
        subject: 'Your Catalogue has been synced to Curve',
        html: mainText,
        templateId: 'ca132040-44b6-4421-aa9e-86d56022dea1',
        substitutions: {
          link: values.url,
          logo: values.logo,
          supportEmail: values.supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          allRightsReservedDate: getCurrentYear(),
        },
      };
      sgMail.send(msg, callback);
    });
  },
  genericComplete(email, client, subject, mainText, callback) {
    detailsFromParent(client, (err, values) => {
      const msg = {
        to: email,
        from: values.fromEmail,
        subject,
        html: mainText || subject,
        templateId: 'ca132040-44b6-4421-aa9e-86d56022dea1',
        substitutions: {
          link: values.url,
          logo: values.logo,
          supportEmail: values.supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          allRightsReservedDate: getCurrentYear(),
        },
      };
      sgMail.send(msg, callback);
    });
  },
  partialImportError(email, client, subject, mainText, errors, callback) {
    let html = mainText || subject;
    if (Array.isArray(errors) && errors.length) {
      html += '<br/><br/>The issues with the import are: <br/><br/><ul>';
      errors.forEach((error) => {
        html += `<li>${error}</li>`;
      });
      html += '</ul>';
    }
    html += 'The rest of the import completed fine, and only these items remain unchanged. This is due to validation issues when saving. Any errors can be fixed individually and reimported.';
    detailsFromParent(client, (err, values) => {
      const msg = {
        to: email,
        from: values.fromEmail,
        subject,
        html,
        templateId: 'ca132040-44b6-4421-aa9e-86d56022dea1',
        substitutions: {
          link: values.url,
          logo: values.logo,
          supportEmail: values.supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          allRightsReservedDate: getCurrentYear(),
        },
      };
      sgMail.send(msg, callback);
    });
  },
  bulkImportError(email, client, subject, mainText, error, callback) {
    let html = mainText || subject;
    if (error) html += `<br/><br/>Error Message: <br/><br/>${error}`;
    detailsFromParent(client, (err, values) => {
      const msg = {
        to: email,
        from: values.fromEmail,
        subject,
        html,
        templateId: 'ca132040-44b6-4421-aa9e-86d56022dea1',
        substitutions: {
          link: values.url,
          logo: values.logo,
          supportEmail: values.supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          allRightsReservedDate: getCurrentYear(),
        },
      };
      sgMail.send(msg, callback);
    });
  },
  genericError(email, client, subject, mainText, closingText, errors, callback) {
    let html = mainText || subject;
    if (Array.isArray(errors)) {
      html += '<br/><ul>';
      errors.forEach((error) => {
        html += `<li>${error}</li>`;
      });
      html += '</ul>';
    }
    html += closingText || '';
    detailsFromParent(client, (err, values) => {
      const msg = {
        to: email,
        from: values.fromEmail,
        subject,
        html,
        templateId: 'ca132040-44b6-4421-aa9e-86d56022dea1',
        substitutions: {
          link: values.url,
          logo: values.logo,
          supportEmail: values.supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          allRightsReservedDate: getCurrentYear(),
        },
      };
      sgMail.send(msg, callback);
    });
  },
};
