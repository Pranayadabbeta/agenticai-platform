const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, LevelFormat, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, Header, Footer
} = require('docx');
const fs = require('fs');

// ── Colors ──────────────────────────────────────────────
const NAVY   = "1A3055";
const TEAL   = "00C9A7";
const GOLD   = "F5A623";
const BLUE   = "2563EB";
const GRAY   = "64748B";
const LGRAY  = "F1F5F9";
const WHITE  = "FFFFFF";
const DARK   = "0F172A";
const RED    = "DC2626";
const GREEN  = "16A34A";

// ── Helpers ──────────────────────────────────────────────
const border1 = { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" };
const cellBorders = { top: border1, bottom: border1, left: border1, right: border1 };
const noBorders = {
  top:    { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left:   { style: BorderStyle.NONE },
  right:  { style: BorderStyle.NONE },
};

function sp(before=0, after=0) { return { spacing: { before, after } }; }

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: "Arial", size: 32, bold: true, color: NAVY })],
    ...sp(320, 120),
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 4 } },
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: NAVY })],
    ...sp(260, 80),
  });
}

function heading3(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: "Arial", size: 22, bold: true, color: BLUE })],
    ...sp(200, 60),
  });
}

function para(runs, before=60, after=60, align) {
  const opts = { children: Array.isArray(runs) ? runs : [new TextRun({ text: runs, font: "Arial", size: 22, color: DARK })], ...sp(before, after) };
  if (align) opts.alignment = align;
  return new Paragraph(opts);
}

function bold(text, color=DARK, size=22) {
  return new TextRun({ text, font: "Arial", size, bold: true, color });
}
function reg(text, color=DARK, size=22) {
  return new TextRun({ text, font: "Arial", size, color });
}
function italic(text, color=GRAY, size=22) {
  return new TextRun({ text, font: "Arial", size, italic: true, color });
}

function bullet(text, level=0, color=DARK) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    children: [new TextRun({ text, font: "Arial", size: 22, color })],
    ...sp(40, 40),
  });
}

function speech(lines) {
  // Green box for what to say
  const cellPara = lines.map(l => new Paragraph({
    children: [new TextRun({ text: l, font: "Arial", size: 21, color: "166534", italic: l.startsWith('"') || l.startsWith('\u201C') })],
    ...sp(40, 40),
  }));
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 6, color: GREEN },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: GREEN },
        left:   { style: BorderStyle.SINGLE, size: 6, color: GREEN },
        right:  { style: BorderStyle.SINGLE, size: 6, color: GREEN },
      },
      shading: { fill: "F0FDF4", type: ShadingType.CLEAR },
      margins: { top: 140, bottom: 140, left: 180, right: 180 },
      children: [
        new Paragraph({ children: [new TextRun({ text: "WHAT TO SAY", font: "Arial", size: 18, bold: true, color: GREEN })], ...sp(0,80) }),
        ...cellPara,
      ],
    }) ] })]
  });
}

// Blue box for action
function actionBox(lines) {
  const cellPara = lines.map(l => new Paragraph({
    children: [new TextRun({ text: l, font: "Arial", size: 21, color: "1e40af" })],
    ...sp(40, 40),
  }));
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 6, color: BLUE },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE },
        left:   { style: BorderStyle.SINGLE, size: 6, color: BLUE },
        right:  { style: BorderStyle.SINGLE, size: 6, color: BLUE },
      },
      shading: { fill: "EFF6FF", type: ShadingType.CLEAR },
      margins: { top: 140, bottom: 140, left: 180, right: 180 },
      children: [
        new Paragraph({ children: [new TextRun({ text: "🖥️  ON SCREEN / ACTION", font: "Arial", size: 18, bold: true, color: BLUE })], ...sp(0,80) }),
        ...cellPara,
      ],
    }) ] })]
  });
}

// Gold box for tips
function tipBox(lines) {
  const cellPara = lines.map(l => new Paragraph({
    children: [new TextRun({ text: l, font: "Arial", size: 21, color: "92400e" })],
    ...sp(40, 40),
  }));
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: {
        top:    { style: BorderStyle.SINGLE, size: 6, color: GOLD },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD },
        left:   { style: BorderStyle.SINGLE, size: 6, color: GOLD },
        right:  { style: BorderStyle.SINGLE, size: 6, color: GOLD },
      },
      shading: { fill: "FFFBEB", type: ShadingType.CLEAR },
      margins: { top: 140, bottom: 140, left: 180, right: 180 },
      children: [
        new Paragraph({ children: [new TextRun({ text: "💡  TIP / NOTE", font: "Arial", size: 18, bold: true, color: "92400e" })], ...sp(0,80) }),
        ...cellPara,
      ],
    }) ] })]
  });
}

