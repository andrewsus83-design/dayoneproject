import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || 're_placeholder';
const defaultFrom = process.env.RESEND_FROM_EMAIL || 'all41 <invitations@all41.app>';

export const resend = new Resend(resendApiKey);

export interface SendEventEmailOptions {
  to: string;
  guestName: string;
  eventName: string;
  eventDate: string;
  locationName?: string;
  tableNumber?: string | null;
  qrCodeUrl: string;
  invitationLink: string;
  type: 'invitation' | 'reminder' | 'thank_you';
  customSubject?: string;
}

export async function sendEventEmail(options: SendEventEmailOptions) {
  const {
    to,
    guestName,
    eventName,
    eventDate,
    locationName,
    tableNumber,
    qrCodeUrl,
    invitationLink,
    type,
    customSubject,
  } = options;

  let subject = customSubject;
  if (!subject) {
    if (type === 'invitation') subject = `You are cordially invited to ${eventName}`;
    else if (type === 'reminder') subject = `Reminder: ${eventName} is happening soon!`;
    else subject = `Thank you for celebrating with us at ${eventName}`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0b0d13; color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 580px; margin: 0 auto; background: #121622; border-radius: 16px; border: 1px solid #23293d; overflow: hidden; }
          .header { background: linear-gradient(135deg, #00f0ff 0%, #dfb76c 50%, #ff007f 100%); padding: 3px; }
          .header-inner { background: #121622; padding: 32px 24px; text-align: center; }
          .title { font-size: 26px; font-weight: 800; color: #dfb76c; margin: 0 0 8px 0; }
          .subtitle { font-size: 14px; color: #94a3b8; margin: 0; }
          .body { padding: 32px 24px; }
          .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #ffffff; }
          .event-card { background: #181e2e; border: 1px solid #28324a; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .event-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
          .label { color: #94a3b8; }
          .value { color: #ffffff; font-weight: 600; }
          .qr-section { text-align: center; margin: 28px 0; }
          .qr-image { width: 180px; height: 180px; border-radius: 8px; border: 2px solid #dfb76c; padding: 6px; background: #ffffff; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { display: inline-block; background: linear-gradient(135deg, #00f0ff, #dfb76c); color: #0b0d13; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 9999px; }
          .footer { text-align: center; font-size: 12px; color: #64748b; padding: 20px; border-top: 1px solid #1e2538; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-inner">
              <h1 class="title">${eventName}</h1>
              <p class="subtitle">${eventDate}</p>
            </div>
          </div>
          <div class="body">
            <div class="greeting">Dear ${guestName},</div>
            <p style="color: #cbd5e1; line-height: 1.6;">
              ${type === 'invitation' ? 'We are delighted to invite you to join us for an unforgettable occasion. Please find your personal event ticket and access details below.' : ''}
              ${type === 'reminder' ? 'This is a friendly reminder that our event is coming up soon. We look forward to seeing you!' : ''}
              ${type === 'thank_you' ? 'Thank you so much for attending and making our celebration extraordinary!' : ''}
            </p>

            <div class="event-card">
              <div class="event-row">
                <span class="label">Date & Time:</span>
                <span class="value">${eventDate}</span>
              </div>
              ${locationName ? `
              <div class="event-row">
                <span class="label">Location:</span>
                <span class="value">${locationName}</span>
              </div>` : ''}
              ${tableNumber ? `
              <div class="event-row">
                <span class="label">Table Number:</span>
                <span class="value">${tableNumber}</span>
              </div>` : ''}
            </div>

            <div class="qr-section">
              <p style="font-size: 13px; color: #94a3b8; margin-bottom: 12px;">Your Personal Check-in QR Code:</p>
              <img src="${qrCodeUrl}" alt="Event Ticket QR" class="qr-image" />
              <p style="font-size: 11px; color: #64748b; margin-top: 8px;">Show this QR at the venue entrance for seamless check-in & interactive access.</p>
            </div>

            <div class="btn-container">
              <a href="${invitationLink}" class="btn">View Digital Invitation & RSVP</a>
            </div>
          </div>
          <div class="footer">
            Powered by <strong>all41.app</strong> — Everything you need for your event
          </div>
        </div>
      </body>
    </html>
  `;

  return await resend.emails.send({
    from: defaultFrom,
    to,
    subject,
    html,
  });
}
