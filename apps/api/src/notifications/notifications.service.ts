import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ─── E-Mail Templates ────────────────────────────────────────────────────────

const BASE_STYLE = `
  font-family: 'Georgia', serif;
  max-width: 600px;
  margin: 0 auto;
  background: #fdf8f8;
  color: #1c1b1b;
`;

const BUTTON_STYLE = `
  display: inline-block;
  background: #1c1b1b;
  color: #fff !important;
  text-decoration: none;
  padding: 13px 28px;
  font-family: 'Helvetica Neue', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const GOLD = '#9E896A';

function layout(content: string, frontendUrl: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f0ef;">
  <div style="${BASE_STYLE}">
    <!-- Header -->
    <div style="background:#1c1b1b;padding:28px 40px;text-align:center;">
      <a href="${frontendUrl}" style="font-family:'Georgia',serif;font-size:26px;font-weight:700;color:#fdf8f8;text-decoration:none;letter-spacing:-0.02em;">
        My Dressa
      </a>
    </div>

    <!-- Content -->
    <div style="padding:40px;background:#fff;border-left:1px solid #e8e3e1;border-right:1px solid #e8e3e1;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="padding:24px 40px;text-align:center;border:1px solid #e8e3e1;border-top:none;background:#fdf8f8;">
      <p style="font-size:11px;color:#9e9e9b;margin:0 0 6px;font-family:sans-serif;letter-spacing:0.06em;text-transform:uppercase;">
        My Dressa · Fashion Marketplace · Deutschland
      </p>
      <p style="font-size:11px;color:#c4c7c7;margin:0;font-family:sans-serif;">
        Du erhältst diese E-Mail weil du ein Konto bei My Dressa hast.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function heading(text: string) {
  return `<h1 style="font-family:'Georgia',serif;font-size:26px;font-weight:700;color:#1c1b1b;margin:0 0 20px;letter-spacing:-0.02em;">${text}</h1>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #e8e3e1;margin:24px 0;">`;
}

