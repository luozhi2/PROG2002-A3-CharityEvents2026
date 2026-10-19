"""
Rewrites the event_date / end_date expressions in api/seed.sql.

Before: DATE_ADD(NOW(), INTERVAL 12 DAY)            -- inherits the server clock time
After:  DATE_ADD(CURDATE(), INTERVAL 12 DAY) + INTERVAL 9 HOUR

Pinning the time of day means the stored value is always the intended Sydney
wall-clock time, whichever timezone the MySQL server runs in. The day offsets and
hours match db/demo-data.js so the demo dataset and the MySQL dataset agree.

Run:  python tools/fix_seed_dates.py api/seed.sql
"""

import re
import sys
from pathlib import Path

# event_id -> (day offset from today, start hour, end hour)
EVENTS = {
    1: (12, 9, 13),    # Coastal Clean-Up Charity Walk
    2: (25, 7, 12),    # Charity Fun Run for Regional Health
    3: (40, 18, 22),   # Books for Brighter Futures Gala
    4: (6, 10, 16),    # Paws and Pals Animal Rescue Open Day
    5: (18, 8, 16),    # Winter Warmth Community Appeal
    6: (-35, 8, 14),   # Rainforest Revegetation Day
    7: (-70, 7, 10),   # Mental Health Awareness Breakfast
    8: (55, 18, 22),   # Regional Scholarship Trivia Night
}

HEADER_NOTE = """-- TIMEZONE CONVENTION: every event datetime below is an Australia/Sydney
-- wall-clock time. CURDATE() is used with an explicit INTERVAL ... HOUR rather
-- than NOW(), so the time of day is exactly what is intended whatever timezone
-- the MySQL server runs in. See api/lib/timezone.js for the full explanation.
--
"""


def expression(days: int, hour: int) -> str:
    """A CURDATE()-based datetime expression with an explicit time of day."""
    if days >= 0:
        base = f'DATE_ADD(CURDATE(), INTERVAL {days} DAY)'
    else:
        base = f'DATE_SUB(CURDATE(), INTERVAL {abs(days)} DAY)'
    return f'{base} + INTERVAL {hour} HOUR'


def main() -> None:
    path = Path(sys.argv[1])
    text = path.read_text(encoding='utf-8')

    if 'TIMEZONE CONVENTION' not in text:
        marker = '-- Relative dates are used'
        if marker in text:
            text = text.replace(marker, HEADER_NOTE + marker, 1)
            print('header note added')
        else:
            print('WARNING: header marker not found, note not added')

    current_event = None
    replaced = 0
    output = []

    for line in text.split('\n'):
        # Track which event's VALUES tuple we are inside.
        heading = re.match(r'\s*\((\d+), \d+, \'', line)
        if heading:
            current_event = int(heading.group(1))

        # The date line: two DATE_..._ADD/SUB(NOW(), ...) expressions.
        if re.match(r'^\s*DATE_(ADD|SUB)\(NOW\(\), INTERVAL -?\d+ DAY\)', line):
            if current_event in EVENTS:
                days, start_hour, end_hour = EVENTS[current_event]
                output.append(f'      {expression(days, start_hour)}, {expression(days, end_hour)},')
                replaced += 1
                continue

        output.append(line)

    text = '\n'.join(output)
    path.write_text(text, encoding='utf-8')
    print(f'event date lines rewritten: {replaced} of {len(EVENTS)}')

    if replaced != len(EVENTS):
        raise SystemExit('ERROR: not every event was rewritten - check the file format')


if __name__ == '__main__':
    main()
