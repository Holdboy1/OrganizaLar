import type { AppState, FormaPagamento, TipoMercado } from "@/lib/types"

export interface CupomFiscalQr {
  chaveAcesso: string
  uf: string
  cnpjEmitente: string
  ano: string
  mes: string
  ehPE: boolean
  valorTotal: number | null
  urlConsulta: string
  conteudoOriginal: string
}

export interface ItemCupomParseado {
  nome: string
  quantidade: number
  unidade: string
  valorUnitario: number
  valorTotal: number
}

export interface DadosTextoCupom {
  valorTotal: number | null
  formaPagamento: FormaPagamento | null
  itens: ItemCupomParseado[]
}

const UNIDADES_VALIDAS = ["un", "kg", "g", "l", "ml", "dz", "pct", "cx", "pc"]

export function parseQRCodeNFCe(conteudo: string): CupomFiscalQr | null {
  const texto = String(conteudo || "").trim()
  if (!texto) return null

  let chave: string | null = null

  const p = texto.match(/[?&]p=(\d{44})/i)
  if (p) chave = p[1]

  if (!chave) {
    const chNFe = texto.match(/[?&]chNFe=(\d{44})/i)
    if (chNFe) chave = chNFe[1]
  }

  if (!chave) {
    const direta = texto.match(/\b(\d{44})\b/)
    if (direta) chave = direta[1]
  }

  if (!chave) return null

  const uf = chave.slice(0, 2)
  const aamm = chave.slice(2, 6)
  const cnpjEmitente = chave.slice(6, 20)
  const ano = `20${aamm.slice(0, 2)}`
  const mes = aamm.slice(2, 4)
  const valorTotal = extrairValorDoQr(texto)

  return {
    chaveAcesso: chave,
    uf,
    cnpjEmitente,
    ano,
    mes,
    ehPE: uf === "26",
    valorTotal,
    urlConsulta: `https://nfce.sefaz.pe.gov.br:444/nfce-web/consultarNFCe?chNFe=${chave}`,
    conteudoOriginal: texto,
  }
}

