import type { FormaPagamento, VozAcao, VozInterpretacao } from "@/lib/types"

export type ConfiancaVoz = "alta" | "media" | "baixa" | "nenhuma"

export interface ComandoVozResultado {
  textoOriginal: string
  acoes: VozAcao[]
  confianca: ConfiancaVoz
  avisos: string[]
}

type TipoAcao = VozAcao["tipo"]

interface RegraCategoria {
  padroes: string[]
  tipo?: TipoAcao
  categoria: string
  descricao: string
}

const REGRAS_CATEGORIA: RegraCategoria[] = [
  {
    padroes: ["mercado", "supermercado", "atacadao", "atacarejo", "carrefour", "extra", "assai", "atacadao dos presentes"],
    tipo: "mercado",
    categoria: "cat-mercado",
    descricao: "Mercado",
  },
  {
    padroes: ["mercadinho", "mercearia", "conveniencia", "mini box", "minibox", "padaria", "acougue", "hortifruti"],
    tipo: "mercadinho",
    categoria: "cat-mercadinho",
    descricao: "Mercadinho",
  },
  { padroes: ["luz", "energia", "celpe", "neoenergia"], categoria: "cat-luz", descricao: "Luz" },
  { padroes: ["agua", "compesa", "saneamento"], categoria: "cat-agua", descricao: "Agua" },
  { padroes: ["internet", "wifi", "wi fi", "fibra"], categoria: "cat-internet", descricao: "Internet" },
  { padroes: ["celular", "telefone", "tim", "claro", "vivo", "oi"], categoria: "cat-celular", descricao: "Celular" },
  { padroes: ["aluguel", "condominio", "locacao"], categoria: "cat-aluguel", descricao: "Aluguel" },
  { padroes: ["comida", "alimentacao", "delivery", "restaurante", "ifood", "lanchonete", "pizza"], categoria: "cat-comida", descricao: "Comida" },
  { padroes: ["salario", "holerite", "pagamento do trabalho"], tipo: "receita", categoria: "cat-salario", descricao: "Salario" },
  { padroes: ["freela", "freelance", "bico"], tipo: "receita", categoria: "cat-freelance", descricao: "Freelance" },
]

const REGRAS_PAGAMENTO: Array<{ padroes: string[]; forma: FormaPagamento }> = [
  { padroes: ["dinheiro", "especie", "cash"], forma: "dinheiro" },
  { padroes: ["credito", "cartao de credito", "no credito"], forma: "credito" },
  { padroes: ["debito", "cartao de debito", "no debito"], forma: "debito" },
  { padroes: ["pix"], forma: "pix" },
]

const NUMEROS_EXTENSO: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezassete: 17,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  duzentos: 200,
  trezentos: 300,
  quatrocentos: 400,
  quinhentos: 500,
  seiscentos: 600,
  setecentos: 700,
  oitocentos: 800,
  novecentos: 900,
  mil: 1000,
}

export function temSuporteVoz(): boolean {
  if (typeof window === "undefined") return false
  return "webkitSpeechRecognition" in window || "SpeechRecognition" in window
}

export function interpretarComandoVoz(texto: string): ComandoVozResultado {
  const original = String(texto || "").trim()
  if (!original) {
    return { textoOriginal: "", acoes: [], confianca: "nenhuma", avisos: ["Nenhum texto informado."] }
  }

  const partes = dividirAcoes(original)
  const acoes = partes
    .map(interpretarFragmento)
    .filter((acao): acao is VozAcao => Boolean(acao))

  const avisos = gerarAvisos(acoes, partes.length)
  return {
    textoOriginal: original,
    acoes,
    confianca: calcularConfianca(acoes, avisos),
    avisos,
  }
}

export function interpretar(texto: string): VozInterpretacao {
  const resultado = interpretarComandoVoz(texto)
  const principal = resultado.acoes[0]

  return {
    tipo: principal?.tipo || null,
    valor: principal?.valor || null,
    categoriaSugerida: principal?.categoriaSugerida || null,
    descricao: principal?.descricao || "",
    formaPagamento: principal?.formaPagamento || null,
    estabelecimentoSugerido: principal?.estabelecimento || null,
    textoOriginal: resultado.textoOriginal,
    acoes: resultado.acoes,
  }
}

