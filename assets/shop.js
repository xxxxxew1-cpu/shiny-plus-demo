/* Общий код сайта «ШИНА +» для всех страниц прототипа:
   данные товаров, корзина, карточки с 3D-рендерами, барабан выбора, световые шлейфы на фоне.
   Подключается обычным <script> в конце страницы, до скрипта самой страницы. */
'use strict';

const WA_NUMBER = '79059102002';
const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

// real: true — товары из текущего каталога shiny-plus.ru, остальные — примеры для макета.
// В WordPress этот список заменит вывод WooCommerce.
const TIRES = [
  { id: 't1', brand: 'Ikon Tyres', model: 'Nordman 8', width: 205, profile: 55, d: 16, index: '94T', season: 'winter', price: 7900 },
  { id: 't2', brand: 'Yokohama', model: 'iceGuard Stud IG65', width: 205, profile: 55, d: 16, index: '94T', season: 'winter', price: 9600 },
  { id: 't3', brand: 'Triangle', model: 'IcelynX TI501', width: 205, profile: 55, d: 16, index: '94T', season: 'winter', price: 6300 },
  { id: 't4', brand: 'Maxxis', model: 'Premitra Ice Nord NS5', width: 185, profile: 65, d: 15, index: '92T', season: 'winter', price: 6100 },
  { id: 't5', brand: 'Nexen', model: 'Winguard winSpike 3', width: 195, profile: 65, d: 15, index: '95T', season: 'winter', price: 6700 },
  { id: 't6', brand: 'Pirelli Formula', model: 'Ice', width: 215, profile: 60, d: 16, index: '99T', season: 'winter', price: 8400 },
  { id: 't7', brand: 'Ikon Tyres', model: 'Nordman 8', width: 175, profile: 70, d: 13, index: '82T', season: 'winter', price: 5200 },
  { id: 't8', brand: 'Fronway', model: 'Ecogreen 66', width: 165, profile: 55, d: 14, index: '72H', season: 'summer', price: 4450, real: true },
  { id: 't9', brand: 'Nexen', model: "N'blue HD Plus", width: 205, profile: 55, d: 16, index: '91V', season: 'summer', price: 6200 },
  { id: 't10', brand: 'Yokohama', model: 'BluEarth-ES ES32', width: 195, profile: 65, d: 15, index: '91H', season: 'summer', price: 6900 },
  { id: 't11', brand: 'Nexen', model: "N'Priz 4S", width: 195, profile: 65, d: 15, index: '91H', season: 'all', price: 6500 },
  { id: 't12', brand: 'Maxxis', model: 'AP2 All Season', width: 205, profile: 55, d: 16, index: '91V', season: 'all', price: 6800 },
];
const WHEELS = [
  { id: 'w1', brand: 'Trebl', model: '5155T', note: 'Штампованный, чёрный', rim: '5,0', d: 14, pcd: '4×100', et: 45, dia: '54,1', price: 2600, real: true },
  { id: 'w2', brand: 'Trebl', model: '64A50C', note: 'Штампованный, чёрный', rim: '6,0', d: 15, pcd: '4×100', et: 50, dia: '60,1', price: 3300 },
  { id: 'w3', brand: 'Trebl', model: '7255', note: 'Штампованный, чёрный', rim: '6,0', d: 15, pcd: '4×100', et: 48, dia: '54,1', price: 3100 },
  { id: 'w4', brand: 'Trebl', model: '8114', note: 'Штампованный, чёрный', rim: '6,5', d: 16, pcd: '5×114,3', et: 45, dia: '60,1', price: 4100 },
];

