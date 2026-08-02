import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const templatePath = join(__dirname, '..', 'public', 'templates', 'certificado_template.pdf')
const outputPath = join(__dirname, '..', 'grade_referencia.pdf')

async function gerarGrade() {
  const buffer = readFileSync(templatePath)
  const pdfDoc = await PDFDocument.load(buffer)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  for (let i = 0; i < pdfDoc.getPageCount(); i++) {
    const page = pdfDoc.getPages()[i]
    const { width, height } = page.getSize()
    console.log(`\n=== PÁGINA ${i + 1} === width: ${width}  height: ${height}`)

    // ── Linhas verticais (eixo X) a cada 50pts ──
    for (let x = 0; x <= width; x += 50) {
      page.drawLine({
        start: { x, y: 0 },
        end: { x, y: height },
        thickness: 0.5,
        color: rgb(1, 0, 0),
        opacity: 0.4,
      })
      page.drawText(String(x), {
        x: x + 1,
        y: height - 12,
        size: 6,
        font,
        color: rgb(1, 0, 0),
      })
    }

    // ── Linhas horizontais (eixo Y) a cada 50pts ──
    for (let y = 0; y <= height; y += 50) {
      page.drawLine({
        start: { x: 0, y },
        end: { x: width, y },
        thickness: 0.5,
        color: rgb(0, 0, 1),
        opacity: 0.4,
      })
      page.drawText(String(y), {
        x: 2,
        y: y + 1,
        size: 6,
        font,
        color: rgb(0, 0, 1),
      })
    }

    // ── Marcadores extras a cada 10pts nas bordas pra facilitar leitura ──
    for (let x = 0; x <= width; x += 10) {
      page.drawLine({
        start: { x, y: 0 },
        end: { x, y: 8 },
        thickness: 0.3,
        color: rgb(1, 0, 0),
        opacity: 0.3,
      })
      page.drawLine({
        start: { x, y: height },
        end: { x, y: height - 8 },
        thickness: 0.3,
        color: rgb(1, 0, 0),
        opacity: 0.3,
      })
    }
    for (let y = 0; y <= height; y += 10) {
      page.drawLine({
        start: { x: 0, y },
        end: { x: 8, y },
        thickness: 0.3,
        color: rgb(0, 0, 1),
        opacity: 0.3,
      })
      page.drawLine({
        start: { x: width, y },
        end: { x: width - 8, y },
        thickness: 0.3,
        color: rgb(0, 0, 1),
        opacity: 0.3,
      })
    }

    console.log(`  Grid desenhada: linhas a cada 50pt, marcações a cada 10pt`)
  }

  const pdfBytes = await pdfDoc.save()
  writeFileSync(outputPath, pdfBytes)
  console.log(`\n✔ Grade salva em: ${outputPath}`)
  console.log('Abra este arquivo e anote as coordenadas (x, y) de cada campo {{placeholder}}.')
  console.log('Lembrete: y=0 é a BASE da página (canto inferior).')
}

gerarGrade().catch(console.error)