export function extrairValores(texto: string): number[] {
  const normalizado = normalizarTexto(texto)
  const valores: number[] = []
  const reNumerico = /(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|real|conto|contos))?/g
  let match: RegExpExecArray | null

  while ((match = reNumerico.exec(normalizado)) !== null) {
    const valor = Number(match[1].replace(",", "."))
    if (valor > 0 && valor < 1000000) valores.push(valor)
  }

  for (const valor of extrairNumerosPorExtenso(normalizado)) {
    if (valor > 0 && !valores.includes(valor)) valores.push(valor)
  }

  return valores
}

function interpretarFragmento(fragmentoOriginal: string): VozAcao | null {
  const texto = normalizarTexto(fragmentoOriginal)
  const valor = extrairValores(texto)[0] || 0
  if (valor <= 0) return null

  const categoria = encontrarCategoria(texto)
  const tipo = detectarTipo(texto, categoria?.tipo)
  const formaPagamento = encontrarPagamento(texto)
  const descricao = categoria?.descricao || montarDescricao(fragmentoOriginal)
  const estabelecimento = tipo === "mercado" || tipo === "mercadinho"
    ? extrairEstabelecimento(fragmentoOriginal, categoria?.descricao)
    : undefined

  return {
    tipo,
    valor,
    descricao,
    categoriaSugerida: categoria?.categoria || categoriaFallback(tipo),
    formaPagamento,
    estabelecimento,
  }
}

function dividirAcoes(texto: string): string[] {
  return texto
    .split(/;|,(?!\d)/)
    .flatMap(dividirPorEEntreAcoes)
    .map(parte => parte.trim())
    .filter(Boolean)
}

function dividirPorEEntreAcoes(texto: string): string[] {
  const palavras = normalizarTexto(texto).split(/\s+/)
  const originais = texto.trim().split(/\s+/)
  const partes: string[] = []
  let inicio = 0

  for (let i = 0; i < palavras.length; i++) {
    if (palavras[i] !== "e") continue
    if (!pareceNovaAcao(palavras, i)) continue

    partes.push(originais.slice(inicio, i).join(" "))
    inicio = i + 1
  }

  partes.push(originais.slice(inicio).join(" "))
  return partes
}

function pareceNovaAcao(palavras: string[], indiceE: number): boolean {
  const anterior = palavras[indiceE - 1]
  const proxima = palavras[indiceE + 1]
  if (ehPalavraDeNumero(anterior)) return false

  const antes = palavras.slice(Math.max(0, indiceE - 5), indiceE).join(" ")
  const depois = palavras.slice(indiceE + 1, indiceE + 7).join(" ")
  if (!depois) return false

  const temValorAntes = extrairValores(antes).length > 0
  const temValorDepois = extrairValores(depois).length > 0 || /^\d/.test(proxima || "")
  const temVerboDepois = /\b(gastei|gasto|paguei|comprei|recebi|ganhei|despesa|receita)\b/.test(depois)

  return (temValorAntes && temValorDepois) || temVerboDepois
}

function encontrarCategoria(texto: string): RegraCategoria | null {
  for (const regra of REGRAS_CATEGORIA) {
    if (regra.padroes.some(padrao => contemTermo(texto, padrao))) return regra
  }
  return null
}

function encontrarPagamento(texto: string): FormaPagamento | undefined {
  return REGRAS_PAGAMENTO.find(regra => regra.padroes.some(padrao => contemTermo(texto, padrao)))?.forma
}

function detectarTipo(texto: string, tipoCategoria?: TipoAcao): TipoAcao {
  if (tipoCategoria) return tipoCategoria
  if (/\b(recebi|ganhei|salario|freela|freelance|receita|pagamento do trabalho)\b/.test(texto)) return "receita"
  if (/\b(mercadinho|mercearia|conveniencia|mini box|minibox)\b/.test(texto)) return "mercadinho"
  if (/\b(mercado|supermercado|atacadao|atacarejo|carrefour|extra|assai)\b/.test(texto)) return "mercado"
  return "despesa"
}

function categoriaFallback(tipo: TipoAcao): string {
  if (tipo === "receita") return "cat-outros-receita"
  if (tipo === "mercado") return "cat-mercado"
  if (tipo === "mercadinho") return "cat-mercadinho"
  return "cat-outros"
}