const SEASONS = {
  winter: { one: 'Зимняя, шипы', many: 'Зимние шипованные шины' },
  summer: { one: 'Летняя', many: 'Летние шины' },
  all: { one: 'Всесезонная', many: 'Всесезонные шины' },
};
const range = (from, to, step) => { const out = []; for (let v = from; v <= to; v += step) out.push(String(v)); return out; };
const OPTIONS = {
  tires: { width: range(135, 335, 10), profile: range(35, 70, 5), diameter: range(13, 21, 1) },
  wheels: {
    diameter: range(13, 21, 1),
    pcd: ['4×98', '4×100', '4×108', '4×114,3', '5×100', '5×105', '5×108', '5×112', '5×114,3', '5×120', '5×139,7', '6×139,7'],
    et: ['', '35', '37', '38', '40', '43', '45', '46', '47', '49', '50'],
  },
};
const FIELD_TITLES = {
  tires: { width: 'Ширина, мм', profile: 'Профиль, %', diameter: 'Диаметр, дюймы' },
  wheels: { diameter: 'Диаметр, дюймы', pcd: 'Сверловка', et: 'Вылет, мм' },
};
// пустое значение — «любая/любой» по роду поля: так оно подписано в барабане
const optionLabel = (field, value) => value || ({ width: 'любая', pcd: 'любая' }[field] || 'любой');
const NOUN_SHOW = { tires: ['шину', 'шины', 'шин'], wheels: ['диск', 'диска', 'дисков'] };
const NOUN_FOUND = { tires: ['шина', 'шины', 'шин'], wheels: ['диск', 'диска', 'дисков'] };
const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;

const plural = (n, [one, few, many]) => {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
};
const rub = (n) => `${n.toLocaleString('ru-RU')}<span class="cur"> ₽</span>`;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
// Время анимаций — только performance.now(): метка кадра rAF бывает раньше момента клика
const progress = (start, dur) => clamp((performance.now() - start) / dur, 0, 1);
const replay = (el, cls) => {
  if (reduceMotion.matches) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
};
const pcdMm = (pcd) => parseFloat(pcd.split('×')[1].replace(',', '.'));

// ---------- Общая разметка: иконки и барабан выбора ----------
document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-winter" viewBox="0 0 24 24"><path d="M12 2.5v19M3.8 7.25l16.4 9.5M20.2 7.25 3.8 16.75M9.6 4.1 12 6.5l2.4-2.4M9.6 19.9 12 17.5l2.4 2.4"/></symbol>
  <symbol id="i-summer" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></symbol>
  <symbol id="i-all" viewBox="0 0 24 24"><circle cx="8.5" cy="8.5" r="3"/><path d="M8.5 2.5v1.3M8.5 13.2v1.3M2.5 8.5h1.3M13.2 8.5h1.3M4.3 4.3l.9.9M11.8 4.3l-.9.9M17 12.5v9M13.1 14.75l7.8 4.5M20.9 14.75l-7.8 4.5"/></symbol>
  <symbol id="i-wheel" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3v6.5M12 14.5V21M3.4 9.2l6.2 2M14.4 12.8l6.2 2M6.7 19.3l3.8-5.2M13.5 9.9l3.8-5.2"/></symbol>
  <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
  <symbol id="i-chat" viewBox="0 0 24 24"><path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.6z"/></symbol>
  <symbol id="i-cart" viewBox="0 0 24 24"><path d="M3 4h2.2l2.3 11h10.3l2-8H6.4"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="16.5" cy="19.5" r="1.3"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></symbol>
  <symbol id="i-filter" viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></symbol>
</svg>`);
document.body.insertAdjacentHTML('beforeend', `<div class="drum-backdrop" id="drum-backdrop" hidden></div>
<div class="drum-pop" id="drum-pop" hidden>
  <div class="drum-head">
    <span class="drum-title" id="drum-title"></span>
    <button type="button" class="drum-done" id="drum-done">Готово</button>
  </div>
  <div class="drum-body">
    <div class="drum" id="drum" role="listbox" tabindex="0" aria-labelledby="drum-title">
      <div class="drum-band" aria-hidden="true"></div>
      <ul class="drum-list" id="drum-list" role="presentation"></ul>
    </div>
    <div class="drum-extra" id="drum-extra" hidden></div>
  </div>
  <p class="drum-legend" id="drum-legend"><span class="drum-dot" aria-hidden="true"></span>есть в наличии</p>
