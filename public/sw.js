// Service Worker - OrganizaLar PWA
// Versão nova - desativa caches antigos e usa estratégia simples

const CACHE = "organizalar-v3"
const ASSETS_ESSENCIAIS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg",
]

self.addEventListener("install", (e) => {
  // Toma controle imediatamente
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS_ESSENCIAIS).catch(() => {}))
  )
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    Promise.all([
      // Limpa TODOS os caches antigos (incluindo organizalar-v1, v2 do projeto antigo)
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      ),
      // Toma controle de todas as abas abertas
      self.clients.claim(),
    ])
  )
})

self.addEventListener("fetch", (e) => {
  const req = e.request
  if (req.method !== "GET") return
  // Apenas same-origin
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Network-first com fallback para cache (boa estratégia para SPA)
  e.respondWith(
    fetch(req)
      .then((resp) => {
        // Cacheia respostas válidas
        if (resp.ok && resp.type === "basic") {
          const clone = resp.clone()
          caches.open(CACHE).then((c) => c.put(req, clone))
        }
        return resp
      })
      .catch(() => {
        return caches.match(req).then((cached) => {
          if (cached) return cached
          // Fallback para a home se for navegação
          if (req.mode === "navigate") {
            return caches.match("/")
          }
          return new Response("", { status: 404 })
        })
      })
  )
})

// Receberá mensagem da página pra forçar atualização
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
