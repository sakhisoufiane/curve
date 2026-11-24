/* eslint-disable eqeqeq */
/* eslint-disable max-len */
require('dotenv').config();
const { Utils } = require('@curveroyaltysystems/curve-shared-logic');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const sgMail = require('@sendgrid/mail');
const async = require('async');
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

  if (client && client.parentId) {
    Parent.findById(client.parentId)
      .then((parent) => {
        if (parent && parent.whiteLabelCommunication) {
          if (parent.publicLightLogo) { values.logo = parent.publicLightLogo; }
          if (parent.name) { values.name = parent.name; }
          if (parent.address) { values.address = parent.address; }
          if (parent.customDomain) { values.url = parent.customDomain; }
          if (parent.supportEmail) { values.fromEmail = parent.supportEmail; }
        } else if (parent && parent.useLogoForClients) {
          if (parent.publicLightLogo) { values.logo = parent.publicLightLogo; }
        } else if (!parent?.whiteLabelCommunication && client?.fugaIntegration?.statementNotifications) {
          values.supportEmail = 'royalties-support@fuga.com';
        }
        callback(null, values);
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  } else {
    callback(null, values);
  }
}

module.exports = {
  multiFactorAuthentication(email, parent, code, callback) {
    const falseClient = parent ? { parentId: parent._id } : null;
    detailsFromParent(falseClient, (err, values) => {
      const body = `To complete your Curve login, please enter the code below on the validation page.<br/><br/>You are receiving this email as you have Multi Factor Authentication turned on within the app. <br/><br/><div style='font-size: 20px; text-align: center; width: 100%;'>${code}</div>`;
      const msg = {
        to: email,
        from: values.fromEmail,
        subject: 'Complete Your Login Into Curve',
        html: body,
        templateId: 'ca132040-44b6-4421-aa9e-86d56022dea1',
        substitutions: {
          token: code,
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
  forgotPassword(email, parent, token, callback) {
    const falseClient = parent ? { parentId: parent._id } : null;
    detailsFromParent(falseClient, (err, values) => {
      const url = `${values.url}/reset`;
      const msg = {
        to: email,
        from: values.fromEmail,
        subject: 'Curve Royalty System - Reset Password',
        templateId: 'eafbe107-08b6-4a4c-8b49-9ae25590fbce',
        substitutions: {
          link: `${url}?token=${token}`,
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
  invite(email, client, parent, token, clientName, options, callback) {
    const falseClient = parent ? { parentId: parent._id } : null;
    detailsFromParent(falseClient, (err, values) => {
      const supportEmail = options.supportEmail && options.supportEmail != '' ? options.supportEmail : values.supportEmail;
      options.customText = options.customText ? options.customText : '';
      options.customText.replace(/(?:\r\n|\r|\n)/g, '<br/>');
      const url = `${values.url}/reset`;
      const msg = {
        to: email,
        from: values.fromEmail,
        subject: `Welcome to ${values.name}`,
        templateId: parent?.whiteLabelCommunication ? '822340bd-5707-446c-a02b-9509e1e570e5' : 'bf4e52ac-f540-4fea-bddc-566df2e9dfd0',
        substitutions: {
          link: `${url}?token=${token}`,
          client: clientName,
          logo: values.logo,
          supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          customText: options.customText,
          email,
          allRightsReservedDate: getCurrentYear(),
        },
      };

      if ((options.cc && options.cc !== '') && (email !== options.cc)) { msg.cc = options.cc; }
      // invite for Payees
      if (options.payeeNames?.length > 0) {
        // modify msg params if payeeNames option has been supplied
        const last = options.payeeNames.pop();
        msg.substitutions.payeeNames = (options.payeeNames.length > 0) ? `${options.payeeNames.join(', ')} and ${last}` : last;
        // change the template id to custom invitePayee email template
        msg.templateId = parent?.whiteLabelCommunication ? 'ed1731d8-2491-4b50-a989-fa01ebbff8fc' : '395f028a-fe86-4632-9585-7f2566cc282d';
      }

      // Custom Invite Email For Fuga Clients
      if (client?.fugaSplitType === 'Fuga Split') {
        if (options.payeeNames?.length > 0) {
          const last = options.payeeNames.pop();
          msg.substitutions.payeeNames = (options.payeeNames.length > 0) ? `${options.payeeNames.join(', ')} and ${last}` : last;
        }

        msg.templateId = '49c7615f-9010-4bba-b4f2-2413e27b47ee';
      }

      sgMail.send(msg, callback);
    });
  },
  inviteAdditional(client, email, parent, clientName, options, callback) {
    const falseClient = parent ? { parentId: parent._id } : null;
    detailsFromParent(falseClient, (err, values) => {
      const supportEmail = options.supportEmail && options.supportEmail != '' ? options.supportEmail : values.supportEmail;
      options.customText = options.customText ? options.customText : '';
      options.customText.replace(/(?:\r\n|\r|\n)/g, '<br/>');
      const msg = {
        to: email,
        from: values.fromEmail,
        subject: `You have been added to ${clientName} on Curve`,
        templateId: '3efa7435-908b-47e9-b1b7-15a2d8b7d001',
        substitutions: {
          clientName,
          logo: values.logo,
          supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          customText: options.customText,
          email,
          allRightsReservedDate: getCurrentYear(),
        },
      };
      if ((options.cc && options.cc !== '') && (email !== options.cc)) { msg.cc = options.cc; }
      // invite for Payees
      if (options.payeeNames?.length > 0) {
        // modify msg params if payeeNames option has been supplied
        const last = options.payeeNames.pop();
        msg.substitutions.payeeNames = (options.payeeNames.length > 0) ? `${options.payeeNames.join(', ')} and ${last}` : last;
        // change the template id to custom inviteAdditionalPayee email template
        msg.templateId = '9bb51fab-3654-4764-8bf3-150a4da145bf';
      }

      // Custom Invite Email For Fuga Clients
      if (client?.fugaSplitType === 'Fuga Split') {
        if (options.payeeNames?.length > 0) {
          const last = options.payeeNames.pop();
          msg.substitutions.payeeName = (options.payeeNames.length > 0) ? `${options.payeeNames.join(', ')} and ${last}` : last;
        }

        msg.templateId = '4be60168-2bc2-4b35-b36a-f0bfe8ff7995';
      }
      sgMail.send(msg, callback);
    });
  },
  exportError(curveUser, client, subject, error, callback) {
    const User = require('../models/user');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          detailsFromParent(client, (err, values) => {
            const msg = {
              to: user.email,
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
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  exportDownload(curveUser, client, subject, link, callback) {
    const User = require('../models/user');
    const Client = require('../models/client');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user && !curveUser.email) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          detailsFromParent(client, (err, values) => {
            const msg = {
              to: user?.email || curveUser.email,
              from: values.fromEmail,
              subject,
              html: 'Your download is ready, and will be available for the next 24 hours.',
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
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  cwrDelivery(to, cc, client, subject, link, delivery, callback) {
    const User = require('../models/user');
    const Client = require('../models/client');
    detailsFromParent(client, (err, values) => {
      const msg = {
        to,
        from: values.fromEmail,
        subject,
        html: `Your download is ready, and will be available for the next 7 days. <br/><br/> ${delivery?.name} <br/><br/> ${delivery?.receivingParty}`,
        templateId: 'de8d2af0-2046-40f6-9f93-245e2ff855d0',
        substitutions: {
          link,
          logo: values.logo,
          supportEmail: client?.customSupportEmail || values.supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          allRightsReservedDate: getCurrentYear(),
        },
      };
      if (cc) {
        msg.cc = cc;
      }
      sgMail.send(msg, callback);
    });
  },
  deliveryComplete(curveUser, client, subject, deliveryPartner, callback) {
    const User = require('../models/user');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          let html = `Your delivery to ${deliveryPartner} is complete.<br/><br/>`;
          html += 'Check the delivery in Curve to see any results from the acknowledgement from the delivery partner.';
          detailsFromParent(client, (err, values) => {
            const msg = {
              to: user.email,
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
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  deliveryError(curveUser, client, subject, deliveryPartner, errors, callback) {
    const User = require('../models/user');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          let html = `We're sorry, but your delivery to ${deliveryPartner} has errored.<br/><br/>The issues with the export are: <br/><br/><ul>`;
          async.each(errors, (error, errorCb) => {
            html += `<li>${error}</li>`;
            errorCb();
          }, () => {
            html += '</ul>';
            html += 'Please check the details are correct, and try again, or contact support.';
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
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  importComplete(curveUser, client, subject, fileName, count, callback) {
    const User = require('../models/user');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
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
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  importError(curveUser, client, subject, fileName, errors, callback) {
    const User = require('../models/user');
    const async = require('async');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          let html = `We're sorry, but your import for ${fileName} has errored.<br/><br/>The issues with the import are: <br/><br/><ul>`;
          async.each(errors, (error, errorCb) => {
            html += `<li>${error}</li>`;
            errorCb();
          }, () => {
            html += '</ul>';
            html += 'Please be aware, nothing has been imported. Your import now needs to be error free in order to import anything. Any errors raised here should be fixed and then try to import again.';
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
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  spotifyImportError(curveUser, client, subject, errors, callback) {
    const User = require('../models/user');
    const async = require('async');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          let html = 'We`re sorry, but your Spotify Import has errored.<br/><br/>The issues with the import are: <br/><br/><ul>';
          async.each(errors, (error, errorCb) => {
            html += `<li>${error}</li>`;
            errorCb();
          }, () => {
            html += '</ul>';
            html += 'Please be aware, nothing has been imported. Your import now needs to be error free in order to import anything. Any errors raised here should be fixed and then try to import again.';
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
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  partialImportError(curveUser, client, subject, fileName, errors, callback) {
    const User = require('../models/user');
    const async = require('async');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          let html = `We're sorry, but your import for ${fileName} has partially errored.<br/><br/>The issues with the import are: <br/><br/><ul>`;
          async.each(errors, (error, errorCb) => {
            html += `<li>${error}</li>`;
            errorCb();
          }, () => {
            html += '</ul>';
            html += 'The rest of the import completed fine, and only these items remain unchanged. This is due to validation issues when saving. Any errors can be fixed individually and reimported.';
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
          });
        }
      });
  },
  partialSpotifyImportError(curveUser, client, subject, fileName, errors, callback) {
    const User = require('../models/user');
    const async = require('async');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          let html = 'We`re sorry, but your Spotify import for has partially errored.<br/><br/>The issues with the import are: <br/><br/><ul>';
          async.each(errors, (error, errorCb) => {
            html += `<li>${error}</li>`;
            errorCb();
          }, () => {
            html += '</ul>';
            html += 'The rest of the import completed fine, and only these items remain unchanged. This is due to validation issues when saving. Any errors can be fixed individually and reimported.';
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
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  csPartialImportError(curveUser, client, subject, fileName, errors, callback) {
    const User = require('../models/user');
    const async = require('async');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          let html = `We're sorry, but your import for ${fileName} has partially errored.<br/><br/>The issues with the import are: <br/><br/><ul>`;
          async.each(errors, (error, errorCb) => {
            html += `<li>${error}</li>`;
            errorCb();
          }, () => {
            html += '</ul>';
            html += 'The rest of the import completed fine, and only these items are affected. This is due to validation issues when saving. Any errors can be fixed individually and reimported.';
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
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  importErrorIngestedCompleteItems(curveUser, client, subject, fileName, errors, callback) {
    const User = require('../models/user');
    const async = require('async');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          let html = `We're sorry, but your import for ${fileName} has errored.<br/><br/>The issues with the import are: <br/><br/><ul>`;
          async.each(errors, (error, errorCb) => {
            html += `<li>${error}</li>`;
            errorCb();
          }, () => {
            html += '</ul>';
            html += 'Please be aware, the completed items have been updated, so you only need to reingest any errored lines.';
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
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  bulkImportComplete(curveUser, client, subject, importName, releases, tracks, payees, contracts, callback) {
    const User = require('../models/user');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          detailsFromParent(client, (err, values) => {
            const msg = {
              to: user.email,
              from: values.fromEmail,
              subject,
              html: `Your import ${importName} has completed.<br/><br/>Releases: ${releases}<br/>Tracks: ${tracks}<br/>Payees: ${payees}<br/>Contracts: ${contracts}<br/>`,
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
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  bulkImportError(curveUser, client, subject, importName, error, callback) {
    const User = require('../models/user');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          detailsFromParent(client, (err, values) => {
            const msg = {
              to: user.email,
              from: values.fromEmail,
              subject,
              html: `Your import ${importName} has errored.<br/><br/>Error Message: <br/><br/>${error}`,
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
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  cwrImportComplete(curveUser, client, subject, importName, works, callback) {
    const User = require('../models/user');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          detailsFromParent(client, (err, values) => {
            const msg = {
              to: user.email,
              from: values.fromEmail,
              subject,
              html: `Your import ${importName} has completed.<br/><br/>Ingested Works: ${works}`,
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
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  bulkPublishingImportComplete(curveUser, client, subject, importName, payees, contracts, composers, publishers, works, callback) {
    const User = require('../models/user');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          detailsFromParent(client, (err, values) => {
            const msg = {
              to: user.email,
              from: values.fromEmail,
              subject,
              html: `Your import ${importName} has completed.<br/><br/>Payees: ${payees}<br/>Contracts: ${contracts}<br/>Composers: ${composers}<br/>Publishers: ${publishers}<br/>Works: ${works}<br/>`,
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
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  statementReady(email, client, year, accountingPeriod, callback) {
    detailsFromParent(client, (err, values) => {
      const supportEmail = client.customSupportEmail && client.customSupportEmail != '' ? client.customSupportEmail : values.supportEmail;
      client.statementEmailCustomText = client.statementEmailCustomText ? Utils.unescapeHtml(client.statementEmailCustomText) : '';
      client.statementEmailCustomText.replace(/(?:\r\n|\r|\n)/g, '<br/>');
      let customText = client.statementEmailCustomText ? `${client.statementEmailCustomText}<br/><br/>` : '';
      customText += 'Need help understanding your statement? Find out more at <a href="https://www.curveforcreators.com" target="_blank">Curve For Creators here.</a>';
      const msg = {
        to: email,
        from: values.fromEmail,
        subject: `Your ${client.name} ${year} ${accountingPeriod} statement is ready`,
        templateId: '75a86265-0500-4bde-a055-16bc672c599f',
        substitutions: {
          clientName: client.name,
          year,
          accountingPeriod,
          link: values.url,
          logo: values.logo,
          supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          customText,
          allRightsReservedDate: getCurrentYear(),
        },
      };
      if (client.ccCommunicationEmail && client.ccCommunicationEmail != '') { msg.cc = client.ccCommunicationEmail; }
      sgMail.send(msg, callback);
    });
  },
  statementReadyAndInvite(email, client, year, accountingPeriod, token, callback) {
    detailsFromParent(client, (err, values) => {
      const supportEmail = client.customSupportEmail && client.customSupportEmail !== '' ? client.customSupportEmail : values.supportEmail;
      client.statementEmailCustomText = client.statementEmailCustomText ? Utils.unescapeHtml(client.statementEmailCustomText) : '';
      client.statementEmailCustomText.replace(/(?:\r\n|\r|\n)/g, '<br/>');
      let customText = client.statementEmailCustomText ? `${client.statementEmailCustomText}<br/><br/>` : '';
      const subject = `Your ${client.name} ${year} ${accountingPeriod} statement is ready`;
      let mainText = `Your statement for ${year} ${accountingPeriod} from ${client.name} is ready.<br/><br/>`;
      mainText += 'You can view and download it by activating your Curve account, and clicking on Statements in the sidebar.';
      const buttonText = 'Get Statement';
      const url = `${values.url}/reset`;
      customText += 'Need help understanding your statement? Find out more at <a href="https://www.curveforcreators.com" target="_blank">Curve For Creators here.</a>';
      const msg = {
        to: email,
        from: values.fromEmail,
        subject,
        templateId: '4dd0d3b6-37a1-4f97-b8c7-5f4e5220467d',
        substitutions: {
          body: mainText,
          buttonText,
          link: `${url}?token=${token}&statement=true`,
          logo: values.logo,
          supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          customText,
          allRightsReservedDate: getCurrentYear(),
        },
      };
      if (client.ccCommunicationEmail && client.ccCommunicationEmail != '') { msg.cc = client.ccCommunicationEmail; }
      sgMail.send(msg, callback);
    });
  },
  statementsReady(email, client, year, accountingPeriod, statements, callback) {
    detailsFromParent(client, (err, values) => {
      const supportEmail = client.customSupportEmail && client.customSupportEmail !== '' ? client.customSupportEmail : values.supportEmail;
      client.statementEmailCustomText = client.statementEmailCustomText ? Utils.unescapeHtml(client.statementEmailCustomText) : '';
      client.statementEmailCustomText.replace(/(?:\r\n|\r|\n)/g, '<br/>');
      const multiple = (statements.length > 1); // check if there is more than one statement to be included in the email
      const subject = `Your ${client.name} ${year} ${accountingPeriod} statement${multiple ? 's are' : ' is'} ready`;
      let mainText = `Your statement${multiple ? 's' : ''} for ${year} ${accountingPeriod} from ${client.name}${multiple ? ' are' : ' is'} ready.`;

      let statementsToShow = statements;
      if (statements.length > 10) {
        // limit array to first 10
        statementsToShow = statements.slice(0, 10);
      }

      // Build statements list
      const statementList = `<ul>${statementsToShow.map((pS) => `<li>${pS.name}</li>`).join('')}</ul>`;

      mainText += statementList;

      if (statements.length > 10) {
        mainText += `<ul> And ${statements.length - 10} more... </ul> <br/>`;
      }

      mainText += `You can view and download ${multiple ? 'them' : 'it'} by logging into Curve, and clicking on Statements in the sidebar.`;
      const buttonText = `Get Statement${multiple ? 's' : ''}`;
      let customText = client.statementEmailCustomText ? `${client.statementEmailCustomText}<br/><br/>` : '';
      customText += 'Need help understanding your statement? Find out more at <a href="https://www.curveforcreators.com" target="_blank">Curve For Creators here.</a>';
      const msg = {
        to: email,
        from: values.fromEmail,
        subject,
        templateId: '4dd0d3b6-37a1-4f97-b8c7-5f4e5220467d',
        substitutions: {
          body: mainText,
          buttonText,
          link: values.url,
          logo: values.logo,
          supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          customText,
          allRightsReservedDate: getCurrentYear(),
        },
      };
      if (client.ccCommunicationEmail && client.ccCommunicationEmail != '') { msg.cc = client.ccCommunicationEmail; }

      // Custom Logo for Fuga Flag
      if (client?.fugaSplitType === 'Fuga Split') {
        msg.templateId = '5c54091e-a796-41dd-80fd-4b07a927a7b4';
      }

      sgMail.send(msg, callback);
    });
  },
  statementsReadyAndInvite(email, client, year, accountingPeriod, statements, token, callback) {
    detailsFromParent(client, (err, values) => {
      const supportEmail = client.customSupportEmail && client.customSupportEmail !== '' ? client.customSupportEmail : values.supportEmail;
      client.statementEmailCustomText = client.statementEmailCustomText ? Utils.unescapeHtml(client.statementEmailCustomText) : '';
      client.statementEmailCustomText.replace(/(?:\r\n|\r|\n)/g, '<br/>');
      const multiple = (statements.length > 1); // check if there is more than one statement to be included in the email
      const subject = `Your ${client.name} ${year} ${accountingPeriod} statement${multiple ? 's are' : ' is'} ready`;
      let mainText = `Your statement${multiple ? 's' : ''} for ${year} ${accountingPeriod} from ${client.name}${multiple ? ' are' : ' is'} ready.`;

      let statementsToShow = statements;
      if (statements.length > 10) {
        // limit array to first 10
        statementsToShow = statements.slice(0, 10);
      }

      // Build statements list
      const statementList = `<ul>${statementsToShow.map((pS) => `<li>${pS.name}</li>`).join('')}</ul>`;
      mainText += statementList;

      if (statements.length > 10) {
        mainText += `<ul> ...And ${statements.length - 10} more Statements </ul> <br/>`;
      }

      mainText += `You can view and download ${multiple ? 'them' : 'it'} by activating your Curve account, and clicking on Statements in the sidebar.`;
      const buttonText = `Get Statement${multiple ? 's' : ''}`;
      let customText = client.statementEmailCustomText ? `${client.statementEmailCustomText}<br/><br/>` : '';
      customText += 'Need help understanding your statement? Find out more at <a href="https://www.curveforcreators.com" target="_blank">Curve For Creators here.</a>';
      const url = `${values.url}/reset`;
      const msg = {
        to: email,
        from: values.fromEmail,
        subject,
        templateId: '4dd0d3b6-37a1-4f97-b8c7-5f4e5220467d',
        substitutions: {
          body: mainText,
          buttonText,
          link: `${url}?token=${token}&statement=true`,
          logo: values.logo,
          supportEmail,
          parentName: values.name,
          parentAddress: values.address,
          customText,
          allRightsReservedDate: getCurrentYear(),
        },
      };
      if (client.ccCommunicationEmail && client.ccCommunicationEmail != '') { msg.cc = client.ccCommunicationEmail; }

      // Custom Logo for Fuga Flag
      if (client?.fugaSplitType === 'Fuga Split') {
        msg.templateId = '5c54091e-a796-41dd-80fd-4b07a927a7b4';
      }

      sgMail.send(msg, callback);
    });
  },
  genericComplete(curveUser, client, subject, mainText, callback) {
    const User = require('../models/user');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          detailsFromParent(client, (err, values) => {
            const msg = {
              to: user.email,
              from: values.fromEmail,
              subject,
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
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  genericError(curveUser, client, subject, mainText, closingText, errors, callback) {
    const User = require('../models/user');
    const async = require('async');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          let html = mainText;
          html += '<br/><ul>';
          async.each(errors, (error, errorCb) => {
            html += `<li>${error}</li>`;
            errorCb();
          }, () => {
            html += '</ul>';
            html += closingText;
            detailsFromParent(client, (err, values) => {
              const msg = {
                to: user.email,
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
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  flushPaymentValidation(curveUser, client, subject, fileName, errors, callback) {
    const User = require('../models/user');
    const async = require('async');
    User.findById(curveUser.id)
      .then((user) => {
        if (!user) {
          console.log('Error finding user to send email');
          callback(new Error('Error finding user to send email'));
        } else {
          let html = `Payment Flush completed with ${errors.length} error${errors.length !== 1 ? 's' : ''}<br/><br/><ul>`;
          async.each(errors, (error, errorCb) => {
            html += `<li>${error}</li>`;
            errorCb();
          }, () => {
            html += '</ul>';
            detailsFromParent(client, (err, values) => {
              const msg = {
                to: user.email,
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
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  confirm(email, token, callback) {
    detailsFromParent(null, (err, values) => {
      const url = `${values.url}/signup/confirm?token=${token}`;
      const msg = {
        to: email,
        from: values.fromEmail,
        subject: 'Complete Curve Sign Up',
        html: `Please confirm your email by clicking the link below, and we\'ll get your account setup completed. <br><br><br>
        <center>
          <a href="${url}" 
            style="display:inline-block;color:#ffffff;text-decoration:none;border-radius:20px;background-color:#4aa3df;border-top:10px solid #4aa3df;border-right:18px solid #4aa3df;border-bottom:10px solid #4aa3df;border-left:18px solid #4aa3df">
              Complete Sign Up
          </a>
        </center>
        `,
        templateId: 'ca132040-44b6-4421-aa9e-86d56022dea1',
        substitutions: {
          link: url,
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
  genericEmail(email, client, subject, mainText, callback) {
    detailsFromParent(client, (err, values) => {
      const msg = {
        to: email,
        from: values.fromEmail,
        subject,
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
  expiredPassword(email, parent, callback) {
    const falseClient = parent ? { parentId: parent._id } : null;
    detailsFromParent(falseClient, (err, values) => {
      const msg = {
        to: email,
        from: values.fromEmail,
        subject: 'Curve Royalty System - Password Updated',
        templateId: 'ca132040-44b6-4421-aa9e-86d56022dea1',
        html: 'Your password has been updated. If you did not request this change, please contact support.',
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
  async notifyNewlyAddedSplit({ email, client, track }) {
    // Values from client setup, i.e. logos...
    const values = await new Promise((resolve, reject) => {
      detailsFromParent(client, (err, values) => {
        if (err) {
          reject(err);
        } else {
          resolve(values);
        }
      });
    });

    // Config for email
    const msg = {
      to: email,
      from: values.fromEmail,
      subject: 'You have been added to a new royalty split',
      templateId: '3f243b7d-acbd-4098-bc64-5c9623e55e88',
      substitutions: {
        trackName: track.title,
        trackArtist: track.artist,
        link: values.url,
        logo: client.fugaSplitType === 'Fuga Split' ? 'https://res.cloudinary.com/dnaxy8rkw/image/upload/v1701876968/kzjl3bnef128nsqiiae8.png' : values.logo,
        supportEmail: values.supportEmail,
        parentName: values.name,
        parentAddress: values.address,
        allRightsReservedDate: getCurrentYear(),
      },
    };

    // Send Email
    await new Promise((resolve, reject) => {
      sgMail.send(msg, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },
};
