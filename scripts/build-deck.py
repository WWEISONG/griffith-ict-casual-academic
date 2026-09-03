"""
Build the Head of School briefing deck.

Follows the layout and type conventions of the author's existing Griffith decks:
Arial throughout, a 32pt title at the top-left, a hairline rule beneath it, 17pt
body with square bullets, 10pt sources at the foot, and stat cards carrying a
narrow accent bar down their left edge.

    python3 scripts/build-deck.py
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
import math

# --- palette, taken from the author's existing decks -------------------------
INK    = RGBColor(0x11, 0x11, 0x11)
GREY   = RGBColor(0x59, 0x59, 0x59)
LIGHT  = RGBColor(0xA6, 0xA6, 0xA6)
RED    = RGBColor(0xC0, 0x00, 0x00)
BLUE   = RGBColor(0x08, 0x78, 0xB8)
GREEN  = RGBColor(0x2E, 0x7D, 0x32)
ORANGE = RGBColor(0xC8, 0x74, 0x13)
RULE   = RGBColor(0xD9, 0xD9, 0xD9)
WASH   = RGBColor(0xF5, 0xF5, 0xF5)
WHITE  = RGBColor(0xFF, 0xFF, 0xFF)

FONT   = "Arial"
T_TITLE = 32
T_LEAD  = 17
T_CARD  = 16
T_BODY  = 12.5
T_NOTE  = 10

# --- the grid ----------------------------------------------------------------
W, H     = Inches(13.333), Inches(7.5)
L        = Inches(0.38)          # left margin
CONTENT  = Inches(12.60)         # content width
RULE_Y   = Inches(1.04)          # hairline under the title
BODY_TOP = Inches(1.92)          # where content begins
FOOT_Y   = Inches(6.89)          # source line
RIGHT_X  = Inches(7.85)          # right-hand column
RIGHT_W  = Inches(5.10)

SHOT  = "docs/tutor-program/screenshots/"
LOGO  = "docs/tutor-program/assets/cap-logo.png"

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


def para(tf, text, size, *, bold=False, color=INK, after=6, before=0,
         align=PP_ALIGN.LEFT, first=False, line=1.15):
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    p.text = text
    p.alignment = align
    p.space_after = Pt(after)
    p.space_before = Pt(before)
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


def head(s, title, lead=None, lead_color=GREY):
    """Title, hairline rule, optional lead line. Returns y for content."""
    tf = box(s, L, Inches(0.08), Inches(9.9), Inches(0.95))
    para(tf, title, T_TITLE, bold=True, first=True, after=0, line=1.08)
    rect(s, 0, RULE_Y, W, Pt(1.1), RULE)
    s.shapes.add_picture(LOGO, Inches(12.55), Inches(0.26), height=Inches(0.62))
    if lead:
        tf = box(s, L, Inches(1.30), CONTENT, Inches(0.5))
        para(tf, lead, T_LEAD, color=lead_color, first=True, after=0, line=1.25)
        return BODY_TOP
    return Inches(1.45)


def bullets(tf, items, size=T_LEAD, color=INK, after=9):
    for i, t in enumerate(items):
        para(tf, "▪  " + t, size, color=color, first=(i == 0), after=after, line=1.25)


def foot(s, text):
    tf = box(s, L, FOOT_Y, Inches(9.0), Inches(0.3))
    para(tf, text, T_NOTE, color=LIGHT, first=True, after=0)


def card(s, l, t, w, h, accent, title, body):
    """The author's card: a wash panel with a narrow accent bar down its left."""
    rect(s, l, t, w, h, WASH)
    rect(s, l, t, Inches(0.07), h, accent)
    tf = box(s, l + Inches(0.25), t + Inches(0.14), w - Inches(0.45), h - Inches(0.28))
    para(tf, title, T_CARD, bold=True, first=True, after=4)
    para(tf, body, T_BODY, color=GREY, after=0, line=1.25)


def stat(s, t, figure, label, color=RED):
    tf = box(s, RIGHT_X, t, RIGHT_W, Inches(0.55))
    para(tf, figure, T_TITLE, bold=True, color=color, first=True, after=0, line=1.0)
    tf = box(s, RIGHT_X, t + Inches(0.52), RIGHT_W, Inches(0.75))
    para(tf, label, T_BODY, color=GREY, first=True, after=0, line=1.25)


def picture(s, name, l, t, w):
    pic = s.shapes.add_picture(SHOT + name, l, t, width=w)
    rect(s, l, t, pic.width, pic.height, None, RULE)
    return pic


