import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createCanvas } from '@napi-rs/canvas'

const __dirname = dirname(fileURLToPath(import.meta.url))
const templatePath = join(__dirname, '..', 'public', 'templates', 'certificado_template.pdf')
const outDir = join(__dirname, '..', 'public', 'templates')

const SCALE = 3
const NOMES = ['certificado_front.png', 'certificado_back.png']

async function extrairImagens() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const buffer = readFileSync(templatePath)
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: SCALE })
    const canvas = createCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext('2d')

    await page.render({ canvasContext: ctx, viewport }).promise

    const png = canvas.toBuffer('image/png')
    const nome = NOMES[i - 1]
    const caminho = join(outDir, nome)
    writeFileSync(caminho, png)

    console.log(
      `Page ${i} -> ${nome} (${viewport.width}x${viewport.height}px, ${(png.length / 1024).toFixed(0)}KB)`,
    )
  }

  console.log(`\nImagens salvas em: ${outDir}`)
}

extrairImagens().catch((err) => {
  console.error(err)
  process.exit(1)
})
