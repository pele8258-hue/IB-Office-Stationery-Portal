import nodemailer from 'nodemailer'
import { resolve } from 'path'

const LOGO_CID    = 'logo@adminsvs'
const LOGO_FILE   = resolve('app/assets/images/logos/Frame 10.png')
const BG_CID      = 'bg@adminsvs'
const BG_FILE     = resolve('app/assets/images/backgrounds/Login_tile.png')

let transporter = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

function buildApprovalHtml({ requesterName, requestNo, destination, purpose, timeOut, timeIn, plateNumber, brand, model, color, parkingLot, parkingFloor, approvedBy }) {
  const fmt = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }

  const vehicleName = [brand, model].filter(Boolean).join(' ') || '—'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Request Approved</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td bgcolor="#5b21b6" background="cid:${BG_CID}" style="background-color:#5b21b6;padding:28px 32px;" align="center">
            <img src="cid:${LOGO_CID}" alt="Admin Office Services" width="220" style="display:block;max-width:220px;height:auto;margin:0 auto 14px;" />
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.01em;">Admin Office Services</h1>
            <p style="margin:5px 0 0;color:#ddd6fe;font-size:12px;letter-spacing:0.04em;">VEHICLE MANAGEMENT SYSTEM</p>
          </td>
        </tr>

        <!-- Banner -->
        <tr>
          <td style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 32px;">
            <p style="margin:0;color:#16a34a;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">REQUEST APPROVED</p>
            <p style="margin:5px 0 0;color:#374151;font-size:13px;line-height:1.5;font-weight:600;">Your vehicle request <strong>${requestNo}</strong> has been approved and a vehicle has been assigned.</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 6px;color:#111827;font-size:14px;">Dear <strong>${requesterName}</strong>,</p>
            <p style="margin:0 0 24px;color:#4b5563;font-size:13px;line-height:1.8;">
              Your vehicle request has been reviewed and approved. Please find the assigned vehicle details below.
            </p>

            <!-- Vehicle Assigned -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
              <tr>
                <td style="background:#f0fdf4;padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;color:#15803d;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Vehicle Assigned</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;width:38%;vertical-align:top;">Plate Number</td>
                      <td style="padding:5px 0;color:#5b21b6;font-size:14px;font-weight:700;">${plateNumber || '—'}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Vehicle</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${vehicleName}</td>
                    </tr>
                    ${color ? `<tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Color</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${color}</td>
                    </tr>` : ''}
                    ${parkingLot ? `<tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Parking Lot</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${parkingLot}</td>
                    </tr>` : ''}
                    ${parkingFloor ? `<tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Floor</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${parkingFloor}</td>
                    </tr>` : ''}
                  </table>
                </td>
              </tr>
            </table>

            <!-- Trip Info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr>
                <td style="background:#f9fafb;padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Trip Details</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;width:38%;vertical-align:top;">Request No.</td>
                      <td style="padding:5px 0;color:#5b21b6;font-size:13px;font-weight:700;">${requestNo}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Destination</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${destination || '—'}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Purpose</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${purpose || '—'}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Departure</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${fmt(timeOut)}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Return</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${fmt(timeIn)}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Approved by</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${approvedBy}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7;">Best regards,<br><strong style="color:#374151;">Admin Team</strong></p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#4c1d95" style="background:radial-gradient(ellipse at 50% 100%,#6d28d9 0%,#4c1d95 100%);padding:16px 32px;">
            <p style="margin:0;color:#c4b5fd;font-size:11px;text-align:center;">
              This is an automated notification from Admin Office Services. Please do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendApprovalEmail({ to, requesterName, requestNo, destination, purpose, timeOut, timeIn, plateNumber, brand, model, color, parkingLot, parkingFloor, approvedBy }) {
  const t = getTransporter()
  await t.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `[Approved] Your request ${requestNo} — ${plateNumber} assigned`,
    html:    buildApprovalHtml({ requesterName, requestNo, destination, purpose, timeOut, timeIn, plateNumber, brand, model, color, parkingLot, parkingFloor, approvedBy }),
    attachments: [
      { filename: 'logo.png', path: LOGO_FILE, cid: LOGO_CID },
      { filename: 'bg.png',   path: BG_FILE,   cid: BG_CID  },
    ],
  })
}

