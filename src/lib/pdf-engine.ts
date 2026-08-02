import JSZip from 'jszip'
import { gerarCertificadoPDF } from '@/utils/certificado/gerarCertificadoPDF'
import type { CertificateData } from './types'

export async function generatePdfCertificate(
  data: CertificateData,
): Promise<Blob | null> {
  try {
    const pdfBytes = await gerarCertificadoPDF({
      nome: data.nome,
      cpf: data.cpf,
      treinamento: data.curso,
      cargaHoraria: `${data.carga_horaria} horas`,
      dataConclusao: data.data,
      empresa: data.empresa,
      cidade: data.cidade,
      conteudoProgramatico: data.conteudoProgramatico ?? [],
    })
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
  } catch (err) {
    console.error('[generatePdfCertificate] Error:', err)
    return null
  }
}

export async function generateBatchCertificates(
  _templateUrl: string,
  studentsData: CertificateData[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _turmaName: string,
): Promise<Blob | null> {
  try {
    const zip = new JSZip()

    for (const data of studentsData) {
      try {
        const pdfBytes = await gerarCertificadoPDF({
          nome: data.nome,
          cpf: data.cpf,
          treinamento: data.curso,
          cargaHoraria: `${data.carga_horaria} horas`,
          dataConclusao: data.data,
          empresa: data.empresa,
          cidade: data.cidade,
          conteudoProgramatico: data.conteudoProgramatico ?? [],
        })
        const sanitized = data.nome.replace(/[^a-zA-Z\u00c0-\u00ff\s]/g, '').trim()
        zip.file(`${sanitized} - ${data.curso}.pdf`, pdfBytes)
      } catch (err) {
        console.error(`[generateBatchCertificates] Error for ${data.nome}:`, err)
      }
    }

    return await zip.generateAsync({ type: 'blob' })
  } catch (err) {
    console.error('[generateBatchCertificates] Error:', err)
    return null
  }
}
