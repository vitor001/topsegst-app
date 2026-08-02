import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'
import JSZip from 'jszip'
import { localizarPlaceholders, PlaceholderMap } from './localizarPlaceholders'

export interface CertificadoDados {
  nome: string
  cpf: string
  treinamento: string
  cargaHoraria: string
  dataConclusao: string
  empresa: string
  cidade: string
  conteudoProgramatico: string[]
}

const BLUE = rgb(0.1, 0.2, 0.45)
const WHITE = rgb(1, 1, 1)
const DARK = rgb(0.12, 0.12, 0.12)

interface FieldInfo {
  pagina: number
  x: number
  y: number
  width: number
  fontSize: number
}

const DEFAULTS: Record<string, FieldInfo> = {
  nome:               { pagina: 1, x: 421, y: 360, width: 200, fontSize: 20 },
  cpf:                { pagina: 1, x: 421, y: 328, width: 160, fontSize: 13 },
  treinamento:        { pagina: 1, x: 421, y: 298, width: 180, fontSize: 14 },
  cargaHoraria:       { pagina: 1, x: 421, y: 270, width: 140, fontSize: 12 },
  dataConclusao:      { pagina: 1, x: 421, y: 242, width: 120, fontSize: 12 },
  empresa:            { pagina: 1, x: 421, y: 214, width: 170, fontSize: 12 },
  cidade:             { pagina: 1, x: 421, y: 186, width: 130, fontSize: 12 },
  conteudoProgramatico: { pagina: 2, x: 95, y: 480, width: 650, fontSize: 11 },
}

function pick(key: string, found: PlaceholderMap): FieldInfo {
  if (found[key]) {
    const f = found[key]
    return { pagina: f.pagina, x: f.x, y: f.y, width: f.width, fontSize: f.fontSize }
  }
  return DEFAULTS[key] ?? DEFAULTS.nome
}

function calcFontSize(text: string, preferred: number, maxWidth: number): number {
  const est = text.length * preferred * 0.55
  if (est <= maxWidth) return preferred
  return Math.max(Math.floor((maxWidth / (text.length * 0.55)) * 10) / 10, 8)
}

function drawCenteredField(
  page: import('pdf-lib').PDFPage,
  text: string,
  info: FieldInfo,
  font: PDFFont,
  maxWidth: number,
  coverColor: ReturnType<typeof rgb>,
  textColor: ReturnType<typeof rgb>,
) {
  const fs = calcFontSize(text, info.fontSize, maxWidth)
  const tw = text.length * fs * 0.55
  const bw = Math.max(info.width + 8, tw + 12)
  const bh = fs * 1.3

  page.drawRectangle({
    x: info.x - bw / 2,
    y: info.y - bh * 0.35,
    width: bw,
    height: bh,
    color: coverColor,
  })

  page.drawText(text, {
    x: info.x - tw / 2,
    y: info.y - bh * 0.35,
    size: fs,
    font,
    color: textColor,
  })
}

export async function gerarCertificadoPDF(
  dados: CertificadoDados,
): Promise<Uint8Array> {
  const response = await fetch('/templates/certificado_template.pdf')
  const templateBytes = await response.arrayBuffer()

  const found = await localizarPlaceholders(templateBytes.slice(0))

  const pdfDoc = await PDFDocument.load(templateBytes)
  const pages = pdfDoc.getPages()
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // ── Page 1: nome (extra treatment for variable width) ──
  const nomeInfo = pick('nome', found)
  drawCenteredField(pages[0], dados.nome, nomeInfo, fontBold, 320, BLUE, WHITE)

  // Simple fields
  const simple: [string, string, number][] = [
    ['cpf', dados.cpf, 280],
    ['treinamento', dados.treinamento, 300],
    ['cargaHoraria', dados.cargaHoraria, 200],
    ['dataConclusao', dados.dataConclusao, 200],
    ['empresa', dados.empresa, 280],
    ['cidade', dados.cidade, 250],
  ]
  for (const [key, value, maxW] of simple) {
    drawCenteredField(pages[0], value, pick(key, found), fontBold, maxW, BLUE, WHITE)
  }

  // ── Page 2: conteúdo programático ──
  const cpInfo = pick('conteudoProgramatico', found)

  // Cover a large area on page 2
  pages[1].drawRectangle({
    x: cpInfo.x - 8,
    y: 100,
    width: cpInfo.width + 16,
    height: cpInfo.y + 20 - 100,
    color: WHITE,
  })

  let currentY = cpInfo.y
  const cpLabels = 'abcdef'
  for (let i = 0; i < dados.conteudoProgramatico.length; i++) {
    const line = dados.conteudoProgramatico[i]
    const label = cpLabels[i] ? `${cpLabels[i]}) ` : `${i + 1}. `

    pages[1].drawText(label, {
      x: cpInfo.x,
      y: currentY,
      size: cpInfo.fontSize,
      font: fontBold,
      color: DARK,
    })

    const lw = label.length * cpInfo.fontSize * 0.55
    pages[1].drawText(line, {
      x: cpInfo.x + lw + 4,
      y: currentY,
      size: cpInfo.fontSize,
      font: fontRegular,
      color: DARK,
    })

    currentY -= 28
  }

  return pdfDoc.save()
}

export async function gerarCertificadosEmLote(
  alunos: CertificadoDados[],
): Promise<Blob> {
  const zip = new JSZip()

  for (const aluno of alunos) {
    const pdfBytes = await gerarCertificadoPDF(aluno)
    const nomeArquivo = `certificado_${aluno.nome.replace(/\s+/g, '_')}.pdf`
    zip.file(nomeArquivo, pdfBytes)
  }

  return zip.generateAsync({ type: 'blob' })
}