def notes(s, text):
    """No-op: the author does not want speaker notes in this deck.

    Kept as a call site so the intent of each slide stays recorded next to it,
    and so notes can be reinstated by restoring one line.
    """
    return


# ============================================================ 1. Title
s = slide()
rect(s, 0, 0, W, H, WHITE)
s.shapes.add_picture(LOGO, Inches(0.38), Inches(1.55), height=Inches(0.95))
tf = box(s, Inches(0.38), Inches(2.80), Inches(11.5), Inches(1.6))
para(tf, "Preparing the People Who Teach", 31, bold=True, first=True, after=6, line=1.12)
para(tf, "A Casual Academic Management System, and the training to go with it",
     21, color=GREY, after=0, line=1.2)
rect(s, Inches(0.38), Inches(4.62), Inches(1.5), Pt(2.5), RED)
tf = box(s, Inches(0.38), Inches(5.00), Inches(11.5), Inches(1.0))
para(tf, "Wei Song  ·  School of Information and Communication Technology", 21,
     first=True, after=6)
para(tf, "Proposal to the Head of School  —  September 2026", 14, color=GREY, after=0)
notes(s, "Two halves. A tutor pool that makes candidates findable — built, deployed, "
         "and I can demonstrate it today. And the training that makes them ready, which "
         "is what I am asking the School to endorse.")

# ============================================================ 2. Why a pool
s = slide()
y = head(s, "Why the School Needs a Casual Academic Pool",
         "Convenors cannot staff a course well if they cannot see who is available.")

PW = Inches(6.02)
LX, RX2 = L, Inches(6.93)
LC, RC = LX + PW / 2, RX2 + PW / 2
NW2 = Inches(3.0)

def node(x_centre, top, w, h, label, sub=None, fill=WASH, edge=RULE,
         label_colour=INK, sub_colour=GREY, label_size=T_CARD):
    rect(s, x_centre - w / 2, top, w, h, fill, edge)
    tf = box(s, x_centre - w / 2 + Inches(0.12), top + (Inches(0.14) if sub else Inches(0.16)),
             w - Inches(0.24), h - Inches(0.2))
    para(tf, label, label_size, bold=True, color=label_colour, first=True,
         align=PP_ALIGN.CENTER, after=3 if sub else 0)
    if sub:
        para(tf, sub, 11, color=sub_colour, align=PP_ALIGN.CENTER, after=0, line=1.2)

def arrow(x_centre, top, colour=LIGHT, h=Inches(0.3)):
    a = s.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, x_centre - Inches(0.09), top,
                           Inches(0.18), h)
    a.fill.solid(); a.fill.fore_color.rgb = colour
    a.line.fill.background(); a.shadow.inherit = False

# --- panel headings ---
for cx_, txt, col in [(LC, "TODAY", LIGHT), (RC, "WITH A POOL", RED)]:
    tf = box(s, cx_ - PW / 2, y - Inches(0.06), PW, Inches(0.3))
    para(tf, txt, T_NOTE, bold=True, color=col, first=True, align=PP_ALIGN.CENTER, after=0)

top = y + Inches(0.34)

# --- left: how it works now ---
node(LC, top, NW2, Inches(0.62), "Course convenor")
arrow(LC, top + Inches(0.72))
small_w, small_gap = Inches(1.85), Inches(0.12)
sx = LX + (PW - (3 * small_w + 2 * small_gap)) / 2
for i, t in enumerate(["Ask a colleague", "Remember someone", "Hope somebody asks"]):
    rect(s, sx + i * (small_w + small_gap), top + Inches(1.12), small_w, Inches(0.62), WHITE, RULE)
    tf = box(s, sx + i * (small_w + small_gap) + Inches(0.1), top + Inches(1.29),
             small_w - Inches(0.2), Inches(0.4))
    para(tf, t, 11, color=GREY, first=True, align=PP_ALIGN.CENTER, after=0)
arrow(LC, top + Inches(1.84))
node(LC, top + Inches(2.24), Inches(1.5), Inches(0.62), "?", fill=WHITE, edge=RULE,
     label_colour=LIGHT, label_size=24)

# --- right: how it works with a pool ---
node(RC, top, NW2, Inches(0.62), "Course convenor")
arrow(RC, top + Inches(0.72), RED)
rect(s, RX2, top + Inches(1.12), PW, Inches(0.98), INK)
tf = box(s, RX2 + Inches(0.2), top + Inches(1.24), PW - Inches(0.4), Inches(0.8))
para(tf, "THE POOL", T_NOTE, bold=True, color=WHITE, first=True, align=PP_ALIGN.CENTER, after=4)
para(tf, "Everyone willing and able — and what each of them has taught",
     11, color=RGBColor(0xCC, 0xCC, 0xCC), align=PP_ALIGN.CENTER, after=0, line=1.2)
