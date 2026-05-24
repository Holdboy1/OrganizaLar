import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourcePath = path.join(root, "lib", "domain", "voz.ts")
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

const { interpretarComandoVoz, extrairValores } = sandbox.exports

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function approx(a, b) {
  return Math.abs(a - b) < 0.001
}

const casos = [
  {
    frase: "Gastei 80 no Atacadao e 99 reais de internet",
    totalAcoes: 2,
    tipos: ["mercado", "despesa"],
    valores: [80, 99],
    categorias: ["cat-mercado", "cat-internet"],
  },
  {
    frase: "Recebi 5000 de salario",
    totalAcoes: 1,
    tipos: ["receita"],
    valores: [5000],
    categorias: ["cat-salario"],
  },
  {
    frase: "Paguei cento e cinquenta reais de luz no credito",
    totalAcoes: 1,
    tipos: ["despesa"],
    valores: [150],
    categorias: ["cat-luz"],
    pagamento: "credito",
  },
  {
    frase: "Comprei 32,50 no mercadinho no pix",
    totalAcoes: 1,
    tipos: ["mercadinho"],
    valores: [32.5],
    categorias: ["cat-mercadinho"],
    pagamento: "pix",
  },
  {
    frase: "Gastei 45 no acougue e vinte reais de celular",
    totalAcoes: 2,
    tipos: ["mercadinho", "despesa"],
    valores: [45, 20],
    categorias: ["cat-mercadinho", "cat-celular"],
  },
]

assert(approx(extrairValores("cento e cinquenta reais")[0], 150), "Falhou valor por extenso")
assert(approx(extrairValores("32,50")[0], 32.5), "Falhou decimal com virgula")

for (const caso of casos) {
  const resultado = interpretarComandoVoz(caso.frase)
  assert(resultado.acoes.length === caso.totalAcoes, `${caso.frase}: total de acoes errado`)

  caso.tipos.forEach((tipo, index) => {
    const acao = resultado.acoes[index]
    assert(acao.tipo === tipo, `${caso.frase}: tipo ${index} deveria ser ${tipo}, veio ${acao.tipo}`)
    assert(approx(acao.valor, caso.valores[index]), `${caso.frase}: valor ${index} errado`)
    assert(acao.categoriaSugerida === caso.categorias[index], `${caso.frase}: categoria ${index} errada`)
  })

  if (caso.pagamento) {
    assert(resultado.acoes[0].formaPagamento === caso.pagamento, `${caso.frase}: pagamento errado`)
  }
}

console.log(`OK - ${casos.length} casos de voz validados`)
