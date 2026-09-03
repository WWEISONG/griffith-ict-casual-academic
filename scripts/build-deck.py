"""
Build the Head of School briefing deck.

Griffith's official template is not available as a file, so this uses Griffith's
brand red with restrained typography rather than imitating a template we do not
have. If the approved .potx is obtained from Marketing, the content here can be
pasted into it.

    python3 scripts/build-deck.py
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# --- palette ----------------------------------------------------------------
RED   = RGBColor(0xB6, 0x0A, 0x20)
INK   = RGBColor(0x19, 0x1C, 0x22)
SOFT  = RGBColor(0x4A, 0x4A, 0x52)
FAINT = RGBColor(0x7C, 0x7A, 0x80)
RULE  = RGBColor(0xDD, 0xDB, 0xD8)
WASH  = RGBColor(0xF7, 0xF6, 0xF5)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

# --- one type scale, used everywhere ----------------------------------------
FONT      = "Calibri"
T_HERO    = 42      # cover only
T_TITLE   = 30      # slide title
T_LEAD    = 20      # the one sentence that carries the slide
T_SUB     = 18      # card and row headings
T_BODY    = 14      # bullets, table cells, most text
T_META    = 11.5    # captions, eyebrows, attributions
T_BIG     = 26      # the occasional figure

W, H = Inches(13.333), Inches(7.5)
M    = Inches(0.85)
SHOT = "docs/tutor-program/screenshots/"

prs = Presentation()
prs.slide_width, prs.slide_height = W, H
BLANK = prs.slide_layouts[6]


def slide():
    return prs.slides.add_slide(BLANK)


def box(s, l, t, w, h):
    tf = s.shapes.add_textbox(l, t, w, h).text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    return tf


def para(tf, text, size, *, bold=False, color=INK, before=0, after=6,
         align=PP_ALIGN.LEFT, first=False, line=1.2):
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    p.text = text
    p.alignment = align
    p.space_before = Pt(before)
    p.space_after = Pt(after)
    p.line_spacing = line
    f = p.runs[0].font if p.runs else p.font
    f.name, f.size, f.bold, f.color.rgb = FONT, Pt(size), bold, color
    return p


def rect(s, l, t, w, h, fill=None, line=None):
    sh = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, l, t, w, h)
    if fill is None:
        sh.fill.background()
    else:
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
    if line:
        sh.line.color.rgb = line
        sh.line.width = Pt(0.75)
    else:
        sh.line.fill.background()
    sh.shadow.inherit = False
    return sh


def header(s, eyebrow, title):
    """Eyebrow, title, rule. Returns the y where content may start."""
    tf = box(s, M, Inches(0.6), W - 2 * M, Inches(0.3))
    para(tf, eyebrow.upper(), T_META, bold=True, color=RED, first=True, after=0)
    tf = box(s, M, Inches(0.97), W - 2 * M, Inches(0.62))
    para(tf, title, T_TITLE, bold=True, first=True, after=0)
    rect(s, M, Inches(1.68), Inches(1.1), Pt(2.5), RED)
    return Inches(2.0)


def picture(s, name, l, t, w):
    """Screenshot with a hairline frame, so it reads as a screen."""
    pic = s.shapes.add_picture(SHOT + name, l, t, width=w)
    rect(s, l, t, pic.width, pic.height, None, RULE)
    return pic


def notes(s, text):
    s.notes_slide.notes_text_frame.text = text


def bar_title(s, title, sub=None):
    """Full-bleed opener/closer."""
    rect(s, 0, 0, W, H, WHITE)
    rect(s, 0, 0, Inches(0.28), H, RED)


# ============================================================ 1. Title
s = slide()
bar_title(s, None)
tf = box(s, Inches(1.3), Inches(2.1), Inches(10.4), Inches(0.4))
para(tf, "SCHOOL OF INFORMATION AND COMMUNICATION TECHNOLOGY", T_META,
     bold=True, color=RED, first=True, after=0)
tf = box(s, Inches(1.3), Inches(2.62), Inches(10.6), Inches(1.9))
para(tf, "Preparing the people who teach", T_HERO, bold=True, first=True, after=12, line=1.05)
para(tf, "A Casual Academic Management System, and the training to go with it",
     T_LEAD, color=SOFT, after=0, line=1.25)
rect(s, Inches(1.3), Inches(4.75), Inches(1.4), Pt(2.5), RED)
tf = box(s, Inches(1.3), Inches(5.12), Inches(10.4), Inches(1.0))
para(tf, "Wei Song", T_SUB, bold=True, first=True, after=3)
para(tf, "Proposal to the Head of School  ·  September 2026", T_META, color=FAINT, after=0)
notes(s, "Two halves. A system that makes tutors findable — built, deployed, and I can "
         "demonstrate it today. And a training program, which is what I am asking the "
         "School to endorse.")

# ============================================================ 2. The problem
s = slide()
y = header(s, "The problem", "We appoint tutors every trimester. We prepare none of them.")
tf = box(s, M, y, Inches(11.3), Inches(1.6))
para(tf, "A new tutor's readiness depends entirely on which convenor hired them.",
     T_LEAD, first=True, after=14, line=1.3)
para(tf, "Some get a thorough handover. Some are told the room number.",
     T_BODY, color=SOFT, after=0, line=1.3)

cards = [("187", "courses in the School"),
         ("Every trimester", "we appoint casual academics"),
         ("No standard", "for teaching preparation")]
cw, gap = Inches(3.53), Inches(0.28)
for i, (big, small) in enumerate(cards):
    x = M + i * (cw + gap)
    rect(s, x, Inches(4.6), cw, Inches(1.5), WASH, RULE)
    tf = box(s, x + Inches(0.3), Inches(4.85), cw - Inches(0.6), Inches(1.05))
    para(tf, big, T_BIG, bold=True, color=RED, first=True, after=3)
    para(tf, small, T_BODY, color=SOFT, after=0, line=1.2)
notes(s, "This is not a criticism of convenors. There is nothing for them to hand over "
         "to — no shared model, no materials, no record of who has taught what.")

# ============================================================ 3. The gap
s = slide()
y = header(s, "What Griffith already provides", "Thorough compliance. No teaching preparation.")
rows = [("Mandatory onboarding", "WHS, integrity, privacy, equity"),
        ("Casual Staff Time Recording", "Timesheets and payment"),
        ("How to engage sessional staff", "Guidance for the hiring academic"),
        ("Tutoring for Success", "A different program, a different cohort")]
colw = [Inches(4.2), Inches(4.4), Inches(2.75)]
rect(s, M, y, sum(colw, Emu(0)), Inches(0.44), RED)
cx = M
for i, htxt in enumerate(["Provision", "What it covers", "Teaching?"]):
    tf = box(s, cx + Inches(0.22), y + Inches(0.11), colw[i] - Inches(0.34), Inches(0.3))
    para(tf, htxt, T_BODY, bold=True, color=WHITE, first=True, after=0)
    cx += colw[i]
ry = y + Inches(0.44)
for r, (a, b) in enumerate(rows):
    rect(s, M, ry, sum(colw, Emu(0)), Inches(0.66), WHITE if r % 2 else WASH, RULE)
    cx = M
    for i, txt in enumerate((a, b, "No")):
        tf = box(s, cx + Inches(0.22), ry + Inches(0.16), colw[i] - Inches(0.34), Inches(0.4))
        para(tf, txt, T_BODY, bold=(i == 0),
             color=INK if i == 0 else (RED if i == 2 else SOFT), first=True, after=0)
        cx += colw[i]
    ry += Inches(0.66)
tf = box(s, M, ry + Inches(0.42), Inches(11.3), Inches(1.1))
para(tf, "Compliance and payroll, done well. Nothing that prepares somebody to teach.",
     T_LEAD, bold=True, first=True, after=10, line=1.25)
para(tf, "That gap sits at School level: how a computing lab runs is not something a "
         "central program can cover.", T_BODY, color=SOFT, after=0, line=1.3)
notes(s, "Checked against public Griffith sources. The written proposal notes we should "
         "confirm with the School Manager that nothing internal already exists — if it "
         "does, we adopt it rather than duplicate it.")

# ============================================================ 4. The cycle
s = slide()
y = header(s, "The proposal", "One cycle, every trimester, with a named owner")
steps = [("1", "Invite", "Convenors invite\nstudents who did well", "Convenor"),
         ("2", "Apply", "One standing application:\nexperience, ranked courses", "Candidate"),
         ("3", "Select", "Search by course.\nContact directly", "Convenor"),
         ("4", "Prepare", "Week 0 workshop\nThree hours", "Coordinator"),
         ("5", "Teach", "Shared tutorial model.\nWeek 3 check-in", "Convenor")]
cw = Inches(2.2)
gap = Inches(0.18)
x0 = (W - (5 * cw + 4 * gap)) / 2
for i, (n, title, bodytxt, owner) in enumerate(steps):
    x = x0 + i * (cw + gap)
    hi = (i == 3)
    rect(s, x, y, cw, Inches(2.7), RED if hi else WASH, None if hi else RULE)
    tf = box(s, x + Inches(0.24), y + Inches(0.22), cw - Inches(0.48), Inches(0.32))
    para(tf, n, T_META, bold=True, color=WHITE if hi else RED, first=True, after=5)
    tf = box(s, x + Inches(0.24), y + Inches(0.62), cw - Inches(0.48), Inches(0.36))
    para(tf, title, T_SUB, bold=True, color=WHITE if hi else INK, first=True, after=6)
    tf = box(s, x + Inches(0.24), y + Inches(1.08), cw - Inches(0.48), Inches(1.0))
    lines = bodytxt.split("\n")
    for ln in lines:
        para(tf, ln, T_META, color=WHITE if hi else SOFT,
             first=(ln == lines[0]), after=2, line=1.2)
    tf = box(s, x + Inches(0.24), y + Inches(2.2), cw - Inches(0.48), Inches(0.3))
    para(tf, owner.upper(), 10.5, bold=True, color=WHITE if hi else FAINT, first=True, after=0)
    if i < 4:
        ar = box(s, x + cw, y + Inches(1.15), gap, Inches(0.3))
        para(ar, "›", T_LEAD, bold=True, color=FAINT, first=True,
             align=PP_ALIGN.CENTER, after=0)
tf = box(s, M, y + Inches(3.15), Inches(11.3), Inches(1.0))
para(tf, "Step 4 is the new part. The rest already happens — just not consistently, "
         "and nowhere on record.", T_LEAD, first=True, after=0, line=1.3)
notes(s, "Two things change. Strong students are asked, rather than left to find out by "
         "knowing somebody. And training becomes a School standard, not a convenor's "
         "discretion.")

# ============================================================ 5. The system
s = slide()
y = header(s, "Half of it already exists", "The Casual Academic Management System")
tf = box(s, M, y, Inches(11.3), Inches(0.8))
para(tf, "One place where senior students put themselves forward, and convenors find "
         "out who can teach their course.", T_LEAD, first=True, after=0, line=1.3)
picture(s, "00-entrance-candidate.png", Inches(1.4), y + Inches(0.95), Inches(5.0))
picture(s, "01-entrance-staff.png", Inches(6.95), y + Inches(0.95), Inches(5.0))
tf = box(s, Inches(1.4), y + Inches(4.1), Inches(5.0), Inches(0.35))
para(tf, "Candidates have their own link", T_META, bold=True, color=SOFT,
     first=True, align=PP_ALIGN.CENTER, after=0)
tf = box(s, Inches(6.95), y + Inches(4.1), Inches(5.0), Inches(0.35))
para(tf, "Convenors have theirs", T_META, bold=True, color=SOFT,
     first=True, align=PP_ALIGN.CENTER, after=0)
notes(s, "Built already, at no cost to the School, and deployed. Two links: one goes to "
         "students, one to staff. Each audience sees only what applies to them.")

# ============================================================ 6-9. The views
views = [
    ("The candidate", "One page, one form", "10-candidate.png",
     ["Everything on one page",
      "Teaching experience, ranked course choices, a statement",
      "Always open — no round to wait for"],
     "Students have exactly one job here, so they get exactly one page and no navigation."),
    ("The convenor", "Every candidate, searchable by course", "11-convenor.png",
     ["Everyone registered — not only this trimester's applicants",
      "Two columns: what they have taught, what they applied for",
      "Filter by a course; those who have taught it come first"],
     "This is the page that addresses the real problem. Convenors do not struggle to run "
     "a selection process — they struggle to find out who is available at all. Note the "
     "people who have taught a course but did not apply this time; they were invisible "
     "before."),
    ("One candidate", "Everything known, in one place", "21-convenor-detail.png",
     ["Full teaching history, by course and trimester",
      "Their applied courses, in their own ranked order",
      "Their statement, contact details, availability"],
     "No approval workflow and no shortlisting buttons. The system informs the convenor; "
     "the decision and the conversation stay theirs."),
    ("The administrator", "The School-wide picture", "12-admin.png",
     ["Every candidate, across all 187 courses",
      "Create and manage convenor accounts",
      "Export to CSV for the School office"],
     "As Coordinator, this is where I would identify first-time tutors for the Week 0 "
     "workshop — derived from the records rather than by asking around."),
]
for title, sub, img, bullets, note in views:
    s = slide()
    y = header(s, title, sub)
    picture(s, img, M, y, Inches(8.0))
    bx = M + Inches(8.35)
    bw = W - bx - M
    for i, b in enumerate(bullets):
        ty = y + Inches(0.15) + i * Inches(1.15)
        rect(s, bx, ty, Pt(3), Inches(0.7), RED)
        tf = box(s, bx + Inches(0.2), ty - Inches(0.04), bw - Inches(0.2), Inches(1.0))
        para(tf, b, T_BODY, color=SOFT, first=True, after=0, line=1.3)
    notes(s, note)

# ============================================================ 10. Workshop
s = slide()
y = header(s, "The missing half", "Week 0 workshop — three hours, before teaching starts")
seg = [("What a tutor does", "Not a second lecturer. Find out what students did not understand."),
       ("The tutorial model", "Review · supported practice · consolidation. Draft your own first session."),
       ("Micro-teaching", "Deliver a five-minute concept review to a peer."),
       ("Helping without answering", "Hands off the keyboard. Ask before you tell."),
       ("Marking consistently", "Everyone marks the same submission. Compare the spread."),
       ("Conduct and escalation", "Boundaries, integrity, students in difficulty."),
       ("Senior tutor panel", "The most credible voice in the room.")]
ty = y
for i, (h2, sub2) in enumerate(seg):
    hi = i in (1, 3)
    rect(s, M, ty, Inches(0.3), Inches(0.3), RED if hi else RULE)
    tf = box(s, M + Inches(0.5), ty - Inches(0.04), Inches(10.6), Inches(0.5))
    para(tf, h2, T_SUB, bold=True, first=True, after=1)
    para(tf, sub2, T_META, color=SOFT, after=0, line=1.15)
    ty += Inches(0.6)
tf = box(s, M, ty + Inches(0.25), Inches(11.3), Inches(0.7))
para(tf, "Half the time is spent doing, not listening.", T_LEAD, bold=True,
     color=RED, first=True, after=0, line=1.25)
notes(s, "Deliberately not compliance training — Griffith does that already and repeating "
         "it would waste the only three hours the School gets. Not course-specific "
         "either; convenors brief their own tutors. This is what is common to all.")

# ============================================================ 11. Evaluation
s = slide()
y = header(s, "How we would know", "Measures chosen so a failed pilot shows up as failed")
cards = [("Coverage", "90% of first-time tutors trained before teaching"),
         ("Convenor judgement", "Better prepared than previous trimesters?\nThis decides continuation."),
         ("Participant judgement", "Prepared to run my first tutorial: 4.0 / 5"),
         ("Retention", "60% of tutors return the following trimester")]
cw2, gap2 = Inches(5.55), Inches(0.32)
for i, (t, b) in enumerate(cards):
    x = M + (i % 2) * (cw2 + gap2)
    ty = y + (i // 2) * Inches(1.5)
    rect(s, x, ty, cw2, Inches(1.28), WASH, RULE)
    rect(s, x, ty, Pt(3), Inches(1.28), RED)
    tf = box(s, x + Inches(0.32), ty + Inches(0.2), cw2 - Inches(0.64), Inches(0.95))
    para(tf, t, T_SUB, bold=True, first=True, after=5)
    for ln in b.split("\n"):
        para(tf, ln, T_BODY, color=SOFT, after=2, line=1.2)
rect(s, M, y + Inches(3.2), Inches(11.42), Inches(1.35), WHITE, RED)
tf = box(s, M + Inches(0.35), y + Inches(3.4), Inches(10.7), Inches(1.0))
para(tf, "What would count as failure", T_BODY, bold=True, color=RED, first=True, after=8)
para(tf, "Convenors bypass the system  ·  No difference in preparedness  ·  "
         "Tutors do not attend  ·  It cannot run without me",
     T_BODY, after=0, line=1.3)
notes(s, "A program that cannot fail its own evaluation is not being evaluated. The last "
         "one matters most: if it depends on one person it is a hobby with a budget, not "
         "a School process.")

# ============================================================ 12. The ask
s = slide()
y = header(s, "What I am asking for", "Four decisions")
asks = [("Endorse the cycle", "Adopt the trimester process as School practice"),
        ("Endorse the expectation", "First-time tutors attend Week 0 before teaching"),
        ("Confirm the owner", "Casual Academic Coordinator — proposed: Wei Song"),
        ("Agree a pilot", "Run it once, review, then decide")]
ty = y
for i, (t, b) in enumerate(asks):
    rect(s, M, ty, Inches(11.42), Inches(0.92), WASH, RULE)
    tf = box(s, M + Inches(0.34), ty + Inches(0.22), Inches(0.5), Inches(0.5))
    para(tf, str(i + 1), T_BIG, bold=True, color=RED, first=True, after=0)
    tf = box(s, M + Inches(1.0), ty + Inches(0.17), Inches(10.0), Inches(0.66))
    para(tf, t, T_SUB, bold=True, first=True, after=2)
    para(tf, b, T_BODY, color=SOFT, after=0)
    ty += Inches(1.04)
tf = box(s, M, ty + Inches(0.28), Inches(11.42), Inches(0.8))
para(tf, "The system is built. The materials are written. What is needed is one "
         "trimester to try it.", T_LEAD, bold=True, first=True, after=0, line=1.3)
notes(s, "The pilot framing is deliberate. I am not asking for a permanent commitment to "
         "something untested — one trimester, against criteria agreed in advance.")

# ============================================================ 13. Try it
s = slide()
y = header(s, "Try it now", "It is live. Please open it during or after this meeting.")

cw3, gap3 = Inches(5.55), Inches(0.32)
rect(s, M, y, cw3, Inches(1.9), WASH, RULE)
tf = box(s, M + Inches(0.35), y + Inches(0.28), cw3 - Inches(0.7), Inches(1.4))
para(tf, "Links", T_BODY, bold=True, color=RED, first=True, after=8)
para(tf, "Candidates", T_META, color=FAINT, after=2)
para(tf, "wweisong.github.io/griffith-ict-casual-academic", T_BODY, bold=True, after=8)
para(tf, "Convenors", T_META, color=FAINT, after=2)
para(tf, ".../griffith-ict-casual-academic/#/staff", T_BODY, bold=True, after=0)

rx = M + cw3 + gap3
rect(s, rx, y, cw3, Inches(1.9), WHITE, RED)
tf = box(s, rx + Inches(0.35), y + Inches(0.28), cw3 - Inches(0.7), Inches(1.4))
para(tf, "Accounts for this demonstration", T_BODY, bold=True, color=RED, first=True, after=8)
para(tf, "Candidate", T_META, color=FAINT, after=2)
para(tf, "sample.liam.chen@griffithuni.edu.au", T_BODY, bold=True, after=8)
para(tf, "Convenor", T_META, color=FAINT, after=2)
para(tf, "sample.convenor@griffith.edu.au", T_BODY, bold=True, after=6)
para(tf, "Password for both:  SamplePortal#2027", T_BODY, bold=True, color=RED, after=0)

picture(s, "22-admin-detail.png", Inches(4.35), y + Inches(2.15), Inches(4.65))
tf = box(s, M, y + Inches(5.15), Inches(11.42), Inches(0.35))
para(tf, "The candidates shown are sample records, not real students.", T_META,
     bold=True, color=SOFT, first=True, align=PP_ALIGN.CENTER, after=0)
notes(s, "Please do open it — the convenor account shows the page that matters most. "
         "Administrator access on request. Proposal, process, workshop run sheet and "
         "code of conduct are all at github.com/WWEISONG/griffith-ict-casual-academic")

# ============================================================ 14. Close
s = slide()
bar_title(s, None)
tf = box(s, Inches(1.3), Inches(2.6), Inches(10.6), Inches(2.0))
para(tf, "Students remember their tutors.", T_HERO, bold=True, first=True, after=16, line=1.1)
para(tf, "They are the staff our students see most, and the only ones we have never "
         "prepared.", T_LEAD, color=SOFT, after=0, line=1.35)
rect(s, Inches(1.3), Inches(4.9), Inches(1.4), Pt(2.5), RED)
tf = box(s, Inches(1.3), Inches(5.28), Inches(10.4), Inches(0.9))
para(tf, "Wei Song  ·  w.song@griffith.edu.au", T_BODY, bold=True, first=True, after=4)
para(tf, "github.com/WWEISONG/griffith-ict-casual-academic", T_META, color=FAINT, after=0)
notes(s, "Everything is written up in the repository — the gap analysis with sources, "
         "the full process, the workshop run sheet, the code of conduct and the "
         "evaluation plan.")

out = "docs/tutor-program/HoS-briefing.pptx"
prs.save(out)
print(f"{out}  ·  {len(prs.slides._sldIdLst)} slides")
