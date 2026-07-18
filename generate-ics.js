// generate-ics.js
// Reads tars-events.json → writes tars.ics
// Run with: node generate-ics.js

const fs = require('fs');

// ─── Load events ────────────────────────────────────────────────────────────
const data = JSON.parse(fs.readFileSync('tars-events.json', 'utf8'));

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Convert ISO 8601 UTC to iCal format
// "2026-07-21T13:00:00Z" → "20260721T130000Z"
function toIcal(isoString) {
  return isoString.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Check if two events overlap
// Overlap when: start1 < end2 AND start2 < end1
function overlaps(a, b) {
  return new Date(a.start) < new Date(b.end) &&
         new Date(b.start) < new Date(a.end);
}

// ─── Conflict check ──────────────────────────────────────────────────────────
// Finds all overlapping pairs in the event list
function findConflicts(events) {
  const conflicts = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (overlaps(events[i], events[j])) {
        conflicts.push([events[i], events[j]]);
      }
    }
  }
  return conflicts;
}

const conflicts = findConflicts(data.events);
if (conflicts.length > 0) {
  console.log('\n⚠️  CONFLICTS DETECTED — tars.ics was NOT updated.\n');
  for (const [a, b] of conflicts) {
    console.log(`  ❌ "${a.title}" (${a.start} → ${a.end})`);
    console.log(`     conflicts with`);
    console.log(`  ❌ "${b.title}" (${b.start} → ${b.end})\n`);
  }
  process.exit(1);
}

// ─── Generate ICS ────────────────────────────────────────────────────────────
const now = toIcal(new Date().toISOString());

const lines = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  `PRODID:-//TARS//TARS Calendar//EN`,
  `X-WR-CALNAME:${data.calendar.name}`,
  `X-WR-TIMEZONE:${data.calendar.timezone}`,
];

for (const event of data.events) {
  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${event.id}@tars-ai-141`);
  lines.push(`DTSTAMP:${now}`);
  lines.push(`DTSTART:${toIcal(event.start)}`);
  lines.push(`DTEND:${toIcal(event.end)}`);
  lines.push(`SUMMARY:${event.title}`);
  if (event.description) lines.push(`DESCRIPTION:${event.description}`);
  lines.push('END:VEVENT');
}

lines.push('END:VCALENDAR');

// iCal spec requires CRLF line endings (\r\n)
fs.writeFileSync('tars.ics', lines.join('\r\n') + '\r\n');
console.log(`✅ tars.ics generated with ${data.events.length} events. No conflicts.`);