function buildExpiryHtml({ ownerName, ownerEmail, ownerPhone, documentName, plateNumber, brand, model, expiryDate, daysRemaining, notificationType }) {
  const formattedExpiry = new Date(expiryDate).toLocaleDateString('en-MY', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const styles = {
    '2_MONTHS': { color: '#2563eb', bg: '#eff6ff', badge: '2 MONTHS REMAINING', body: `expires in ${Math.abs(daysRemaining)} days on ${formattedExpiry}. Please schedule a renewal.` },
    '1_MONTH':  { color: '#d97706', bg: '#fffbeb', badge: '1 MONTH REMAINING',  body: `expires in ${Math.abs(daysRemaining)} days on ${formattedExpiry}. Please prepare for renewal soon.` },
    '1_WEEK':   { color: '#ea580c', bg: '#fff7ed', badge: '1 WEEK REMAINING',   body: `expires in ${Math.abs(daysRemaining)} days on ${formattedExpiry}. Please renew as soon as possible.` },
    'EXPIRED':  { color: '#dc2626', bg: '#fef2f2', badge: 'DOCUMENT EXPIRED',   body: `expired on ${formattedExpiry}.` },
  }

  const s = styles[notificationType] || styles['2_MONTHS']
  const bannerText = notificationType === 'EXPIRED'
    ? 'Your document has Expired'
    : `This document ${s.body}`

  const ownerRows = [
    ownerName  ? `<tr><td style="padding:5px 0;color:#6b7280;font-size:13px;width:38%;">Owner Name</td><td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${ownerName}</td></tr>` : '',
    ownerEmail ? `<tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Owner Email</td><td style="padding:5px 0;color:#111827;font-size:13px;">${ownerEmail}</td></tr>` : '',
    ownerPhone ? `<tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Owner Phone</td><td style="padding:5px 0;color:#111827;font-size:13px;">${ownerPhone}</td></tr>` : '',
  ].join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Vehicle Document Notice</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header — Login.png background via CID (pattern + purple) -->
        <tr>
          <td bgcolor="#5b21b6" background="cid:${BG_CID}" style="background-color:#5b21b6;padding:28px 32px;" align="center">
            <img src="cid:${LOGO_CID}" alt="Admin Office Services" width="220" style="display:block;max-width:220px;height:auto;margin:0 auto 14px;" />
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.01em;">Admin Office Services</h1>
            <p style="margin:5px 0 0;color:#ddd6fe;font-size:12px;letter-spacing:0.04em;">VEHICLE MANAGEMENT SYSTEM</p>
          </td>
        </tr>

        <!-- Urgency Banner -->
        <tr>
          <td style="background:${s.bg};border-left:4px solid ${s.color};padding:14px 32px;">
            <p style="margin:0;color:${s.color};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${s.badge}</p>
            <p style="margin:5px 0 0;color:#374151;font-size:13px;line-height:1.5;font-weight:600;">${bannerText}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;color:#111827;font-size:14px;">Dear <strong>${ownerName || 'Vehicle Owner'}</strong>,</p>
            <p style="margin:0 0 24px;color:#4b5563;font-size:13px;line-height:1.8;">
              This is an automated reminder from the Admin Office Services regarding your vehicle documentation.
              Please review the details below and complete the necessary renewal actions at your earliest convenience.
            </p>

            <!-- Document Information -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
              <tr>
                <td style="background:#f9fafb;padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Document Information</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;width:38%;">Document Name</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${documentName}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;">Vehicle</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${brand} ${model}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;">Plate Number</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${plateNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;">Expiry Date</td>
                      <td style="padding:5px 0;color:${s.color};font-size:13px;font-weight:700;">${formattedExpiry}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Vehicle Owner -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr>
                <td style="background:#f9fafb;padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Vehicle Owner</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${ownerRows}
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;color:#4b5563;font-size:13px;line-height:1.8;">
              Please contact admin teams after renew this document.
            </p>
            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7;">Best regards,<br><strong style="color:#374151;">Admin Team</strong></p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#4c1d95" style="background:radial-gradient(ellipse at 50% 100%,#6d28d9 0%,#4c1d95 100%);padding:16px 32px;">
            <p style="margin:0;color:#c4b5fd;font-size:11px;text-align:center;">
              This is an automated notification from Admin Office Services. Please do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildSubject(notificationType, documentName, plateNumber) {
  const map = {
    '2_MONTHS': `[Reminder] "${documentName}" (${plateNumber}) expires in 2 months`,
    '1_MONTH':  `[Notice] "${documentName}" (${plateNumber}) expires in 1 month`,
    '1_WEEK':   `[Urgent] "${documentName}" (${plateNumber}) expires in 1 week`,
    'EXPIRED':  `[EXPIRED] "${documentName}" (${plateNumber}) — Action Required`,
  }
  return map[notificationType] || `Vehicle Document Expiry Notice — ${plateNumber}`
}

function buildNewRequestHtml({ requestNo, requesterName, requesterDept, requesterBranch, driverName, driverDept, driverBranch, passengerCount, passengers, destination, purpose, timeOut, timeIn, notes }) {
  const fmt = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }

  const subLine = (dept, branch) => {
    const parts = [dept, branch].filter(Boolean)
    return parts.length ? `<span style="color:#9ca3af;font-size:11px;">${parts.join(' · ')}</span>` : ''
  }

  const passengerList = passengers?.length
    ? passengers.map(p => {
        const sub = subLine(p.dept, p.branch)
        return `<li style="margin:4px 0;color:#111827;font-size:13px;">${p.name || p}${sub ? '<br>' + sub : ''}</li>`
      }).join('')
    : `<li style="margin:2px 0;color:#6b7280;font-size:13px;">—</li>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>New Vehicle Request</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td bgcolor="#5b21b6" background="cid:${BG_CID}" style="background-color:#5b21b6;padding:28px 32px;" align="center">
            <img src="cid:${LOGO_CID}" alt="Admin Office Services" width="220" style="display:block;max-width:220px;height:auto;margin:0 auto 14px;" />
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.01em;">Admin Office Services</h1>
            <p style="margin:5px 0 0;color:#ddd6fe;font-size:12px;letter-spacing:0.04em;">VEHICLE MANAGEMENT SYSTEM</p>
          </td>
        </tr>

        <!-- Banner -->
        <tr>
          <td style="background:#eff6ff;border-left:4px solid #2563eb;padding:14px 32px;">
            <p style="margin:0;color:#2563eb;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">NEW VEHICLE REQUEST</p>
            <p style="margin:5px 0 0;color:#374151;font-size:13px;line-height:1.5;font-weight:600;">A new vehicle request <strong>${requestNo}</strong> has been submitted and is awaiting your review.</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 24px;color:#4b5563;font-size:13px;line-height:1.8;">
              Please review the request details below and take the appropriate action in the system.
            </p>

            <!-- Request Info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:16px;">
              <tr>
                <td style="background:#f9fafb;padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Request Details</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;width:38%;vertical-align:top;">Request No.</td>
                      <td style="padding:5px 0;color:#5b21b6;font-size:13px;font-weight:700;">${requestNo}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Requested By</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">
                        ${requesterName}
                        ${subLine(requesterDept, requesterBranch) ? `<br>${subLine(requesterDept, requesterBranch)}` : ''}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Driver</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">
                        ${driverName || '—'}
                        ${driverName && subLine(driverDept, driverBranch) ? `<br>${subLine(driverDept, driverBranch)}` : ''}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Destination</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${destination}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Purpose</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${purpose}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Departure</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${fmt(timeOut)}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Return</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${fmt(timeIn)}</td>
                    </tr>
                    ${notes ? `<tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Notes</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${notes}</td>
                    </tr>` : ''}
                  </table>
                </td>
              </tr>
            </table>

            <!-- Passengers -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr>
                <td style="background:#f9fafb;padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Passengers (${passengerCount})</p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;">
                  <ul style="margin:0;padding-left:18px;">
                    ${passengerList}
                  </ul>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7;">Best regards,<br><strong style="color:#374151;">Admin Team</strong></p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#4c1d95" style="background:radial-gradient(ellipse at 50% 100%,#6d28d9 0%,#4c1d95 100%);padding:16px 32px;">
            <p style="margin:0;color:#c4b5fd;font-size:11px;text-align:center;">
              This is an automated notification from Admin Office Services. Please do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendNewRequestEmail({ to, requestNo, requesterName, requesterDept, requesterBranch, driverName, driverDept, driverBranch, passengerCount, passengers, destination, purpose, timeOut, timeIn, notes }) {
  const t = getTransporter()
  await t.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `[New Request] ${requestNo} — ${destination} by ${requesterName}`,
    html:    buildNewRequestHtml({ requestNo, requesterName, requesterDept, requesterBranch, driverName, driverDept, driverBranch, passengerCount, passengers, destination, purpose, timeOut, timeIn, notes }),
    attachments: [
      { filename: 'logo.png', path: LOGO_FILE, cid: LOGO_CID },
      { filename: 'bg.png',   path: BG_FILE,   cid: BG_CID  },
    ],
  })
}

function buildCancelHtml({ requestNo, requesterName, requesterDept, requesterBranch, destination, purpose, timeOut, timeIn, cancelledBy }) {
  const fmt = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }

  const subLine = (dept, branch) => {
    const parts = [dept, branch].filter(Boolean)
    return parts.length ? `<span style="color:#9ca3af;font-size:11px;">${parts.join(' · ')}</span>` : ''
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Request Cancelled</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td bgcolor="#5b21b6" background="cid:${BG_CID}" style="background-color:#5b21b6;padding:28px 32px;" align="center">
            <img src="cid:${LOGO_CID}" alt="Admin Office Services" width="220" style="display:block;max-width:220px;height:auto;margin:0 auto 14px;" />
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.01em;">Admin Office Services</h1>
            <p style="margin:5px 0 0;color:#ddd6fe;font-size:12px;letter-spacing:0.04em;">VEHICLE MANAGEMENT SYSTEM</p>
          </td>
        </tr>

        <!-- Banner -->
        <tr>
          <td style="background:#fff7ed;border-left:4px solid #d97706;padding:14px 32px;">
            <p style="margin:0;color:#d97706;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">REQUEST CANCELLED</p>
            <p style="margin:5px 0 0;color:#374151;font-size:13px;line-height:1.5;font-weight:600;">Vehicle request <strong>${requestNo}</strong> has been cancelled by the requester.</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 24px;color:#4b5563;font-size:13px;line-height:1.8;">
              The following vehicle request has been cancelled. No further action is required.
            </p>

            <!-- Request Info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr>
                <td style="background:#f9fafb;padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Request Details</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;width:38%;vertical-align:top;">Request No.</td>
                      <td style="padding:5px 0;color:#5b21b6;font-size:13px;font-weight:700;">${requestNo}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Requested By</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">
                        ${requesterName}
                        ${subLine(requesterDept, requesterBranch) ? `<br>${subLine(requesterDept, requesterBranch)}` : ''}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Destination</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${destination || '—'}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Purpose</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${purpose || '—'}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Departure</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${fmt(timeOut)}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Return</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${fmt(timeIn)}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Cancelled By</td>
                      <td style="padding:5px 0;color:#d97706;font-size:13px;font-weight:600;">${cancelledBy}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7;">Best regards,<br><strong style="color:#374151;">Admin Team</strong></p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#4c1d95" style="background:radial-gradient(ellipse at 50% 100%,#6d28d9 0%,#4c1d95 100%);padding:16px 32px;">
            <p style="margin:0;color:#c4b5fd;font-size:11px;text-align:center;">
              This is an automated notification from Admin Office Services. Please do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendCancelEmail({ to, requestNo, requesterName, requesterDept, requesterBranch, destination, purpose, timeOut, timeIn, cancelledBy }) {
  const t = getTransporter()
  await t.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `[Cancelled] Request ${requestNo} — ${destination} by ${requesterName}`,
    html:    buildCancelHtml({ requestNo, requesterName, requesterDept, requesterBranch, destination, purpose, timeOut, timeIn, cancelledBy }),
    attachments: [
      { filename: 'logo.png', path: LOGO_FILE, cid: LOGO_CID },
      { filename: 'bg.png',   path: BG_FILE,   cid: BG_CID  },
    ],
  })
}

function buildRejectHtml({ requestNo, requesterName, destination, purpose, timeOut, timeIn, rejectReason, rejectedBy }) {
  const fmt = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Request Rejected</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td bgcolor="#5b21b6" background="cid:${BG_CID}" style="background-color:#5b21b6;padding:28px 32px;" align="center">
            <img src="cid:${LOGO_CID}" alt="Admin Office Services" width="220" style="display:block;max-width:220px;height:auto;margin:0 auto 14px;" />
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.01em;">Admin Office Services</h1>
            <p style="margin:5px 0 0;color:#ddd6fe;font-size:12px;letter-spacing:0.04em;">VEHICLE MANAGEMENT SYSTEM</p>
          </td>
        </tr>

        <!-- Banner -->
        <tr>
          <td style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 32px;">
            <p style="margin:0;color:#dc2626;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">REQUEST REJECTED</p>
            <p style="margin:5px 0 0;color:#374151;font-size:13px;line-height:1.5;font-weight:600;">Your vehicle request <strong>${requestNo}</strong> has been reviewed and rejected.</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 6px;color:#111827;font-size:14px;">Dear <strong>${requesterName}</strong>,</p>
            <p style="margin:0 0 24px;color:#4b5563;font-size:13px;line-height:1.8;">
              We regret to inform you that your vehicle request has been rejected. You may review the reason below and resubmit after making the necessary adjustments.
            </p>

            <!-- Reject Reason -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-radius:8px;overflow:hidden;margin-bottom:16px;">
              <tr>
                <td style="background:#fef2f2;padding:10px 16px;border-bottom:1px solid #fecaca;">
                  <p style="margin:0;color:#dc2626;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Rejection Reason</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px;">
                  <p style="margin:0;color:#374151;font-size:13px;line-height:1.7;">${rejectReason}</p>
                  <p style="margin:10px 0 0;color:#9ca3af;font-size:12px;">Rejected by: <strong style="color:#374151;">${rejectedBy}</strong></p>
                </td>
              </tr>
            </table>

            <!-- Request Info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr>
                <td style="background:#f9fafb;padding:10px 16px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;color:#374151;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Request Details</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;width:38%;vertical-align:top;">Request No.</td>
                      <td style="padding:5px 0;color:#5b21b6;font-size:13px;font-weight:700;">${requestNo}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Destination</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${destination || '—'}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Purpose</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${purpose || '—'}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Departure</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${fmt(timeOut)}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Return</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;">${fmt(timeIn)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.7;">Best regards,<br><strong style="color:#374151;">Admin Team</strong></p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td bgcolor="#4c1d95" style="background:radial-gradient(ellipse at 50% 100%,#6d28d9 0%,#4c1d95 100%);padding:16px 32px;">
            <p style="margin:0;color:#c4b5fd;font-size:11px;text-align:center;">
              This is an automated notification from Admin Office Services. Please do not reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendRejectEmail({ to, requestNo, requesterName, destination, purpose, timeOut, timeIn, rejectReason, rejectedBy }) {
  const t = getTransporter()
  await t.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `[Rejected] Your request ${requestNo} has been rejected`,
    html:    buildRejectHtml({ requestNo, requesterName, destination, purpose, timeOut, timeIn, rejectReason, rejectedBy }),
    attachments: [
      { filename: 'logo.png', path: LOGO_FILE, cid: LOGO_CID },
      { filename: 'bg.png',   path: BG_FILE,   cid: BG_CID  },
    ],
  })
}

export async function sendExpiryEmail({ to, ownerName, ownerEmail, ownerPhone, documentName, plateNumber, brand, model, expiryDate, daysRemaining, notificationType }) {
  const t = getTransporter()
  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: buildSubject(notificationType, documentName, plateNumber),
    html: buildExpiryHtml({ ownerName, ownerEmail, ownerPhone, documentName, plateNumber, brand, model, expiryDate, daysRemaining, notificationType }),
    attachments: [
      {
        filename: 'logo.png',
        path:     LOGO_FILE,
        cid:      LOGO_CID,
      },
      {
        filename: 'bg.png',
        path:     BG_FILE,
        cid:      BG_CID,
      },
    ],
  })
}
