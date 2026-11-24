// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable eqeqeq */
/* eslint-disable max-len */
require('dotenv').config();
const sgMail = require('@sendgrid/mail');
const { Parent } = require('../models');
const logger = require('./logger');

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

  if (client && client.parentId) {
    Parent.findById(client.parentId, (err, parent) => {
      if (parent && parent.whiteLabelCommunication) {
        if (parent.publicLightLogo) {
          values.logo = parent.publicLightLogo;
        }
        if (parent.name) {
          values.name = parent.name;
        }
        if (parent.address) {
          values.address = parent.address;
        }
        if (parent.customDomain) {
          values.url = parent.customDomain;
        }
        if (parent.supportEmail) {
          values.fromEmail = parent.supportEmail;
        }
      } else if (parent && parent.useLogoForClients) {
        if (parent.publicLightLogo) {
          values.logo = parent.publicLightLogo;
        }
      } else if (
        !parent?.whiteLabelCommunication &&
        client?.fugaIntegration?.statementNotifications
      ) {
        values.supportEmail = 'royalties-support@fuga.com';
      }
      callback(null, values);
    });
  } else {
    callback(null, values);
  }
}

module.exports = {
  importComplete(curveUser, client, subject, fileName, count, callback) {
    const User = require('../models/user');
    User.findById(curveUser.id, (err, user) => {
      if (err || !user) {
        logger.error('Error finding user to send email');
        callback(new Error('Error finding user to send email'));
      } else {
        detailsFromParent(client, (err, values) => {
          const msg = {
            to: user.email,
            from: values.fromEmail,
            subject,
            html: `Your import ${fileName} has completed, importing ${count} items.`,
            templateId: '4d9b079b-9d46-48b5-9f71-393fdb8a4e1d',
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
      }
    });
  },
  importError(curveUser, client, subject, fileName, errors, callback) {
    const User = require('../models/user');
    const async = require('async');
    User.findById(curveUser.id, (err, user) => {
      if (err || !user) {
        logger.error('Error finding user to send email');
        callback(new Error('Error finding user to send email'));
      } else {
        let html = `We're sorry, but your import for ${fileName} has errored.<br/><br/>The issues with the import are: <br/><br/><ul>`;
        async.each(
          errors,
          (error, errorCb) => {
            html += `<li>${error}</li>`;
            errorCb();
          },
          () => {
            html += '</ul>';
            html +=
              'Please be aware, nothing has been imported. Your import now needs to be error free in order to import anything. Any errors raised here should be fixed and then try to import again.';
            detailsFromParent(client, (err, values) => {
              const msg = {
                to: user.email,
                from: values.fromEmail,
                subject,
                html,
                templateId: '4d9b079b-9d46-48b5-9f71-393fdb8a4e1d',
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
        );
      }
    });
  },
  partialImportError(curveUser, client, subject, fileName, errors, callback) {
    const User = require('../models/user');
    const async = require('async');
    User.findById(curveUser.id, (err, user) => {
      if (err || !user) {
        logger.error('Error finding user to send email');
        callback(new Error('Error finding user to send email'));
      } else {
        let html = `We're sorry, but your import for ${fileName} has partially errored.<br/><br/>The issues with the import are: <br/><br/><ul>`;
        async.each(
          errors,
          (error, errorCb) => {
            html += `<li>${error}</li>`;
            errorCb();
          },
          () => {
            html += '</ul>';
            html +=
              'The rest of the import completed fine, and only these items remain unchanged. This is due to validation issues when saving. Any errors can be fixed individually and reimported.';
            detailsFromParent(client, (err, values) => {
              const msg = {
                to: user.email,
                from: values.fromEmail,
                subject,
                html,
                templateId: '4d9b079b-9d46-48b5-9f71-393fdb8a4e1d',
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
        );
      }
    });
  },
};
