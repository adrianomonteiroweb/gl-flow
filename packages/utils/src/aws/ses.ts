import Mustache from 'mustache';
import * as fs from 'fs';

import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { getAWSCredentials } from './credentials';
import TemplateDefault from '../templates/default';

const ses = new SESClient(getAWSCredentials());

export class SES {
  static _parseEmails(emails: any = []) {
    return Array.isArray(emails) ? emails : emails.split(',');
  }

  static render(data: any, template_id: string = 'default') {
    const templates: any = {
      default: TemplateDefault,
    };

    const html: string = templates[template_id];
    return Mustache.render(html, data);
  }

  static send(data: any = {}, opts: any = {}) {
    const html = this.render(data, opts.template);

    if (opts.attachments && opts.attachments.length > 0) {
      return this._sendWithAttachments({
        ...opts,
        html,
      });
    }

    return this._send({
      ...opts,
      html,
    });
  }

  static _send(opts: any) {
    if (process.env.DISABLE_EMAIL_NOTIFICATIONS === '1') {
      console.warn('Email notifications are disabled.');
      return;
    }

    const ToAddresses = this._parseEmails(opts.to);
    const CcAddresses = this._parseEmails(opts.cc);
    const CcoAddresses = this._parseEmails(opts.cco);

    const params = {
      Destination: { ToAddresses, CcAddresses, CcoAddresses },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: opts.html || opts.text,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: opts.subject,
        },
      },
      Source: process.env.SES_FROM || 'no-reply@solfy.tech',
    };

    const command = new SendEmailCommand(params);
    return ses.send(command);
  }

  static _sendWithAttachments(opts: any) {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Construir cabeçalhos do email
    let rawMessage = `From: ${opts.from || process.env.SES_FROM || 'no-reply@solfy.tech'}\n`;
    rawMessage += `To: ${this._parseEmails(opts.to).join(', ')}\n`;

    if (opts.cc) {
      rawMessage += `Cc: ${this._parseEmails(opts.cc).join(', ')}\n`;
    }

    if (opts.cco) {
      rawMessage += `Bcc: ${this._parseEmails(opts.cco).join(', ')}\n`;
    }

    rawMessage += `Subject: ${opts.subject}\n`;
    rawMessage += `MIME-Version: 1.0\n`;
    rawMessage += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;

    // Corpo do email (HTML)
    rawMessage += `--${boundary}\n`;
    rawMessage += `Content-Type: text/html; charset=UTF-8\n`;
    rawMessage += `Content-Transfer-Encoding: 7bit\n\n`;
    rawMessage += `${opts.html || opts.text}\n\n`;

    // Anexos
    if (opts.attachments) {
      for (const attachment of opts.attachments) {
        rawMessage += `--${boundary}\n`;
        rawMessage += `Content-Type: application/octet-stream\n`;
        rawMessage += `Content-Transfer-Encoding: base64\n`;
        rawMessage += `Content-Disposition: attachment; filename="${attachment.filename}"\n\n`;

        // Ler arquivo e converter para base64
        try {
          const fileContent = fs.readFileSync(attachment.path);
          const base64Content = fileContent.toString('base64');

          // Dividir em linhas de 76 caracteres (padrão MIME)
          const lines = base64Content.match(/.{1,76}/g) || [];
          rawMessage += lines.join('\n') + '\n\n';
        } catch (error) {
          console.error(`Erro ao ler arquivo ${attachment.path}:`, error);
          throw new Error(`Não foi possível ler o arquivo ${attachment.filename}`);
        }
      }
    }

    rawMessage += `--${boundary}--`;

    const params = {
      RawMessage: {
        Data: Buffer.from(rawMessage),
      },
    };

    const command = new SendRawEmailCommand(params);
    return ses.send(command);
  }
}

export default SES;