function extrairEstabelecimento(texto: string, descricaoCategoria?: string): string {
  const limpo = texto
    .replace(/(?:r\$\s*)?\d+(?:[.,]\d{1,2})?\s*(?:reais|real|conto|contos)?/gi, " ")
    .replace(/\b(gastei|gasto|paguei|comprei|fiz compra|uma compra|no|na|em|de|do|da|por|com|pix|credito|debito|dinheiro)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  return capitalizar(limpo || descricaoCategoria || "Mercado")
}

function montarDescricao(texto: string): string {
  const limpo = texto
    .replace(/(?:r\$\s*)?\d+(?:[.,]\d{1,2})?\s*(?:reais|real|conto|contos)?/gi, " ")
    .replace(/\b(gastei|gasto|paguei|comprei|despesa|recebi|ganhei|receita|no|na|em|de|do|da|por|com|pix|credito|debito|dinheiro)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  return capitalizar(limpo) || "Lancamento por voz"
}

function gerarAvisos(acoes: VozAcao[], partes: number): string[] {
  const avisos: string[] = []
  if (acoes.length === 0) avisos.push("Nao encontrei valor na frase.")
  if (partes > acoes.length) avisos.push("Uma parte da frase nao virou lancamento.")
  for (const acao of acoes) {
    if (!acao.categoriaSugerida) avisos.push(`Sem categoria clara para "${acao.descricao}".`)
    if ((acao.tipo === "mercado" || acao.tipo === "mercadinho") && !acao.estabelecimento) {
      avisos.push(`Sem estabelecimento claro para compra de ${acao.tipo}.`)
    }
  }
  return avisos
}

function calcularConfianca(acoes: VozAcao[], avisos: string[]): ConfiancaVoz {
  if (acoes.length === 0) return "nenhuma"
  if (avisos.length === 0 && acoes.every(a => a.valor > 0 && a.categoriaSugerida)) return "alta"
  if (acoes.every(a => a.valor > 0)) return "media"
  return "baixa"
}

function extrairNumerosPorExtenso(texto: string): number[] {
  const valores: number[] = []
  let acumulado = 0
  let parcial = 0

  for (const raw of texto.split(/\s+/)) {
    const palavra = raw.replace(/[^a-z]/g, "")
    const numero = NUMEROS_EXTENSO[palavra]

    if (numero !== undefined) {
      if (numero === 1000) {
        acumulado += (parcial || 1) * 1000
        parcial = 0
      } else {
        parcial += numero
      }
      continue
    }

    if (palavra === "e" || palavra === "") continue

    if (parcial > 0 || acumulado > 0) {
      valores.push(acumulado + parcial)
      acumulado = 0
      parcial = 0
    }
  }

  if (parcial > 0 || acumulado > 0) valores.push(acumulado + parcial)
  return valores
}

function contemTermo(texto: string, termo: string): boolean {
  const t = normalizarTexto(texto)
  const p = normalizarTexto(termo).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`\\b${p}\\b`).test(t)
}

function ehPalavraDeNumero(raw: string | undefined): boolean {
  if (!raw) return false
  return raw in NUMEROS_EXTENSO
}

function normalizarTexto(texto: string): string {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function capitalizar(texto: string): string {
  const limpo = String(texto || "").trim()
  if (!limpo) return ""
  return limpo.charAt(0).toUpperCase() + limpo.slice(1)
}

export function mensagemErroVoz(code: string): string {
  const map: Record<string, string> = {
    "not-allowed": "Permissao de microfone negada. Libere nas configuracoes do navegador.",
    "permission-denied": "Permissao de microfone negada.",
    "no-speech": "Nao ouvi nada. Fale um pouco mais alto e tente de novo.",
    "audio-capture": "Microfone nao disponivel. Verifique se outro app nao esta usando.",
    network: "Sem internet. O reconhecimento de voz do navegador precisa de conexao.",
    aborted: "Reconhecimento cancelado.",
    "service-not-allowed": "Servico de voz indisponivel neste navegador.",
    "language-not-supported": "Idioma portugues nao disponivel neste dispositivo.",
  }

  return map[code] || `Erro: ${code}`
}