arrow(RC, top + Inches(2.22), RED)
node(RC, top + Inches(2.62), NW2, Inches(0.62), "The right tutor",
     fill=WHITE, edge=RED, label_colour=RED)

# --- what each approach costs or gives ---
cap_y = top + Inches(3.52)
tf = box(s, LX, cap_y, PW, Inches(0.8))
para(tf, "Whoever comes to mind. Strong students who never hear about it never apply, "
         "and nothing carries from one trimester to the next.",
     T_BODY, color=GREY, first=True, align=PP_ALIGN.CENTER, after=0, line=1.3)
tf = box(s, RX2, cap_y, PW, Inches(0.8))
para(tf, "Search by course. See who has already taught it. Contact them directly — and "
         "the record carries forward.",
     T_BODY, color=INK, first=True, align=PP_ALIGN.CENTER, after=0, line=1.3)
notes(s, "This is the whole argument. A convenor staffing a course today relies on who "
         "they happen to know, which is both a narrower pool and a less fair one — a "
         "strong student with no connection to the teaching team never hears about it. "
         "A pool makes the same decision on better information, and keeps the record.")

# ============================================================ 3. The system
s = slide()
y = head(s, "A Tutor Pool for the School",
         "Built and deployed. One place where senior students put themselves forward, "
         "and convenors find out who can teach their course.")
picture(s, "00-entrance-candidate.png", Inches(0.9), y, Inches(5.4))
picture(s, "01-entrance-staff.png", Inches(7.0), y, Inches(5.4))
tf = box(s, Inches(0.9), y + Inches(3.55), Inches(5.4), Inches(0.4))
para(tf, "Candidates have their own link", T_BODY, bold=True, color=GREY,
     first=True, align=PP_ALIGN.CENTER, after=0)
tf = box(s, Inches(7.0), y + Inches(3.55), Inches(5.4), Inches(0.4))
para(tf, "Convenors have theirs", T_BODY, bold=True, color=GREY,
     first=True, align=PP_ALIGN.CENTER, after=0)
tf = box(s, L, y + Inches(4.15), CONTENT, Inches(0.7))
para(tf, "▪  The School has never had a list of who is willing and able to tutor. "
         "This is that list.", T_LEAD, first=True, after=0, line=1.3)
notes(s, "Two links: one goes to students, one to staff, so each audience sees only what "
         "applies to them. Built at no cost to the School.")

# ================================================= 4-7. The four views
views = [
    ("The Candidate's View", "One page, one form — everything a student needs to do.",
     "10-candidate.png",
     ["Details, teaching experience, ranked course choices, a supporting statement",
      "Always open — no recruitment round to wait for",
      "Starts blank each visit, so nothing stale is resubmitted by accident"],
     "Students have exactly one job here, so they get exactly one page and no navigation "
     "to learn."),
    ("The Convenor's View", "Every candidate in the pool, searchable by course.",
     "11-convenor.png",
     ["Everyone registered — not only this trimester's applicants",
      "Two columns: what they have taught, and what they have applied for",
      "Filter by a course; those who have taught it are listed first"],
     "This is the page that addresses the real problem. Convenors do not struggle to run "
     "a selection process — they struggle to find out who is available at all. Note the "
     "people who have taught a course but did not apply this time; they were invisible "
     "before."),
    ("One Candidate", "Everything known about them, in one place.",
     "21-convenor-detail.png",
     ["Full teaching history, by course and trimester",
      "Their applied courses, in their own ranked order",
      "Their statement, contact details and availability"],
     "No approval workflow and no shortlisting buttons. The system informs the convenor; "
     "the decision and the conversation stay theirs."),
    ("The Administrator's View", "The School-wide picture, and the accounts behind it.",
     "12-admin.png",
     ["Every candidate, across all 187 courses",
      "Create and manage convenor accounts",
      "Export to CSV at any point, for the School office"],
     "As Coordinator this is where I would identify first-time tutors for the Week 0 "
     "workshop — derived from the records, rather than by asking around."),
]
for title, lead, img, pts, note in views:
    s = slide()
    y = head(s, title, lead)
    picture(s, img, L, y, Inches(8.1))
    bx = L + Inches(8.45)
    bw = W - bx - L
    for i, b in enumerate(pts):
        ty = y + Inches(0.18) + i * Inches(1.25)
        rect(s, bx, ty, Inches(0.07), Inches(0.85), BLUE)
        tf = box(s, bx + Inches(0.25), ty - Inches(0.02), bw - Inches(0.25), Inches(1.1))
        para(tf, b, T_BODY, color=GREY, first=True, after=0, line=1.35)
    notes(s, note)