function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 4 } },
    ...sp(160, 160),
    children: [],
  });
}

function timelineRow(time, speaker, desc) {
  return new TableRow({ children: [
    new TableCell({
      borders: cellBorders, width: { size: 1400, type: WidthType.DXA },
      shading: { fill: LGRAY, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: time, font: "Arial", size: 20, bold: true, color: NAVY })], alignment: AlignmentType.CENTER })],
    }),
    new TableCell({
      borders: cellBorders, width: { size: 2200, type: WidthType.DXA },
      shading: { fill: time.includes("PPT") ? "EFF6FF" : time.includes("DEMO") ? "F0FDF4" : "FFF7ED", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: speaker, font: "Arial", size: 20, bold: true, color: DARK })] })],
    }),
    new TableCell({
      borders: cellBorders, width: { size: 5760, type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: desc, font: "Arial", size: 20, color: DARK })] })],
    }),
  ]});
}

function slideTag(slideNum, title) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: noBorders,
      shading: { fill: NAVY, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 180, right: 180 },
      children: [new Paragraph({
        children: [
          new TextRun({ text: `SLIDE ${slideNum}  `, font: "Arial", size: 20, bold: true, color: TEAL }),
          new TextRun({ text: title, font: "Arial", size: 20, bold: true, color: WHITE }),
        ],
        alignment: AlignmentType.LEFT,
      })],
    }) ] })]
  });
}

// ══════════════════════════════════════════════════════════
// DOCUMENT CONTENT
// ══════════════════════════════════════════════════════════

