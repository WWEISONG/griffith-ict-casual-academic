# 3. Week 0 workshop

*Three hours, before teaching starts. Expected of all first-time tutors.*

---

## Design principles

**Practise, don't lecture.** A workshop that consists of somebody talking about
good teaching models bad teaching. Roughly half the time is spent with
participants doing something.

**Teach the specific case, not teaching in general.** These are computing
tutorials and labs. The recurring difficulty is not classroom management, it is
what to do when a student says *"my code doesn't work"* and wants you to fix it.

**Senior tutors carry a third of it.** The most credible person to explain what
Week 5 feels like is someone who tutored the same course last trimester. It also
gives experienced tutors a visible step up, which the School currently has no
way to offer.

**Everyone leaves with something written.** A one-page tutorial plan for their
own first session, drafted in the room and reviewed by a peer.

---

## Run sheet

**Total: 3 hours, including a 15-minute break. Venue: computer lab.**

| Time | Duration | Segment | Format |
|---|---|---|---|
| 0:00 | 15 min | Welcome and why this exists | Facilitator |
| 0:15 | 25 min | What a tutor at Griffith ICT does | Facilitator + discussion |
| 0:40 | 35 min | **The tutorial model** | Worked example + drafting |
| 1:15 | 30 min | **Micro-teaching** | Pairs, then plenary |
| 1:45 | 15 min | Break | |
| 2:00 | 30 min | **Helping without answering** | Role-play in threes |
| 2:30 | 20 min | Marking consistently | Calibration exercise |
| 2:50 | 25 min | Conduct, boundaries and escalation | Scenario discussion |
| 3:15 | 25 min | Senior tutor panel | 3 panellists + Q&A |
| 3:40 | 10 min | Close: your first tutorial | Individual |

> The columns above run to 3h50 including the break. For a strict three hours,
> cut the marking calibration to 15 minutes and the panel to 20, or move
> marking to a separate mid-trimester session — which is arguably better placed
> there anyway, since it becomes real in Week 4.

---

## Segment detail

### 0:00 — Welcome and why this exists *(15 min)*

The School appoints casual academics every trimester and has never had a shared
account of what the job involves. This is the first cohort to get one.

Cover: who is in the room, which courses they will teach, and that the point is
preparation rather than assessment — nobody is being marked today.

### 0:15 — What a tutor at Griffith ICT does *(25 min)*

The role, stated plainly:

- **You are not a second lecturer.** You are not there to re-deliver content.
- **You are the person who finds out what students actually did not understand.**
  In a lecture nobody admits confusion. In a lab, everybody's confusion is
  visible on their screen.
- **Your job is to make them capable, not to make them finished.** A student
  who leaves with working code they did not write has been failed.

Discussion, five minutes: *think of the best tutor you had as a student. What
did they do?* Collect answers on the board. They will describe patience,
questions rather than answers, and being made to feel not-stupid — which is the
rest of the workshop, in the participants' own words.

### 0:40 — The tutorial model *(35 min)*

**The shape of an ICT tutorial or lab**, used across Australian computing schools:

```
0:00 ─ 0:20   Review           Re-anchor the week's key concepts. Not the
                               lecture again: the two or three ideas the tasks
                               depend on, with one worked example.

0:20 ─ 1:30   Supported work   Students work the tasks. You circulate. This is
                               the majority of the session and the part where
                               the teaching actually happens.

1:30 ─ 1:50   Consolidate      Draw out what was common. "Nearly everyone hit
                               the same problem at step 3 — here is why."
```

Why the twenty-minute review matters: without it, the weakest students spend
the session stuck at the first task, and the tutor spends the session repeating
the same explanation individually. Twenty minutes at the front saves an hour of
one-to-one repetition.

Why the consolidation matters: it is the only point where a student learns that
their confusion was normal.

**Activity (20 min):** each participant drafts a plan for their own first
tutorial — the three concepts they will review, the worked example, the two
places they expect students to get stuck. One page, on the provided template.

### 1:15 — Micro-teaching *(30 min)*

In pairs: each person delivers the **five-minute concept review** from their
plan to their partner, who plays a student who half-understands it.

Then swap. Then five minutes of structured feedback each way:

- One thing that worked
- One thing you would change
- One question the "student" still had

Plenary (10 min): what was harder than expected? The universal answer is
*explaining something you understand to someone who does not*, which is the
skill the whole workshop is about.

