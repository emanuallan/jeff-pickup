type OgFont = {
  name: string
  data: ArrayBuffer
  weight: 400 | 600 | 700
  style: 'normal'
}

const fontCache = new Map<string, ArrayBuffer>()

async function loadInter(weight: number): Promise<ArrayBuffer> {
  const key = `inter-${weight}`
  const cached = fontCache.get(key)
  if (cached) return cached

  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap`, {
      cache: 'force-cache',
    })
  ).text()

  const match = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)
  if (!match?.[1]) {
    throw new Error(`Failed to load Inter weight ${weight}`)
  }

  const data = await (await fetch(match[1], { cache: 'force-cache' })).arrayBuffer()
  fontCache.set(key, data)
  return data
}

/** Inter — closest web font match to the site’s system-ui stack. Cached per process. */
export async function getOgFonts(): Promise<OgFont[]> {
  const [regular, semibold, bold] = await Promise.all([loadInter(400), loadInter(600), loadInter(700)])

  return [
    { name: 'Inter', data: regular, weight: 400, style: 'normal' },
    { name: 'Inter', data: semibold, weight: 600, style: 'normal' },
    { name: 'Inter', data: bold, weight: 700, style: 'normal' },
  ]
}
