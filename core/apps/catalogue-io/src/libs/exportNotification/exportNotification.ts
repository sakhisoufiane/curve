import sgMail from '@sendgrid/mail';
// @ts-expect-error — no type declarations for platform-shared-utils
import { logger } from '@curveroyaltysystems/platform-shared-utils';
import { Notification, User, Parent } from '../../models';

sgMail.setApiKey(process.env.sendgridKey ?? '');
sgMail.setSubstitutionWrappers('{{', '}}');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClientDoc {
  _id?: { toString(): string };
  name: string;
  parentId?: string;
  fugaIntegration?: { statementNotifications?: boolean };
}

interface ParentDetails {
  logo: string;
  supportEmail: string;
  name: string;
  address: string;
  url: string;
  fromEmail: string;
}

export interface GenerateOptions {
  email: string;
  client: ClientDoc;
  identifier: string;
  subject?: string;
  link?: string | null;
  urls?: { url: string; name: string }[];
  mainText?: string;
  closingText?: string;
  error?: string | string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FROM_EMAIL = 'Curve Royalties <noreply@curveroyaltysystems.com>';

const DOWNLOAD_IDENTIFIERS = new Set([
  'reportDownload',
  'salesExportZips',
  'statementSalesExportZips',
  'songlistDownload',
  'statementAllFilesExportZip',
  'worksExportDownload',
  'unmappedExportDownload',
  'cwrExportDownload',
]);

// ---------------------------------------------------------------------------
// White-label branding
// ---------------------------------------------------------------------------

async function detailsFromParent(client: ClientDoc | null): Promise<ParentDetails> {
  const values: ParentDetails = {
    logo: 'https://app.curveroyaltysystems.com/assets/img/curvetypwhite2x.png',
    supportEmail: 'support@curveroyaltysystems.com',
    name: 'Curve',
    address: '7 Bell Yard<br/>London<br/>WC2A 2JR',
    url: process.env.frontEndUrl ?? '',
    fromEmail: FROM_EMAIL,
  };

  if (!client?.parentId) return values;

  try {
    const parent = await Parent.findById(client.parentId).lean() as {
      whiteLabelCommunication?: boolean;
      publicLightLogo?: string;
      supportEmail?: string;
      name?: string;
      address?: string;
      customDomain?: string;
    } | null;

    if (parent?.whiteLabelCommunication) {
      if (parent.publicLightLogo) values.logo = parent.publicLightLogo;
      if (parent.supportEmail) values.supportEmail = parent.supportEmail;
      if (parent.name) values.name = parent.name;
      if (parent.address) values.address = parent.address;
      if (parent.customDomain) values.url = parent.customDomain;
      if (parent.supportEmail) values.fromEmail = parent.supportEmail;
    } else if (!parent?.whiteLabelCommunication && client.fugaIntegration?.statementNotifications) {
      values.supportEmail = 'royalties-support@fuga.com';
    }
  } catch (err) {
    logger.error('Error finding parent for notification branding', err);
  }

  return values;
}

// ---------------------------------------------------------------------------
// Email senders
// ---------------------------------------------------------------------------

async function sendReportDownloadEmail(
  email: string,
  client: ClientDoc,
  subject: string,
  link: string | null,
  mainText?: string,
): Promise<void> {
  const values = await detailsFromParent(client);
  await sgMail.send({
    to: email,
    from: values.fromEmail,
    subject,
    html: mainText ?? 'Your download is ready, and will be available for the next 24 hours.',
    templateId: 'de8d2af0-2046-40f6-9f93-245e2ff855d0',
    substitutions: {
      link: link ?? '',
      logo: values.logo,
      supportEmail: values.supportEmail,
      parentName: values.name,
      parentAddress: values.address,
      allRightsReservedDate: `${new Date().getFullYear()}`,
    },
  });
}

async function sendGenericCompleteEmail(
  email: string,
  client: ClientDoc,
  subject: string,
  mainText?: string,
): Promise<void> {
  const values = await detailsFromParent(client);
  await sgMail.send({
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
      allRightsReservedDate: `${new Date().getFullYear()}`,
    },
  });
}

async function sendGenericErrorEmail(
  email: string,
  client: ClientDoc,
  subject: string,
  mainText?: string,
  closingText?: string,
  errors?: string | string[],
): Promise<void> {
  let html = mainText || subject;
  if (Array.isArray(errors)) {
    html += '<br/><ul>';
    for (const error of errors) html += `<li>${error}</li>`;
    html += '</ul>';
  }
  html += closingText ?? '';

  const values = await detailsFromParent(client);
  await sgMail.send({
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
      allRightsReservedDate: `${new Date().getFullYear()}`,
    },
  });
}

// ---------------------------------------------------------------------------
// Core generate function (ported from notificationSchema.statics.generate)
// ---------------------------------------------------------------------------

export async function generate(
  name: string,
  description: string,
  link: string | null,
  options: GenerateOptions,
): Promise<void> {
  const user = await User.findOne({ email: options.email }).lean() as {
    _id: unknown;
    notifications?: string;
  } | null;

  let saveInAppNotification = false;
  let sendEmailNotification = false;

  if (!user && options.email) {
    // No user account found — send email only (e.g. Fuga Splits workaround)
    sendEmailNotification = true;
  } else if (user?.notifications === 'Both') {
    saveInAppNotification = true;
    sendEmailNotification = true;
  } else if (user?.notifications === 'In App Notifications') {
    saveInAppNotification = true;
  } else if (user?.notifications === 'Email') {
    sendEmailNotification = true;
  } else if (user) {
    saveInAppNotification = true;
  }

  if (saveInAppNotification && user) {
    const doc: Record<string, unknown> = {
      clientId: options.client._id!.toString(),
      userId: user._id,
      name,
      description,
      link,
    };
    if (options.error) doc.notificationErrors = options.error;
    if (options.urls && options.urls.length > 0) doc.urls = options.urls;
    await new Notification(doc).save();
  }

  if (!sendEmailNotification) return;

  if (DOWNLOAD_IDENTIFIERS.has(options.identifier)) {
    if (options.urls) {
      await sendGenericCompleteEmail(options.email, options.client, options.subject ?? name, options.mainText);
    } else {
      await sendReportDownloadEmail(options.email, options.client, options.subject ?? name, options.link ?? link, options.mainText);
    }
  } else if (options.identifier === 'genericComplete' || options.identifier === 'periodComplete') {
    await sendGenericCompleteEmail(options.email, options.client, options.subject ?? name, options.mainText);
  } else if (options.identifier === 'genericError') {
    await sendGenericErrorEmail(options.email, options.client, options.subject ?? name, options.mainText, options.closingText, options.error);
  } else {
    throw new Error(`Notification not sent, no valid identifier found: ${options.identifier}`);
  }
}

// ---------------------------------------------------------------------------
// Public notification helpers
// ---------------------------------------------------------------------------

export async function sendWorksExportNotification({
  url,
  client,
  email,
  isError = false,
}: {
  url: string | null;
  client: ClientDoc;
  email: string;
  isError?: boolean;
}): Promise<void> {
  if (isError) {
    const subject = `Your Works Export for ${client.name} Has Errored`;
    await generate(subject, subject, null, {
      identifier: 'genericError',
      client,
      subject,
      email,
      mainText: 'There was an error while generating your export. Please try again later or contact support if the issue persists.',
    });
    return;
  }

  const subject = `Your Works Export for ${client.name} is Ready to Download`;
  await generate('Works Export Ready', subject, url, {
    identifier: 'worksExportDownload',
    client,
    subject,
    email,
    link: url,
  });
  logger.info('Works Export Notification sent');
}
