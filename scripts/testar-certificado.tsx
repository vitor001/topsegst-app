import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pdf } from '@react-pdf/renderer'
import { CertificadoDocument } from '../src/utils/certificado/CertificadoPDF'

const __dirname = dirname(fileURLToPath(import.meta.url))

function toDataUri(bytes: Uint8Array, mime: string): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i])
  }
  return `data:${mime};base64,${btoa(bin)}`
}

async function main() {
  const frente = new Uint8Array(
    readFileSync(join(__dirname, '..', 'public', 'templates', 'certificado_front.png')),
  )
  const verso = new Uint8Array(
    readFileSync(join(__dirname, '..', 'public', 'templates', 'certificado_back.png')),
  )

  const dados = {
    nome: 'JOÃO DA SILVA SANTOS',
    cpf: '123.456.789-00',
    treinamento: 'NR-35 Trabalho em Altura',
    cargaHoraria: '8 horas',
    dataConclusao: '01/08/2026',
    empresa: 'Construtora Horizonte LTDA',
    cidade: 'São Paulo',
    estado: 'SP',
    conteudoProgramatico: [
      'Análise de riscos e medidas de controle',
      'Equipamentos de proteção individual (EPI)',
      'Sistemas de ancoragem e pontos de fixação',
      'Resgate e primeiros socorros',
      'Legislação aplicável (NR-35)',
      'Atividades práticas supervisionadas',
    ],
  }

  const blob = await pdf(
    <CertificadoDocument
      dados={dados}
      frente={toDataUri(frente, 'image/png')}
      verso={toDataUri(verso, 'image/png')}
    />,
  ).toBlob()

  const out = join(__dirname, '..', 'certificado_teste.pdf')
  writeFileSync(out, Buffer.from(await blob.arrayBuffer()))
  console.log(`OK -> ${out} (${blob.size} bytes)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
