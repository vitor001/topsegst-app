import JSZip from 'jszip'
import type { CertificadoDados } from './tipos'

export type { CertificadoDados }

export async function gerarCertificadoPDF(
  dados: CertificadoDados,
): Promise<Uint8Array> {
  const { renderCertificadoPDF } = await import('./CertificadoPDF')

  const [frente, verso] = await Promise.all([
    fetch('/templates/certificado_front.png').then((r) => r.arrayBuffer()),
    fetch('/templates/certificado_back.png').then((r) => r.arrayBuffer()),
  ])

  return renderCertificadoPDF(dados, new Uint8Array(frente), new Uint8Array(verso))
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
