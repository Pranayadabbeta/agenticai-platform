from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
import io, json
from datetime import datetime

BLUE = HexColor("#2563EB")
DARK = HexColor("#1C1917")
GRAY = HexColor("#78716C")
LIGHT_BLUE = HexColor("#EFF6FF")
GREEN = HexColor("#16A34A")
AMBER = HexColor("#D97706")
RED = HexColor("#DC2626")
BG = HexColor("#F8FAFC")

def generate_prospect_pdf(workflow_data: dict, agent_results: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle("Title", fontSize=22, textColor=DARK,
        fontName="Helvetica-Bold", spaceAfter=4)
    subtitle_style = ParagraphStyle("Subtitle", fontSize=11, textColor=GRAY,
        fontName="Helvetica", spaceAfter=20)
    h2_style = ParagraphStyle("H2", fontSize=13, textColor=BLUE,
        fontName="Helvetica-Bold", spaceBefore=16, spaceAfter=8)
    body_style = ParagraphStyle("Body", fontSize=10, textColor=DARK,
        fontName="Helvetica", spaceAfter=6, leading=16)
    small_style = ParagraphStyle("Small", fontSize=9, textColor=GRAY,
        fontName="Helvetica", spaceAfter=4)
    bold_style = ParagraphStyle("Bold", fontSize=10, textColor=DARK,
        fontName="Helvetica-Bold", spaceAfter=4)

    summary = agent_results.get("summary", {}).get("payload", {})
    qualification = agent_results.get("qualification", {}).get("payload", {})
    persona = agent_results.get("persona", {}).get("payload", {})
    contact = agent_results.get("contact", {}).get("payload", {})
    research = agent_results.get("research", {}).get("payload", {})

    top_lead = qualification.get("top_lead") or {}
    score = summary.get("confidence") or top_lead.get("lead_score") or 0
    company = summary.get("priority_target") or top_lead.get("company_name") or "Unknown"
    strength = summary.get("recommendation_strength") or "Buy"
    persona_data = persona.get("persona") or {}
    role = persona_data.get("role") or "CTO"
    email = contact.get("email") or "Not found"
    phone = contact.get("phone") or "Not found"
    linkedin = contact.get("linkedin_url") or ""
    evidence = summary.get("evidence") or top_lead.get("evidence") or []
    exec_summary = summary.get("executive_summary") or ""
    next_action = summary.get("next_action") or ""
    risk_factors = summary.get("risk_factors") or []
    companies_found = research.get("companies_found") or 0

    score_color = GREEN if score >= 80 else AMBER if score >= 60 else RED
    strength_color = GREEN if strength in ["Strong Buy","Buy"] else AMBER if strength == "Hold" else RED

    elements = []

    # Header block
    header_data = [[
        Paragraph(f"<b>PROSPECT INTELLIGENCE BRIEF</b>", ParagraphStyle("H",fontSize=9,textColor=white,fontName="Helvetica-Bold")),
        Paragraph(f"Generated {datetime.now().strftime('%B %d, %Y %H:%M')}", ParagraphStyle("D",fontSize=9,textColor=HexColor('#93C5FD'),fontName="Helvetica",alignment=TA_RIGHT))
    ]]
    header_table = Table(header_data, colWidths=[10*cm, 7*cm])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), BLUE),
        ("PADDING", (0,0), (-1,-1), 10),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 0.5*cm))

    # Company name + score
    score_label = f"{score}/100"
    kpi_data = [[
        Paragraph(f"<b>{company}</b>", ParagraphStyle("CN",fontSize=20,textColor=DARK,fontName="Helvetica-Bold", leading=24)),
        Paragraph(f"<b>{score_label}</b>", ParagraphStyle("SC",fontSize=20,textColor=score_color,fontName="Helvetica-Bold",alignment=TA_RIGHT, leading=24)),
    ]]
    kpi_table = Table(kpi_data, colWidths=[12*cm, 5*cm])
    kpi_table.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"BOTTOM"),("PADDING",(0,0),(-1,-1),4)]))
    elements.append(kpi_table)
    elements.append(Paragraph("ICP Match Score", small_style))
    elements.append(HRFlowable(width="100%", thickness=1, color=HexColor("#E5E7EB")))
    elements.append(Spacer(1, 0.3*cm))

    # Recommendation badge
    rec_data = [[
        Paragraph(f"<b>RECOMMENDATION: {strength.upper()}</b>", ParagraphStyle("R",fontSize=11,textColor=white,fontName="Helvetica-Bold",alignment=TA_CENTER))
    ]]
    rec_table = Table(rec_data, colWidths=[17*cm])
    rec_table.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),strength_color),
        ("PADDING",(0,0),(-1,-1),8),
        ("ROUNDEDCORNERS",[4,4,4,4]),
    ]))
    elements.append(rec_table)
    elements.append(Spacer(1, 0.4*cm))

    # Executive Summary
    if exec_summary:
        elements.append(Paragraph("EXECUTIVE SUMMARY", h2_style))
        elements.append(Paragraph(exec_summary, body_style))

    # Key Metrics row
    metrics = [
        ["Companies Analyzed", str(companies_found)],
        ["Qualified Leads", str(len(qualification.get("qualified_leads",[])))],
        ["Target Tier", top_lead.get("tier","Strategic")],
        ["Sources Used", ", ".join(research.get("sources",["SQLite"])[:2])],
    ]
    elements.append(Paragraph("KEY METRICS", h2_style))
    metrics_data = [[Paragraph(f"<b>{m[0]}</b>",bold_style), Paragraph(m[1],body_style)] for m in metrics]
    metrics_table = Table(metrics_data, colWidths=[6*cm, 11*cm])
    metrics_table.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(0,-1),LIGHT_BLUE),
        ("PADDING",(0,0),(-1,-1),6),
        ("GRID",(0,0),(-1,-1),0.5,HexColor("#E5E7EB")),
    ]))
    elements.append(metrics_table)
    elements.append(Spacer(1, 0.3*cm))

    # Evidence
    if evidence:
        elements.append(Paragraph("QUALIFYING EVIDENCE", h2_style))
        for i, ev in enumerate(evidence[:6], 1):
            elements.append(Paragraph(f"<b>{i}.</b> {ev}", body_style))

    # Recommended Contact
    elements.append(Paragraph("RECOMMENDED CONTACT", h2_style))
    contact_data_table = [
        [Paragraph("<b>Role</b>", bold_style), Paragraph(role, body_style)],
        [Paragraph("<b>Seniority</b>", bold_style), Paragraph(persona_data.get("seniority","C-Suite"), body_style)],
        [Paragraph("<b>Email</b>", bold_style), Paragraph(email, body_style)],
        [Paragraph("<b>Phone</b>", bold_style), Paragraph(phone, body_style)],
        [Paragraph("<b>LinkedIn</b>", bold_style), Paragraph(linkedin, body_style)],
        [Paragraph("<b>Verified</b>", bold_style), Paragraph("Yes ✓" if contact.get("verified") else "No (generated)", body_style)],
    ]
    if persona_data.get("reasoning"):
        contact_data_table.append([
            Paragraph("<b>Why This Person</b>", bold_style),
            Paragraph(persona_data.get("reasoning",""), body_style)
        ])
    ct = Table(contact_data_table, colWidths=[4*cm, 13*cm])
    ct.setStyle(TableStyle([
        ("GRID",(0,0),(-1,-1),0.5,HexColor("#E5E7EB")),
        ("PADDING",(0,0),(-1,-1),6),
        ("BACKGROUND",(0,0),(0,-1),LIGHT_BLUE),
    ]))
    elements.append(ct)
    elements.append(Spacer(1, 0.3*cm))

    # Next Action
    if next_action:
        elements.append(Paragraph("RECOMMENDED NEXT ACTION", h2_style))
        action_data = [[Paragraph(f"<b>→</b> {next_action}", body_style)]]
        action_table = Table(action_data, colWidths=[17*cm])
        action_table.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1),LIGHT_BLUE),
            ("PADDING",(0,0),(-1,-1),12),
            ("LEFTPADDING",(0,0),(-1,-1),16),
        ]))
        elements.append(action_table)
        elements.append(Spacer(1, 0.3*cm))

    # Risk factors
    if risk_factors:
        elements.append(Paragraph("RISK FACTORS", h2_style))
        for r in risk_factors[:3]:
            elements.append(Paragraph(f"⚠ {r}", small_style))

    # Footer
    elements.append(Spacer(1, 0.5*cm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#E5E7EB")))
    elements.append(Spacer(1, 0.2*cm))
    elements.append(Paragraph(
        "Generated by AgentOS Prospect Intelligence Platform · Confidential · For Internal Use Only",
        ParagraphStyle("F",fontSize=8,textColor=GRAY,fontName="Helvetica",alignment=TA_CENTER)
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()
