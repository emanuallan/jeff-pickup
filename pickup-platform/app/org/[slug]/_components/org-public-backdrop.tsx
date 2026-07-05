import { hexToRgba } from '@/lib/colors'

/** Subtle branded backdrop using the group's accent color. */
export function OrgPublicBackdrop({ accent }: { accent: string }) {
  const glow = hexToRgba(accent, 0.14)

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-zinc-950">
      <div
        className="absolute inset-x-0 top-0 h-[28rem]"
        style={{
          background: `linear-gradient(to bottom, ${glow}, transparent 72%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'linear-gradient(to bottom, black, transparent 75%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 75%)',
        }}
      />
    </div>
  )
}