# ============================================================ 8. Workshop
s = slide()
y = head(s, "The Missing Half: A Week 0 Workshop",
         "Three hours, before teaching starts, for everyone tutoring for the first time.")
seg = [("What a tutor does", "Not a second lecturer. Find out what students did not understand."),
       ("The tutorial model", "Review · supported practice · consolidation. Draft your own first session."),
       ("Micro-teaching", "Deliver a five-minute concept review to a peer, with feedback both ways."),
       ("Helping without answering", "Hands off the keyboard. Ask before you tell."),
       ("Marking consistently", "Everyone marks the same submission, then compares the spread."),
       ("Conduct and escalation", "Boundaries, integrity, students in difficulty. Escalate, don't absorb."),
       ("Senior tutor panel", "Experienced ICT tutors — the most credible voice in the room.")]
ty = y
for i, (h2, sub) in enumerate(seg):
    accent = RED if i in (1, 3) else BLUE
    rect(s, L, ty + Inches(0.04), Inches(0.07), Inches(0.42), accent)
    tf = box(s, L + Inches(0.28), ty, Inches(11.9), Inches(0.5))
    para(tf, h2, T_CARD, bold=True, first=True, after=2)
    para(tf, sub, T_BODY, color=GREY, after=0, line=1.2)
    ty += Inches(0.62)
tf = box(s, L, ty + Inches(0.2), CONTENT, Inches(0.6))
para(tf, "▪  Half the time is spent doing, not listening.", T_LEAD, bold=True,
     color=RED, first=True, after=0)
foot(s, "Deliberately excludes University compliance training and course-specific "
        "content — both are covered elsewhere.")
notes(s, "Not compliance training: Griffith does that already and repeating it would "
         "waste the only three hours the School gets. Not course-specific either — "
         "convenors brief their own tutors. This is what is common to all of them.")

# ============================================================ 9. Try it
s = slide()
y = head(s, "Please Try It Yourself",
         "The system is live. These accounts are for you to use during or after this meeting.")
cw3, gap3 = Inches(6.15), Inches(0.30)

rect(s, L, y, cw3, Inches(2.35), WASH)
rect(s, L, y, Inches(0.07), Inches(2.35), BLUE)
tf = box(s, L + Inches(0.30), y + Inches(0.22), cw3 - Inches(0.55), Inches(1.95))
para(tf, "Candidate", T_CARD, bold=True, color=BLUE, first=True, after=10)
para(tf, "wweisong.github.io/griffith-ict-casual-academic", T_BODY, bold=True, after=12)
para(tf, "sample.liam.chen@griffithuni.edu.au", T_CARD, bold=True, after=4)
para(tf, "SamplePortal#2027", T_CARD, bold=True, color=RED, after=8)
para(tf, "Opens the application form a student fills in.", T_BODY, color=GREY, after=0)

rx = L + cw3 + gap3
rect(s, rx, y, cw3, Inches(2.35), WASH)
rect(s, rx, y, Inches(0.07), Inches(2.35), RED)
tf = box(s, rx + Inches(0.30), y + Inches(0.22), cw3 - Inches(0.55), Inches(1.95))
para(tf, "Course convenor", T_CARD, bold=True, color=RED, first=True, after=10)
para(tf, "wweisong.github.io/griffith-ict-casual-academic/#/staff", T_BODY, bold=True, after=12)
para(tf, "sample.convenor@griffith.edu.au", T_CARD, bold=True, after=4)
para(tf, "SamplePortal#2027", T_CARD, bold=True, color=RED, after=8)
para(tf, "Opens the candidate list — the page that matters most.", T_BODY, color=GREY, after=0)

picture(s, "22-admin-detail.png", Inches(4.55), y + Inches(2.55), Inches(4.25))
tf = box(s, L, y + Inches(5.25), CONTENT, Inches(0.32))
para(tf, "Administrator access on request. The candidates shown are sample records, "
         "not real students.", T_NOTE, color=LIGHT, first=True, align=PP_ALIGN.CENTER, after=0)
