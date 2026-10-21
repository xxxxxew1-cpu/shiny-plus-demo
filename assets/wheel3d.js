/* 3D-колесо на подиуме (three.js): шина меняется по размеру, диск — по сверловке и вылету.
   Подключается после shop.js: берёт оттуда clamp, easeOut, progress и reduceMotion. */

function createTire3D(stage) {
  let api = null, pending = null, pendingIntro = false;
  const ready = [];
  load().catch((err) => {
    console.warn('3D-колесо недоступно:', err);
    stage.classList.add('is-fallback');
  });
  return {
    update(s) { pending = s; if (api) api.update(s); },
    intro() { if (api) api.intro(); else pendingIntro = true; },
    guide(on) { if (api) api.guide(on); },
    snapshot: (spec) => (api ? api.snapshot(spec) : null),
    onReady(fn) { if (api) fn(); else ready.push(fn); },
  };

  async function load() {
    const THREE = await import('three');
    const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
    const { Reflector } = await import('three/addons/objects/Reflector.js');
    await document.fonts.load('500 40px "Jost"').catch(() => {});
    api = build(THREE, RoundedBoxGeometry, Reflector);
    if (pending) api.update({ ...pending, kick: 0 }, true);
    if (pendingIntro) api.intro();
    ready.splice(0).forEach((fn) => fn());
  }

  function build(THREE, RoundedBoxGeometry, Reflector) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Объёмное колесо на подиуме. Шина меняется вместе с выбранным размером, подиум можно повернуть.');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.matchMedia('(max-width: 760px)').matches ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    stage.prepend(canvas);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);

    // Студийное окружение: тёмная комната и софтбоксы — от них на металле длинные блики
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x15181c);
    const softbox = (w, h, x, y, z, power, color = 0xffffff) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    softbox(9, 1.4, 0, 7, 1.5, 4);
    softbox(2.2, 6, -7, 1.5, 3, 2.6);
    softbox(2.2, 6, 7, 1.2, -2.5, 2.2, 0xd8e4ff);
    softbox(10, 0.8, 0, -1.2, -7, 0.9);
    // фронтальный свет за камерой: без него проточенный диск, развёрнутый к зрителю, отражает тёмную стену
    softbox(7, 3.2, 0, 2.2, 8, 1.5);
    softbox(5, 1, 0, -0.6, 7, 0.6);
    // большие рассеиватели спереди слева и справа: проточка светлая при любом повороте подиума
    softbox(7, 5, -5.5, 0.8, 5.5, 1.5);
    softbox(5, 4, 5.5, 0.2, 5.5, 0.8);
    softbox(4, 4, -6, 0.3, -4, 1.2);
    // мягкий светлый горизонт по кругу — металл не уходит в черноту ни при каком повороте подиума
    const horizon = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 2.4, 48, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(0.32), side: THREE.BackSide }));
    horizon.position.y = 0.4;
    env.add(horizon);
    scene.environment = pmrem.fromScene(env, 0.02).texture;

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 80);
    const key = new THREE.DirectionalLight(0xfff6ec, 2.2);
    key.position.set(-3.5, 6, 4);
    const rimL = new THREE.DirectionalLight(0xcfdcff, 3.2);
    rimL.position.set(-5, 2.5, -5);
    const rimR = new THREE.DirectionalLight(0xffffff, 2.6);
    rimR.position.set(5.5, 3, -4);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(0, -1, 6);
    scene.add(key, rimL, rimR, fill);

    const FLOOR_Y = -1;
    // root — колесо на подиуме (поворот); spinner — вращение вокруг оси; wheel/fixed — «токарное» пространство, ось = Y
    const root = new THREE.Group();
    const spinner = new THREE.Group();
    const wheel = new THREE.Group();
    const fixed = new THREE.Group();
    wheel.rotation.x = Math.PI / 2;
    fixed.rotation.x = Math.PI / 2;
    scene.add(root);
    root.add(spinner, fixed);
    spinner.add(wheel);

    // Материалы
    const sideCanvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    sideCanvas.width = bumpCanvas.width = 2048;
    sideCanvas.height = bumpCanvas.height = 1024;
    const sideMap = new THREE.CanvasTexture(sideCanvas);
    sideMap.colorSpace = THREE.SRGBColorSpace;
    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    for (const t of [sideMap, bumpMap]) {
      t.wrapS = THREE.RepeatWrapping;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    const tireMat = new THREE.MeshStandardMaterial({ map: sideMap, bumpMap, bumpScale: 3, roughness: 0.62, metalness: 0, envMapIntensity: 0.7 });
    const treadMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.82, envMapIntensity: 0.6 });
    const studMat = new THREE.MeshStandardMaterial({ color: 0xd0d5db, metalness: 1, roughness: 0.2 });
    // алмазная проточка: лицевая сторона светлая, грани спиц — тёмный металл
    const machinedMat = new THREE.MeshStandardMaterial({ color: 0xeceff2, metalness: 1, roughness: 0.16 });
    const gunmetalMat = new THREE.MeshStandardMaterial({ color: 0x2c3036, metalness: 0.9, roughness: 0.32 });
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.05 });
    const capMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0d0f, metalness: 0.2, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 });
    const discMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a7, metalness: 1, roughness: 0.38 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x23262b, metalness: 0.7, roughness: 0.45 });
    const redMat = new THREE.MeshPhysicalMaterial({ color: 0xe0190f, metalness: 0.1, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
    const steelMat = new THREE.MeshPhysicalMaterial({ color: 0x23262b, metalness: 0.55, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.15, side: THREE.DoubleSide });

    // Профиль шины в долях: u — от борта (0) до протектора (1), v — по ширине (−1…1)
    const HALF_PROFILE = [[0, 0.78], [0.07, 0.86], [0.2, 0.95], [0.38, 1.02], [0.56, 1.03], [0.72, 1], [0.84, 0.94],
      [0.92, 0.86], [0.97, 0.74], [0.993, 0.58], [1, 0.4], [1.006, 0.15]];
    const NORM = [...HALF_PROFILE.map(([u, v]) => [u, -v]), [1.008, 0], ...HALF_PROFILE.slice().reverse()];
    // Сплайн Катмулла — Рома аффинно-инвариантен, поэтому точки считаем один раз и только растягиваем
    const NORM_PTS = new THREE.SplineCurve(NORM.map(([u, v]) => new THREE.Vector2(u, v))).getPoints(90);
    const SHOULDER = [[0.15, 1.006], [0.4, 1], [0.58, 0.993], [0.74, 0.97], [0.86, 0.92], [0.94, 0.84]];
    const uAt = (v) => {
      if (v <= SHOULDER[0][0]) return SHOULDER[0][1];
      for (let i = 1; i < SHOULDER.length; i++) {
        const [v0, u0] = SHOULDER[i - 1], [v1, u1] = SHOULDER[i];
        if (v <= v1) return u0 + (u1 - u0) * (v - v0) / (v1 - v0);
      }
      return SHOULDER[SHOULDER.length - 1][1];
    };
    // строка текстуры для доли высоты внешней боковины
    const plusRow = (u) => {
      let best = 0, dist = Infinity;
      NORM_PTS.forEach((p, j) => {
        if (p.y > 0.3 && Math.abs(p.x - u) < dist) { dist = Math.abs(p.x - u); best = j; }
      });
      return (1 - best / (NORM_PTS.length - 1)) * sideCanvas.height;
    };

    const dimsOf = ({ w, p, d }) => {
      const rimMm = d * 25.4, side = w * p / 100, outerMm = rimMm + 2 * side;
      const k = Math.min(1 / 316, 1.42 / (outerMm / 2));
      return { R: outerMm / 2 * k, r: rimMm / 2 * k, h: side * k, half: w / 2 * k, k };
    };

    // Шина и протектор
    const tire = new THREE.Mesh(new THREE.BufferGeometry(), tireMat);
    const blocks = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.2), treadMat, 300);
    const studs = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 10), studMat, 160);
    const tireParts = [tire, blocks, studs];
    wheel.add(...tireParts);
    const TREAD = {
      winter: {
        n: 54,
        rows: [{ a: -0.6, len: 0.8, w: 0.28, yaw: 0.42 }, { a: 0.6, len: 0.8, w: 0.28, yaw: -0.42 }, { a: 0, len: 0.55, w: 0.2, shift: 0.5 }],
        studs: [{ a: -0.6, every: 2 }, { a: 0.6, every: 2, shift: 1 }],
      },
      summer: {
        n: 64,
        rows: [{ a: -0.78, len: 0.76, w: 0.2 }, { a: -0.27, len: 0.95, w: 0.22 }, { a: 0.27, len: 0.95, w: 0.22 }, { a: 0.78, len: 0.76, w: 0.2 }],
        studs: [],
      },
      all: {
        n: 58,
        rows: [{ a: -0.6, len: 0.78, w: 0.26, yaw: 0.22 }, { a: 0.6, len: 0.78, w: 0.26, yaw: -0.22, shift: 0.5 }, { a: 0, len: 0.66, w: 0.18 }],
        studs: [],
      },
    };
    const m4 = new THREE.Matrix4(), basis = new THREE.Matrix4(), yawM = new THREE.Matrix4(), scaleM = new THREE.Matrix4();
    const tangent = new THREE.Vector3(), radial = new THREE.Vector3(), axial = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), scl = new THREE.Vector3();

    function layoutTread({ R, r, half }, season) {
      const cfg = TREAD[season];
      const T = half * 0.84, depth = R * 0.03, pitch = (2 * Math.PI * R) / cfg.n;
      let k = 0, ks = 0;
      for (let i = 0; i < cfg.n; i++) {
        for (const row of cfg.rows) {
          const phi = ((i + (row.shift || 0)) / cfg.n) * Math.PI * 2;
          const y = row.a * T;
          const baseR = r + (R - r) * uAt(Math.abs(y) / half);
          const c = Math.cos(phi), s = Math.sin(phi);
          radial.set(c, 0, s);
          tangent.set(s, 0, -c);
          basis.makeBasis(tangent, axial, radial);
          yawM.makeRotationZ(row.yaw || 0);
          scaleM.makeScale(pitch * row.len, row.w * 2 * T, depth);
          m4.copy(basis).multiply(yawM).multiply(scaleM);
          m4.setPosition(c * (baseR + depth * 0.3), y, s * (baseR + depth * 0.3));
          blocks.setMatrixAt(k++, m4);
        }
        for (const st of cfg.studs) {
          if ((i + (st.shift || 0)) % st.every) continue;
          const phi = (i / cfg.n) * Math.PI * 2;
          const y = st.a * T;
          const baseR = r + (R - r) * uAt(Math.abs(y) / half) + depth * 0.85;
          radial.set(Math.cos(phi), 0, Math.sin(phi));
          quat.setFromUnitVectors(up, radial);
          pos.set(radial.x * baseR, y, radial.z * baseR);
          scl.set(R * 0.011, depth * 0.5, R * 0.011);
          m4.compose(pos, quat, scl);
          studs.setMatrixAt(ks++, m4);
        }
      }
      blocks.count = k;
      studs.count = ks;
      blocks.instanceMatrix.needsUpdate = true;
      studs.instanceMatrix.needsUpdate = true;
    }

    // Литой диск в радиусе 1: сдвоенные спицы, их пар столько же, сколько болтов
    const nutGeo = new THREE.CylinderGeometry(0.034, 0.038, 0.06, 6);
    const wedge = (c, rO, rI, spanO, spanI) => {
      const path = new THREE.Path();
      path.absarc(0, 0, rO, c - spanO, c + spanO, false);
      path.lineTo(rI * Math.cos(c + spanI), rI * Math.sin(c + spanI));
      path.absarc(0, 0, rI, c + spanI, c - spanI, true);
      path.closePath();
      return path;
    };
    function hubAndBrakes(g, n, cap) {
      const nuts = [];
      for (let i = 0; i < n; i++) {
        const a = i * (2 * Math.PI / n);
        const nut = new THREE.Mesh(nutGeo, chromeMat);
        nut.position.set(Math.cos(a) * 0.21, 0.235, Math.sin(a) * 0.21);
        g.add(nut);
        nuts.push(nut);
      }
      if (cap) {
        const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.145, 0.04, 64), capMat);
        capMesh.position.y = 0.24;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.007, 8, 64), chromeMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.26;
        // красный «+» из логотипа
        const plusA = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.026), redMat);
        const plusB = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.012, 0.1), redMat);
        plusA.position.y = plusB.position.y = 0.264;
        g.add(capMesh, ring, plusA, plusB);
      }
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.035, 96), discMat);
      disc.position.y = -0.2;
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 48), hatMat);
      hat.position.y = -0.12;
      g.add(disc, hat);
      return nuts;
    }
    function buildAlloy(n) {
      const g = new THREE.Group();
      const barrel = [[0.86, -0.62], [0.9, -0.6], [0.92, -0.2], [0.92, 0.05], [0.95, 0.12], [1, 0.15], [1.035, 0.19], [1.03, 0.23], [0.99, 0.235]];
      g.add(new THREE.Mesh(new THREE.LatheGeometry(barrel.map(([x, y]) => new THREE.Vector2(x, y)), 128), barrelMat));
      const lip = new THREE.Mesh(new THREE.TorusGeometry(1, 0.026, 16, 160), chromeMat);
      lip.rotation.x = Math.PI / 2;
      lip.position.y = 0.215;
      g.add(lip);

      const shape = new THREE.Shape();
      shape.absarc(0, 0, 0.9, 0, Math.PI * 2, false);
      const half = Math.PI / n;
      for (let i = 0; i < n; i++) {
        const a = i * 2 * half;
        shape.holes.push(wedge(a + half, 0.8, 0.36, half - 0.14, half - 0.27));   // большое окно между парами
        shape.holes.push(wedge(a, 0.8, 0.47, 0.034, 0.024));                    // щель внутри пары
      }
      const faceGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.018, bevelSegments: 3, curveSegments: 64 });
      faceGeo.rotateX(-Math.PI / 2);
      const face = new THREE.Mesh(faceGeo, [machinedMat, gunmetalMat]);
      face.position.y = 0.06;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.1, 64), [gunmetalMat, machinedMat, gunmetalMat]);
      hub.position.y = 0.17;
      const mount = new THREE.Group();
      mount.add(face, hub);
      const nuts = hubAndBrakes(mount, n, true);
      g.add(mount);
      g.userData = { mount, nuts };
      return g;
    }
    // Штампованный чёрный диск — для карточек дисков Trebl: только диск, без тормоза и гаек
    function buildSteel(n) {
      const g = new THREE.Group();
      const dish = [[0.86, -0.62], [0.9, -0.6], [0.92, -0.1], [0.97, 0.1], [1.02, 0.16], [1.02, 0.2], [0.96, 0.19], [0.86, 0.12], [0.64, 0.08]];
      g.add(new THREE.Mesh(new THREE.LatheGeometry(dish.map(([x, y]) => new THREE.Vector2(x, y)), 128), steelMat));
      const extrude = (shape, depth) => {
        const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 48 });
        geo.rotateX(-Math.PI / 2);
        return geo;
      };
      const circleHole = (x, y, r) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p; };
      // чаша с вентиляционными отверстиями
      const plate = new THREE.Shape();
      plate.absarc(0, 0, 0.66, 0, Math.PI * 2, false);
      plate.holes.push(circleHole(0, 0, 0.34));
      for (let i = 0; i < 8; i++) {
        const a = (i + 0.5) * Math.PI / 4;
        plate.holes.push(circleHole(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.07));
      }
      const face = new THREE.Mesh(extrude(plate, 0.03), steelMat);
      face.position.y = 0.07;
      // центральная площадка: отверстия под болты по сверловке и центральное отверстие
      const center = new THREE.Shape();
      center.absarc(0, 0, 0.36, 0, Math.PI * 2, false);
      center.holes.push(circleHole(0, 0, 0.1));
      for (let i = 0; i < n; i++) {
        const a = i * (2 * Math.PI / n);
        center.holes.push(circleHole(Math.cos(a) * 0.21, Math.sin(a) * 0.21, 0.035));
      }
      const hub = new THREE.Mesh(extrude(center, 0.04), steelMat);
      hub.position.y = 0.17;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.08, 64, 1, true), steelMat);
      neck.position.y = 0.13;
      const mount = new THREE.Group();
      mount.add(face, hub, neck);
      g.add(mount);
      g.userData = { mount, nuts: [] };
      return g;
    }
    // Подсказка к вылету: красная — привалочная плоскость, светлое кольцо — середина обода
    const etGuide = new THREE.Group();
    const guideMat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const mountPlane = new THREE.Mesh(new THREE.CircleGeometry(0.88, 96), guideMat(0xe0190f, 0.28));
    const mountEdge = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.008, 8, 160), guideMat(0xff3a2e, 0.95));
    const centerEdge = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.005, 8, 160), guideMat(0xffffff, 0.55));
    mountPlane.rotation.x = -Math.PI / 2;
    mountEdge.rotation.x = centerEdge.rotation.x = Math.PI / 2;
    centerEdge.position.y = -0.19;
    etGuide.add(mountPlane, mountEdge, centerEdge);
    etGuide.visible = false;
    let guideOn = false, kindNow = 'tires';

    const rims = new Map();
    let rimGroup = null;
    function setRim(n, style = 'alloy') {
      const key = `${style}-${n}`;
      if (!rims.has(key)) rims.set(key, style === 'alloy' ? buildAlloy(n) : buildSteel(n));
      if (rimGroup) wheel.remove(rimGroup);
      rimGroup = rims.get(key);
      wheel.add(rimGroup);
      rimGroup.add(etGuide);
    }

    // Суппорт не вращается: лакированный, в цвет логотипа
    const caliperShape = new THREE.Shape();
    caliperShape.absarc(0, 0, 0.84, 0.35, 1.2, false);
    caliperShape.absarc(0, 0, 0.54, 1.2, 0.35, true);
    caliperShape.closePath();
    const caliperGeo = new THREE.ExtrudeGeometry(caliperShape, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 32 });
    caliperGeo.rotateX(-Math.PI / 2);
    const caliper = new THREE.Mesh(caliperGeo, redMat);
    fixed.add(caliper);

    // Подиум: глянцевый круг с отражением, тонкий металлический кант и мягкая тень
    const PODIUM_R = 1.32;
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(PODIUM_R, PODIUM_R * 1.01, 0.08, 128),
      new THREE.MeshStandardMaterial({ color: 0x0f1114, metalness: 0.6, roughness: 0.45 }));
    base.position.y = FLOOR_Y - 0.04;
    const mirror = new Reflector(new THREE.CircleGeometry(PODIUM_R * 0.985, 128), { clipBias: 0.003, color: 0x6a6e74, textureWidth: 512, textureHeight: 512 });
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = FLOOR_Y + 0.001;
    const radialTex = (stops) => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      for (const [o, col] of stops) g.addColorStop(o, col);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    // лак: отражение видно у колеса и гаснет к краю
    const gloss = new THREE.Mesh(new THREE.CircleGeometry(PODIUM_R * 0.985, 128), new THREE.MeshBasicMaterial({
      map: radialTex([[0, 'rgba(12,14,17,0.35)'], [0.55, 'rgba(12,14,17,0.7)'], [1, 'rgba(12,14,17,0.96)']]),
      transparent: true, depthWrite: false, toneMapped: false,
    }));
    gloss.rotation.x = -Math.PI / 2;
    gloss.position.y = FLOOR_Y + 0.002;
    const edge = new THREE.Mesh(new THREE.TorusGeometry(PODIUM_R, 0.005, 12, 200),
      new THREE.MeshStandardMaterial({ color: 0x7d838b, metalness: 1, roughness: 0.32 }));
    edge.rotation.x = Math.PI / 2;
    edge.position.y = FLOOR_Y;
    stageGroup.add(base, mirror, gloss, edge);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      map: radialTex([[0, 'rgba(0,0,0,0.85)'], [0.5, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]),
      transparent: true, depthWrite: false, toneMapped: false,
    }));
    shadow.rotation.x = -Math.PI / 2;
    root.add(shadow);

    // Надписи на боковине: цвет и рельеф
    let paintedLabel = '';
    function paintSidewall(label, dm) {
      paintedLabel = label;
      const W = sideCanvas.width, H = sideCanvas.height;
      const yBead = plusRow(0.34), yTread = plusRow(0.78), band = yTread - yBead, yMid = (yBead + yTread) / 2;
      // перевод пикселей текстуры в длину по кругу и по высоте боковины — чтобы буквы не растягивались
      const sx = ((0.44 * dm.h) / band) / ((2 * Math.PI * (dm.r + 0.56 * dm.h)) / W);
      for (const [cv, baseCol, ink, ring] of [[sideCanvas, '#17191c', '#3b4047', '#202327'], [bumpCanvas, '#000', '#fff', '#888']]) {
        const ctx = cv.getContext('2d');
        ctx.fillStyle = baseCol;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = ring;
        for (const [u, t] of [[0.12, 6], [0.86, 2], [0.9, 2]]) ctx.fillRect(0, plusRow(u) - t / 2, W, t);
        ctx.fillStyle = ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const write = (text, x, size, weight, spacing) => {
          ctx.save();
          ctx.translate(x, yMid);
          ctx.rotate(Math.PI);
          ctx.scale(sx, 1);
          ctx.font = `${weight} ${Math.round(band * size)}px "Jost", "Futura", sans-serif`;
          if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.round(band * spacing)}px`;
          ctx.fillText(text, 0, 0);
          ctx.restore();
        };
        for (const x of [0, 0.5, 1]) write('ШИНА +', x * W, 0.72, 500, 0.12);
        for (const x of [0.25, 0.75]) write(label, x * W, 0.5, 400, 0.05);
      }
      sideMap.needsUpdate = true;
      bumpMap.needsUpdate = true;
    }

    let dims = null;
    const ET_BASE = 40;
    function rebuild(dm, season, et = cur.et, pcd = cur.pcd) {
      dims = dm;
      const { R, r, h, half } = dm;
      tire.geometry.dispose();
      tire.geometry = new THREE.LatheGeometry(NORM_PTS.map((p) => new THREE.Vector2(r + p.x * h, p.y * half)), 192);
      layoutTread(dm, season);
      // диск садится закраиной на борт шины
      const offset = 0.78 * half - 0.215 * r;
      rimGroup.scale.setScalar(r);
      rimGroup.position.y = offset;
      // вылет: привалочная плоскость сдвигается от середины обода. Меньше вылет — спицы глубже в ободе, больше — диск площе
      const { mount, nuts } = rimGroup.userData;
      mount.position.y = clamp((et - ET_BASE) * dm.k / r, -0.14, 0.05);
      mountPlane.position.y = mountEdge.position.y = mount.position.y + 0.1;
      // сверловка: гайки стоят на окружности её диаметра (4×100 → 100 мм)
      const boltR = clamp((pcd / 2) * dm.k / r, 0.17, 0.3);
      nuts.forEach((nut, i) => {
        const a = i * (2 * Math.PI / nuts.length);
        nut.position.x = Math.cos(a) * boltR;
        nut.position.z = Math.sin(a) * boltR;
      });
      caliper.scale.setScalar(r);
      caliper.position.y = offset + (mount.position.y - 0.21) * r;
      // колесо стоит на подиуме
      root.position.y = FLOOR_Y + R * 1.024;
      shadow.position.y = -R * 1.024 + 0.004;
      shadow.scale.set(R * 2.4, half * 5, 1);
    }

    // Состояние сцены
    const cur = { w: 205, p: 55, d: 16, et: 40, pcd: 100 };
    let from = null, to = null, t0 = 0, season = 'winter', bolts = 0, rimStyle = 'alloy';
    let spin = 0, vel = 0;
    let baseYaw = -0.62, userYaw = baseYaw, yawGoal = baseYaw, yawVel = 0, par = 0, parGoal = 0, tilt = 0, tiltGoal = 0;
    let opacity = 1, opacityGoal = 1, intro = null, exposure = reduceMotion.matches ? 1 : 0;
    let dragging = false, raf = 0, last = 0;

    function applyOpacity(o) {
      for (const m of [tireMat, treadMat, studMat]) {
        m.opacity = o;
        const t = o < 0.995;
        if (m.transparent !== t) { m.transparent = t; m.depthWrite = !t; m.needsUpdate = true; }
      }
    }

    function fitCamera(aspect, R) {
      // в кадр помещаются подиум и шина целиком — даже самая крупная
      const tanHalf = Math.tan((camera.fov * Math.PI / 180) / 2);
      const needH = Math.max(3.4, 2 * R + 1.3);
      const dist = Math.max(needH / 2 / tanHalf, 3.3 / 2 / (tanHalf * aspect));
      // запас снизу — чтобы передний край подиума не упирался в край кадра
      const lookY = FLOOR_Y + needH / 2 - 0.8;
      camera.position.set(0, lookY + dist * 0.17, dist);
      camera.lookAt(0, lookY, 0);
      camera.updateProjectionMatrix();
    }

    function frame() {
      fitCamera(camera.aspect, dims.R);
      root.rotation.set(tilt, clamp(userYaw, -1.6, 0.4) + par, 0);
      spinner.rotation.z = spin;
      applyOpacity(opacity);
      renderer.toneMappingExposure = exposure;
      renderer.render(scene, camera);
    }

    function tick() {
      const now = performance.now(), dt = last ? Math.min(48, now - last) : 16;
      last = now;
      let busy = dragging;
      if (to) {
        const e = easeOut(progress(t0, 560));
        for (const k of ['w', 'p', 'd', 'et', 'pcd']) cur[k] = from[k] + (to[k] - from[k]) * e;
        rebuild(dimsOf(cur), season);
        if (e < 1) busy = true; else to = null;
      }
      const k = 1 - Math.exp(-dt / 160);
      if (intro) {
        // свет разгорается, подиум поворачивает колесо к зрителю
        const t = progress(intro.t0, 2400);
        exposure = easeOut(clamp(t * 1.6, 0, 1));
        userYaw = yawGoal = intro.from + (baseYaw - intro.from) * easeInOut(t);
        if (t < 1) busy = true; else intro = null;
      } else if (!dragging && Math.abs(yawVel) > 0.00002) {
        userYaw = yawGoal = clamp(userYaw + yawVel * dt, -1.6, 0.4);
        yawVel *= Math.exp(-dt / 500);
        busy = true;
      } else if (!dragging) {
        userYaw += (yawGoal - userYaw) * k;
        if (Math.abs(yawGoal - userYaw) > 1e-4) busy = true; else userYaw = yawGoal;
      }
      if (!dragging && Math.abs(vel) > 0.00003) {
        spin += vel * dt;
        vel *= Math.exp(-dt / 700);
        busy = true;
      }
      par += (parGoal - par) * k;
      tilt += (tiltGoal - tilt) * k;
      opacity += (opacityGoal - opacity) * (1 - Math.exp(-dt / 200));
      if (Math.abs(parGoal - par) > 1e-4 || Math.abs(tiltGoal - tilt) > 1e-4 || Math.abs(opacityGoal - opacity) > 0.002) busy = true;
      else { par = parGoal; tilt = tiltGoal; opacity = opacityGoal; }
      frame();
      if (busy) raf = requestAnimationFrame(tick);
      else { raf = 0; last = 0; vel = 0; yawVel = 0; }
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const px = renderer.getPixelRatio();
      mirror.getRenderTarget().setSize(Math.round(w * px * 0.6), Math.round(h * px * 0.6));
      if (dims) frame();
    }
    new ResizeObserver(resize).observe(stage);

    // Подиум поворачивается перетаскиванием, как в конфигураторе
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (intro) return;
      drag = { x: e.clientX, t: e.timeStamp };
      dragging = true;
      yawVel = 0;
      canvas.setPointerCapture(e.pointerId);
      stage.classList.add('is-dragging');
      wake();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (drag) {
        const dx = e.clientX - drag.x, d = dx / canvas.clientWidth * 3.2;
        userYaw = yawGoal = clamp(userYaw + d, -1.6, 0.4);
        yawVel = clamp(yawVel * 0.5 + (d / Math.max(1, e.timeStamp - drag.t)) * 0.5, -0.01, 0.01);
        drag.x = e.clientX; drag.t = e.timeStamp;
        return;
      }
      if (e.pointerType !== 'mouse' || reduceMotion.matches || intro) return;
      // лёгкий поворот к курсору
      const rect = canvas.getBoundingClientRect();
      parGoal = ((e.clientX - rect.left) / rect.width - 0.5) * 0.16;
      tiltGoal = ((e.clientY - rect.top) / rect.height - 0.5) * 0.06;
      wake();
    });
    const release = (e) => {
      if (!drag) return;
      if (reduceMotion.matches || e.timeStamp - drag.t > 80) yawVel = 0;
      drag = null;
      dragging = false;
      stage.classList.remove('is-dragging');
      wake();
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('pointerleave', () => { parGoal = 0; tiltGoal = 0; wake(); });

    return {
      update({ w, p, d, et, pcd, season: s, bolts: b, label, kind, kick = 0, view = null, rim = 'alloy' }, immediate = false) {
        const seasonChanged = s !== season;
        season = s;
        // rim: 'alloy' — литой диск с тормозом, 'steel' — штампованный, как в карточках дисков
        if (b !== bolts || rim !== rimStyle) { bolts = b; rimStyle = rim; setRim(b, rim); caliper.visible = rim === 'alloy'; }
        const kindYaw = kind === 'wheels' ? -0.28 : -0.62;
        if (kindYaw !== baseYaw) { baseYaw = kindYaw; yawGoal = baseYaw; }
        // вылет видно только сбоку — разворачиваем подиум на три четверти; сверловку и диаметр — лицом
        if (view && !dragging) { yawGoal = view === 'depth' ? -1.02 : baseYaw; yawVel = 0; }
        kindNow = kind;
        opacityGoal = kind === 'wheels' ? (guideOn ? 0.06 : 0.22) : 1;
        const next = { w, p, d, et, pcd };
        paintSidewall(label, dimsOf(next));
        if (immediate || reduceMotion.matches) {
          Object.assign(cur, next);
          to = null;
          rebuild(dimsOf(cur), season);
          opacity = opacityGoal;
          if (reduceMotion.matches) userYaw = yawGoal;
        } else {
          from = { ...cur }; to = next; t0 = performance.now();
          vel = clamp(vel + kick * Math.PI / 180, -0.03, 0.03);
        }
        if (seasonChanged && dims) layoutTread(dims, season);
        resize();
        wake();
      },
      guide(on) {
        guideOn = on;
        etGuide.visible = on;
        opacityGoal = kindNow === 'wheels' ? (on ? 0.06 : 0.22) : 1;
        if (reduceMotion.matches) opacity = opacityGoal;
        wake();
      },
      intro() {
        if (reduceMotion.matches) { exposure = 1; return wake(); }
        intro = { from: -2.5, t0: performance.now() };
        wake();
      },
      // Снимок колеса для карточки товара: тот же рендер, без подиума, с прозрачным фоном
      snapshot({ w, p, d, season: s, bolts: b, steel = false, et = ET_BASE, pcd = 114.3 }) {
        if (intro || to || dragging || !bolts) return null;   // сцена ещё не готова — снимок позже
        const savedRim = bolts;
        const size = renderer.getSize(new THREE.Vector2());
        const tw = 480, th = 360;
        stageGroup.visible = false;
        shadow.visible = false;
        etGuide.visible = false;
        caliper.visible = !steel;
        for (const m of tireParts) m.visible = !steel;
        setRim(b, steel ? 'steel' : 'alloy');
        const dm = dimsOf({ w, p, d });
        const label = paintedLabel;
        paintSidewall(`${w}/${p} R${d}`, dm);
        rebuild(dm, s, et, pcd);
        applyOpacity(1);
        root.rotation.set(0.02, steel ? -0.32 : -0.58, 0);
        spinner.rotation.z = 0;
        renderer.toneMappingExposure = 1;
        renderer.setSize(tw, th, false);
        // кадр по колесу: для диска — крупнее
        const tanHalf = Math.tan((camera.fov * Math.PI / 180) / 2);
        const span = steel ? dm.r * 2.55 : dm.R * 2.45;
        const dist = span / 2 / tanHalf;
        camera.aspect = tw / th;
        camera.position.set(0, root.position.y + dist * 0.08, dist);
        camera.lookAt(0, root.position.y, 0);
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        const url = canvas.toDataURL('image/webp', 0.86);
        // вернуть сцену как была
        renderer.setSize(size.x, size.y, false);
        camera.aspect = size.x / size.y;
        stageGroup.visible = true;
        shadow.visible = true;
        etGuide.visible = guideOn;
        caliper.visible = rimStyle === 'alloy';
        for (const m of tireParts) m.visible = true;
        setRim(savedRim, rimStyle);
        paintSidewall(label, dimsOf(cur));
        rebuild(dimsOf(cur), season);
        frame();
        return url;
      },
    };
  }
}