</div>`);

// ---------- Световые шлейфы на фоне: как фары и стоп-сигналы на длинной выдержке ----------
function startRibbons(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) { canvas.remove(); return; }
  const small = window.matchMedia('(max-width: 760px)').matches;
  const N = small ? 18 : 34;
  const vs = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';
  const fs = `precision highp float;
    uniform vec2 uRes, uMouse;
    uniform float uTime, uScroll, uFade, uPortrait;
    float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      float sc = uScroll, t = uTime;
      // изогнутая лента света идёт по диагонали сверху вниз: сверху — между формой и колесом, снизу — за подиумом.
      // При прокрутке дуга перекатывается, лента перекручивается, весь пучок мягко покачивается
      float sway = 0.06 * sin(sc * 9.4248) + uMouse.x * 0.02;
      float x0 = mix(0.3, 0.02, uPortrait) + sway;
      float slope = mix(-0.5, -0.28, uPortrait);
      float bendA = mix(0.11, 0.07, uPortrait);
      float bph = uv.y * 1.5 + sc * 4.0 + t * 0.07;
      float xc = x0 + slope * uv.y + bendA * sin(bph);
      float dxc = slope + bendA * 1.5 * cos(bph);
      float tw = uv.y * 2.8 + sc * 8.0 + t * 0.15;                       // перекрут ленты по длине
      vec3 col = vec3(0.0);
      for (int i = 0; i < ${N}; i++) {
        float fi = float(i), u = fi / ${N - 1}.0;
        float r = hash(fi + 0.37), r2 = hash(fi * 3.71 + 1.3);
        // две ленты: широкая основная и тонкая, которая крутится навстречу, отходит в сторону и возвращается
        float second = step(0.72, u);
        float lane = mix(u / 0.72, (u - 0.72) / 0.28, second) - 0.5;
        float width = mix(0.14, 0.05, second) * mix(1.0, 0.7, uPortrait);
        float offs = second * (0.09 * sin(uv.y * 2.0 - sc * 6.0 + 1.3) + 0.05);
        float dir = 1.0 - 2.0 * second;
        float twl = tw * dir;
        float x = xc + offs + lane * width * cos(twl) + 0.006 * sin(uv.y * 9.0 + fi + t * 0.5);
        float dx = dxc - lane * width * sin(twl) * 2.8 * dir;
        float d = abs(uv.x - x) / sqrt(1.0 + dx * dx);
        float w = mix(0.0008, 0.0024, r2);
        float core = w / (d + w);
        float glow = core * core + 0.05 * core;
        // огни бегут вдоль нитей: прокрутка ведёт их, а в покое они медленно мерцают
        float run = 0.6 + 0.4 * sin(uv.y * 2.4 + sc * 18.0 + t * (0.4 + 0.4 * r) + fi * 1.7);
        // ближняя к нам сторона перекрученной ленты ярче дальней
        float shade = 0.55 + 0.45 * (0.5 + 0.5 * sin(twl) * sign(lane + 0.001));
        float mid = 1.0 - abs(lane) * 1.1;
        vec3 c = mix(vec3(0.92, 0.07, 0.03), vec3(1.0, 0.42, 0.16), r2);   // стоп-сигналы
        c = mix(c, vec3(0.92, 0.95, 1.0), step(0.86, r));                   // редкие белые — фары
        col += c * glow * run * shade * (0.45 + 0.55 * mid);
      }
      // искры
      vec2 cell = floor(uv * 60.0);
      float s = hash(cell.x * 13.0 + cell.y * 71.0);
      vec2 f = fract(uv * 60.0) - 0.5;
      col += vec3(1.0, 0.6, 0.45) * step(0.992, s) * (0.5 + 0.5 * sin(t * 2.0 + s * 40.0)) * smoothstep(0.12, 0.0, length(f)) * 0.6;
      // у текста и каталога шлейфы тише
      float intensity = mix(1.0, 0.5, smoothstep(0.04, 0.3, sc)) * uFade;
      // на телефоне колесо сверху, текст ниже — под текстом шлейфы приглушаем
      intensity *= mix(1.0, mix(0.4, 1.0, smoothstep(-0.12, 0.14, uv.y)), uPortrait * (1.0 - smoothstep(0.0, 0.15, sc)));
      intensity *= mix(mix(0.22, 1.0, smoothstep(-0.45, 0.12, uv.x)), 1.0, uPortrait);
      // на телефоне пучок идёт через текст — чуть тише
      intensity *= mix(1.0, 0.75, uPortrait);
      col = 1.0 - exp(-col * 1.3 * intensity);
      gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
    }`;
  const shader = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); return sh; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('Шлейфы не собрались:', gl.getProgramInfoLog(prog)); canvas.remove(); return; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = Object.fromEntries(['uRes', 'uMouse', 'uTime', 'uScroll', 'uFade', 'uPortrait'].map((n) => [n, gl.getUniformLocation(prog, n)]));

  let scroll = 0, scrollGoal = 0, mx = 0, my = 0, mxGoal = 0, myGoal = 0, raf = 0, last = 0;
  const start = performance.now();
  const resize = () => {
    const k = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.5) * (small ? 0.8 : 0.75);
    canvas.width = Math.round(innerWidth * k);
    canvas.height = Math.round(innerHeight * k);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const readScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollGoal = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
  };
  function draw(now = performance.now()) {
    scroll += (scrollGoal - scroll) * (reduceMotion.matches ? 1 : 0.08);
    mx += (mxGoal - mx) * 0.05;
    my += (myGoal - my) * 0.05;
    const time = reduceMotion.matches ? 8 : (now - start) / 1000;
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform2f(u.uMouse, mx, -my);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uScroll, scroll);
    gl.uniform1f(u.uFade, reduceMotion.matches ? 1 : easeOut(clamp((now - start) / 1800, 0, 1)));
    gl.uniform1f(u.uPortrait, canvas.width < canvas.height ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < 1000 / 45) return;   // ~45 кадров в секунду хватает для плавного света
    last = now;
    draw(now);
  }
  addEventListener('scroll', () => { readScroll(); if (reduceMotion.matches) draw(); }, { passive: true });
  addEventListener('resize', () => { resize(); readScroll(); draw(); });
  addEventListener('pointermove', (e) => { mxGoal = e.clientX / innerWidth - 0.5; myGoal = e.clientY / innerHeight - 0.5; }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf && !reduceMotion.matches) raf = requestAnimationFrame(loop);
  });
  resize();
  readScroll();
  scroll = scrollGoal;
  if (reduceMotion.matches) draw(); else raf = requestAnimationFrame(loop);
}

// ---------- Появление блоков при прокрутке ----------
const revealer = 'IntersectionObserver' in window && !reduceMotion.matches
  ? new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); revealer.unobserve(e.target); }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 })
  : null;
function reveal(els, step = 1) {
  els.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.setProperty('--i', (i % 8) * step);
    if (revealer) revealer.observe(el); else el.classList.add('is-in');
  });
}

// Схема сечения обода: пунктир — середина обода, красное — привалочная плоскость, между ними вылет
function etDiagram(value) {
  // «любой»: та же схема без числа — плоскость на типичном месте, бледнее; левая половина окна не пустеет
  const any = !value;
  const et = any ? 40 : +value, mm = 0.9;       // масштаб: обод шириной около 165 мм
  const cx = 100, inner = 26, outer = 174, mx = cx + et * mm;
  const label = any ? 'Схема: вылет — расстояние от середины обода до привалочной плоскости' : `Схема: вылет ${et} мм — расстояние от середины обода до привалочной плоскости`;
  return `<svg viewBox="0 0 200 146" role="img" aria-label="${label}">
    <path d="M${inner} 22 V36 H${outer} V22" fill="none" stroke="#A7AEB6" stroke-width="2" stroke-linejoin="round"/>
    <path d="M${outer - 10} 36 C${outer - 10} 68 ${mx + 8} 70 ${mx} 96 V112" fill="none" stroke="#A7AEB6" stroke-width="2"/>
    <line x1="${cx}" y1="12" x2="${cx}" y2="124" stroke="#707882" stroke-width="1" stroke-dasharray="3 3"/>
    <line x1="${mx}" y1="84" x2="${mx}" y2="124" stroke="#FF3A2E" stroke-width="3"${any ? ' stroke-opacity=".5"' : ''}/>
    <line x1="${cx}" y1="120" x2="${mx}" y2="120" stroke="#F2F3F5" stroke-width="1"/>
    <text class="et-value" x="${(cx + mx) / 2}" y="134" text-anchor="middle">${any ? 'ET' : `ET ${et}`}</text>
    <text x="${cx - 4}" y="10" text-anchor="end">середина обода</text>
    <text x="${mx - 6}" y="100" text-anchor="end">привалочная</text>
    <text x="${mx - 6}" y="110" text-anchor="end">плоскость</text>
    <text x="${inner}" y="144">к автомобилю</text>
    <text x="${outer}" y="144" text-anchor="end">наружу</text>
  </svg>
  <p class="et-note">${any ? 'Вылет — расстояние от середины обода до привалочной плоскости, в миллиметрах.' : 'Меньше вылет — колесо сильнее выступает из арки, больше — глубже уходит в неё.'}</p>`;
}

// ---------- Рендеры колёс для карточек ----------
// Снимает каждое колесо тем же 3D, что и на главной. Страница передаёт свою сцену через thumbs.use().
const thumbs = (() => {
  const cache = new Map(), queue = [];
  let renderer3d = null, running = false;
  const keyOf = (spec) => JSON.stringify(spec);
  const show = (img, url) => {
    img.addEventListener('load', () => img.classList.add('is-ready'), { once: true });
    img.src = url;
  };
  function run() {
    const job = queue.shift();
    if (!job) { running = false; return; }
    let url = cache.get(job.key);
    if (!url) {
      url = renderer3d.snapshot(job.spec);
      // сцена занята анимацией — попробуем позже
      if (!url) { queue.unshift(job); setTimeout(run, 300); return; }
      cache.set(job.key, url);
    }
    for (const img of $$('img[data-thumb]')) if (img.dataset.thumb === job.key) show(img, url);
    setTimeout(run, 16);
  }
  function start() {
    if (!renderer3d || running || !queue.length) return;
    renderer3d.onReady(() => {
      if (running || !queue.length) return;
      running = true;
      setTimeout(run, 300);
    });
  }
  return {
    keyOf,
    use(t) { renderer3d = t; start(); },
    specFor(item) {
      return isWheel(item)
        ? { w: 195, p: 55, d: item.d, season: 'summer', bolts: parseInt(item.pcd, 10), steel: true, et: item.et }
        : { w: item.width, p: item.profile, d: item.d, season: item.season, bolts: 5 };
    },
    attach(root) {
      for (const img of $$('img[data-thumb]', root)) {
        const key = img.dataset.thumb;
        if (cache.has(key)) show(img, cache.get(key));
        else if (!queue.some((j) => j.key === key)) queue.push({ key, spec: JSON.parse(key) });
      }
      start();
    },
  };
})();

// ---------- Барабан выбора значения ----------
const drum = (() => {
  const pop = $('#drum-pop'), box = $('#drum'), list = $('#drum-list'), backdrop = $('#drum-backdrop'), extra = $('#drum-extra');
  const STEP = 20 * Math.PI / 180;
  const sheet = window.matchMedia('(max-width: 640px)');
  let ctx = null, opts = [], els = [], pos = 0, goal = 0, index = -1, raf = 0, last = 0;
  let drag = null, typed = '', typedTimer = 0, settleTimer = 0, sheetScroll = null;

  const itemH = () => parseFloat(getComputedStyle(pop).getPropertyValue('--drum-item')) || 48;
  const clampIdx = (v) => clamp(v, 0, opts.length - 1);

  function render() {
    const h = itemH(), radius = h / 2 / Math.tan(STEP / 2);
    list.style.transform = `translateZ(${-radius}px)`;
    els.forEach((el, i) => {
      const off = i - pos, a = Math.abs(off);
      if (a > 4.5) { el.style.visibility = 'hidden'; return; }
      el.style.visibility = '';
      el.style.transform = `rotateX(${-off * STEP}rad) translateZ(${radius}px)`;
      el.style.opacity = String(Math.max(0, 1 - a * 0.22));
      el.style.filter = a > 0.6 ? `blur(${((a - 0.6) * 0.7).toFixed(2)}px)` : '';
    });
    const i = Math.round(clampIdx(pos));
    if (i !== index) select(i);
  }

  function select(i) {
    if (index >= 0 && els[index]) els[index].setAttribute('aria-selected', 'false');
    index = i;
    els[i].setAttribute('aria-selected', 'true');
    box.setAttribute('aria-activedescendant', els[i].id);
    ctx?.onPreview(opts[i].value);
    if (ctx?.extra) {
      const html = ctx.extra(opts[i].value);
      extra.innerHTML = html;
      extra.hidden = !html;
      place();
    }
  }

  function tick() {
    const now = performance.now(), dt = last ? Math.min(48, now - last) : 16;
    last = now;
    if (!drag) {
      pos += (goal - pos) * (reduceMotion.matches ? 1 : 1 - Math.exp(-dt / 70));
      if (Math.abs(goal - pos) < 0.002) pos = goal;
    }
    render();
    if (drag || pos !== goal) raf = requestAnimationFrame(tick);
    else { raf = 0; last = 0; }
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const moveTo = (i) => { goal = clampIdx(Math.round(i)); wake(); };

  function place() {
    if (!ctx) return;
    if (sheet.matches) { pop.style.left = pop.style.top = ''; return; }
    const { x, y } = ctx.anchor;
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const bandY = box.offsetTop + box.offsetHeight / 2;
    const bandX = box.offsetLeft + box.offsetWidth / 2;
    // полоса выбора ложится ровно на число, которое меняем; схема, если есть, — сбоку
    const left = clamp(x - bandX, 8, innerWidth - w - 8);
    const top = clamp(y - bandY, 8, innerHeight - h - 8);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  function open(btn, config) {
    if (ctx) finish(true, false);
    ctx = { btn, ...config };
    // центр кнопки запоминаем при открытии: число на ней меняет ширину («любой» → «35»), а окно не должно ездить следом
    const r = btn.getBoundingClientRect();
    ctx.anchor = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    opts = config.options;
    list.innerHTML = opts.map((o, i) => `<li role="option" id="drum-opt-${i}" data-index="${i}" aria-selected="false">${o.label}${o.available
      ? '<span class="drum-dot" aria-hidden="true"></span><span class="visually-hidden">, есть в наличии</span>' : ''}</li>`).join('');
    els = [...list.children];
    $('#drum-title').textContent = config.title;
    $('#drum-legend').hidden = !opts.some((o) => o.available);
    index = -1;
    pos = goal = Math.max(0, opts.findIndex((o) => o.value === config.value));
    extra.hidden = true;
    extra.innerHTML = '';
    pop.classList.toggle('has-extra', !!config.extra);
    pop.hidden = false;
    backdrop.hidden = !sheet.matches;
    btn.setAttribute('aria-expanded', 'true');
    place();
    render();
    // на телефоне выбор открывается снизу — поднимаем страницу так, чтобы колесо было видно над панелью
    sheetScroll = null;
    if (sheet.matches && config.preview && !config.preview.classList.contains('is-fallback')) {
      sheetScroll = scrollY;
      const r = config.preview.getBoundingClientRect();
      const free = innerHeight - pop.offsetHeight;
      const top = scrollY + r.top - Math.max(0, (free - r.height) / 2);
      window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }
    box.focus({ preventScroll: true });
    replay(pop, 'pop-in');
  }

  // keep = true — оставить выбранное, false — вернуть исходное значение
  function finish(keep, focusBack = true) {
    if (!ctx) return;
    const c = ctx;
    if (!keep) c.onPreview(c.value);
    // клавиша могла прийти раньше кадра анимации — сохраняем значение, к которому едет барабан
    else if (Math.round(clampIdx(goal)) !== index) c.onPreview(opts[Math.round(clampIdx(goal))].value);
    ctx = null;
    pop.hidden = true;
    backdrop.hidden = true;
    c.btn.setAttribute('aria-expanded', 'false');
    c.onClose?.();
    if (sheetScroll != null) {
      window.scrollTo({ top: sheetScroll, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      sheetScroll = null;
    }
    if (focusBack) c.btn.focus({ preventScroll: true });
  }

  box.addEventListener('wheel', (e) => {
    e.preventDefault();
    const px = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 300 : e.deltaY;
    goal = clampIdx(goal + px / 100);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => moveTo(goal), 120);
    wake();
  }, { passive: false });

  box.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    box.setPointerCapture(e.pointerId);
    drag = { y: e.clientY, start: pos, lastY: e.clientY, lastT: e.timeStamp, v: 0, moved: 0, item: e.target.closest('li') };
    box.classList.add('is-dragging');
    wake();
  });
  box.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const h = itemH(), dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.abs(dy));
    pos = goal = clampIdx(drag.start - dy / h);
    const dt = Math.max(1, e.timeStamp - drag.lastT);
    drag.v = 0.6 * drag.v + 0.4 * (-(e.clientY - drag.lastY) / h / dt);
    drag.lastY = e.clientY;
    drag.lastT = e.timeStamp;
  });
  const endDrag = (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    box.classList.remove('is-dragging');
    if (d.moved < 5 && d.item) {
      const i = Number(d.item.dataset.index);
      if (i === index && Math.abs(pos - i) < 0.05) return finish(true);
      return moveTo(i);
    }
    const fling = e.timeStamp - d.lastT > 80 ? 0 : d.v * 160;
    moveTo(pos + fling);
  };
  box.addEventListener('pointerup', endDrag);
  box.addEventListener('pointercancel', endDrag);

  pop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); return finish(false); }
    if (e.target !== box) return;
    const i = Math.round(goal);
    const keys = { ArrowDown: i + 1, ArrowUp: i - 1, PageDown: i + 5, PageUp: i - 5, Home: 0, End: opts.length - 1 };
    if (e.key in keys) { e.preventDefault(); return moveTo(keys[e.key]); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); return finish(true); }
    // быстрый ввод цифрами: «2», «0», «5» → 205
    if (/^[\d×,]$/.test(e.key)) {
      typed += e.key;
      clearTimeout(typedTimer);
      typedTimer = setTimeout(() => { typed = ''; }, 800);
      const j = opts.findIndex((o) => o.label.startsWith(typed));
      if (j >= 0) moveTo(j);
    }
  });
  pop.addEventListener('focusout', (e) => {
    if (ctx && e.relatedTarget && !pop.contains(e.relatedTarget)) finish(true, false);
  });
  $('#drum-done').addEventListener('click', () => finish(true));
  backdrop.addEventListener('click', () => finish(true));
  document.addEventListener('pointerdown', (e) => {
    if (ctx && !pop.contains(e.target) && !ctx.btn.contains(e.target) && e.target !== backdrop) finish(true, false);
  }, true);
  addEventListener('resize', place);
  addEventListener('scroll', place, { passive: true });

  return { open, finish, isOpenFor: (btn) => ctx?.btn === btn };
})();

// ---------- Товары: общие сведения ----------
const isWheel = (item) => WHEELS.includes(item);
const kindOf = (item) => (isWheel(item) ? 'wheels' : 'tires');
const findItem = (id) => TIRES.find((t) => t.id === id) || WHEELS.find((w) => w.id === id);
const productUrl = (item) => `product.html?id=${item.id}`;
const SEASON_SHORT = { winter: 'Зимние шипованные', summer: 'Летние', all: 'Всесезонные' };
const sizeText = (item) => (isWheel(item) ? `${item.rim}×${item.d} ${item.pcd} ET${item.et}` : `${item.width}/${item.profile} R${item.d} ${item.index}`);
const titleText = (item) => `${item.brand} ${item.model}`;
// Индексы нагрузки и скорости — расшифровка для карточки товара
const LOAD_KG = { 72: 355, 82: 475, 91: 615, 92: 630, 94: 670, 95: 690, 99: 775 };
const SPEED_KMH = { H: 210, T: 190, V: 240 };
const rubText = (n) => `${n.toLocaleString('ru-RU')} ₽`;

// ---------- Корзина ----------
// В прототипе хранится в браузере; в WordPress её заменит корзина WooCommerce.
const Cart = (() => {
  const KEY = 'shina-plus-cart';
  const listeners = new Set();
  const load = () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v.filter((x) => findItem(x.id) && x.qty > 0) : [];
    } catch { return []; }
  };
  let items = load();
  const emit = () => listeners.forEach((fn) => fn());
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* приватный режим — корзина живёт до перезагрузки */ }
    emit();
  };
  addEventListener('storage', (e) => { if (e.key === KEY) { items = load(); emit(); } });
  return {
    lines: () => items.map((x) => ({ ...x, item: findItem(x.id) })),
    qty: (id) => items.find((x) => x.id === id)?.qty || 0,
    has: (id) => items.some((x) => x.id === id),
    add(id, qty = 4) {
      const line = items.find((x) => x.id === id);
      if (line) line.qty = Math.min(99, line.qty + qty); else items.push({ id, qty });
      save();
    },
    set(id, qty) {
      qty = clamp(Math.round(qty) || 0, 0, 99);
      if (!qty) items = items.filter((x) => x.id !== id);
      else {
        const line = items.find((x) => x.id === id);
        if (line) line.qty = qty; else items.push({ id, qty });
      }
      save();
    },
    remove(id) { items = items.filter((x) => x.id !== id); save(); },
    clear() { items = []; save(); },
    count: () => items.reduce((s, x) => s + x.qty, 0),
    total: () => items.reduce((s, x) => s + x.qty * findItem(x.id).price, 0),
    onChange(fn) { listeners.add(fn); },
  };
})();

function updateBadge() {
  const n = Cart.count(), el = $('#cart-count');
  if (!el) return;
  el.textContent = n;
  el.hidden = !n;
  $('#cart')?.setAttribute('aria-label', `Корзина: ${n} ${plural(n, ['товар', 'товара', 'товаров'])}`);
}
Cart.onChange(updateBadge);

// ---------- Уведомление внизу экрана ----------
function toast(html) {
  let el = $('#toast');
  if (!el) {
    document.body.insertAdjacentHTML('beforeend', '<div class="toast" id="toast" role="status" aria-live="polite"></div>');
    el = $('#toast');
  }
  el.innerHTML = html;
  el.classList.add('is-on');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('is-on'), 4500);
}

// ---------- Карточки товаров ----------
const cartLabel = (item, inCart) => (inCart
  ? `${icon('check')}В корзине<span class="visually-hidden">: ${titleText(item)}, перейти в корзину</span>`
  : `В корзину<span class="visually-hidden">: ${titleText(item)}</span>`);

function cardHTML(item) {
  const wheel = isWheel(item);
  const size = wheel
    ? `${item.rim}×${item.d} <small>${item.pcd} ET${item.et}</small>`
    : `${item.width}/${item.profile} R${item.d} <small>${item.index}</small>`;
  const kindCell = wheel ? `${icon('wheel')}${item.note}, DIA ${item.dia}` : `${icon(item.season)}${SEASONS[item.season].one}`;
  const key = thumbs.keyOf(thumbs.specFor(item));
  return `<li class="card">
    <div class="card-media">
      <img class="card-img" alt="" width="480" height="360" data-thumb='${key}'>
      <div class="card-ph">${icon(wheel ? 'wheel' : item.season)}</div>
    </div>
    <div class="card-body">
      <p class="card-size">${size}</p>
      <h3 class="card-name"><a class="card-link" href="${productUrl(item)}"><span class="card-brand">${item.brand}</span>${item.model}</a></h3>
      <p class="card-kind">${kindCell}</p>
      <div class="card-foot">
        <span class="card-price">${rub(item.price)}</span>
        <button type="button" class="btn btn-cart" data-id="${item.id}">${cartLabel(item, Cart.has(item.id))}</button>
      </div>
    </div>
  </li>`;
}

// «В корзину» кладёт комплект из 4 штук; если товар уже в корзине — ведёт в корзину
function bindCards(root) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-cart');
    if (!btn) return;
    const item = findItem(btn.dataset.id);
    if (Cart.has(item.id)) { location.href = 'cart.html'; return; }
    Cart.add(item.id, 4);
    toast(`${icon('check')}<span><b>${titleText(item)}</b>, комплект 4 шт., в корзине</span><a href="cart.html">Перейти в корзину</a>`);
  });
}
Cart.onChange(() => {
  for (const btn of $$('.btn-cart')) {
    const item = findItem(btn.dataset.id);
    if (item) btn.innerHTML = cartLabel(item, Cart.has(item.id));
  }
});

// Невидимая 3D-сцена только для снимков карточек — на страницах без большого колеса
function offscreenTire3D() {
  const stage = document.createElement('div');
  stage.className = 'offscreen-stage';
  stage.setAttribute('aria-hidden', 'true');
  document.body.append(stage);
  const t = createTire3D(stage);
  t.update({ w: 205, p: 55, d: 16, et: 40, pcd: 114.3, season: 'winter', bolts: 5, label: '205/55 R16', kind: 'tires' });
  return t;
}

// Ссылки «Написать в WhatsApp» с готовым текстом
for (const a of $$('a[data-wa]')) a.href = waLink(a.dataset.wa);
updateBadge();
