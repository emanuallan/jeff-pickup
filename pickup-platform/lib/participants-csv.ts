import type { OrgParticipantHistory } from '@/lib/participants'

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function participantsToCsv(rows: OrgParticipantHistory[]): string {
  const header = ['display_name', 'first_name', 'last_name', 'phone', 'session_count']
  const lines = [
    header.join(','),
    ...rows.map((p) =>
      [
        escapeCsv(p.display_name),
        escapeCsv(p.first_name),
        escapeCsv(p.last_name),
        escapeCsv(p.phone),
        String(p.session_count),
      ].join(','),
    ),
  ]
  return lines.join('\n')
}