function row(label: string, value: string) {
  return `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1edec;font-family:sans-serif;">
      <span style="font-size:12px;color:#9e9e9b;text-transform:uppercase;letter-spacing:0.08em;">${label}</span>
      <span style="font-size:13px;font-weight:600;color:#1c1b1b;">${value}</span>
    </div>`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: any; // nodemailer transporter
  private brevoApiKey: string | null = null;
  private fromEmail: string;
  private frontendUrl: string;
  private enabled: boolean;
  private testOverride: string | null;

  constructor(private readonly config: ConfigService) {
    // Brevo API Key (keine IP-Beschränkung)
    this.brevoApiKey = config.get<string>('BREVO_API_KEY', '');
    const brevoUser = config.get<string>('BREVO_SMTP_USER');
    const brevoPass = config.get<string>('BREVO_SMTP_KEY');
    // Fallback: Resend noch unterstützt
    const resendKey = config.get<string>('RESEND_API_KEY');

    this.fromEmail = config.get('EMAIL_FROM', 'My Dressa <noreply@mydressa.de>');
    this.frontendUrl = config.get('FRONTEND_URL', 'http://localhost:3000');
    this.testOverride = config.get<string>('EMAIL_TEST_OVERRIDE') || null;

    const nodemailer = require('nodemailer');

    if (brevoUser && brevoPass) {
      // Brevo SMTP
      this.transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: { user: brevoUser, pass: brevoPass },
      });
      this.enabled = true;
      this.logger.log('✅ Brevo SMTP E-Mail Service aktiv');
    } else if (resendKey && resendKey !== 'DEIN_RESEND_KEY') {
      // Fallback: Resend SMTP
      this.transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: { user: 'resend', pass: resendKey },
      });
      this.enabled = true;
      this.logger.log('✅ Resend SMTP E-Mail Service aktiv (Fallback)');
    } else {
      this.enabled = false;
      this.logger.warn('⚠️  Kein E-Mail Service konfiguriert — E-Mails werden nur geloggt');
    }
  }

  // ─── Core send ─────────────────────────────────────────────────────────────
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    // Brevo REST API (bevorzugt — keine IP-Beschränkung)
    if (this.brevoApiKey) {
      try {
        const fetch = require('node-fetch');
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': this.brevoApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'My Dressa', email: this.fromEmail.replace(/.*<(.+)>.*/, '$1').trim() },
            to: [{ email: to }],
            subject,
            htmlContent: html,
          }),
        });
        if (res.ok) {
          this.logger.log(`✉️  E-Mail gesendet → ${to} | ${subject}`);
          return;
        }
        const err = await res.json();
        this.logger.warn(`Brevo API Fehler: ${JSON.stringify(err)} — versuche SMTP`);
      } catch (e: any) {
        this.logger.warn(`Brevo API Exception: ${e.message} — versuche SMTP`);
      }
    }
    // SMTP Fallback
    // Guard: niemals mit leerem Empfänger senden
    if (!to || !to.trim()) {
      this.logger.warn(`sendEmail abgebrochen: kein Empfänger für "${subject}"`);
      return;
    }

    if (!this.enabled) {
      this.logger.log(`[E-MAIL MOCK] An: ${to} | Betreff: ${subject}`);
      return;
    }

    const recipient = (this.testOverride || to).trim();

    if (!recipient) {
      this.logger.warn(`sendEmail abgebrochen: Empfänger nach Trim leer`);
      return;
    }

    if (this.testOverride && this.testOverride !== to) {
      this.logger.warn(`[TEST OVERRIDE] E-Mail umgeleitet: ${to} → ${this.testOverride}`);
    }

    try {
      this.logger.debug(`Sende E-Mail: from="${this.fromEmail}" to="${recipient}" subject="${subject}"`);
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: recipient,
        subject,
        html,
      });
      this.logger.log(`✉️  E-Mail gesendet → ${recipient} | ${subject}`);
    } catch (err: any) {
      this.logger.error(`E-Mail konnte nicht gesendet werden: ${err.message}`);
    }
  }

  // ─── 1. Willkommens-E-Mail (nach Registrierung) ─────────────────────────────
  async sendWelcome(to: string, firstName: string) {
    const html = layout(`
      ${heading(`Willkommen, ${firstName}! 👗`)}
      <p style="font-family:sans-serif;font-size:14px;color:#5e5e5b;line-height:1.7;margin:0 0 24px;">
        Schön, dass du dabei bist! Bei My Dressa kannst du hochwertige Modestücke kaufen oder mieten —
        nachhaltig, erschwinglich und stilvoll.
      </p>
      <div style="background:#fdf8f8;padding:20px;margin:0 0 28px;border-left:3px solid ${GOLD};">
        <p style="font-family:sans-serif;font-size:13px;color:#1c1b1b;margin:0 0 6px;font-weight:600;">Was dich erwartet:</p>
        <p style="font-family:sans-serif;font-size:13px;color:#5e5e5b;margin:0;line-height:1.7;">
          ◈ Hunderte Designer-Stücke zum Mieten & Kaufen<br>
          ◈ Kaution wird nach Rückgabe vollständig freigegeben<br>
          ◈ Werde selbst Händler und verdiene Geld mit deiner Garderobe
        </p>
      </div>
      <a href="${this.frontendUrl}/products" style="${BUTTON_STYLE}">Kollektion entdecken →</a>
    `, this.frontendUrl);

    await this.sendEmail(to, 'Willkommen bei My Dressa! 👗', html);
  }

  // ─── 2. E-Mail Verifizierung ────────────────────────────────────────────────
  async sendEmailVerification(to: string, firstName: string, token: string) {
    const verifyUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;
    const html = layout(`
      ${heading('E-Mail bestätigen')}
      <p style="font-family:sans-serif;font-size:14px;color:#5e5e5b;line-height:1.7;margin:0 0 24px;">
        Hallo ${firstName}, bitte bestätige deine E-Mail-Adresse um dein Konto zu aktivieren.
        Der Link ist 24 Stunden gültig.
      </p>
      <a href="${verifyUrl}" style="${BUTTON_STYLE}">E-Mail bestätigen →</a>
      ${divider()}
      <p style="font-family:sans-serif;font-size:11px;color:#9e9e9b;margin:0;">
        Falls du dich nicht registriert hast, ignoriere diese E-Mail.
      </p>
    `, this.frontendUrl);

    await this.sendEmail(to, 'Bitte bestätige deine E-Mail — My Dressa', html);
  }

  // ─── 3. Bestellbestätigung (Kauf) ──────────────────────────────────────────
  async sendOrderConfirmation(to: string, details: {
    orderId: string;
    firstName: string;
    productTitle: string;
    size: string;
    totalPrice: number;
    merchantName: string;
  }) {
    const html = layout(`
      ${heading('Bestellung bestätigt ✓')}
      <p style="font-family:sans-serif;font-size:14px;color:#5e5e5b;line-height:1.7;margin:0 0 28px;">
        Hallo ${details.firstName}, deine Bestellung ist eingegangen und wird bearbeitet.
      </p>
      <div style="background:#fdf8f8;padding:20px;margin:0 0 28px;">
        ${row('Bestellnummer', details.orderId.slice(0, 8).toUpperCase())}
        ${row('Produkt', details.productTitle)}
        ${row('Größe', details.size)}
        ${row('Händler', details.merchantName)}
        ${row('Betrag', `€${Number(details.totalPrice).toFixed(2)}`)}
      </div>
      <a href="${this.frontendUrl}/account" style="${BUTTON_STYLE}">Bestellung verfolgen →</a>
    `, this.frontendUrl);

    await this.sendEmail(to, `Bestellbestätigung #${details.orderId.slice(0, 8).toUpperCase()} — My Dressa`, html);
  }

  // ─── 4. Mietbestätigung ─────────────────────────────────────────────────────
  async sendRentalConfirmation(to: string, details: {
    firstName: string;
    productTitle: string;
    size: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    rentalFee: number;
    depositAmount: number;
    merchantName: string;
  }) {
    const html = layout(`
      ${heading('Mietbestätigung ◈')}
      <p style="font-family:sans-serif;font-size:14px;color:#5e5e5b;line-height:1.7;margin:0 0 28px;">
        Hallo ${details.firstName}, deine Mietanfrage wurde bestätigt!
      </p>
      <div style="background:#fdf8f8;padding:20px;margin:0 0 20px;">
        ${row('Produkt', details.productTitle)}
        ${row('Größe', details.size)}
        ${row('Händler', details.merchantName)}
        ${row('Mietzeitraum', `${details.startDate} → ${details.endDate}`)}
        ${row('Dauer', `${details.durationDays} Tag${details.durationDays > 1 ? 'e' : ''}`)}
        ${row('Mietgebühr', `€${Number(details.rentalFee).toFixed(2)}`)}
        ${row('Kaution (gehalten)', `€${Number(details.depositAmount).toFixed(2)}`)}
      </div>
      <div style="background:#FAEEDA;padding:14px 18px;margin:0 0 28px;border-left:3px solid ${GOLD};">
        <p style="font-family:sans-serif;font-size:12px;color:#633806;margin:0;line-height:1.6;">
          <strong>Wichtig:</strong> Die Kaution von €${Number(details.depositAmount).toFixed(2)} wird nach erfolgreicher Rückgabe
          vollständig auf deine Karte zurückgebucht. Bitte gib das Kleid bis spätestens
          <strong>${details.endDate}</strong> zurück.
        </p>
      </div>
      <a href="${this.frontendUrl}/account" style="${BUTTON_STYLE}">Meine Mieten →</a>
    `, this.frontendUrl);

    await this.sendEmail(to, `Mietbestätigung — ${details.productTitle} | My Dressa`, html);
  }

  // ─── 5. Rückgabe-Erinnerung (1 Tag vorher) ─────────────────────────────────
  async sendRentalReminder(to: string, details: {
    firstName: string;
    productTitle: string;
    endDate: string;
    daysLeft: number;
  }) {
    const urgent = details.daysLeft <= 1;
    const html = layout(`
      ${heading(urgent ? '⚠️ Letzte Erinnerung: Rückgabe morgen!' : `Erinnerung: Rückgabe in ${details.daysLeft} Tagen`)}
      <p style="font-family:sans-serif;font-size:14px;color:#5e5e5b;line-height:1.7;margin:0 0 24px;">
        Hallo ${details.firstName}, deine Miete für <strong>${details.productTitle}</strong> endet
        ${urgent ? 'morgen' : `in ${details.daysLeft} Tagen`} am <strong>${details.endDate}</strong>.
      </p>
      ${urgent ? `
        <div style="background:#FCEBEB;padding:14px 18px;margin:0 0 24px;border-left:3px solid #ba1a1a;">
          <p style="font-family:sans-serif;font-size:13px;color:#791F1F;margin:0;line-height:1.6;">
            <strong>Achtung:</strong> Bei verspäteter Rückgabe wird die Kaution einbehalten.
            Bitte sende das Kleid noch heute zurück.
          </p>
        </div>
      ` : ''}
      <div style="background:#fdf8f8;padding:20px;margin:0 0 28px;">
        ${row('Produkt', details.productTitle)}
        ${row('Rückgabedatum', details.endDate)}
        ${row('Verbleibende Tage', String(details.daysLeft))}
      </div>
      <a href="${this.frontendUrl}/account" style="${BUTTON_STYLE}">Meine Mieten ansehen →</a>
    `, this.frontendUrl);

    await this.sendEmail(
      to,
      urgent
        ? `⚠️ Letzte Erinnerung: Rückgabe morgen — ${details.productTitle}`
        : `Erinnerung: ${details.daysLeft} Tage bis zur Rückgabe — ${details.productTitle}`,
      html
    );
  }

  // ─── 6. Kaution freigegeben ─────────────────────────────────────────────────
  async sendDepositReleased(to: string, firstName: string, details: {
    productTitle: string;
    amount: number;
  }) {
    const html = layout(`
      ${heading('Kaution freigegeben ✓')}
      <p style="font-family:sans-serif;font-size:14px;color:#5e5e5b;line-height:1.7;margin:0 0 24px;">
        Hallo ${details.productTitle}, vielen Dank für die pünktliche Rückgabe!
        Deine Kaution wurde freigegeben.
      </p>
      <div style="background:#EAF3DE;padding:20px;margin:0 0 28px;border-left:3px solid #27500A;">
        <p style="font-family:sans-serif;font-size:15px;font-weight:700;color:#27500A;margin:0 0 4px;">
          €${Number(details.amount).toFixed(2)} werden zurückgebucht
        </p>
        <p style="font-family:sans-serif;font-size:12px;color:#27500A;margin:0;">
          Die Rückbuchung erscheint in 3–5 Werktagen auf deiner Karte.
        </p>
      </div>
      <a href="${this.frontendUrl}/products" style="${BUTTON_STYLE}">Wieder shoppen →</a>
    `, this.frontendUrl);

    await this.sendEmail(to, '✓ Kaution freigegeben — My Dressa', html);
  }

  // ─── 7. Kaution einbehalten (Schaden) ──────────────────────────────────────
  async sendDepositRetained(to: string, firstName: string, details: {
    productTitle: string;
    amount: number;
    reason: string;
  }) {
    const html = layout(`
      ${heading('Kaution einbehalten')}
      <p style="font-family:sans-serif;font-size:14px;color:#5e5e5b;line-height:1.7;margin:0 0 24px;">
        Hallo ${firstName}, leider mussten wir die Kaution für deine Miete einbehalten.
      </p>
      <div style="background:#FCEBEB;padding:20px;margin:0 0 24px;border-left:3px solid #ba1a1a;">
        ${row('Produkt', details.productTitle)}
        ${row('Einbehaltener Betrag', `€${Number(details.amount).toFixed(2)}`)}
        ${row('Grund', details.reason)}
      </div>
      <p style="font-family:sans-serif;font-size:13px;color:#5e5e5b;line-height:1.7;">
        Bei Fragen wende dich an unser Support-Team unter support@mydressa.de.
      </p>
    `, this.frontendUrl);

    await this.sendEmail(to, 'Information zur Kaution — My Dressa', html);
  }

  // ─── 8. Merchant-Antrag genehmigt ──────────────────────────────────────────
  async sendMerchantApproved(to: string, firstName: string, shopName: string) {
    const html = layout(`
      ${heading('Glückwunsch — du bist Händler! 🎉')}
      <p style="font-family:sans-serif;font-size:14px;color:#5e5e5b;line-height:1.7;margin:0 0 24px;">
        Hallo ${firstName}, dein Händler-Antrag für <strong>${shopName}</strong> wurde genehmigt!
        Du kannst jetzt Produkte einstellen und Zahlungen empfangen.
      </p>
      <div style="background:#fdf8f8;padding:20px;margin:0 0 24px;border-left:3px solid ${GOLD};">
        <p style="font-family:sans-serif;font-size:13px;color:#1c1b1b;font-weight:600;margin:0 0 8px;">Nächste Schritte:</p>
        <p style="font-family:sans-serif;font-size:13px;color:#5e5e5b;margin:0;line-height:1.8;">
          1. Stripe-Konto verbinden für Auszahlungen<br>
          2. Erstes Produkt einstellen<br>
          3. Fotos hochladen und veröffentlichen
        </p>
      </div>
      <a href="${this.frontendUrl}/merchant/dashboard" style="${BUTTON_STYLE}">Zum Händler-Dashboard →</a>
    `, this.frontendUrl);

    await this.sendEmail(to, `✓ Händler-Antrag genehmigt — ${shopName} | My Dressa`, html);
  }

  // ─── 9. Merchant-Antrag abgelehnt ──────────────────────────────────────────
  async sendMerchantRejected(to: string, firstName: string, reason?: string) {
    const html = layout(`
      ${heading('Händler-Antrag — Update')}
      <p style="font-family:sans-serif;font-size:14px;color:#5e5e5b;line-height:1.7;margin:0 0 24px;">
        Hallo ${firstName}, leider konnten wir deinen Händler-Antrag zum jetzigen Zeitpunkt nicht genehmigen.
      </p>
      ${reason ? `
        <div style="background:#fdf8f8;padding:16px;margin:0 0 24px;">
          <p style="font-family:sans-serif;font-size:12px;color:#9e9e9b;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Begründung</p>
          <p style="font-family:sans-serif;font-size:13px;color:#1c1b1b;margin:0;">${reason}</p>
        </div>
      ` : ''}
      <p style="font-family:sans-serif;font-size:13px;color:#5e5e5b;line-height:1.7;">
        Du kannst jederzeit einen neuen Antrag stellen. Bei Fragen: support@mydressa.de
      </p>
      <a href="${this.frontendUrl}/account" style="${BUTTON_STYLE}">Erneut bewerben →</a>
    `, this.frontendUrl);

    await this.sendEmail(to, 'Update zu deinem Händler-Antrag — My Dressa', html);
  }

  // ─── 10. Rückgabe-Erinnerungen (wird vom Scheduler aufgerufen) ─────────────
  async sendBulkRentalReminders(reminders: Array<{
    email: string;
    firstName: string;
    productTitle: string;
    endDate: string;
    daysLeft: number;
  }>) {
    for (const r of reminders) {
      await this.sendRentalReminder(r.email, {
        firstName: r.firstName,
        productTitle: r.productTitle,
        endDate: r.endDate,
        daysLeft: r.daysLeft,
      });
    }
  }

  async sendPasswordReset(to: string, details: { firstName: string; resetUrl: string }) {
    const subject = 'Passwort zurücksetzen — My Dressa';
    const html = layout(`
      <div style="padding:32px;text-align:center;border-bottom:1px solid #f0ebe8;">
        <p style="font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${GOLD};margin:0 0 8px;">My Dressa</p>
        <h1 style="font-family:'Georgia',serif;font-size:24px;font-weight:400;color:#1c1b1b;margin:0;">Passwort zurücksetzen</h1>
      </div>
      <div style="padding:32px;">
        <p style="font-family:sans-serif;font-size:14px;color:#5e5e5b;line-height:1.7;margin:0 0 24px;">
          Hallo ${details.firstName},<br>
          wir haben eine Anfrage zum Zurücksetzen deines Passworts erhalten.
          Klicke auf den Button um ein neues Passwort zu wählen:
        </p>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="${details.resetUrl}" style="${BUTTON_STYLE}">
            Passwort zurücksetzen
          </a>
        </div>
        <p style="font-family:sans-serif;font-size:12px;color:#9e9e9b;line-height:1.7;margin:0;">
          Dieser Link ist <strong>1 Stunde</strong> gültig.<br>
          Falls du kein neues Passwort angefordert hast, kannst du diese E-Mail ignorieren.
        </p>
      </div>
    `, this.frontendUrl);
    await this.sendEmail(to, subject, html);
  }

  async sendShippingNotification(to: string, details: {
    firstName: string;
    orderNumber: string;
    productName: string;
    trackingNumber: string;
    trackingUrl: string;
  }) {
    const subject = `Deine Bestellung ist unterwegs! 📦 — My Dressa`;
    const html = layout(`
      <div style="padding:32px;text-align:center;border-bottom:1px solid #f0ebe8;">
        <p style="font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${GOLD};margin:0 0 8px;">My Dressa</p>
        <h1 style="font-family:'Georgia',serif;font-size:24px;font-weight:400;color:#1c1b1b;margin:0;">Dein Paket ist unterwegs! 🚚</h1>
      </div>
      <div style="padding:32px;">
        <p style="font-family:sans-serif;font-size:14px;color:#5e5e5b;line-height:1.7;margin:0 0 20px;">
          Hallo ${details.firstName},<br>
          deine Bestellung <strong>#${details.orderNumber}</strong> wurde verschickt.
        </p>
        <div style="background:#fdf8f8;border:1px solid #e8e3e1;padding:16px;margin:0 0 24px;">
          <p style="font-family:sans-serif;font-size:13px;color:#5e5e5b;margin:0 0 8px;">Produkt: <strong>${details.productName}</strong></p>
          <p style="font-family:sans-serif;font-size:13px;color:#5e5e5b;margin:0;">DHL Sendungsnummer: <strong style="font-family:monospace;">${details.trackingNumber}</strong></p>
        </div>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="${details.trackingUrl}" style="${BUTTON_STYLE}">Sendung verfolgen</a>
        </div>
        <p style="font-family:sans-serif;font-size:12px;color:#9e9e9b;line-height:1.7;margin:0;">
          Du erhältst eine weitere E-Mail sobald dein Paket geliefert wurde.
        </p>
      </div>
    `, this.frontendUrl);
    await this.sendEmail(to, subject, html);
  }

  async sendDeliveredNotification(to: string, details: {
    firstName: string;
    orderNumber: string;
    productName: string;
    orderType: string;
  }) {
    const isRental = details.orderType === 'rental';
    const subject = `Dein Paket wurde geliefert ✓ — My Dressa`;
    const html = layout(`
      <div style="padding:32px;text-align:center;border-bottom:1px solid #f0ebe8;">
        <p style="font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${GOLD};margin:0 0 8px;">My Dressa</p>
        <h1 style="font-family:'Georgia',serif;font-size:24px;font-weight:400;color:#1c1b1b;margin:0;">Lieferung bestätigt ✓</h1>
      </div>
      <div style="padding:32px;">
        <p style="font-family:sans-serif;font-size:14px;color:#5e5e5b;line-height:1.7;margin:0 0 20px;">
          Hallo ${details.firstName},<br>
          deine Bestellung <strong>#${details.orderNumber}</strong> (${details.productName}) wurde erfolgreich geliefert.
        </p>
        ${isRental ? `
        <div style="background:#E6F1FB;border:1px solid #b5d4f4;padding:16px;margin:0 0 24px;">
          <p style="font-family:sans-serif;font-size:13px;color:#0C447C;margin:0;">
            🎗️ <strong>Mietrückgabe:</strong> Bitte sende das Kleid nach deiner Mietzeit zurück. 
            Die Kaution wird nach Prüfung freigegeben.
          </p>
        </div>` : `
        <div style="background:#EAF3DE;border:1px solid #c0dd97;padding:16px;margin:0 0 24px;">
          <p style="font-family:sans-serif;font-size:13px;color:#27500A;margin:0;">
            ✓ Wir hoffen, du freust dich über dein neues Stück! Bei Fragen stehen wir dir gerne zur Verfügung.
          </p>
        </div>`}
        <div style="text-align:center;">
          <a href="${this.frontendUrl}/account" style="${BUTTON_STYLE}">Meine Bestellungen</a>
        </div>
      </div>
    `, this.frontendUrl);
    await this.sendEmail(to, subject, html);
  }
  async sendContactForm(details: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    const supportEmail = this.config.get('SUPPORT_EMAIL', 'support@mydressa.de');
    const subject = `[Kontakt] ${details.subject} — von ${details.name}`;
    const html = layout(`
      <div style="padding:32px;border-bottom:1px solid #f0ebe8;">
        <p style="font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${GOLD};margin:0 0 8px;">My Dressa Support</p>
        <h1 style="font-family:'Georgia',serif;font-size:22px;font-weight:400;color:#1c1b1b;margin:0;">Neue Kontaktanfrage</h1>
      </div>
      <div style="padding:32px;">
        <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:14px;">
          <tr><td style="padding:8px 0;color:#9e9e9b;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;">${details.name}</td></tr>
          <tr><td style="padding:8px 0;color:#9e9e9b;">E-Mail</td><td style="padding:8px 0;"><a href="mailto:${details.email}" style="color:#9E896A;">${details.email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#9e9e9b;">Betreff</td><td style="padding:8px 0;">${details.subject}</td></tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:#fdf8f8;border-left:3px solid #9E896A;">
          <p style="font-family:sans-serif;font-size:14px;color:#1c1b1b;line-height:1.7;margin:0;white-space:pre-wrap;">${details.message}</p>
        </div>
        <div style="margin-top:24px;padding:12px 16px;background:#f1edec;font-family:sans-serif;font-size:12px;color:#9e9e9b;">
          Antworten an: <a href="mailto:${details.email}" style="color:#9E896A;">${details.email}</a>
        </div>
      </div>
    `, this.frontendUrl);

    // An Support-Adresse senden
    await this.sendEmail(supportEmail, subject, html);

    // Bestätigung an Absender
    const confirmHtml = layout(`
      <div style="padding:32px;text-align:center;border-bottom:1px solid #f0ebe8;">
        <p style="font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${GOLD};margin:0 0 8px;">My Dressa</p>
        <h1 style="font-family:'Georgia',serif;font-size:22px;font-weight:400;color:#1c1b1b;margin:0;">Nachricht erhalten ✓</h1>
      </div>
      <div style="padding:32px;">
        <p style="font-family:sans-serif;font-size:14px;color:#5e5e5b;line-height:1.7;margin:0 0 16px;">
          Hallo ${details.name},<br>
          vielen Dank für deine Nachricht. Wir haben sie erhalten und melden uns innerhalb von 24 Stunden.
        </p>
        <div style="background:#fdf8f8;padding:16px;font-family:sans-serif;font-size:13px;color:#5e5e5b;">
          <strong>Dein Betreff:</strong> ${details.subject}
        </div>
        <div style="text-align:center;margin-top:28px;">
          <a href="${this.frontendUrl}" style="${BUTTON_STYLE}">Zurück zur Website</a>
        </div>
      </div>
    `, this.frontendUrl);
    await this.sendEmail(details.email, 'Wir haben deine Nachricht erhalten — My Dressa', confirmHtml);
  }

}