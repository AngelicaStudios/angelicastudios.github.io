/*
 * Service worker do Painel de Gestão, servido da RAIZ do domínio.
 *
 * Por que na raiz: o manifest declara "scope": "/", então o app instalado engloba
 * também /manutencao-angelica/. Assim os painéis de manutenção abrem DENTRO do app,
 * sem a barra do navegador, sem precisar instalar um app por painel.
 *
 * Escopo x controle: quem decide se a página abre dentro do app é o scope do MANIFEST.
 * Este service worker só precisa existir para o Android instalar como app de verdade.
 * As páginas de /manutencao-angelica/ continuam sendo controladas pelo service worker
 * de lá, que é mais específico — os dois convivem sem conflito.
 *
 * Rede primeiro, sempre. Para HTML o fetch ignora o cache do navegador de propósito:
 * o GitHub Pages manda Cache-Control: max-age=600 e isso segurava versão velha dentro
 * do app instalado depois de cada publicação.
 */
const CACHE = 'angelica-raiz-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.add('/').catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  const ehPagina = req.mode === 'navigate' || req.destination === 'document';
  const pedido = ehPagina
    ? new Request(req.url, { cache: 'reload', credentials: 'same-origin' })
    : req;

  e.respondWith(
    fetch(pedido)
      .then(resp => {
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('/')))
  );
});
