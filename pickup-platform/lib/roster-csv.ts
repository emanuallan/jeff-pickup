import type { SignupWithContact } from '@/lib/signups'

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function rosterToCsv(rows: SignupWithContact[]): string {
  const header = ['display_name', 'first_name', 'last_name', 'phone', 'guest_count', 'arrival_status']
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [
        escapeCsv(r.display_name),
        escapeCsv(r.first_name),
        escapeCsv(r.last_name),
        escapeCsv(r.phone),
        String(r.guest_count),
        escapeCsv(r.arrival_status),
      ].join(','),
    ),
  ]
  return lines.join('\n')
}