### 2:00 — Helping without answering *(30 min)*

The central skill, and the one new tutors get wrong most often.

**The failure mode:** a student says *"it doesn't work"*, the tutor takes the
keyboard, fixes it, and moves on. The queue shortens. The student learns
nothing, and returns next week with the same class of problem.

**The alternative, as a sequence:**

1. **Make them describe it.** *"What did you expect to happen, and what
   happened?"* A surprising share of bugs are found by the student while
   answering this.
2. **Make them locate it.** *"Where does it stop being what you expect?"*
   Teaches bisection, which is the actual transferable skill.
3. **Ask, don't tell.** *"What does that variable hold at this point?"*
4. **Hands stay off the keyboard.** If you must demonstrate, do it on your own
   machine, then have them do it on theirs.
5. **Know when to just answer.** Twenty minutes stuck on a tooling problem
   teaches nothing. Environment issues get fixed; conceptual issues get asked
   about.

**Role-play (15 min), in threes** — one tutor, one student, one observer,
rotating. The observer watches for: did the tutor touch the keyboard? Did they
ask more questions than they answered?

Scenarios, provided on cards:

- A student's code produces the wrong output; the bug is one line and obvious to you
- A student has not started and does not know where to begin
- A student who finished early is bored
- A student says *"just tell me the answer, I have a deadline"*
- A student is clearly using generated code they cannot explain

### 2:30 — Marking consistently *(20 min)*

Three markers, one course, forty submissions each — students compare grades and
notice differences.

- **Read the rubric before the first submission, not the fifth**
- **Mark one question across all submissions**, rather than all questions per
  submission — far more consistent, and faster
- **Feedback that names the next action.** "Incorrect" teaches nothing.
  "This loop runs one time too few — check the boundary" teaches something.
- **Escalate rather than guess** when a submission is unusual
- **Never mark someone you have a personal relationship with.** Tell the
  convenor and swap.

**Calibration exercise (10 min):** everyone marks the same short submission
against the same rubric. Reveal the spread. The spread is always wider than
anybody expects, and it makes the case for moderation better than any
explanation.

### 2:50 — Conduct, boundaries and escalation *(25 min)*

Full detail in [4. Code of conduct](04-code-of-conduct.md). In the room, cover
it as scenarios rather than a policy reading:

- A student adds you on social media
- A student asks you to look at their assignment "informally" before submission
- You realise you are marking a friend's work
- A student discloses that they are struggling with their mental health
- A student's work looks generated, or copied
- A student asks a question you cannot answer

The last one matters more than it appears. New tutors bluff, because they think
not knowing is disqualifying. **"I don't know — I'll find out and tell you next
week"** is a correct and professional answer, and modelling it is one of the
more useful things a tutor does.

**Escalate, don't absorb.** Every scenario above has a person to hand it to: the
convenor, the School office, or Griffith's student support services. A tutor is
not a counsellor and is not the last line of defence.

### 3:15 — Senior tutor panel *(25 min)*

Three experienced ICT tutors. Fifteen minutes on prepared questions, ten on open
Q&A.

Prepared questions:

- What surprised you in your first trimester?
- What do you do in the first five minutes of a session?
- Tell us about something that went badly and what you changed.
- How do you handle the student who is much further ahead than everyone else?
- What do you wish somebody had told you?

Panellists are recognised for their contribution.

### 3:40 — Close *(10 min)*

Each participant finalises their one-page plan for their first tutorial and
keeps it. Attendance recorded. Materials and the tutor guide circulated.

---

## Materials

| | |
|---|---|
| Slide deck | Facilitator's, reused each trimester |
| Tutorial plan template | One page, printed |
| Role-play scenario cards | Six scenarios, printed |
| Calibration sample | One short submission plus rubric, from a real course with identifying details removed |
| Tutor guide | The written reference; [4. Code of conduct](04-code-of-conduct.md) plus the tutorial model |

Prepared once; refreshed annually.

---

## What is deliberately not in this workshop

**University compliance training.** Work health and safety, integrity modules
and privacy are Griffith's mandatory onboarding, delivered on Canvas. Repeating
them here would waste the only three hours the School gets.

**Timesheets and pay.** Covered by the University's Casual Staff Time Recording
training. Mentioned in one slide with a link, not taught.

**Course-specific content.** Each convenor briefs their own tutors on their own
course. This workshop is what is common to all of them.
