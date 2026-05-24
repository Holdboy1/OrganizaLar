import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourcePath = path.join(root, "lib", "domain", "cupom-fiscal.ts")
const source = fs.readFileSync(sourcePath, "utf8")

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
})

const sandbox = { exports: {}, require, console }
vm.runInNewContext(compiled.outputText, sandbox, { filename: sourcePath })

const {
  parseQRCodeNFCe,
  formatarCNPJ,
  cupomJaImportado,
  parseDadosTextoCupom,
  parseTextoItensCupom,
} = sandbox.exports

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const chavePE = "26240512345678000195650010000012341000012345"
const qr = `https://nfce.sefaz.pe.gov.br/nfce/consulta?p=${chavePE}|2|1|1|ABC`
const parsed = parseQRCodeNFCe(qr)

assert(parsed, "QR deveria ser reconhecido")
assert(parsed.chaveAcesso === chavePE, "Chave extraida errada")
assert(parsed.uf === "26", "UF deveria ser PE")
assert(parsed.ehPE === true, "Cupom deveria ser marcado como PE")
assert(parsed.cnpjEmitente === "12345678000195", "CNPJ extraido errado")
assert(formatarCNPJ(parsed.cnpjEmitente) === "12.345.678/0001-95", "Formatacao CNPJ errada")

const parsedDireto = parseQRCodeNFCe(chavePE)
assert(parsedDireto?.chaveAcesso === chavePE, "Chave direta deveria ser reconhecida")

const chaveRealUsuario = "26260508071185000137653100001746341310814405"
const parsedUsuario = parseQRCodeNFCe(chaveRealUsuario)
assert(parsedUsuario?.chaveAcesso === chaveRealUsuario, "Chave real do usuario deveria ser reconhecida")
assert(parsedUsuario?.cnpjEmitente === "08071185000137", "CNPJ da chave real do usuario errado")
assert(parsedUsuario?.valorTotal === null, "Chave pura nao deveria fingir valor total")

const state = { comprasMercado: [{ chaveAcesso: chavePE }] }
assert(cupomJaImportado(chavePE, state), "Duplicidade deveria ser detectada")

const itens = parseTextoItensCupom(`
ARROZ TIPO 1 5KG    1 UN  R$ 28,90  R$ 28,90
FEIJAO CARIOCA      2 UN  8,50  17,00
TOTAL R$ 45,90
`)

assert(itens.length === 2, "Parser deveria reconhecer 2 itens")
assert(itens[0].nome === "ARROZ TIPO 1 5KG", "Nome do primeiro item errado")
assert(itens[0].valorTotal === 28.9, "Valor do primeiro item errado")
assert(itens[1].quantidade === 2, "Quantidade do segundo item errada")

const dadosTexto = parseDadosTextoCupom(`
Forma de pagamento: PIX
ARROZ TIPO 1 5KG    1 UN  R$ 28,90  R$ 28,90
FEIJAO CARIOCA      2 UN  8,50  17,00
Valor total R$ 45,90
`)

assert(dadosTexto.valorTotal === 45.9, "Total do texto oficial deveria ser extraido")
assert(dadosTexto.formaPagamento === "pix", "Forma de pagamento deveria ser pix")
assert(dadosTexto.itens.length === 2, "Texto oficial deveria extrair itens")

const textoPrintSefaz = `
A.J.J. EMPRESA DE ALIMENTOS LTDA
CNPJ: 08.071.185/0001-37
MOIDA 2 KG KG (Codigo: 2427) Vl. Total
15,90
Qtde.: 0,53 UN: KG0001 Vl. Unit.: 30
CAFE SAO BRAZ ALIMOF FAMILIA 250G (Codigo: 1883) Vl. Total
14,65
Qtde.: 1 UN: UN0001 Vl. Unit.: 14,65
REFR SPRITE PET 250ML (Codigo: 1927) Vl. Total
1,99
Qtde.: 1 UN: UN0001 Vl. Unit.: 1,99
Valor a pagar R$: 38,51
Forma de pagamento:
Cartao de Credito
Chave de acesso:
2626 0508 0711 8500 0137 6531 0000 1746 3413 1081 4405
`

const parsedPrint = parseQRCodeNFCe(textoPrintSefaz)
assert(parsedPrint?.chaveAcesso === chaveRealUsuario, "Chave espacada do print deveria ser reconhecida")

const dadosPrint = parseDadosTextoCupom(textoPrintSefaz)
assert(dadosPrint.emitenteNome === "A.J.J. EMPRESA DE ALIMENTOS LTDA", "Emitente do print deveria ser reconhecido")
assert(dadosPrint.cnpjEmitente === "08071185000137", "CNPJ do print deveria ser reconhecido")
assert(dadosPrint.valorTotal === 38.51, "Valor total do print deveria ser 38,51")
assert(dadosPrint.formaPagamento === "credito", "Forma de pagamento do print deveria ser credito")
assert(dadosPrint.itens.length >= 3, "Itens do layout SEFAZ deveriam ser reconhecidos")
assert(dadosPrint.itens[0].nome === "MOIDA 2 KG KG", "Nome do item SEFAZ errado")
assert(dadosPrint.itens[0].quantidade === 0.53, "Quantidade do item SEFAZ errada")

console.log("OK - cupom fiscal validado")
