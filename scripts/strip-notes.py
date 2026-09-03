"""
Remove every speaker-notes part from the deck, in place.

Operates on the .pptx directly rather than regenerating it, so hand edits made
in PowerPoint are preserved.

    python3 scripts/strip-notes.py docs/tutor-program/HoS-briefing.pptx
"""
import sys
from pptx import Presentation

NOTES_RELTYPE = ("http://schemas.openxmlformats.org/officeDocument/"
                 "2006/relationships/notesSlide")

path = sys.argv[1] if len(sys.argv) > 1 else "docs/tutor-program/HoS-briefing.pptx"
prs = Presentation(path)

removed = 0
for slide in prs.slides:
    # Drop the relationship to the notes part; the part itself is then
    # unreferenced and is not written back out.
    for rId, rel in list(slide.part.rels.items()):
        if rel.reltype == NOTES_RELTYPE:
            slide.part.drop_rel(rId)
            removed += 1

prs.save(path)
print(f"{path}: removed {removed} notes slide{'' if removed == 1 else 's'}")
