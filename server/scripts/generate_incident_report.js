'use strict';

/**
 * Radisson Hotel Group Mauritius
 * Cybersecurity Incident Report – Template Generator
 *
 * Run:  node generate_incident_report.js
 * Output: RHG_Cybersecurity_Incident_Report_Template.docx
 *
 * Dependencies: docx, fs
 * Install:  npm install docx
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, TabStopType,
  LevelFormat,
} = require('docx');
const fs = require('fs');

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  radissonBlue: '1B3E6F',
  accentGold:   'C9A84C',
  lightBlue:    'E8EEF6',
  midBlue:      '2C5F9E',
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
const dashedBorder = {
  top:    { style: BorderStyle.DASHED, size: 6, color: C.borderGrey },
  bottom: { style: BorderStyle.DASHED, size: 6, color: C.borderGrey },
  left:   { style: BorderStyle.DASHED, size: 6, color: C.borderGrey },
  right:  { style: BorderStyle.DASHED, size: 6, color: C.borderGrey },
};

// ─── Paragraph helpers ────────────────────────────────────────────────────────
function spacer(pt = 80) {
  return new Paragraph({ spacing: { before: pt, after: pt }, children: [new TextRun('')] });
}

function instruction(text) {
  return new Paragraph({
    spacing: { before: 60, after: 80 },
    children: [new TextRun({ text, size: 17, italics: true, color: C.labelGrey, font: 'Calibri' })],
  });
}

function sectionRule(text) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.radissonBlue, space: 4 } },
    spacing: { before: 320, after: 120 },
    children: [new TextRun({
      text,
      bold: true,
      size: 24,
      color: C.radissonBlue,
      font: 'Calibri',
      allCaps: true,
      characterSpacing: 40,
    })],
  });
}

function checkRow(item) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: '[  ]  ', bold: true, size: 18, font: 'Courier New', color: C.radissonBlue }),
      new TextRun({ text: item, size: 18, font: 'Calibri' }),
    ],
  });
}

function imageCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 200 },
    children: [new TextRun({ text, size: 16, italics: true, color: C.labelGrey, font: 'Calibri' })],
  });
}

// ─── Cell helpers ─────────────────────────────────────────────────────────────
function labelCell(text, w = 2600) {
  return new TableCell({
    borders: cellBorders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: C.lightBlue, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, size: 18, color: C.radissonBlue, font: 'Calibri' })],
    })],
  });
}

function valueCell(text = '', w = 6760, shade = C.white) {
  const empty = text === '';
  return new TableCell({
    borders: cellBorders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    children: [new Paragraph({
      children: [new TextRun({
        text: empty ? 'Click to fill in' : text,
        size: 18,
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
        margins: { top: 80, bottom: tall ? 800 : 240, left: 160, right: 160 },
        children: [new Paragraph({
          children: [new TextRun({ text: hint, size: 17, italics: true, color: C.labelGrey, font: 'Calibri' })],
        })],
      }),
    ],
  });
}

// Full-width navy header row (spans 2 columns by default)
function headerRow(text, span = 2, totalW = 9360) {
  return new TableRow({
    children: [
      new TableCell({
        borders: cellBorders,
        columnSpan: span,
        width: { size: totalW, type: WidthType.DXA },
        shading: { fill: C.radissonBlue, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 160, right: 160 },
        children: [new Paragraph({
          children: [new TextRun({
            text: text.toUpperCase(),
            bold: true, size: 20, color: C.white,
            font: 'Calibri', allCaps: true, characterSpacing: 30,
          })],
        })],
      }),
    ],
  });
}

// ─── Severity badge ───────────────────────────────────────────────────────────
function severityRow() {
  function badge(label, fg, bg) {
    return new TableCell({
      borders: cellBorders,
      width: { size: 2340, type: WidthType.DXA },
      shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 120, right: 120 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: label, bold: true, size: 20, color: fg, font: 'Calibri' })],
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

// ─── Image placeholder ────────────────────────────────────────────────────────
function imagePlaceholder(label = 'Insert evidence image here', index = 1) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: dashedBorder,
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: 'F0F4FA', type: ShadingType.CLEAR },
            margins: { top: 600, bottom: 600, left: 300, right: 300 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({
                  text: `[ Figure ${index}:  ${label} ]`,
                  size: 19, color: C.midBlue, italics: true, font: 'Calibri',
                })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80 },
                children: [new TextRun({
                  text: 'Right-click  →  Insert Picture  |  or  Paste (Ctrl+V) directly into this cell',
                  size: 16, color: C.labelGrey, italics: true, font: 'Calibri',
                })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ─── Timeline row ─────────────────────────────────────────────────────────────
function timelineRow(time = '', action = '', by = '', shade = C.white) {
  function tcell(txt, w, bold = false) {
    return new TableCell({
      borders: cellBorders,
      width: { size: w, type: WidthType.DXA },
      shading: { fill: shade, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      children: [new Paragraph({
        children: [new TextRun({ text: txt, size: 18, font: 'Calibri', bold, color: bold ? C.radissonBlue : C.black })],
      })],
    });
  }
  return new TableRow({ children: [tcell(time, 1800, !!time), tcell(action, 5760), tcell(by, 1800)] });
}

// ─── Three-column header row (for timeline) ───────────────────────────────────
function timelineHeaderRow() {
  function hcell(txt, w) {
    return new TableCell({
      borders: cellBorders,
      width: { size: w, type: WidthType.DXA },
      shading: { fill: C.radissonBlue, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
      children: [new Paragraph({
        children: [new TextRun({ text: txt, bold: true, size: 18, color: C.white, font: 'Calibri', allCaps: true })],
      })],
    });
  }
  return new TableRow({ children: [hcell('DATE / TIME', 1800), hcell('ACTION / OBSERVATION', 5760), hcell('ACTIONED BY', 1800)] });
}

// ─── Recommendations table row ────────────────────────────────────────────────
function recRow(rec, desc, owner, shade) {
  function rcell(txt, w) {
    const empty = txt === '';
    return new TableCell({
      borders: cellBorders,
      width: { size: w, type: WidthType.DXA },
      shading: { fill: shade, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 200, left: 140, right: 140 },
      children: [new Paragraph({
        children: [new TextRun({ text: empty ? '' : txt, size: 18, font: 'Calibri' })],
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
        margins: { top: 80, bottom: 280, left: 140, right: 140 },
        children: [new Paragraph({
          children: [new TextRun({ text: role, bold: true, size: 17, color: C.radissonBlue, font: 'Calibri' })],
        })],
      }),
      new TableCell({
        borders: cellBorders,
        width: { size: 3380, type: WidthType.DXA },
        shading: { fill: shade, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 280, left: 140, right: 140 },
        children: [new Paragraph({ children: [new TextRun({ text: '', size: 18, font: 'Calibri' })] })],
      }),
      new TableCell({
        borders: cellBorders,
        width: { size: 3380, type: WidthType.DXA },
        shading: { fill: shade, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 280, left: 140, right: 140 },
        children: [new Paragraph({ children: [new TextRun({ text: '', size: 18, font: 'Calibri' })] })],
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
                new Paragraph({ spacing: { before: 20 }, children: [new TextRun({ text: 'Mauritius  |  Information Security', size: 17, color: C.accentGold, font: 'Calibri' })] }),
              ],
            }),
            new TableCell({
              borders: noBorder,
              width: { size: 3160, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'CYBERSECURITY INCIDENT REPORT', bold: true, size: 17, color: C.labelGrey, font: 'Calibri', allCaps: true })] }),
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'CONFIDENTIAL', bold: true, size: 16, color: C.critRed, font: 'Calibri' })] }),
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
      spacing: { before: 80 },
      children: [
        new TextRun({ text: 'Radisson Hotel Group Mauritius', size: 16, color: C.labelGrey, font: 'Calibri' }),
        new TextRun({ text: '\t', size: 16 }),
        new TextRun({ text: 'CONFIDENTIAL  |  For Authorised Personnel Only', size: 16, color: C.labelGrey, italics: true, font: 'Calibri' }),
        new TextRun({ text: '\tPage ', size: 16, color: C.labelGrey, font: 'Calibri' }),
        new TextRun({
          children: [PageNumber.CURRENT],
          size: 16,
          color: C.labelGrey,
          font: 'Calibri',
        }),
      ],
    }),
  ],
});

// ─── Document ─────────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 20 } },
    },
  },

  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1200, right: 1080, bottom: 1080, left: 1080 },
      },
    },
    headers: { default: docHeader },
    footers: { default: docFooter },

    children: [

      // ═══════════════════════════════════════════════════════
      // COVER / TITLE BLOCK
      // ═══════════════════════════════════════════════════════
      spacer(200),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: 'CYBERSECURITY INCIDENT REPORT', bold: true, size: 44, color: C.radissonBlue, font: 'Calibri', allCaps: true, characterSpacing: 60 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: 'Radisson Hotel Group  |  Mauritius Operations', size: 22, color: C.accentGold, font: 'Calibri' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.accentGold, space: 6 } },
        spacing: { before: 0, after: 280 },
        children: [new TextRun({ text: 'RESTRICTED  |  FOR AUTHORISED PERSONNEL ONLY', bold: true, size: 18, color: C.critRed, font: 'Calibri' })],
      }),

      spacer(80),

      // ═══════════════════════════════════════════════════════
      // SECTION 1 — INCIDENT IDENTIFICATION
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 1   Incident Identification'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Reference & Classification'),
          dataRow('Report Reference No.',  '[Auto-assign: RHG-SEC-YYYY-NNN]'),
          dataRow('Related Ticket / Case No.', ''),
          dataRow('Property / Location',   ''),
          dataRow('Department Affected',   ''),
          dataRow('Report Prepared By',    ''),
          dataRow('Designation',           ''),
          dataRow('Date of Report',        ''),
          dataRow('Report Version',        'v1.0  –  Initial'),
        ],
      }),

      spacer(160),

      instruction('Circle or shade the appropriate severity level.'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 2340, 2340, 2340],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                columnSpan: 4,
                width: { size: 9360, type: WidthType.DXA },
                shading: { fill: C.radissonBlue, type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 160, right: 160 },
                children: [new Paragraph({ children: [new TextRun({ text: 'INCIDENT SEVERITY', bold: true, size: 20, color: C.white, font: 'Calibri', allCaps: true })] })],
              }),
            ],
          }),
          severityRow(),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                columnSpan: 4,
                width: { size: 9360, type: WidthType.DXA },
                shading: { fill: C.rowAlt, type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 100, left: 160, right: 160 },
                children: [
                  new Paragraph({ children: [
                    new TextRun({ text: 'CRITICAL: ', bold: true, size: 17, color: C.critRed, font: 'Calibri' }),
                    new TextRun({ text: 'Active breach, ransomware, data exfiltration in progress.     ', size: 17, font: 'Calibri' }),
                    new TextRun({ text: 'HIGH: ', bold: true, size: 17, color: C.highOrange, font: 'Calibri' }),
                    new TextRun({ text: 'Confirmed compromise, significant system impact.', size: 17, font: 'Calibri' }),
                  ]}),
                  new Paragraph({ children: [
                    new TextRun({ text: 'MEDIUM: ', bold: true, size: 17, color: C.medYellow, font: 'Calibri' }),
                    new TextRun({ text: 'Suspected breach, policy violation, unusual access.     ', size: 17, font: 'Calibri' }),
                    new TextRun({ text: 'LOW: ', bold: true, size: 17, color: C.lowGreen, font: 'Calibri' }),
                    new TextRun({ text: 'Minor anomaly, no active threat confirmed.', size: 17, font: 'Calibri' }),
                  ]}),
                ],
              }),
            ],
          }),
        ],
      }),

      spacer(160),

      // ═══════════════════════════════════════════════════════
      // SECTION 2 — INCIDENT OVERVIEW
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 2   Incident Overview'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('When & Where'),
          dataRow('Date Incident Detected',  ''),
          dataRow('Time Detected (24-hr)',    ''),
          dataRow('Date Incident Occurred',   'If different from detected date'),
          dataRow('Time Occurred (24-hr)',    ''),
          dataRow('Physical Location',        'e.g. Front Office, Server Room, Restaurant POS'),
          dataRow('System / Device Name',     'e.g. WS-FO-01, POS-RES-02, SRV-IT-03, Staff Laptop'),
          dataRow('Asset Tag / Serial No.',   ''),
          dataRow('IP Address / MAC Address', ''),
          dataRow('Operating System',         ''),
          dataRow('Network Segment / VLAN',   ''),
          dataRow('MDM Enrolled?',            '[  ] Yes     [  ] No     [  ] Unknown'),
        ],
      }),

      spacer(120),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Incident Type  –  Select all that apply'),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                columnSpan: 2,
                width: { size: 9360, type: WidthType.DXA },
                shading: { fill: C.white, type: ShadingType.CLEAR },
                margins: { top: 120, bottom: 120, left: 200, right: 200 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: '[  ] Unauthorised Application Installation          [  ] Suspicious Browser Activity / Pop-ups', size: 18, font: 'Calibri' })] }),
                  new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: '[  ] Malware / Ransomware Infection                 [  ] Phishing / Social Engineering Attempt', size: 18, font: 'Calibri' })] }),
                  new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: '[  ] Unauthorised Remote / Network Access            [  ] Data Breach / Leakage', size: 18, font: 'Calibri' })] }),
                  new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: '[  ] Insider Threat / Acceptable Use Policy Violation  [  ] Physical Security Breach', size: 18, font: 'Calibri' })] }),
                  new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: '[  ] Account Compromise / Credential Theft           [  ] PMS / POS System Anomaly', size: 18, font: 'Calibri' })] }),
                  new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: '[  ] Wi-Fi / Network Infrastructure Anomaly          [  ] Other  (describe fully in Section 3)', size: 18, font: 'Calibri' })] }),
                ],
              }),
            ],
          }),
        ],
      }),

      spacer(160),

      // ═══════════════════════════════════════════════════════
      // SECTION 3 — INCIDENT NARRATIVE
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 3   Incident Narrative'),
      instruction('Write clearly and factually. Avoid assumptions or speculation. Use first-person account where appropriate. Continue on additional pages if required.'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Initial Discovery'),
          noteRow('How was it discovered?', 'e.g. Flagged by staff member, automated alert, guest complaint, routine security audit', C.white, true),
          noteRow('Who discovered it?', 'Full name, role, department', C.rowAlt),
          noteRow('Who was notified first?', 'Name, role, and time of notification', C.white),
        ],
      }),

      spacer(120),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Detailed Description of Events'),
          new TableRow({
            children: [
              labelCell('Step-by-step Account', 2600),
              new TableCell({
                borders: cellBorders,
                width: { size: 6760, type: WidthType.DXA },
                shading: { fill: C.white, type: ShadingType.CLEAR },
                margins: { top: 100, bottom: 1400, left: 160, right: 160 },
                children: [new Paragraph({
                  children: [new TextRun({ text: 'Describe what happened in sequence. Include observed behaviours, error messages, application names, notification content, system states, and any contextual detail that may assist investigation.', size: 17, italics: true, color: C.labelGrey, font: 'Calibri' })],
                })],
              }),
            ],
          }),
          noteRow('Suspected Root Cause', 'e.g. Unmanaged personal application installed on hotel device, misconfigured device permissions, employee clicked phishing link', C.rowAlt, true),
          noteRow('Systems / Data Potentially Exposed', 'e.g. Opera PMS guest records, F&B POS payment data, staff login credentials, hotel Wi-Fi PSK', C.white, true),
        ],
      }),

      spacer(160),

      // ═══════════════════════════════════════════════════════
      // SECTION 4 — PHOTOGRAPHIC & DIGITAL EVIDENCE
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 4   Photographic & Digital Evidence'),
      instruction('Insert images directly into the dashed cells below. In Microsoft Word: right-click inside the cell and choose Insert > Picture, or paste a screenshot with Ctrl+V. Add a descriptive caption beneath each image. Insert additional pages as needed and maintain sequential numbering throughout.'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Evidence Log'),
          dataRow('Evidence Collected By',    ''),
          dataRow('Collection Date / Time',   ''),
          dataRow('Storage / Preservation',   'e.g. Device placed in tamper-evident bag, images saved to shared IT drive'),
          noteRow('Chain of Custody Notes', 'Describe who handled the evidence and in what order', C.rowAlt, false),
        ],
      }),

      spacer(120),

      imagePlaceholder('Affected device or asset – overview of physical condition and labelling', 1),
      imageCaption('Figure 1.  [Describe what the image shows and its relevance to the incident]'),

      spacer(80),
      imagePlaceholder('Browser notification or pop-up content', 2),
      imageCaption('Figure 2.  [Describe what the image shows and its relevance to the incident]'),

      spacer(80),
      imagePlaceholder('Installed applications list or device settings screen', 3),
      imageCaption('Figure 3.  [Describe what the image shows and its relevance to the incident]'),

      spacer(80),
      imagePlaceholder('Network logs, alert dashboard, or additional system output (if captured)', 4),
      imageCaption('Figure 4.  [Describe what the image shows and its relevance to the incident]'),

      spacer(80),
      imagePlaceholder('Additional evidence – supplementary image', 5),
      imageCaption('Figure 5.  [Describe what the image shows and its relevance to the incident]'),

      instruction('Further images may be appended on continuation pages. Maintain the sequential Figure numbering.'),

      spacer(160),

      // ═══════════════════════════════════════════════════════
      // SECTION 5 — PEOPLE INVOLVED
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 5   People Involved'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Primary User of Affected Device'),
          dataRow('Full Name',              ''),
          dataRow('Employee ID',            ''),
          dataRow('Department',             ''),
          dataRow('Role / Designation',     ''),
          dataRow('Was device shared?',     '[  ] Yes     [  ] No     [  ] Unknown'),
          noteRow('If shared – list others', 'Full name and department of each additional user with access', C.rowAlt, true),
        ],
      }),

      spacer(120),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Witnesses & Reporting Individuals'),
          dataRow('Witness Name(s)',           ''),
          dataRow('Witness Role(s)',           ''),
          noteRow('Witness Statement Summary', 'Attach full signed statements as annexures where applicable', C.rowAlt, true),
        ],
      }),

      spacer(160),

      // ═══════════════════════════════════════════════════════
      // SECTION 6 — TIMELINE OF EVENTS
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 6   Timeline of Events'),
      instruction('Record each key action or observation in chronological order. Complete Date/Time and Actioned By columns for every entry.'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1800, 5760, 1800],
        rows: [
          timelineHeaderRow(),
          timelineRow('', 'Incident first observed by staff member', '', C.rowAlt),
          timelineRow('', 'IT department or supervisor notified', '', C.white),
          timelineRow('', 'Initial containment steps applied', '', C.rowAlt),
          timelineRow('', 'Device isolated from the network', '', C.white),
          timelineRow('', 'Evidence documentation commenced', '', C.rowAlt),
          timelineRow('', 'Property IT Manager informed', '', C.white),
          timelineRow('', 'Regional IT / Group Information Security escalation', '', C.rowAlt),
          timelineRow('', '', '', C.white),
          timelineRow('', '', '', C.rowAlt),
          timelineRow('', '', '', C.white),
          timelineRow('', '', '', C.rowAlt),
        ],
      }),

      spacer(160),

      // ═══════════════════════════════════════════════════════
      // SECTION 7 — IMMEDIATE CONTAINMENT ACTIONS
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 7   Immediate Containment Actions'),
      instruction('Tick all actions taken at the time of discovery or immediately after. Leave blank if not yet completed or not applicable.'),

      checkRow('Device removed from the network immediately (Wi-Fi disabled / network cable unplugged)'),
      checkRow('Device powered off to prevent further automated activity'),
      checkRow('Device physically secured and access restricted to authorised IT personnel only'),
      checkRow('Screenshots and photographic evidence captured before any changes were made to the device'),
      checkRow('Full list of installed applications documented prior to any removal'),
      checkRow('Browser history and active session data documented'),
      checkRow('Network logs requested from infrastructure / Wi-Fi management team'),
      checkRow('PMS and POS systems checked for related unusual activity or unauthorised data access'),
      checkRow('Scope of guest data exposure reviewed and assessed'),
      checkRow('Affected user account credentials changed or disabled'),
      checkRow('Incident formally escalated to Property IT Manager'),
      checkRow('Incident escalated to Regional IT or Group Information Security (if threshold met)'),
      checkRow('Staff member interviewed and instructed not to interact with device further'),
      checkRow('Physical access logs for server room or network equipment reviewed'),

      spacer(100),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Additional Containment Notes'),
          noteRow('Other steps taken', 'Describe any containment or response actions not listed above', C.white, true),
        ],
      }),

      spacer(160),

      // ═══════════════════════════════════════════════════════
      // SECTION 8 — IMPACT ASSESSMENT
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 8   Impact Assessment'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Scope & Exposure'),
          dataRow('Number of Devices Affected',        ''),
          dataRow('Number of Users Affected',          ''),
          dataRow('Guest Data Potentially Exposed?',   '[  ] Yes     [  ] No     [  ] Under Investigation'),
          dataRow('Payment Card Data Involved?',       '[  ] Yes     [  ] No     [  ] Unknown'),
          dataRow('Employee Personal Data Involved?',  '[  ] Yes     [  ] No     [  ] Unknown'),
          dataRow('Operational Impact Level',          '[  ] None     [  ] Minor     [  ] Moderate     [  ] Significant'),
          dataRow('Estimated Duration of Impact',      ''),
          noteRow('Systems / Data Confirmed Affected', 'Be specific. e.g. Opera PMS front-of-house module, F&B POS station 2, staff shared drive', C.rowAlt, true),
          noteRow('Business Impact Summary',           'e.g. Guest check-in delays, temporary system downtime, data at risk of exfiltration', C.white, true),
        ],
      }),

      spacer(160),

      // ═══════════════════════════════════════════════════════
      // SECTION 9 — TECHNICAL FINDINGS
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 9   Technical Findings'),
      instruction('Complete as much as possible at time of initial reporting. The IT team may supplement this section with a separate technical annex document.'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Forensic & Technical Detail'),
          noteRow('Unapproved Applications Found', 'List name, version, install source (e.g. Play Store, APK), and install date if visible', C.white, true),
          noteRow('Browser History / URL Activity', 'Note suspicious domains, redirect chains, file downloads, or extension activity', C.rowAlt, true),
          noteRow('External Network Connections', 'IPs, ports, DNS queries, or outbound connections that appear abnormal or unknown', C.white, true),
          noteRow('Logs / Alerts Referenced', 'Specify which logs were reviewed and highlight the most relevant entries', C.rowAlt, true),
          noteRow('Malware / IOC Indicators', 'File hashes, file names, registry keys, or behavioural indicators identified during investigation', C.white, true),
          noteRow('MDM / Antivirus Findings', 'Scan results, quarantined items, MDM policy violations, or compliance failures detected', C.rowAlt, true),
          noteRow('Notification / Alert Content', 'Verbatim text or description of any suspicious notifications observed on the device', C.white, true),
        ],
      }),

      spacer(160),

      // ═══════════════════════════════════════════════════════
      // SECTION 10 — REGULATORY & COMPLIANCE
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 10   Regulatory & Compliance Considerations'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Notification Obligations'),
          dataRow('Does incident involve personal data?',       '[  ] Yes     [  ] No     [  ] Under Review'),
          dataRow('PCI DSS reporting triggered?',              '[  ] Yes     [  ] No     [  ] Not Applicable'),
          dataRow('Group Privacy / Legal Team notified?',      '[  ] Yes     [  ] No     [  ] Pending'),
          dataRow('Law enforcement notification required?',    '[  ] Yes     [  ] No     [  ] Under Review'),
          dataRow('Mauritius DPA notification required?',      '[  ] Yes     [  ] No     [  ] Under Review'),
          dataRow('Brand / Communications escalation needed?', '[  ] Yes     [  ] No     [  ] Pending'),
          noteRow('Compliance Action Notes', 'Detail any specific steps taken or planned to meet regulatory obligations and internal policy requirements', C.rowAlt, true),
        ],
      }),

      spacer(160),

      // ═══════════════════════════════════════════════════════
      // SECTION 11 — RECOMMENDATIONS & REMEDIATION
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 11   Recommendations & Remediation Plan'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 4560, 2200],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2600, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'RECOMMENDATION', bold: true, size: 18, color: C.white, font: 'Calibri', allCaps: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 4560, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'ACTION REQUIRED', bold: true, size: 18, color: C.white, font: 'Calibri', allCaps: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 2200, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'OWNER / DEADLINE', bold: true, size: 18, color: C.white, font: 'Calibri', allCaps: true })] })] }),
            ],
          }),
          ...[
            ['Device re-imaging',            'Wipe and reinstall approved operating system image on affected device before redeployment'],
            ['MDM enrolment',                'Confirm device is enrolled in Mobile Device Management and all policies applied before returning to service'],
            ['Application whitelist review', 'Audit the approved application list for all hotel devices and update MDM policy accordingly'],
            ['User credential reset',        'Reset passwords and review access permissions for all staff with prior access to the affected system'],
            ['Staff awareness training',     'Schedule a targeted cybersecurity awareness session for the department involved'],
            ['Network log retention audit',  'Confirm that log retention policy meets the minimum 90-day requirement across all systems'],
            ['', ''],
            ['', ''],
          ].map(([rec, desc], i) => recRow(rec, desc, '', i % 2 === 0 ? C.white : C.rowAlt)),
        ],
      }),

      spacer(160),

      // ═══════════════════════════════════════════════════════
      // SECTION 12 — LESSONS LEARNED
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 12   Lessons Learned'),
      instruction('Complete this section once the investigation is closed. Summarise what went well, what could be improved, and any systemic changes recommended.'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 6760],
        rows: [
          headerRow('Post-Incident Review'),
          noteRow('What was handled well?',              'Actions that proved effective and should be repeated', C.white, true),
          noteRow('What could have been done better?',  'Process gaps, communication delays, or tool limitations identified', C.rowAlt, true),
          noteRow('Root cause confirmed?',              'Final confirmed root cause once investigation is concluded', C.white),
          noteRow('Systemic improvements recommended',  'Policy changes, training, technical controls, or procurement actions required to prevent recurrence', C.rowAlt, true),
          dataRow('Date Review Completed', ''),
          dataRow('Reviewed By',           ''),
        ],
      }),

      spacer(160),

      // ═══════════════════════════════════════════════════════
      // SECTION 13 — SIGN-OFF & APPROVALS
      // ═══════════════════════════════════════════════════════
      sectionRule('Section 13   Sign-off & Approvals'),
      instruction('All relevant parties must review and sign this report. Unsigned reports will not be considered formally closed.'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2600, 3380, 3380],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 2600, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'ROLE', bold: true, size: 18, color: C.white, font: 'Calibri', allCaps: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3380, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'FULL NAME & SIGNATURE', bold: true, size: 18, color: C.white, font: 'Calibri', allCaps: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 3380, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'DATE SIGNED', bold: true, size: 18, color: C.white, font: 'Calibri', allCaps: true })] })] }),
            ],
          }),
          ...[
            'Reporting Officer',
            'Property IT Manager / IT Supervisor',
            'Department Head / HOD',
            'General Manager / Director of Operations',
            'Regional IT Manager  (if escalated)',
          ].map((role, i) => signoffRow(role, i % 2 === 0 ? C.white : C.rowAlt)),
        ],
      }),

      spacer(160),

      // ═══════════════════════════════════════════════════════
      // ANNEXURE GUIDANCE
      // ═══════════════════════════════════════════════════════
      sectionRule('Annexures'),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1400, 5760, 2200],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 1400, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'REF', bold: true, size: 18, color: C.white, font: 'Calibri', allCaps: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 5760, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'DOCUMENT / ATTACHMENT', bold: true, size: 18, color: C.white, font: 'Calibri', allCaps: true })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 2200, type: WidthType.DXA }, shading: { fill: C.radissonBlue, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'ATTACHED?', bold: true, size: 18, color: C.white, font: 'Calibri', allCaps: true })] })] }),
            ],
          }),
          ...([
            ['A', 'Witness statements (signed)', ''],
            ['B', 'Full network / system log export', ''],
            ['C', 'MDM report or antivirus scan output', ''],
            ['D', 'Technical forensic annex (IT authored)', ''],
            ['E', 'Device inventory / asset register extract', ''],
            ['F', 'Additional photographic evidence', ''],
            ['G', 'Regulatory notification copies', ''],
          ].map(([ref, doc2, att], i) => new TableRow({
            children: [
              new TableCell({ borders: cellBorders, width: { size: 1400, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? C.white : C.rowAlt, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 120, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: ref, bold: true, size: 18, color: C.radissonBlue, font: 'Calibri' })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 5760, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? C.white : C.rowAlt, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 120, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: doc2, size: 18, font: 'Calibri' })] })] }),
              new TableCell({ borders: cellBorders, width: { size: 2200, type: WidthType.DXA }, shading: { fill: i % 2 === 0 ? C.white : C.rowAlt, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 120, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: '[  ] Yes     [  ] No', size: 18, font: 'Calibri' })] })] }),
            ],
          }))),
        ],
      }),

      spacer(200),

      // End note
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.accentGold, space: 6 } },
        spacing: { before: 120, after: 80 },
        children: [new TextRun({ text: 'This document is classified CONFIDENTIAL. Distribution is restricted to authorised personnel directly involved in the investigation and its resolution.', size: 16, italics: true, color: C.labelGrey, font: 'Calibri' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: 'Radisson Hotel Group Mauritius  |  Information Security', size: 16, color: C.radissonBlue, font: 'Calibri' })],
      }),
    ],
  }],
});

// ─── Write file ───────────────────────────────────────────────────────────────
Packer.toBuffer(doc).then((buffer) => {
  const filename = 'RHG_Cybersecurity_Incident_Report_Template.docx';
  const tmpname = filename + '.tmp';
  fs.writeFileSync(tmpname, buffer);
  try {
    if (fs.existsSync(filename)) fs.unlinkSync(filename);
    fs.renameSync(tmpname, filename);
  } catch (_) {
    // If old file is locked, keep the .tmp — user can rename manually
    console.log(`\n✓  Template written to: ${tmpname}  (rename to ${filename} after closing it in Word)\n`);
    return;
  }
  console.log(`\n✓  Template generated successfully: ${filename}\n`);
}).catch((err) => {
  console.error('Error generating document:', err);
  process.exit(1);
});