notes(s, "Please do open it. The convenor account shows the page that matters most. "
         "Everything — proposal, process, workshop run sheet, code of conduct — is at "
         "github.com/WWEISONG/griffith-ict-casual-academic")

# ============================================================ 10. The cycle
s = slide()
y = head(s, "How the Pool Fills, and Keeps Filling",
         "The system is a tutor pool. This is the cycle that stocks it, every trimester.")

CX, CY = Inches(6.55), Inches(4.62)
RX, RY = Inches(3.62), Inches(1.72)
NW, NH = Inches(2.52), Inches(0.98)

# The cycle path, drawn faintly behind everything.
ring = s.shapes.add_shape(MSO_SHAPE.OVAL, CX - RX, CY - RY, RX * 2, RY * 2)
ring.fill.background()
ring.line.color.rgb = RULE
ring.line.width = Pt(1.25)
ring.shadow.inherit = False

steps = [
    ("1", "Invite", "Convenors invite students\nwho did well in the course", RED),
    ("2", "Apply", "One standing application:\nexperience, ranked courses", BLUE),
    ("3", "Select", "Search the pool by course.\nContact directly", BLUE),
    ("4", "Prepare", "Week 0 workshop\nThree hours", RED),
    ("5", "Teach", "Shared tutorial model.\nWeek 3 check-in", BLUE),
]
angles = [-90, -18, 54, 126, 198]

# Direction markers, sitting between the steps.
for a in [-54, 18, 90, 162, 234]:
    r = math.radians(a)
    tx = CX + Emu(int(RX * math.cos(r))) - Inches(0.11)
    ty = CY + Emu(int(RY * math.sin(r))) - Inches(0.11)
    tri = s.shapes.add_shape(MSO_SHAPE.ISOSCELES_TRIANGLE, tx, ty, Inches(0.22), Inches(0.22))
    tri.fill.solid(); tri.fill.fore_color.rgb = LIGHT
    tri.line.fill.background(); tri.shadow.inherit = False
    tri.rotation = a + 90

for (n, title, bodytxt, accent), a in zip(steps, angles):
    r = math.radians(a)
    x = CX + Emu(int(RX * math.cos(r))) - NW / 2
    ny = CY + Emu(int(RY * math.sin(r))) - NH / 2
    rect(s, x, ny, NW, NH, WHITE, RULE)
    rect(s, x, ny, Inches(0.07), NH, accent)
    tf = box(s, x + Inches(0.24), ny + Inches(0.12), NW - Inches(0.4), Inches(0.28))
    para(tf, f"{n}   {title.upper()}", T_NOTE, bold=True, color=accent, first=True, after=4)
    tf = box(s, x + Inches(0.24), ny + Inches(0.42), NW - Inches(0.4), Inches(0.5))
    lines = bodytxt.split("\n")
    for j, ln in enumerate(lines):
        para(tf, ln, 11, color=GREY, first=(j == 0), after=1, line=1.15)

# The pool itself, at the centre of the cycle.
pool = s.shapes.add_shape(MSO_SHAPE.OVAL, CX - Inches(1.72), CY - Inches(0.86),
                          Inches(3.44), Inches(1.72))
pool.fill.solid(); pool.fill.fore_color.rgb = INK
pool.line.fill.background(); pool.shadow.inherit = False
tf = box(s, CX - Inches(1.55), CY - Inches(0.52), Inches(3.1), Inches(1.1))
para(tf, "THE TUTOR POOL", T_NOTE, bold=True, color=WHITE, first=True,
     align=PP_ALIGN.CENTER, after=5)
para(tf, "Who they are, what they\nhave taught, what they\nwant to teach", 11,
     color=RGBColor(0xCC, 0xCC, 0xCC), align=PP_ALIGN.CENTER, after=0, line=1.25)

tf = box(s, L, Inches(6.80), CONTENT, Inches(0.5))
para(tf, "▪  Step 1 is how the pool gets stocked. Step 4 is the part the School does "
         "not have yet.", T_LEAD, first=True, after=0, line=1.25)
notes(s, "The system is a pool, and a pool only works if something keeps filling it. That "
         "is Step 1: at results release, convenors invite the students who did well. "
         "Today students find out about tutoring by knowing somebody, which is both a "
         "narrower and a less fair pool than it should be. Step 4 is the training, and "
         "the only part that does not exist in some form already.")

out = "docs/tutor-program/HoS-briefing.pptx"
prs.save(out)
print(f"{out}  ·  {len(prs.slides._sldIdLst)} slides")
