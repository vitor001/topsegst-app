import React from 'react'
import {
  Document,
  Page,
  Image,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from '@react-pdf/renderer'
import type { CertificadoDados } from './tipos'

function fontSrc(): string {
  if (typeof window !== 'undefined') return '/fonts/calibri.ttf'
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
  const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', 'calibri.ttf'))
  let bin = ''
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
  return `data:font/truetype;base64,${btoa(bin)}`
}

Font.register({ family: 'Calibri', src: fontSrc() })
Font.register({ family: 'Calibri', fontWeight: 'bold', src: fontSrcBold() })

function fontSrcBold(): string {
  if (typeof window !== 'undefined') return '/fonts/calibrib.ttf'
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
  const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', 'calibrib.ttf'))
  let bin = ''
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
  return `data:font/truetype;base64,${btoa(bin)}`
}

export const PAGE_SIZE: [number, number] = [842, 596]

const PANEL_BLUE = '#0066cc'
const PANEL_OPACITY = 0.6

const styles = StyleSheet.create({
  page: {
    position: 'relative',
  },
  bg: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  },
  painelFrente: {
    position: 'absolute',
    left: 110,
    top: 95,
    width: 622,
    height: 365,
    backgroundColor: PANEL_BLUE,
    opacity: PANEL_OPACITY,
  },
  textoFrente: {
    position: 'absolute',
    left: 110,
    top: 95,
    width: 622,
    height: 365,
    padding: '25 35 25 35',
  },
  painelVerso: {
    position: 'absolute',
    left: 110,
    top: 120,
    width: 622,
    height: 360,
    backgroundColor: PANEL_BLUE,
    opacity: PANEL_OPACITY,
  },
  textoVerso: {
    position: 'absolute',
    left: 110,
    top: 120,
    width: 622,
    height: 360,
    padding: '25 35 25 35',
  },
  textoBranco: {
    color: '#ffffff',
    fontFamily: 'Calibri',
  },
  cpLine: {
    flexDirection: 'row',
  },
})

export function CertificadoDocument({
  dados,
  frente,
  verso,
}: {
  dados: CertificadoDados
  frente: string
  verso: string
}) {
  return (
    <Document>
      <Page size={PAGE_SIZE} style={styles.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image não usa alt */}
        <Image src={frente} style={styles.bg} />
        <View style={styles.painelFrente} />
        <View style={styles.textoFrente}>
          <Text style={[styles.textoBranco, { fontSize: 20, textAlign: 'center', marginBottom: 2 }]}>
            Certificamos que
          </Text>
          <Text style={[styles.textoBranco, { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }]}>
            {dados.nome}
          </Text>
          <Text style={[styles.textoBranco, { fontSize: 20, textAlign: 'left', lineHeight: 1.6, marginBottom: 12 }]}>
            Portador(a) do CPF: <Text style={[styles.textoBranco, { fontWeight: 'bold' }]}>{dados.cpf}</Text>, participou do treinamento de: <Text style={[styles.textoBranco, { fontWeight: 'bold' }]}>{dados.treinamento}</Text> com carga horária de <Text style={[styles.textoBranco, { fontWeight: 'bold' }]}>{dados.cargaHoraria}</Text>.
          </Text>
          <Text style={[styles.textoBranco, { fontSize: 20, textAlign: 'left', lineHeight: 1.6, marginBottom: 12 }]}>
            Este treinamento foi realizado em <Text style={[styles.textoBranco, { fontWeight: 'bold' }]}>{dados.dataConclusao}</Text> pela TOPSEGST – Segurança do Trabalho nas dependências da <Text style={[styles.textoBranco, { fontWeight: 'bold' }]}>{dados.empresa}</Text> localizada na cidade de <Text style={[styles.textoBranco, { fontWeight: 'bold' }]}>{dados.cidade}{dados.estado ? `-${dados.estado}` : ''}</Text>.
          </Text>
          <Text style={[styles.textoBranco, { fontSize: 20, textAlign: 'left', lineHeight: 1.6 }]}>
            Parabenizamos pela conquista e desejamos sucesso na aplicação dos conhecimentos adquiridos!
          </Text>
        </View>
      </Page>

      <Page size={PAGE_SIZE} style={styles.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image não usa alt */}
        <Image src={verso} style={styles.bg} />
        <View style={styles.painelVerso} />
        <View style={styles.textoVerso}>
          {dados.conteudoProgramatico.map((linha, i) => {
            const labels = 'abcdef'
            const label = labels[i] ? `${labels[i]}) ` : `${i + 1}. `
            return (
              <View key={i} style={[styles.cpLine, { marginBottom: 6 }]}>
                <Text
                  style={[
                    styles.textoBranco,
                    { fontSize: 11, fontWeight: 'bold', marginRight: 4 },
                  ]}
                >
                  {label}
                </Text>
                <Text style={[styles.textoBranco, { fontSize: 11, flex: 1, lineHeight: 1.5 }]}>
                  {linha}
                </Text>
              </View>
            )
          })}
        </View>
      </Page>
    </Document>
  )
}

function toDataUri(bytes: Uint8Array, mime: string): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i])
  }
  return `data:${mime};base64,${btoa(bin)}`
}

export async function renderCertificadoPDF(
  dados: CertificadoDados,
  frente: Uint8Array,
  verso: Uint8Array,
): Promise<Uint8Array> {
  const blob = await pdf(
    <CertificadoDocument
      dados={dados}
      frente={toDataUri(frente, 'image/png')}
      verso={toDataUri(verso, 'image/png')}
    />,
  ).toBlob()
  return new Uint8Array(await blob.arrayBuffer())
}
