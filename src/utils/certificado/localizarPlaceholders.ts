export interface PlaceholderInfo {
  pagina: number
  x: number
  y: number
  width: number
  fontSize: number
}

export interface PlaceholderMap {
  [key: string]: PlaceholderInfo
}

export async function localizarPlaceholders(
  pdfBytes: ArrayBuffer,
): Promise<PlaceholderMap> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

  const pdf = await pdfjs.getDocument({ data: pdfBytes }).promise
  const placeholders: PlaceholderMap = {}

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    console.log(
      `[localizarPlaceholders] Page ${i} - ${textContent.items.length} text items found`,
    )

    for (const raw of textContent.items) {
      const item = raw as { str: string; transform: number[]; width: number }
      const str = item.str
      const x = item.transform[4]
      const y = item.transform[5]
      const w = item.width
      const fontSize = Math.hypot(item.transform[0], item.transform[1])

      console.log(
        `[localizarPlaceholders]  Page ${i}  x:${x.toFixed(1)} y:${y.toFixed(1)} w:${w.toFixed(1)} fs:${fontSize.toFixed(1)}  "${str}"`,
      )

      const match = str.match(/\{\{(\w+)\}\}/)
      if (match) {
        const key = match[1]
        placeholders[key] = { pagina: i, x, y, width: w, fontSize }
        console.log(
          `[localizarPlaceholders]  >>> FOUND placeholder {{${key}}} at (${x}, ${y}) page ${i}`,
        )
      }
    }
  }

  if (Object.keys(placeholders).length === 0) {
    console.warn(
      '[localizarPlaceholders] No placeholders found. The PDF likely has rasterized text (images).',
    )
    console.warn(
      '[localizarPlaceholders] Falling back to default hardcoded positions.',
    )
  }

  return placeholders
}
