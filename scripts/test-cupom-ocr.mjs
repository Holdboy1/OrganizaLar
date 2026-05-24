import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import sharp from "sharp"
import { createWorker } from "tesseract.js"
import ts from "typescript"

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourcePath = path.join(root, "lib", "domain", "cupom-fiscal.ts")
const screenshotPath = "C:/Users/holdboy/Pictures/Screenshots/Captura de tela 2026-05-24 095051.png"
const chaveEsperada = "26260508071185000137653100001746341310814405"

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function carregarParser() {
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
  return sandbox.exports
}

async function reconhecerTexto(imagePath, lang, parameters = {}) {
  const worker = await createWorker(lang)
  if (Object.keys(parameters).length > 0) await worker.setParameters(parameters)
  const { data } = await worker.recognize(imagePath)
  await worker.terminate()
  return String(data.text || "").trim()
}

async function prepararFaixaChave(imagePath) {
  const metadata = await sharp(imagePath).metadata()
  const width = metadata.width || 1
  const height = metadata.height || 1
  const top = Math.floor(height * 0.82)
  const outputPath = path.join(root, ".tmp-cupom-chave.png")

  await sharp(imagePath)
    .extract({ left: 0, top, width, height: height - top })
    .resize({ width: width < 900 ? width * 3 : width * 2 })
    .grayscale()
    .normalize()
    .png()
    .toFile(outputPath)

  return outputPath
}

assert(fs.existsSync(screenshotPath), `Print de teste nao encontrado: ${screenshotPath}`)

const { parseQRCodeNFCe, parseDadosTextoCupom } = carregarParser()
const textoGeral = await reconhecerTexto(screenshotPath, "por")
const faixaChave = await prepararFaixaChave(screenshotPath)
const textoChave = await reconhecerTexto(faixaChave, "eng", {
  tessedit_pageseg_mode: "6",
  tessedit_char_whitelist: "0123456789 ",
})
const textoFinal = `${textoGeral}\n${textoChave}`
const cupom = parseQRCodeNFCe(textoFinal)
const dados = parseDadosTextoCupom(textoFinal)

assert(cupom?.chaveAcesso === chaveEsperada, "OCR do print real deveria reconhecer a chave NFC-e")
assert(cupom?.cnpjEmitente === "08071185000137", "OCR do print real deveria extrair CNPJ pela chave")
assert(dados.emitenteNome === "A.J.J. EMPRESA DE ALIMENTOS LTDA", "OCR do print real deveria reconhecer o emitente")

fs.rmSync(faixaChave, { force: true })
console.log("OK - OCR do print real validado")