const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
      ]},
    ],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: DARK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 260, after: 80 }, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 4 } },
        children: [
          new TextRun({ text: "AgentOS — XLVentures.AI Hackathon  ·  9-Minute Demo Script", font: "Arial", size: 18, color: GRAY }),
          new TextRun({ text: "   ·   June 2026", font: "Arial", size: 18, color: GRAY }),
        ],
        alignment: AlignmentType.LEFT,
        ...sp(0, 80),
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0", space: 4 } },
        children: [
          new TextRun({ text: "CONFIDENTIAL  ·  Team AgentOS  ·  github.com/Pranayadabbeta/agenticai-platform", font: "Arial", size: 16, color: GRAY }),
          new TextRun({ children: [new PageNumber()], font: "Arial", size: 16, color: GRAY }),
        ],
        alignment: AlignmentType.LEFT,
        ...sp(80, 0),
      })] }),
    },
    children: [

      // ── COVER ────────────────────────────────────────────────────
      new Paragraph({ children: [], ...sp(0, 200) }),
      new Paragraph({
        children: [new TextRun({ text: "AgentOS", font: "Arial", size: 72, bold: true, color: NAVY })],
        alignment: AlignmentType.CENTER, ...sp(0, 80),
      }),
      new Paragraph({
        children: [new TextRun({ text: "XLVentures.AI Hackathon  ·  9-Minute Video Demo Script", font: "Arial", size: 28, color: GRAY })],
        alignment: AlignmentType.CENTER, ...sp(0, 80),
      }),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL, space: 4 } },
        children: [], ...sp(0, 120),
      }),
      new Paragraph({
        children: [new TextRun({ text: "Agentic B2B Prospect Intelligence Platform", font: "Arial", size: 28, bold: true, color: TEAL })],
        alignment: AlignmentType.CENTER, ...sp(0, 200),
      }),

      // Team roles info box
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: { fill: LGRAY, type: ShadingType.CLEAR },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "Member A", font: "Arial", size: 22, bold: true, color: NAVY })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: "PPT Presenter", font: "Arial", size: 20, color: GRAY })], alignment: AlignmentType.CENTER, ...sp(40,0) }),
                new Paragraph({ children: [new TextRun({ text: "Slides 1–3", font: "Arial", size: 20, color: BLUE })], alignment: AlignmentType.CENTER, ...sp(40,0) }),
              ] }),
            new TableCell({ borders: cellBorders, shading: { fill: "F0FDF4", type: ShadingType.CLEAR },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "Member B", font: "Arial", size: 22, bold: true, color: NAVY })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: "Live Demo", font: "Arial", size: 20, color: GRAY })], alignment: AlignmentType.CENTER, ...sp(40,0) }),
                new Paragraph({ children: [new TextRun({ text: "Features 1, 2, 3", font: "Arial", size: 20, color: GREEN })], alignment: AlignmentType.CENTER, ...sp(40,0) }),
              ] }),
            new TableCell({ borders: cellBorders, shading: { fill: "EFF6FF", type: ShadingType.CLEAR },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: [
                new Paragraph({ children: [new TextRun({ text: "Member C", font: "Arial", size: 22, bold: true, color: NAVY })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: "PPT Presenter", font: "Arial", size: 20, color: GRAY })], alignment: AlignmentType.CENTER, ...sp(40,0) }),
                new Paragraph({ children: [new TextRun({ text: "Slides 7–10", font: "Arial", size: 20, color: BLUE })], alignment: AlignmentType.CENTER, ...sp(40,0) }),
              ] }),
          ]}),
        ],
      }),

      new Paragraph({ children: [], ...sp(200, 0) }),
      new Paragraph({ children: [new TextRun({ text: "GitHub: ", font: "Arial", size: 22, bold: true, color: GRAY }), new TextRun({ text: "github.com/Pranayadabbeta/agenticai-platform", font: "Arial", size: 22, color: BLUE, underline: {} })], alignment: AlignmentType.CENTER, ...sp(80, 0) }),
      new Paragraph({ children: [new PageBreak()] }),

      // ── SECTION 0: How To Use ────────────────────────────────────
      heading1("How To Use This Script"),
      para([
        reg("This document is the "),
        bold("complete word-for-word script "),
        reg("for your 9-minute XLVentures.AI Hackathon demo video. Each section is color-coded:"),
      ], 80, 80),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1600, 7760],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: { fill: "F0FDF4", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 1600, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "Green box", font: "Arial", size: 20, bold: true, color: GREEN })] })] }),
            new TableCell({ borders: cellBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 7760, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "Exact words to speak. Memorise or read naturally.", font: "Arial", size: 20, color: DARK })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: { fill: "EFF6FF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 1600, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "Blue box", font: "Arial", size: 20, bold: true, color: BLUE })] })] }),
            new TableCell({ borders: cellBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 7760, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "On-screen actions — what to click or show.", font: "Arial", size: 20, color: DARK })] })] }),
          ]}),
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: { fill: "FFFBEB", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 1600, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "Gold box", font: "Arial", size: 20, bold: true, color: "92400e" })] })] }),
            new TableCell({ borders: cellBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 7760, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "Tips, transitions, and coaching notes.", font: "Arial", size: 20, color: DARK })] })] }),
          ]}),
        ],
      }),

      new Paragraph({ children: [], ...sp(160, 0) }),

      // ── TIMELINE TABLE ───────────────────────────────────────────
      heading2("9-Minute Timeline at a Glance"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1400, 2200, 5760],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 1400, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "Time", font: "Arial", size: 20, bold: true, color: WHITE })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ borders: cellBorders, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 2200, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "Who / Mode", font: "Arial", size: 20, bold: true, color: WHITE })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 5760, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "What Happens", font: "Arial", size: 20, bold: true, color: WHITE })] })] }),
          ]}),
          timelineRow("0:00–1:00", "PPT · Member A", "Slide 1–2: Intro, team names, the B2B sales problem"),
          timelineRow("1:00–1:45", "PPT · Member A", "Slide 3–4: Governing constraint + Dynamic planner"),
          timelineRow("1:45–2:15", "PPT · Member A", "Slide 5: Shared memory architecture"),
          timelineRow("2:15–3:00", "DEMO · Member B", "Live: Planner page — 5-agent vs 2-agent orchestration"),
          timelineRow("3:00–4:30", "DEMO · Member B", "Live: Full workflow — cybersecurity companies in Europe"),
          timelineRow("4:30–5:30", "DEMO · Member B", "Live: Human-in-the-Loop refinement + feedback loop"),
          timelineRow("5:30–6:30", "PPT · Member C", "Slide 6–7: System Architecture + 9-layer design"),
          timelineRow("6:30–7:30", "PPT · Member C", "Slide 8–9: Extensibility + Business use case output"),
          timelineRow("7:30–8:30", "PPT · Member C", "Slide 9 (cont.) + Slide 10: Platform value + call to action"),
          timelineRow("8:30–9:00", "ALL", "GitHub repo, wrap-up, thank judges"),
        ],
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════════════════
      // PART 1 — MEMBER A
      // ═══════════════════════════════════════════════════════════════════
      heading1("PART 1 — Member A (PPT Presenter)"),
      para([bold("Slides 1–5  ·  Time: 0:00 – 2:15  ·  Duration: ~2 min 15 sec", NAVY, 24)], 0, 120),

      tipBox([
        "You are on camera. Speak clearly, look at the camera lens (not your slides), and keep a steady pace.",
        "Have the slide deck open in full-screen Presenter View so your notes are visible to you but not the recording.",
        "Smile at the start — first impressions matter enormously with judges.",
      ]),

      new Paragraph({ children: [], ...sp(120, 0) }),

      // Slide 1
      slideTag(1, "AgentOS — Title Slide"),
      new Paragraph({ children: [], ...sp(80, 0) }),
      para([bold("⏱ 0:00 – 0:30  (30 seconds)", GRAY, 20)], 0, 60),
      actionBox(["Show Slide 1 — the title card: 'AgentOS · Agentic B2B Prospect Intelligence Platform'", "Three members appear on camera briefly — wave or nod — then Member B and C step off camera."]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "\"Good morning, judges. We are Team AgentOS — three engineers who built a full-stack, production-grade agentic AI platform in this hackathon.",
        "",
        "I'm [Member A name], joining me are [Member B name] who will run our live demo, and [Member C name] who will walk you through our architecture.",
        "",
        "In the next 9 minutes, we are going to show you: a dynamic AI planner that computes unique execution plans per request, live web enrichment with no stale databases, a human-in-the-loop review gate, and a system that can extend with a brand-new agent in exactly one new file.",
        "",
        "Let's get into it.\"",
      ]),
      new Paragraph({ children: [], ...sp(80, 0) }),

      // Slide 2
      slideTag(2, "The Problem"),
      new Paragraph({ children: [], ...sp(80, 0) }),
      para([bold("⏱ 0:30 – 1:00  (30 seconds)", GRAY, 20)], 0, 60),
      actionBox(["Advance to Slide 2 — 'The Problem' slide with three stat callouts: 30–90 min, Stale Data, 0 Human guardrail."]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "\"Here is the problem we are solving.",
        "",
        "B2B sales teams waste 70% of their time prospecting stale, outdated static databases like ZoomInfo. They are pitching AWS migration to companies that migrated two years ago.",
        "",
        "Each lead requires 30 to 90 minutes of manual research before a single email is sent. The data is stale, the personas are wrong, and existing automation either executes fixed rule paths with no judgment — like Zapier — or gives you judgment with no ability to act on it — like a ChatGPT interface.",
        "",
        "Neither one closes the gap between a buying signal and an actionable, qualified prospect record. That gap is exactly what AgentOS eliminates.\"",
      ]),
      new Paragraph({ children: [], ...sp(80, 0) }),

      // Slide 3
      slideTag(3, "The Governing Constraint"),
      new Paragraph({ children: [], ...sp(80, 0) }),
      para([bold("⏱ 1:00 – 1:30  (30 seconds)", GRAY, 20)], 0, 60),
      actionBox(["Advance to Slide 3 — 'The governing constraint' quote slide."]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "\"Before we show you features, I want to share the single architectural principle that every decision in this system derives from.",
        "",
        "Quote: 'The system's capability ceiling must be set by how many agents are registered — not by how many workflows an engineer hardcoded in advance.'",
        "",
        "This is not a motto. It is a falsifiable engineering constraint. Every agent boundary, every memory design choice, every orchestration pattern you are about to see is a consequence of this one rule.",
        "",
        "Three corollaries follow from it: Open-Closed extensibility — new capabilities added without touching orchestration code. Fault isolation — a failure in one agent cannot corrupt another. And eventual scalability — the system must be able to scale without becoming a different system.\"",
      ]),
      new Paragraph({ children: [], ...sp(80, 0) }),

      // Slide 4
      slideTag(4, "Dynamic Planner Orchestration"),
      new Paragraph({ children: [], ...sp(80, 0) }),
      para([bold("⏱ 1:30 – 2:00  (30 seconds)", GRAY, 20)], 0, 60),
      actionBox(["Advance to Slide 4 — the planner flow diagram showing 5-agent vs 2-agent pipeline."]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "\"Here is the core platform innovation: Dynamic Planner Orchestration.",
        "",
        "Instead of a hardcoded DAG or a lookup table of workflow templates, our Planner Agent receives the user's natural-language prompt together with a live manifest of every registered agent — their names, descriptions, and declared data dependencies.",
        "",
        "It returns a structured execution plan, validated against a strict schema, before the workflow engine acts on it.",
        "",
        "The result: the same prompt 'Find Series B SaaS companies to sell our DevOps tool' fires all five agents. But 'Write an executive brief on Vercel' fires only Research and Summary — skipping Qualification, Persona, and Contact entirely. Zero code change. Zero template authoring. The planner computed the right plan for each intent automatically.",
        "",
        "In 30 seconds, you will see [Member B name] demonstrate this live.\"",
      ]),
      new Paragraph({ children: [], ...sp(80, 0) }),

      // Slide 5
      slideTag(5, "Shared Memory as Inter-Agent Contract"),
      new Paragraph({ children: [], ...sp(80, 0) }),
      para([bold("⏱ 2:00 – 2:15  (15 seconds — brief!)", GRAY, 20)], 0, 60),
      actionBox(["Advance to Slide 5 — the Shared Memory diagram showing agents writing typed keys to MemoryManager."]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "\"One more foundational piece before the demo: how agents talk to each other.",
        "",
        "They don't. No agent holds a reference to any other agent. Every agent reads typed keys it expects and writes typed keys downstream agents expect — all through a single MemoryManager scoped to that workflow execution.",
        "",
        "This means agents are stateless, composable, and independently testable. It also means that when we're ready to scale, swapping the in-process memory for a Redis-backed implementation is a backend change — not an agent rewrite.",
        "",
        "Handing over to [Member B name] for the live demo now.\"",
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════════════════
      // PART 2 — MEMBER B
      // ═══════════════════════════════════════════════════════════════════
      heading1("PART 2 — Member B (Live Demo)"),
      para([bold("Features 1, 2, 3  ·  Time: 2:15 – 5:30  ·  Duration: ~3 min 15 sec", NAVY, 24)], 0, 120),

      tipBox([
        "You are screen-sharing your browser. Make sure the platform is running locally on localhost:3000 (or your live URL) before recording starts.",
        "Speak while clicking — don't pause in silence while the UI loads. Use that time to explain what is happening.",
        "Keep your mouse movements deliberate and slow — quick darting movements confuse viewers.",
        "If a live API call takes more than 10 seconds, narrate: 'You can see the pipeline executing in real time — each agent logs its result as it completes.'",
      ]),

      new Paragraph({ children: [], ...sp(120, 0) }),

      // Demo Feature 1
      heading2("Feature 1 — Dynamic Planner Orchestration"),
      para([bold("⏱ 2:15 – 3:00  (45 seconds)", GRAY, 20)], 0, 60),
      actionBox([
        "Switch screen share ON — show the AgentOS platform dashboard/home page.",
        "Click 'Planner' in the left sidebar.",
        "Paste Prompt 1: 'Find Series B SaaS companies in USA to sell our DevOps tool' → click Plan.",
        "Point cursor at the 5 agent badges that light up: Research → Qualification → Persona → Contact → Summary.",
        "Clear the input.",
        "Paste Prompt 2: 'Analyze Vercel's market positioning and write an executive brief' → click Plan.",
        "Point cursor at only Research + Summary — the 3 middle agents are greyed out / skipped.",
      ]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "\"Watch what happens when I type two completely different prompts.",
        "",
        "First: 'Find Series B SaaS companies in USA to sell our DevOps tool.' I hit Plan.",
        "",
        "[PAUSE — let it render] The Planner has classified this as Sales Outreach intent and selected all five agents: Research, Qualification, Persona, Contact, and Summary. Full pipeline.",
        "",
        "Now I clear that and type: 'Analyze Vercel's market positioning and write an executive brief.' Hit Plan.",
        "",
        "[PAUSE] Now only Research and Summary are selected. Qualification, Persona, and Contact are skipped — because there is no sales target, no ICP scoring needed, no contact enrichment required.",
        "",
        "Same platform. Same agents. Same planner. The topology was computed fresh from the prompt — no template was selected, no if-else was written. This is what we mean by a capability ceiling set by agent count, not engineer effort.\"",
      ]),
      new Paragraph({ children: [], ...sp(80, 0) }),

      // Demo Feature 2
      heading2("Feature 2 — Live Workflow with Tavily + Gemini"),
      para([bold("⏱ 3:00 – 4:30  (90 seconds)", GRAY, 20)], 0, 60),
      actionBox([
        "Click 'Start New Workflow' or navigate to the workflow creation page.",
        "Paste prompt: 'Search for cybersecurity companies in Europe using AWS and hiring for a VP of Engineering'",
        "Click 'Generate Workflow' / 'Run'.",
        "Show the pipeline stepper animating: Research → Qualification → Persona → Contact → Summary.",
        "Point to the live terminal/log stream on the right — show actual API calls firing.",
        "When complete, click into the Summary report — show company name, ICP score, decision-maker, verified email.",
      ]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "\"Now let's run an actual workflow end to end with live data.",
        "",
        "I'm entering the prompt: 'Search for cybersecurity companies in Europe using AWS and hiring for a VP of Engineering.'",
        "",
        "I hit Generate Workflow. Watch the stepper on the left — the Research Agent is now executing live Tavily web searches. No stale SQLite database. No cached lists from 2023. Real-time queries.",
        "",
        "[While loading] You can see each agent logging its result as it completes. The Research Agent writes a list of matching companies to shared memory. The Qualification Agent reads that list, scores each company against our ICP — AWS tech stack, headcount, funding stage — and writes back qualified companies with tier scores.",
        "",
        "[As Persona fires] Now the Persona Agent is reading the qualified companies and identifying the right decision-maker at each one — VP of Engineering because headcount is above 50.",
        "",
        "[As Contact fires] The Contact Agent is calling Hunter.io live to retrieve verified work email addresses.",
        "",
        "[On completion] And here is the output. One enriched, scored, ready-to-contact prospect record. Company, ICP score with rationale, decision-maker name and LinkedIn confirmation, verified email with confidence score, and a recommended next action.",
        "",
        "From prompt to actionable lead in under 90 seconds. No stale data was touched.\"",
      ]),
      new Paragraph({ children: [], ...sp(80, 0) }),

      // Demo Feature 3
      heading2("Feature 3 — Human-in-the-Loop Refinement"),
      para([bold("⏱ 4:30 – 5:30  (60 seconds)", GRAY, 20)], 0, 60),
      actionBox([
        "Navigate to the HITL / Recommendations page — or scroll down to the bottom of the workflow output.",
        "Point out a company in the results that has fewer than 50 employees.",
        "Find the Human Feedback input box.",
        "Type: 'We only want companies having employees more than 50. Re-run research.'",
        "Click 'Submit Feedback'.",
        "Show the stepper spinning back and re-ranking — under-scale companies are disqualified.",
        "Show the updated list with only companies above 50 employees remaining.",
      ]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "\"AI is powerful, but it needs human judgment in the loop. Here is our third feature: Human-in-the-Loop Refinement.",
        "",
        "I can see in our results that one company — let's say Moss — is a good keyword match but has only 5 employees. That is too small for our sales motion.",
        "",
        "I type feedback directly into the platform: 'We only want companies having employees more than 50. Re-run research.' And I submit.",
        "",
        "[PAUSE] Watch what happens. The platform propagates this constraint back through the shared memory context — it doesn't restart from scratch, it re-ranks and re-filters using the updated criteria.",
        "",
        "No state is lost. The four upstream agents' work is preserved. Only the disqualified records are removed. The summary regenerates with the refined set.",
        "",
        "This is what we mean by a structural Human-in-the-Loop gate — not a checkbox, but an interactive refinement loop that preserves context and avoids redundant API calls.",
        "",
        "Handing over to [Member C name] for the architecture walkthrough.\"",
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════════════════
      // PART 3 — MEMBER C
      // ═══════════════════════════════════════════════════════════════════
      heading1("PART 3 — Member C (PPT Presenter)"),
      para([bold("Slides 6–10  ·  Time: 5:30 – 8:30  ·  Duration: ~3 min 0 sec", NAVY, 24)], 0, 120),

      tipBox([
        "You are back on camera with slides. Member B has stopped screen-sharing.",
        "These slides are more technical — speak with confidence and authority. You built this.",
        "Don't read the slides word-for-word. The diagrams speak; you narrate the logic behind them.",
      ]),

      new Paragraph({ children: [], ...sp(120, 0) }),

      // Slide 6
      slideTag(6, "System Architecture Diagram"),
      new Paragraph({ children: [], ...sp(80, 0) }),
      para([bold("⏱ 5:30 – 6:00  (30 seconds)", GRAY, 20)], 0, 60),
      actionBox(["Advance to Slide 6 — the full system architecture diagram with 9 layers."]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "\"Let me walk you through the architecture. Every boundary you see in this diagram exists to prevent a specific category of coupling — not because it was the obvious way to build it, but because we named what problem each boundary solves.",
        "",
        "Read the right column as: 'the coupling this layer prevents.' Every boundary is named, not implied.",
        "",
        "The diagram flows top to bottom: the user hits the React SPA, which talks to a single FastAPI ingress point, which routes to the Planner, which returns a validated plan to the Workflow Engine, which dispatches the five stateless agents in order. All agent communication passes through the MemoryManager. All persistence goes through the Repository pattern to SQLite — which is on a clear migration path to Redis and Postgres when load requires it.\"",
      ]),
      new Paragraph({ children: [], ...sp(80, 0) }),

      // Slide 7
      slideTag(7, "9-Layer System Architecture Table"),
      new Paragraph({ children: [], ...sp(80, 0) }),
      para([bold("⏱ 6:00 – 6:30  (30 seconds)", GRAY, 20)], 0, 60),
      actionBox(["Advance to Slide 7 — the detailed 9-layer table."]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "\"Nine layers. Let me highlight the four that matter most for the evaluation criteria.",
        "",
        "Layer 3 — the Planner: planning strategy is fully decoupled from agent code. You can swap the model, fine-tune a dedicated planner, or change the schema — and not one agent needs to change.",
        "",
        "Layer 4 — Orchestration: sole writer of workflow lifecycle state. No two components can produce inconsistent status — there is one source of truth.",
        "",
        "Layer 5 — Agent: five stateless BaseAgent implementations. Stateless means no cross-workflow contamination, and it means horizontal scaling is trivially available when we need it.",
        "",
        "Layer 9 — AI Client: a single abstraction wraps every model call. Switching from Gemini to GPT-4o or Claude is a config change, not a rewrite.\"",
      ]),
      new Paragraph({ children: [], ...sp(80, 0) }),

      // Slide 8
      slideTag(8, "Extensibility — The Falsifiable Claim"),
      new Paragraph({ children: [], ...sp(80, 0) }),
      para([bold("⏱ 6:30 – 7:15  (45 seconds)", GRAY, 20)], 0, 60),
      actionBox(["Advance to Slide 8 — 'Extensibility: the falsifiable claim' table showing one new file, zero changes elsewhere."]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "\"Here is the slide I'm most proud of, because it is falsifiable. You can test it.",
        "",
        "Adding a Finance Agent to this platform requires exactly one new file: agents/finance_agent.py. It implements the BaseAgent interface and registers with the AgentRegistry.",
        "",
        "What changes elsewhere? Look at the table. The Planner: no change — it discovers the new agent on its next registry manifest read. The Workflow Engine: no change. The Memory Manager: no change. All five existing agents: no change.",
        "",
        "A News Agent, a CRM Write Agent, a Pricing Agent, an Email Draft Agent — all follow the identical integration shape.",
        "",
        "We are not claiming extensibility. We are demonstrating it with a specific, testable mechanism. If that ever changes — if adding an agent ever requires touching the orchestrator — the architecture has failed, not as a maintenance task, but as a falsified hypothesis.\"",
      ]),
      new Paragraph({ children: [], ...sp(80, 0) }),

      // Slide 9
      slideTag(9, "Business Use Case — B2B SaaS Sales"),
      new Paragraph({ children: [], ...sp(80, 0) }),
      para([bold("⏱ 7:15 – 8:15  (60 seconds)", GRAY, 20)], 0, 60),
      actionBox(["Advance to Slide 9 — the business use case slide with ICP, Persona matching logic, and the live enrichment output card."]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "\"The business case we built this platform around: B2B SaaS sales into mid-market companies.",
        "",
        "Our Ideal Customer Profile: B2B SaaS companies, Series A to C funding, 50 to 500 employees, cloud-native on AWS or GCP, with an active VP of Engineering hiring signal.",
        "",
        "The persona matching logic is context-sensitive — not a static lookup. Under 50 employees, we target the CTO directly. 50 to 200, we target VP Engineering. Over 200, we target Director of DevOps. The agent dynamically selects the right decision-maker based on company size — and adjusts if that role is not found.",
        "",
        "And here is the output from a live run: Signify Health — Series B, AWS-native, 180 employees, ICP score A-Tier at 87 out of 100. The rationale: hiring three engineering roles, AWS confirmed in the job description. Decision-maker: James Okafor, VP Engineering, LinkedIn confirmed. Verified contact: j.okafor@signifyhealth.com, Hunter.io confidence 94%. Recommended next action: warm intro via a mutual connection at AWS re:Invent 2025.",
        "",
        "This record was generated in 90 seconds from a natural-language prompt. No manual research. No stale database. No guessing.\"",
      ]),
      new Paragraph({ children: [], ...sp(80, 0) }),

      // Slide 10
      slideTag(10, "Closing — The Falsifiable Claim + GitHub"),
      new Paragraph({ children: [], ...sp(80, 0) }),
      para([bold("⏱ 8:15 – 8:30  (15 seconds)", GRAY, 20)], 0, 60),
      actionBox(["Advance to Slide 10 — the closing card with the AgentOS logo, falsifiable claim quote, and GitHub link."]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "\"AgentOS: dynamic planning, shared memory, live enrichment, and structural human-in-the-loop control.",
        "",
        "The falsifiable claim we leave you with: 'Adding a sixth agent requires exactly one file. If that ever changes, the architecture has failed — not as a maintenance task, but as a falsified hypothesis.'",
        "",
        "We just proved it live. The code is fully open on GitHub. Handing back to all three of us for the wrap-up.\"",
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════════════════
      // PART 4 — ALL THREE MEMBERS
      // ═══════════════════════════════════════════════════════════════════
      heading1("PART 4 — All Three Members"),
      para([bold("Wrap-Up + GitHub  ·  Time: 8:30 – 9:00  ·  Duration: ~30 seconds", NAVY, 24)], 0, 120),

      tipBox([
        "All three members appear on camera together for the final 30 seconds.",
        "Member A speaks first, Member B second, Member C third. Keep it tight — 10 seconds each.",
        "End with energy. The last moment is what judges remember.",
      ]),

      new Paragraph({ children: [], ...sp(120, 0) }),
      actionBox(["All three appear on camera. Show Slide 10 still in background.", "Member B opens the GitHub repo URL in a browser tab and shows it briefly.", "GitHub: github.com/Pranayadabbeta/agenticai-platform"]),
      new Paragraph({ children: [], ...sp(80, 0) }),
      speech([
        "[Member A]: \"AgentOS is a production-grade agentic platform — not a demo that only works on one prompt. Every feature you saw was live, every claim is testable in the open-source repo.\"",
        "",
        "[Member B]: \"The full source code, architecture docs, and setup instructions are at github.com/Pranayadabbeta/agenticai-platform. You can spin it up, add a new agent, and verify the extensibility claim yourself.\"",
        "",
        "[Member C]: \"Thank you, judges. We are Team AgentOS — built for the XLVentures.AI Hackathon, June 2026. We look forward to your questions.\"",
      ]),

      new Paragraph({ children: [new PageBreak()] }),

      // ═══════════════════════════════════════════════════════════════════
      // APPENDIX — Judge Questions
      // ═══════════════════════════════════════════════════════════════════
      heading1("Appendix — Likely Judge Questions & Answers"),

      para([bold("Prepare these in case of a live Q&A segment.", GRAY, 20)], 0, 120),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3600, 5760],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders: cellBorders, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 3600, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "Question", font: "Arial", size: 20, bold: true, color: WHITE })] })] }),
            new TableCell({ borders: cellBorders, shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 5760, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: "Answer", font: "Arial", size: 20, bold: true, color: WHITE })] })] }),
          ]}),
          ...[
            ["Why SQLite and not Postgres from day one?", "SQLite gives us zero operational overhead at MVP scale. The Repository pattern means swapping to Postgres requires zero agent changes — only the persistence layer changes. We pay operational costs when load requires it, not before."],
            ["How do you prevent the Planner from hallucinating an invalid agent name?", "The Planner's output is validated against a strict schema before the Workflow Engine acts. Agent names must be present in the live AgentRegistry — it's closed-set validation, not trust in model output."],
            ["What is the cost per workflow run?", "Approximately 3–5 model round-trips per workflow: one for the Planner, one per agent that requires inference. Shared memory means no agent repeats a lookup another already completed — token costs are minimized by design."],
            ["Can this handle multiple concurrent users?", "Today it is single-writer by design. The MemoryManager and WorkflowRepository are the bottleneck, both named explicitly in our Known Limitations section. The migration path: Redis-backed MemoryManager behind the same read/write interface — no agent rewrite required."],
            ["Why not use LangChain or AutoGen?", "Dependency inversion. Our agent boundary is defined by us, not by a framework's version upgrade. Every capability is traceable to our code. We evaluated both — both introduce coupling to the framework's orchestration model, which violates our governing constraint."],
            ["How would you add a Pricing Agent?", "Create agents/pricing_agent.py, implement BaseAgent, register with AgentRegistry. The Planner discovers it on the next manifest read. Zero changes anywhere else. We showed this exact mechanism on Slide 8."],
          ].map(([q, a]) => new TableRow({ children: [
            new TableCell({ borders: cellBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 3600, type: WidthType.DXA },
              shading: { fill: LGRAY, type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: q, font: "Arial", size: 20, bold: true, color: NAVY })] })] }),
            new TableCell({ borders: cellBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, width: { size: 5760, type: WidthType.DXA },
              children: [new Paragraph({ children: [new TextRun({ text: a, font: "Arial", size: 20, color: DARK })] })] }),
          ]})),
        ],
      }),

      new Paragraph({ children: [], ...sp(200, 0) }),
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 4 } },
        children: [new TextRun({ text: "End of Script — Good luck, Team AgentOS!", font: "Arial", size: 22, bold: true, color: NAVY })],
        alignment: AlignmentType.CENTER, ...sp(160, 0),
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("c:/Users/Dabbeta Sai Thripura/Downloads/Project/AgentOS_Demo_Script.docx", buffer);
  console.log("Done");
});
