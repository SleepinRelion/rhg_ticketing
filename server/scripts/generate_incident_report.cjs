ser'use strict';

/**
 * Radisson Hotel Group Mauritius
 * Cybersecurity Incident Report – Template Generator  (compact, ~3 pages)
 *
 * Run:   node generate_incident_report.cjs
 * Output: RHG_Cybersecurity_Incident_Report_Template.docx
 *
 * Dependencies: docx, fs
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, TabStopType,
} = require('docx');
const fs = require('fs');

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  radissonBlue: '1B3E6F',
  accentGold:   'C9A84C',
  lightBlue:    'E8EEF6',
  rowAlt:       'F5F7FB',
  white:        'FFFFFF',
  black:        '000000',
  labelGrey:    '555555',
  borderGrey:   'BFCBD8',
  critRed:      'C0392B',
  highOrange:   'E67E22',
  medYellow:    'D4AC0D',
  lowGreen:     '1E8449',
  critBg:       'FDECEA',
  highBg:       'FEF5E7',
  medBg:        'FEFDE7',
  lowBg:        'EAFAF1',
};

// ─── Border helpers ───────────────────────────────────────────────────────────
function makeBorder(color = C.borderGrey, size = 4) {
  return { style: BorderStyle.SINGLE, size, color };
}
const cellBorders = {
  top: makeBorder(), bottom: makeBorder(),
  left: makeBorder(), right: makeBorder(),
};
const noBorder = {
  top:    { style: BorderStyle.NONE, size: 0, color: C.white },
  bottom: { style: BorderStyle.NONE, size: 0, color: C.white },
  left:   { style: BorderStyle.NONE, size: 0, color: C.white },
  right:  { style: BorderStyle.NONE, size: 0, color: C.white },
};

// ─── Paragraph helpers ────────────────────────────────────────────────────────
function spacer(pt = 60) {
  return new Paragraph({ spacing: { before: pt, after: pt }, children: [new TextRun('')] });
}

function sectionRule(text) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.radissonBlue, space: 3 } },
    spacing: { before: 200, after: 100 },
    children: [new TextRun({
      text,
      bold: true,
      size: 22,
      color: C.radissonBlue,
      font: 'Calibri',
      allCaps: true,
      characterSpacing: 30,
    })],
  });
}

function checkRow(item) {
  return new Paragraph({
    spacing: { before: 50, after: 50 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: '[  ]  ', bold: true, size: 17, font: 'Courier New', color: C.radissonBlue }),
      new TextRun({ text: item, size: 17, font: 'Calibri' }),
    ],
  });
}

// ─── Cell helpers ─────────────────────────────────────────────────────────────
function labelCell(text, w = 2600) {
  return new TableCell({
    borders: cellBorders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: C.lightBlue, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 140, right: 140 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 17, color: C.radissonBlue, font: 'Calibri' })],
    })],
  });
}

function valueCell(text = '', w = 6760, shade = C.white) {
  const empty = text === '';
  return new TableCell({
    borders: cellBorders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 140, right: 140 },
    children: [new Paragraph({
      children: [new TextRun({
        text: empty ? 'Click to fill in' : text,
        size: 17,
        color: empty ? C.labelGrey : C.black,
        italics: empty,
        font: 'Calibri',
      })],
    })],
  });
}

function dataRow(label, value = '', lw = 2600, vw = 6760, shade = C.white) {
  return new TableRow({ children: [labelCell(label, lw), valueCell(value, vw, shade)] });
}

function noteRow(label, hint = '', shade = C.white, tall = false) {
  return new TableRow({
    children: [
      labelCell(label, 2600),
      new TableCell({
        borders: cellBorders,
        width: { size: 6760, type: WidthType.DXA },
        shading: { fill: shade, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: tall ? 600 : 180, left: 140, right: 140 },
        children: [new Paragraph({
          children: [new TextRun({ text: hint, size: 16, italics: true, color: C.labelGrey, font: 'Calibri' })],
        })],
      }),
    ],
  });
}

function headerRow(text, span = 2, totalW = 9360) {
  return new TableRow({
    children: [
      new TableCell({
        borders: cellBorders,
        columnSpan: span,
        width: { size: totalW, type: WidthType.DXA },
        shading: { fill: C.radissonBlue, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 140, right: 140 },
        children: [new Paragraph({
          children: [new TextRun({
            text: text.toUpperCase(),
            bold: true, size: 18, color: C.white,
            font: 'Calibri', allCaps: true, characterSpacing: 20,
          })],
        })],
      }),
    ],
  });
}

// ─── Severity badges ──────────────────────────────────────────────────────────
function severityRow() {
  function badge(label, fg, bg) {
    return new TableCell({
      borders: cellBorders,
      width: { size: 2340, type: WidthType.DXA },
      shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: label, bold: true, size: 19, color: fg, font: 'Calibri' })],
      })],
    });
  }
  return new TableRow({ children: [
    badge('CRITICAL', C.critRed,    C.critBg),
    badge('HIGH',     C.highOrange, C.highBg),
    badge('MEDIUM',   C.medYellow,  C.medBg),
    badge('LOW',      C.lowGreen,   C.lowBg),
  ]});
}

// ─── Recommendations row ─────────────────────────────────────────────────────
function recRow(rec, desc, owner, shade) {
  function rcell(txt, w) {
    return new TableCell({
      borders: cellBorders,
      width: { size: w, type: WidthType.DXA },
      shading: { fill: shade, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 160, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text: txt, size: 17, font: 'Calibri' })],
      })],
    });
  }
  return new TableRow({ children: [rcell(rec, 2600), rcell(desc, 4560), rcell(owner, 2200)] });
}

// ─── Sign-off row ─────────────────────────────────────────────────────────────
function signoffRow(role, shade) {
  return new TableRow({
    children: [
      new TableCell({
        borders: cellBorders,
        width: { size: 2600, type: WidthType.DXA },
        shading: { fill: shade, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 240, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: role, bold: true, size: 16, color: C.radissonBlue, font: 'Calibri' })],
        })],
      }),
      new TableCell({
        borders: cellBorders,
        width: { size: 3380, type: WidthType.DXA },
        shading: { fill: shade, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 240, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: '', size: 17, font: 'Calibri' })] })],
      }),
      new TableCell({
        borders: cellBorders,
        width: { size: 3380, type: WidthType.DXA },
        shading: { fill: shade, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 240, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: '', size: 17, font: 'Calibri' })] })],
      }),
    ],
  });
}

// ─── Header ───────────────────────────────────────────────────────────────────
const docHeader = new Header({
  children: [
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [6200, 3160],
      borders: {
        top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE }, insideH: { style: BorderStyle.NONE },
        insideV: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: C.accentGold },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: noBorder,
              width: { size: 6200, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({ children: [new TextRun({ text: 'RADISSON HOTEL GROUP', bold: true, size: 22, color: C.radissonBlue, font: 'Calibri', allCaps: true })] }),
                new Paragraph({ spacing: { before: 20 }, children: [new TextRun({ text: 'Mauritius  |  Information Security', size: 16, color: C.accentGold, font: 'Calibri' })] }),
              ],
            }),
            new TableCell({
              borders: noBorder,
              width: { size: 3160, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'CYBERSECURITY INCIDENT REPORT', bold: true, size: 16, color: C.labelGrey, font: 'Calibri', allCaps: true })] }),
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'CONFIDENTIAL', bold: true, size: 15, color: C.critRed, font: 'Calibri' })] }),
              ],
            }),
          ],
        }),
      ],
    }),
  ],
});

// ─── Footer ───────────────────────────────────────────────────────────────────
const docFooter = new Footer({
  children: [
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.accentGold, space: 4 } },
      tabStops: [
        { type: TabStopType.CENTER, position: 4680 },
        { type: TabStopType.RIGHT,  position: 9360 },
      ],
      spacing: { before: 60 },
      children: [
        new TextRun({ text: 'Radisson Hotel Group Mauritius', size: 15, color: C.labelGrey, font: 'Calibri' }),
        new TextRun({ text: '\t', size: 15 }),
        new TextRun({ text: 'CONFIDENTIAL  |  For Authorised Personnel Only', size: 15, color: C.labelGrey, italics: true, font: 'Calibri' }),
        new TextRun({ text: '\tPage ', size: 15, color: C.labelGrey, font: 'Calibri' }),
        new TextRun({ children: [PageNumber.CURRENT], size: 15, color: C.labelGrey, font: 'Calibri' }),
      ],
    }),
  ],
});

// ─── Document ─────────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 18 } },
    },
  },

  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
      },
    },
    headers: { default: docHeader },
    footers: { default: docFooter },

    children: [

      // ═══════════════════════════════════════════════════════
      // TITLE BLOCK
      // ═══════════════════════════════════════════════════════
      spacer(120),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: 'CYBERSECURITY INCIDENT REPORT', bold: true, size: 38, color: C.radissonBlue, font: 'Calibri', allCaps: true, characterSpacing: 50 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: C.accentGold, space: 5 } },
        spacing: { before: 0, after: 180 },
        children: [new TextRun({ text: 'RESTRICTED  |  FOR AUTHORISED PERSONNEL ONLY', bold: true, size: 16, color: C.critRed, font: 'Calibri' })],
      }),

      // ═══════════════════════════════════════════════════════
      // SECTION 1 — INCIDENT IDENTIFICATION
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 1   Incident Identification'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Reference & Classification'),
          dataRow('Report Reference No.',       '[RHG-SEC-YYYY-NNN]'),
          dataRow('Property / Location',        ''),
          dataRow('Department Affected',        ''),
          dataRow('Report Prepared By',         ''),
          dataRow('Designation',                ''),
          dataRow('Date of Report',             ''),
          headerRow('Incident Date, Time & Asset'),
          dataRow('Date Incident Detected',     ''),
          dataRow('Time Detected (24-hr)',       ''),
          dataRow('Physical Location of Asset', 'e.g. Front Office, Server Room, Restaurant POS'),
          dataRow('System / Device Name',       'e.g. WS-FO-01, POS-RES-02, SRV-IT-03'),
          dataRow('Asset Tag / Serial No.',     ''),
          dataRow('Operating System',           ''),
          dataRow('MDM Enrolled?',              '[  ] Yes     [  ] No     [  ] Unknown'),
        ],
      }),

      spacer(100),

      // Severity selector
      new Paragraph({
        spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: 'Incident Severity   (circle or shade one):', size: 17, italics: true, color: C.labelGrey, font: 'Calibri' })],
      }),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 2340, 2340, 2340],
        rows: [
          severityRow(),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                columnSpan: 4,
                width: { size: 9360, type: WidthType.DXA },
                shading: { fill: C.rowAlt, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 140, right: 140 },
                children: [
                  new Paragraph({ children: [
                    new TextRun({ text: 'CRITICAL: ', bold: true, size: 16, color: C.critRed, font: 'Calibri' }),
                    new TextRun({ text: 'Active breach / ransomware / exfiltration in progress.  ', size: 16, font: 'Calibri' }),
                    new TextRun({ text: 'HIGH: ', bold: true, size: 16, color: C.highOrange, font: 'Calibri' }),
                    new TextRun({ text: 'Confirmed compromise, significant impact.', size: 16, font: 'Calibri' }),
                  ]}),
                  new Paragraph({ children: [
                    new TextRun({ text: 'MEDIUM: ', bold: true, size: 16, color: C.medYellow, font: 'Calibri' }),
                    new TextRun({ text: 'Suspected breach, policy violation, unusual access.  ', size: 16, font: 'Calibri' }),
                    new TextRun({ text: 'LOW: ', bold: true, size: 16, color: C.lowGreen, font: 'Calibri' }),
                    new TextRun({ text: 'Minor anomaly, no active threat confirmed.', size: 16, font: 'Calibri' }),
                  ]}),
                ],
              }),
            ],
          }),
        ],
      }),

      spacer(100),

      // ═══════════════════════════════════════════════════════
      // SECTION 2 — INCIDENT TYPE
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 2   Incident Type   Tick All That Apply'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 9360, type: WidthType.DXA },
                shading: { fill: C.white, type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 200, right: 200 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: '[  ] Unauthorised Application Installation          [  ] Suspicious Browser / Pop-up Activity', size: 17, font: 'Calibri' })] }),
                  new Paragraph({ spacing: { before: 50 }, children: [new TextRun({ text: '[  ] Malware / Ransomware Infection                 [  ] Phishing / Social Engineering Attempt', size: 17, font: 'Calibri' })] }),
                  new Paragraph({ spacing: { before: 50 }, children: [new TextRun({ text: '[  ] Unauthorised Remote / Network Access            [  ] Data Breach / Leakage', size: 17, font: 'Calibri' })] }),
                  new Paragraph({ spacing: { before: 50 }, children: [new TextRun({ text: '[  ] Insider Threat / Acceptable Use Policy Violation  [  ] Physical Security Breach', size: 17, font: 'Calibri' })] }),
                  new Paragraph({ spacing: { before: 50 }, children: [new TextRun({ text: '[  ] Account Compromise / Credential Theft           [  ] PMS / POS System Anomaly', size: 17, font: 'Calibri' })] }),
                  new Paragraph({ spacing: { before: 50 }, children: [new TextRun({ text: '[  ] Wi-Fi / Network Infrastructure Anomaly          [  ] Other  (describe in Section 3)', size: 17, font: 'Calibri' })] }),
                ],
              }),
            ],
          }),
        ],
      }),

      spacer(100),

      // ═══════════════════════════════════════════════════════
      // SECTION 3 — INCIDENT NARRATIVE
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 3   Incident Narrative'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Discovery & Description'),
          noteRow('How was it discovered?', 'Reported by a staff member / automated alert / routine check / guest complaint', C.white, false),
          noteRow('Who discovered it?',      'Full name, role and department', C.rowAlt, false),
          noteRow('What happened',           'Write a factual account in the order it occurred. Note what was seen, any messages or alerts on screen, what the system was doing, and who else was present.', C.white, true),
          noteRow('Root Cause',              'What most likely caused this? State if the cause is still unknown at time of writing.', C.rowAlt, true),
          noteRow('Systems / Data at Risk',  'PMS guest records, POS payment data, staff logins, shared drives, etc. State if scope is still being assessed.', C.white, true),
          noteRow('Staff Involved',          'Names and roles of anyone who was using or had access to the affected system', C.rowAlt, false),
        ],
      }),

      spacer(100),

      // ═══════════════════════════════════════════════════════
      // SECTION 4 — CONTAINMENT ACTIONS
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 4   Immediate Containment Actions'),
      new Paragraph({
        spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: 'Tick everything that has been done so far:', size: 16, italics: true, color: C.labelGrey, font: 'Calibri' })],
      }),

      checkRow('Device disconnected from the network (Wi-Fi off / cable removed)'),
      checkRow('Device powered off or isolated'),
      checkRow('Device secured and handed to IT personnel only'),
      checkRow('Screenshots or photos taken before any changes were made to the device'),
      checkRow('Installed applications listed before anything was removed'),
      checkRow('Affected account passwords changed or account disabled'),
      checkRow('Property IT Manager notified'),
      checkRow('Regional IT or Group Information Security informed (if applicable)'),
      checkRow('PMS and POS systems checked for unusual activity'),
      checkRow('Staff member spoken to and advised not to touch the device'),

      spacer(80),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          noteRow('Other Actions Taken', 'Anything else done that is not covered by the checklist above', C.white, true),
        ],
      }),

      spacer(100),

      // ═══════════════════════════════════════════════════════
      // SECTION 5 — IMPACT & TECHNICAL FINDINGS
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 5   Impact & Technical Findings'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Impact Assessment'),
          dataRow('Number of Devices Affected',        ''),
          dataRow('Guest Data at Risk?',               '[  ] Yes     [  ] No     [  ] Still being assessed'),
          dataRow('Payment Card Data Involved?',       '[  ] Yes     [  ] No     [  ] Unknown'),
          dataRow('Operational Impact',                '[  ] None     [  ] Minor     [  ] Moderate     [  ] Significant'),
          noteRow('Business Impact',                   'What was disrupted? Guest check-in delays, system downtime, reputational risk, etc.', C.rowAlt, false),
          headerRow('Technical Detail'),
          noteRow('Unauthorised Applications or Files', 'App name, version, where it came from, install date if visible', C.white, false),
          noteRow('Suspicious Network Activity',       'Any unusual outbound connections, unknown IPs, odd DNS queries', C.rowAlt, false),
          noteRow('Malware / Indicators of Compromise','File names, hashes, registry entries, or anything flagged by antivirus or MDM', C.white, false),
          noteRow('Logs Reviewed',                     'Which logs were pulled and what stood out', C.rowAlt, false),
        ],
      }),

      spacer(100),

      // ═══════════════════════════════════════════════════════
      // SECTION 6 — RECOMMENDATIONS
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 6   Recommendations & Remediation'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 4560, 2200],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2600, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'RECOMMENDATION', bold: true, size: 17, color: C.white, font: 'Calibri', allCaps: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 4560, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'ACTION REQUIRED', bold: true, size: 17, color: C.white, font: 'Calibri', allCaps: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 2200, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'OWNER / DEADLINE', bold: true, size: 17, color: C.white, font: 'Calibri', allCaps: true })] })] }),
            ],
          }),
          ...[
            ['Device re-imaging',            'Wipe device and reload the approved OS build before it goes back into service'],
            ['Application audit',            'Check approved app list across all hotel devices and update MDM policy where needed'],
            ['Credential reset',             'Change passwords for all accounts linked to the affected system or user'],
            ['Staff briefing',               'Run a short security awareness session with the team involved'],
            ['',                             ''],
            ['',                             ''],
          ].map(([rec, desc], i) => recRow(rec, desc, '', i % 2 === 0 ? C.white : C.rowAlt)),
        ],
      }),

      spacer(100),

      // ═══════════════════════════════════════════════════════
      // SECTION 7 — SIGN-OFF
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 7   Sign-off & Approvals'),
      new Paragraph({
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: 'This report must be signed by all parties before it is considered closed.', size: 16, italics: true, color: C.labelGrey, font: 'Calibri' })],
      }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 3380, 3380],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2600, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'ROLE', bold: true, size: 17, color: C.white, font: 'Calibri', allCaps: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3380, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'FULL NAME & SIGNATURE', bold: true, size: 17, color: C.white, font: 'Calibri', allCaps: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3380, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: 'DATE SIGNED', bold: true, size: 17, color: C.white, font: 'Calibri', allCaps: true })] })] }),
            ],
          }),
          ...[
            'Reporting Officer',
            'Property IT Manager / IT Supervisor',
            'Department Head',
            'General Manager / Director of Operations',
          ].map((role, i) => signoffRow(role, i % 2 === 0 ? C.white : C.rowAlt)),
        ],
      }),

      spacer(160),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.accentGold, space: 5 } },
        spacing: { before: 100, after: 60 },
        children: [new TextRun({ text: 'This document is CONFIDENTIAL and must only be shared with staff directly involved in the investigation.', size: 15, italics: true, color: C.labelGrey, font: 'Calibri' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: 'Radisson Hotel Group Mauritius  |  Information Security', size: 15, color: C.radissonBlue, font: 'Calibri' })],
      }),
    ],
  }],
});

// ─── Write file ───────────────────────────────────────────────────────────────
Packer.toBuffer(doc).then((buffer) => {
  const filename = 'RHG_Cybersecurity_Incident_Report_Template.docx';
  const tmpname  = filename + '.tmp';
  fs.writeFileSync(tmpname, buffer);
  try {
    if (fs.existsSync(filename)) fs.unlinkSync(filename);
    fs.renameSync(tmpname, filename);
  } catch (_) {
    console.log(`\n✓  Template written to: ${tmpname}  (rename to ${filename} after closing it in Word)\n`);
    return;
  }
  console.log(`\n✓  Template generated successfully: ${filename}\n`);
}).catch((err) => {
  console.error('Error generating document:', err);
  process.exit(1);
});