export function formatarCNPJ(cnpj: string): string {
  const limpo = String(cnpj || "").replace(/\D/g, "")
  if (limpo.length !== 14) return cnpj
  return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12, 14)}`
}

export function cupomJaImportado(chaveAcesso: string, state: AppState): boolean {
  const chave = String(chaveAcesso || "").trim()
  if (!chave) return false
  return state.comprasMercado.some(compra => compra.chaveAcesso === chave)
}

export function sugerirTipoPorCNPJ(cnpj: string, state: AppState): TipoMercado {
  const limpo = String(cnpj || "").replace(/\D/g, "")
  const existente = state.estabelecimentos.find(e => e.cnpj === limpo)
  return existente?.tipo || "mercado"
}

export function sugerirFormaPagamento(texto: string): FormaPagamento {
  const normalizado = normalizarTexto(texto)
  if (/\bpix\b/.test(normalizado)) return "pix"
  if (/\bcredito|cartao de credito\b/.test(normalizado)) return "credito"
  if (/\bdebito|cartao de debito\b/.test(normalizado)) return "debito"
  if (/\bdinheiro|especie\b/.test(normalizado)) return "dinheiro"
  return "dinheiro"
}

export function parseDadosTextoCupom(texto: string): DadosTextoCupom {
  const itens = parseTextoItensCupom(texto)
  const valorTotal = extrairTotalDoTexto(texto) || somaItens(itens)
  const formaPagamento = extrairFormaPagamentoDoTexto(texto)

  return {
    valorTotal: valorTotal && valorTotal > 0 ? valorTotal : null,
    formaPagamento,
    itens,
  }
}

export function parseTextoItensCupom(texto: string): ItemCupomParseado[] {
  return String(texto || "")
    .split(/\r?\n/)
    .map(linha => parseLinhaItemCupom(linha.trim()))
    .filter((item): item is ItemCupomParseado => Boolean(item))
}

function extrairTotalDoTexto(texto: string): number | null {
  const linhas = String(texto || "").split(/\r?\n/).map(linha => linha.trim()).filter(Boolean)
  const padroes = [
    /valor\s+total\s+(?:r\$)?\s*([\d.,]+)/i,
    /total\s+da\s+nota\s+(?:r\$)?\s*([\d.,]+)/i,
    /valor\s+a\s+pagar\s+(?:r\$)?\s*([\d.,]+)/i,
    /total\s+(?:r\$)?\s*([\d.,]+)/i,
  ]

  for (const linha of linhas) {
    for (const padrao of padroes) {
      const match = linha.match(padrao)
      if (match) {
        const valor = parseValorBR(match[1])
        if (valor > 0) return valor
      }
    }
  }

  return null
}

function extrairFormaPagamentoDoTexto(texto: string): FormaPagamento | null {
  const normalizado = normalizarTexto(texto)
  if (/\bpix\b/.test(normalizado)) return "pix"
  if (/\bcredito|cartao credito|cartao de credito\b/.test(normalizado)) return "credito"
  if (/\bdebito|cartao debito|cartao de debito\b/.test(normalizado)) return "debito"
  if (/\bdinheiro|especie\b/.test(normalizado)) return "dinheiro"
  return null
}

function somaItens(itens: ItemCupomParseado[]): number | null {
  if (itens.length === 0) return null
  const total = itens.reduce((soma, item) => soma + item.valorTotal, 0)
  return Number(total.toFixed(2))
}

export function parseLinhaItemCupom(linha: string): ItemCupomParseado | null {
  if (!linha) return null
  if (/^(produto|descricao|descrição|item|cod|codigo|nome|qtd|quantidade|valor|total|subtotal|forma de pagamento|troco)/i.test(linha)) {
    return null
  }

  let match = linha.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s+(UN|KG|G|L|ML|DZ|PCT|CX|PC)\s+R?\$?\s*([\d.,]+)\s+R?\$?\s*([\d.,]+)\s*$/i)
  if (match) {
    return montarItem(match[1], match[2], match[3], match[4], match[5])
  }

  match = linha.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s+(UN|KG|G|L|ML|DZ|PCT|CX|PC)\s+R?\$?\s*([\d.,]+)\s*$/i)
  if (match) {
    const quantidade = parseQuantidade(match[2])
    const valorTotal = parseValorBR(match[4])
    return montarItem(match[1], match[2], match[3], quantidade > 0 ? String(valorTotal / quantidade) : match[4], match[4])
  }

  match = linha.match(/^(.+?)\s{2,}(\d+(?:[.,]\d+)?)\s+R?\$?\s*([\d.,]+)\s+R?\$?\s*([\d.,]+)\s*$/)
  if (match) {
    return montarItem(match[1], match[2], "un", match[3], match[4])
  }

  match = linha.match(/^(.+?)\s{3,}R?\$?\s*([\d.,]+)\s*$/)
  if (match) {
    const valor = parseValorBR(match[2])
    if (valor <= 0) return null
    return montarItem(match[1], "1", "un", match[2], match[2])
  }

  return null
}

function montarItem(nome: string, quantidadeRaw: string, unidadeRaw: string, valorUnitarioRaw: string, valorTotalRaw: string): ItemCupomParseado | null {
  const quantidade = parseQuantidade(quantidadeRaw)
  const valorTotal = parseValorBR(valorTotalRaw)
  if (!nome || quantidade <= 0 || valorTotal <= 0) return null

  return {
    nome: limparNomeItem(nome),
    quantidade,
    unidade: detectarUnidade(unidadeRaw),
    valorUnitario: parseValorBR(valorUnitarioRaw),
    valorTotal,
  }
}

function extrairValorDoQr(texto: string): number | null {
  const match = texto.match(/[?&]vNF=([\d.,]+)/i) || texto.match(/\|vNF=([\d.,]+)/i)
  if (!match) return null
  const valor = parseValorBR(match[1])
  return valor > 0 ? valor : null
}

function parseValorBR(valor: string): number {
  const limpo = String(valor || "").replace(/r\$/i, "").replace(/\s/g, "").trim()
  if (!limpo) return 0
  if (limpo.includes(",") && limpo.includes(".")) return Number(limpo.replace(/\./g, "").replace(",", ".")) || 0
  if (limpo.includes(",")) return Number(limpo.replace(",", ".")) || 0
  return Number(limpo) || 0
}

function parseQuantidade(valor: string): number {
  const match = String(valor || "").match(/(\d+(?:[.,]\d+)?)/)
  if (!match) return 0
  return Number(match[1].replace(",", ".")) || 0
}

function detectarUnidade(valor: string): string {
  const unidade = normalizarTexto(valor).replace(/[^a-z]/g, "")
  if (UNIDADES_VALIDAS.includes(unidade)) return unidade === "cx" || unidade === "pc" ? "un" : unidade
  if (unidade.startsWith("kg")) return "kg"
  if (unidade === "g") return "g"
  if (unidade.startsWith("ml")) return "ml"
  if (unidade.startsWith("l") && unidade.length <= 3) return "l"
  if (unidade.startsWith("pc")) return "pct"
  return "un"
}

function limparNomeItem(nome: string): string {
  return String(nome || "")
    .replace(/^\s*\d+\s*[-–]\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function normalizarTexto(texto: string): string {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
