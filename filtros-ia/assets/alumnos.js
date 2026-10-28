/* Datos falsos de alumnos + motor de filtros + "IA" simulada por reglas.
   Todo es ficticio. No hay ninguna llamada a un modelo real. */
(function () {
  const CURSOS = ['1º ESO A', '1º ESO B', '2º ESO A', '2º ESO B'];
  const TUTORES = { '1º ESO A': 'Marta Calvo', '1º ESO B': 'Íñigo Prats', '2º ESO A': 'Laura Benítez', '2º ESO B': 'Raúl Ortega' };
  const NOMBRES = ['Lucía','Martín','Sofía','Hugo','Valeria','Daniel','Paula','Pablo','Carmen','Álvaro','Irene','Adrián','Noa','Mateo','Claudia','Diego','Alba','Iván','Marta','Sergio','Elena','Javier','Nerea','Marcos','Laia','Rubén','Aitana','Gonzalo','Candela','Óscar','Triana','Bruno','Ainhoa','Leo','Julia','Nicolás'];
  const APELL = ['García','Martínez','López','Sánchez','Pérez','Gómez','Ruiz','Hernández','Díaz','Moreno','Muñoz','Álvarez','Romero','Alonso','Gutiérrez','Navarro','Torres','Domínguez','Vázquez','Ramos','Gil','Serrano','Blanco','Molina','Morales','Ortega','Delgado','Castro','Ortiz','Rubio','Marín','Sanz','Iglesias','Medina','Cortés','Garrido'];
  const DIAS_TRIMESTRE = 60;

  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const r1 = n => Math.round(n * 10) / 10;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  const ALUMNOS = NOMBRES.map((nom, i) => {
    const r = rng(i + 11);
    const curso = CURSOS[i % 4];
    const a1 = APELL[(i * 7) % 36];
    let a2 = APELL[(i * 11 + 5) % 36]; if (a2 === a1) a2 = APELL[(i * 11 + 6) % 36];
    const media = r1(clamp(6.3 + (r() - 0.5) * 5 - (curso === '1º ESO B' ? 0.9 : 0), 2.8, 9.6));
    const faltasTrim = Math.round(Math.max(0, (7 - media) * 1.5 + r() * 4 - 1));
    const faltasSemana = Math.min(4, Math.round(faltasTrim / 4 * r() * 1.8));
    const suspensas = media < 5 ? Math.min(5, Math.round((5 - media) * 1.8 + 1)) : (media < 6 ? 1 : 0);
    const mediaPrev = r1(clamp(media + (r() - 0.3) * 3.6, 2.8, 9.8));
    const dias = r() < 0.25 ? null : Math.round(r() * 100);
    return { id: i, nombre: a1 + ' ' + a2 + ', ' + nom, curso, tutor: TUTORES[curso], faltasTrim, faltasSemana, media, mediaPrev, suspensas, dias };
  });
  /* Ajustes manuales para que haya grupos reconocibles en la demo */
  [[1, { faltasSemana: 3, dias: null }], [6, { faltasSemana: 4, dias: null }], [9, { faltasSemana: 3, dias: 90 }], [13, { faltasSemana: 3, dias: null }],
   [18, { faltasSemana: 4, dias: 75 }], [22, { faltasSemana: 3, dias: null }], [27, { faltasSemana: 3, dias: 80 }], [30, { faltasSemana: 4, dias: null }]]
    .forEach(([i, o]) => Object.assign(ALUMNOS[i], o, { faltasTrim: Math.max(ALUMNOS[i].faltasTrim, o.faltasSemana + 2) }));
  ALUMNOS.forEach(a => {
    a.entrevistaTrim = a.dias !== null && a.dias <= DIAS_TRIMESTRE;
    a.estado = (a.faltasTrim >= 6 && a.media < 5) ? 'riesgo' : ((a.faltasTrim >= 5 || a.media < 5) ? 'atencion' : 'aldia');
  });

  const ESTADOS = { riesgo: ['error', 'Riesgo'], atencion: ['warning', 'Atención'], aldia: ['success', 'Al día'] };
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/º/g, '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const arr = v => Array.isArray(v) ? v : [v];

  /* ---------- Motor de filtros ---------- */
  const F = {
    curso:        { label: f => 'Curso: ' + arr(f.value).join(' o '),            test: (a, f) => arr(f.value).includes(a.curso) },
    tutor:        { label: f => 'Tutor/a: ' + arr(f.value).join(' o '),          test: (a, f) => arr(f.value).includes(a.tutor) },
    estado:       { label: f => 'Estado: ' + arr(f.value).map(v => ESTADOS[v][1]).join(' o '), test: (a, f) => arr(f.value).includes(a.estado) },
    faltasTrim:   { label: f => 'Faltas del trimestre ≥ ' + f.value,             test: (a, f) => a.faltasTrim >= f.value },
    faltasSemana: { label: f => 'Faltas esta semana ≥ ' + f.value,               test: (a, f) => a.faltasSemana >= f.value },
    mediaMax:     { label: f => 'Media < ' + String(f.value).replace('.', ','),  test: (a, f) => a.media < f.value },
    mediaMin:     { label: f => 'Media ≥ ' + String(f.value).replace('.', ','),  test: (a, f) => a.media >= f.value },
    suspensas:    { label: f => 'Suspensas ≥ ' + f.value,                        test: (a, f) => a.suspensas >= f.value },
    entrevista:   { label: f => f.value === 'no' ? 'Sin entrevista este trimestre' : 'Con entrevista este trimestre', test: (a, f) => (f.value === 'si') === a.entrevistaTrim },
    bajada:       { label: f => 'Media baja ' + String(f.value).replace('.', ',') + ' puntos o más', test: (a, f) => a.mediaPrev - a.media >= f.value },
    texto:        { label: f => 'Nombre contiene «' + f.value + '»',             test: (a, f) => norm(a.nombre).includes(norm(f.value)) }
  };
  const label = f => F[f.field].label(f);
  const match = (a, f) => F[f.field].test(a, f);
  const apply = (rows, filters) => rows.filter(a => filters.every(f => match(a, f)));
  const upsert = (filters, f) => filters.filter(x => x.field !== f.field).concat([f]);

  /* ---------- "IA" simulada: texto a filtros ---------- */
  function parse(texto) {
    let t = ' ' + norm(texto) + ' ';
    const out = [];
    const add = (field, value) => out.push({ field, value });
    const take = (re, fn) => { const m = t.match(re); if (m) { t = t.replace(re, ' '); fn(m); } return !!m; };
    const num = s => parseFloat(String(s).replace(',', '.'));

    const cs = [];
    let m; const reC = /\b([12])\s*eso\s*([ab])\b/g;
    while ((m = reC.exec(t))) cs.push(m[1] + 'º ESO ' + m[2].toUpperCase());
    t = t.replace(reC, ' ');
    const reC2 = /\b([12])\s*eso\b/g;
    while ((m = reC2.exec(t))) { cs.push(m[1] + 'º ESO A'); cs.push(m[1] + 'º ESO B'); }
    t = t.replace(reC2, ' ');
    if (cs.length) add('curso', [...new Set(cs)]);

    take(/media\s*(?:de\s*)?(?:menos de|inferior a|por debajo de|bajo|<)\s*(\d+(?:[.,]\d+)?)/, m => add('mediaMax', num(m[1])));
    take(/media\s*(?:de\s*)?(?:mas de|superior a|por encima de|mayor que|>|al menos)\s*(\d+(?:[.,]\d+)?)/, m => add('mediaMin', num(m[1])));

    const tut = Object.values(TUTORES).filter(n => t.includes(norm(n.split(' ')[0])));
    if (tut.length) { add('tutor', tut); tut.forEach(n => { t = t.replace(norm(n.split(' ')[0]), ' '); }); }

    take(/(?:sin|no\s+(?:tienen|tiene|han tenido|tuvieron|tengan|tenga))\s+(?:ninguna\s+)?(?:entrevista|tutoria)s?/, () => add('entrevista', 'no'));
    if (!out.some(f => f.field === 'entrevista')) take(/(?:con|ya\s+(?:tienen|han tenido))\s+(?:una\s+)?entrevista|entrevistad\w+/, () => add('entrevista', 'si'));

    take(/en riesgo|riesgo/, () => add('estado', 'riesgo'));
    if (!out.some(f => f.field === 'estado')) take(/atencion/, () => add('estado', 'atencion'));

    if (/suspend|suspens/.test(t)) {
      const mm = t.match(/(\d+)\s*(?:o mas\s*)?(?:asignaturas\s*)?suspend|suspend\w*\s*(mas de|al menos)?\s*(\d+)/);
      let n = 1; if (mm) { n = mm[1] ? +mm[1] : (+mm[3] + (mm[2] === 'mas de' ? 1 : 0)); }
      add('suspensas', n); t = t.replace(/suspend\w*|suspens\w*/g, ' ');
    }
    if (/falt|ausenc/.test(t)) {
      const semana = /semana/.test(t);
      const mm = t.match(/(mas de|al menos|minimo(?: de)?|por encima de)?\s*(\d+)\s*(?:o mas\s*)?(?:veces|faltas?|ausencias?|dias)?/);
      let n = 3; if (mm) n = +mm[2] + (mm[1] === 'mas de' || mm[1] === 'por encima de' ? 1 : 0);
      add(semana ? 'faltasSemana' : 'faltasTrim', n);
    }
    return out;
  }

  /* Si no hay resultados: qué quitar o relajar para recuperarlos */
  function relajar(filters, rows) {
    const sug = [];
    filters.forEach((f, i) => {
      const resto = filters.filter((_, j) => j !== i);
      const n = apply(rows, resto).length;
      if (n > 0) sug.push({ tipo: 'quitar', field: f.field, texto: 'Quitar «' + label(f) + '»', n });
      if (['faltasTrim', 'faltasSemana', 'suspensas'].includes(f.field) && f.value > 1) {
        const f2 = Object.assign({}, f, { value: f.value - 1 });
        const n2 = apply(rows, filters.map((x, j) => j === i ? f2 : x)).length;
        if (n2 > 0) sug.push({ tipo: 'bajar', field: f.field, value: f2.value, texto: 'Bajar a «' + label(f2) + '»', n: n2 });
      }
      if (f.field === 'mediaMin') {
        const f2 = Object.assign({}, f, { value: Math.max(0, f.value - 1) });
        const n2 = apply(rows, filters.map((x, j) => j === i ? f2 : x)).length;
        if (n2 > 0) sug.push({ tipo: 'bajar', field: f.field, value: f2.value, texto: 'Bajar a «' + label(f2) + '»', n: n2 });
      }
    });
    return sug.sort((a, b) => b.n - a.n).slice(0, 3);
  }

  /* ---------- Pintado de la tabla ---------- */
  function iniciales(n) { const p = n.split(', '); return (p[1][0] + p[0][0]).toUpperCase(); }
  function ultima(a) { return a.dias === null ? '<span class="date-val">Sin entrevista</span>' : '<span class="date-val">hace ' + a.dias + ' días</span>'; }
  function renderTable(tbody, rows, opt) {
    opt = opt || {};
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="' + (opt.selectable ? 9 : 8) + '" style="height:120px;text-align:center;color:var(--text-muted);cursor:default;">Ningún alumno coincide con estos filtros.</td></tr>'; return; }
    tbody.innerHTML = rows.map(a => {
      const sel = opt.selected && opt.selected.has(a.id);
      const [st, txt] = ESTADOS[a.estado];
      return '<tr data-id="' + a.id + '"' + (sel ? ' class="com-checked"' : '') + '>' +
        (opt.selectable ? '<td><input type="checkbox" class="row-check" aria-label="Seleccionar a ' + esc(a.nombre) + '" ' + (sel ? 'checked' : '') + '></td>' : '') +
        '<td><div style="display:flex;align-items:center;gap:12px;"><div class="wc-avatar">' + iniciales(a.nombre) + '</div><div class="info"><div class="info-name">' + esc(a.nombre) + '</div></div></div></td>' +
        '<td>' + a.curso + '</td><td>' + esc(a.tutor) + '</td>' +
        '<td><span class="num-badge ' + (a.faltasSemana >= 3 ? 'danger' : '') + '">' + a.faltasTrim + '</span> <span class="stat-sub">(' + a.faltasSemana + ' esta semana)</span></td>' +
        '<td><span class="num-badge ' + (a.media < 5 ? 'danger' : '') + '">' + String(a.media).replace('.', ',') + '</span></td>' +
        '<td>' + a.suspensas + '</td><td>' + ultima(a) + '</td>' +
        '<td><span class="wc-status" status="' + st + '">' + txt + '</span></td></tr>';
    }).join('');
  }
  const THEAD = cols => '<tr>' + (cols ? '<th><input type="checkbox" class="row-check" id="check-all" aria-label="Seleccionar todos"></th>' : '') +
    '<th>Alumno</th><th>Curso</th><th>Tutor/a</th><th>Faltas trim.</th><th>Media</th><th>Susp.</th><th>Última entrevista</th><th>Estado</th></tr>';

  /* ---------- Shell (topbar + sidenav) ---------- */
  const ico = p => '<svg viewBox="0 0 24 24">' + p + '</svg>';
  function shell(actual) {
    document.getElementById('tb').innerHTML =
      '<div class="topbar-hamburger"><span></span><span></span><span></span></div>' +
      '<div class="topbar-logo" style="font-family:var(--font-ui);font-weight:800;font-size:20px;color:var(--action-primary);">Alexia</div>' +
      '<div class="school-info" style="margin-left:16px;">Prototipo de borrador, datos ficticios</div>' +
      '<div class="topbar-right" style="padding-right:16px;">' +
      [['1-dizer.html', '1 · Decir'], ['2-adaptar.html', '2 · Adaptar'], ['3-descubrir.html', '3 · Descubrir']]
        .map(([h, t], i) => '<a href="' + h + '" class="com-tb-btn" style="text-decoration:none;' + (i + 1 === actual ? 'border-color:var(--action-primary);color:var(--action-primary);' : '') + '"' + (i + 1 === actual ? ' aria-current="page"' : '') + '>' + t + '</a>').join('') +
      '<div class="vdivider"></div><div class="avatar">MC</div></div>';
    document.getElementById('sn').innerHTML =
      '<div class="nav-item" data-tooltip="Visión general">' + ico('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>') + '</div>' +
      '<div class="nav-item active" data-tooltip="Alumnos">' + ico('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>') + '</div>' +
      '<div class="nav-item" data-tooltip="Cuaderno del Profesor">' + ico('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>') + '</div>' +
      '<div class="nav-item" data-tooltip="Comunicados">' + ico('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>') + '</div>';
  }
  const IA_ICON = '<div class="ia-icon"><svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path class="s-big" d="M19.729 9.643C14.662 8.244 13.608 7.19 12.209 2.125a.39.39 0 0 0-.714 0C10.095 7.19 9.04 8.244 3.975 9.643a.39.39 0 0 0 0 .715C9.042 11.757 10.095 12.811 11.495 17.876a.39.39 0 0 0 .714 0C13.608 12.81 14.663 11.757 19.729 10.358a.39.39 0 0 0 0-.715z" fill="#30AAC6"/><path class="s-green" d="M3.717 7.877a.39.39 0 0 0 .714 0C5.08 5.531 5.53 5.08 7.877 4.432a.39.39 0 0 0 0-.715C5.53 3.069 5.08 2.619 4.43.272a.39.39 0 0 0-.714 0C3.068 2.618 2.618 3.069.27 3.717a.39.39 0 0 0 0 .715C2.618 5.08 3.069 5.53 3.717 7.877z" fill="#71A850"/><path class="s-yellow" d="M8.432 16.124c-1.968-.544-2.346-.921-2.889-2.89a.39.39 0 0 0-.714 0c-.544 1.97-.921 2.347-2.89 2.89a.39.39 0 0 0 0 .715c1.97.543 2.347.921 2.89 2.889a.39.39 0 0 0 .714 0c.543-1.968.921-2.346 2.889-2.89a.39.39 0 0 0 0-.714z" fill="#F5D83E"/></svg></div>';
  const X_SVG = '<svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="3" fill="none" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  /* ---------- Modal informativo ---------- */
  function info(cfg) {
    const ov = document.createElement('div'); ov.className = 'panel-overlay'; ov.id = 'dlg-ov';
    const dlg = document.createElement('div'); dlg.className = 'dlg'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-labelledby', 'dlg-title'); dlg.hidden = true;
    const sec = s => '<section class="dlg-sec"><h3 class="compose-section-label">' + esc(s.h) + '</h3>' +
      (s.p ? '<p>' + s.p + '</p>' : '') +
      (s.ol ? '<ol>' + s.ol.map(x => '<li>' + x + '</li>').join('') + '</ol>' : '') +
      (s.ul ? '<ul>' + s.ul.map(x => '<li>' + x + '</li>').join('') + '</ul>' : '') +
      (s.note ? '<div class="compose-info-banner' + (s.warn ? ' compose-info-banner--warning' : '') + '"><span>' + s.note + '</span></div>' : '') + '</section>';
    dlg.innerHTML = '<div class="panel-header"><div class="ph-icon" style="background:color-mix(in srgb, var(--support-discovery) 10%, var(--bg-primary))">' + IA_ICON + '</div>' +
      '<div class="ph-titles"><span class="ph-title" id="dlg-title">' + esc(cfg.title) + '</span><span class="ph-subtitle">' + esc(cfg.subtitle) + '</span></div>' +
      '<button class="ph-btn" id="dlg-x" aria-label="Cerrar">' + '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="panel-body dlg-body">' + cfg.sections.map(sec).join('') + '</div>' +
      '<div class="panel-footer"><button class="btn-primary btn-md" id="dlg-ok">Entendido</button></div>';
    document.body.appendChild(ov); document.body.appendChild(dlg);
    let prev = null;
    function open() { prev = document.activeElement; ov.classList.add('visible'); dlg.hidden = false; document.getElementById('dlg-ok').focus(); }
    function close() { ov.classList.remove('visible'); dlg.hidden = true; if (prev && prev.focus) prev.focus(); }
    ov.onclick = close; document.getElementById('dlg-x').onclick = close; document.getElementById('dlg-ok').onclick = close;
    document.addEventListener('keydown', e => {
      if (dlg.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { const f = dlg.querySelectorAll('button'); const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
    const hd = document.querySelector('.module-header');
    const b = document.createElement('button'); b.className = 'com-tb-btn'; b.style.marginLeft = 'auto'; b.style.marginRight = '16px';
    b.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> ¿Qué es esto?';
    b.onclick = open; hd.appendChild(b);
    let visto = false; try { visto = sessionStorage.getItem('info-' + cfg.id) === '1'; sessionStorage.setItem('info-' + cfg.id, '1'); } catch (e) {}
    if (!visto) open();
  }

  window.ALX = { info, ALUMNOS, CURSOS, TUTORES, ESTADOS, F, label, match, apply, upsert, parse, relajar, renderTable, THEAD, shell, IA_ICON, X_SVG, esc, norm };
})();
