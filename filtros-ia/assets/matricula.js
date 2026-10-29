/* Datos falsos de alumnos para el listado de matrícula + motor de filtros + "IA" simulada por reglas.
   Los campos son los del panel "Filtrar los resultados". Todo es ficticio. No hay ninguna llamada a un modelo real. */
(function () {
  const NIVELES = ['Infantil 1', 'Infantil 2', 'Infantil 3', 'Primaria 1º', 'Primaria 2º', 'Primaria 3º', 'Primaria 4º', 'Primaria 5º', 'Primaria 6º'];
  const NOMBRES = ['Lucía','Martín','Sofía','Hugo','Valeria','Daniel','Paula','Pablo','Carmen','Álvaro','Irene','Adrián','Noa','Mateo','Claudia','Diego','Alba','Iván','Marta','Sergio','Elena','Javier','Nerea','Marcos','Laia','Rubén','Aitana','Gonzalo','Candela','Óscar','Triana','Bruno','Ainhoa','Leo','Julia','Nicolás'];
  const APELL = ['García','Martínez','López','Sánchez','Pérez','Gómez','Ruiz','Hernández','Díaz','Moreno','Muñoz','Álvarez','Romero','Alonso','Gutiérrez','Navarro','Torres','Domínguez','Vázquez','Ramos','Gil','Serrano','Blanco','Molina','Morales','Ortega','Delgado','Castro','Ortiz','Rubio','Marín','Sanz','Iglesias','Medina','Cortés','Garrido'];

  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/º/g, '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const ALUMNOS = [];
  for (let i = 0; i < 84; i++) {
    const r = rng(i + 101);
    const nivel = NIVELES[i % NIVELES.length];
    const nom = NOMBRES[(i * 5 + 3 + Math.floor(i / 36) * 7) % 36];
    const k = Math.floor(i / 36) * 13;
    const a1 = APELL[(i * 7 + k) % 36];
    let a2 = APELL[(i * 11 + 5 + k) % 36]; if (a2 === a1) a2 = APELL[(i * 11 + 6 + k) % 36];
    const alta = r() < 0.84;
    const matriculado = alta ? r() < 0.8 : false;
    const matFutura = matriculado && r() < 0.12;
    ALUMNOS.push({
      id: i, nombre: nom, ap1: a1, ap2: a2,
      etapa: nivel.split(' ')[0], nivel, grupo: ['A', 'B', 'C'][Math.floor(r() * 3)],
      alta, matriculado, matHoy: matriculado && !matFutura, matFutura,
      tutorizado: alta && r() < 0.45,
      matricula: String(8000 + i * 9 + Math.floor(r() * 5)).padStart(8, '0'),
      altaAnio: alta ? 2024 + Math.floor(r() * 3) : 2022 + Math.floor(r() * 3)
    });
  }

  /* Columnas de la tabla de Alexia: avisos médicos, secciones y extraescolares */
  ALUMNOS.forEach(a => {
    const r = rng(a.id + 500);
    a.seccion = String(NIVELES.indexOf(a.nivel) + 1).padStart(3, '0') + a.grupo;
    a.seccionRoja = r() < 0.06 ? 'SEC_EST_X' : '';
    a.avisos = r() < 0.18 ? (r() < 0.5 ? 1 : 2) : 0;
    const ex = [];
    if (r() < 0.9) ex.push({ t: 'COMED' });
    if (a.etapa === 'Infantil' && r() < 0.45) ex.unshift({ t: 'Nat.Inf.I' });
    if (r() < 0.12) ex.unshift({ t: ['Futbol 7-1', 'Karate3', 'Period.2', 'cello 1'][Math.floor(r() * 4)] });
    if (r() < 0.25) ex.push({ t: 'TRANS', red: true });
    a.extra = ex;
  });

  /* ---------- Estado de los filtros del panel ---------- */
  const DEFAULT = () => ({
    nivel: '', alta: true, baja: false, noMatric: false, tutor: false, matHoy: false,
    nombre: { op: 'contiene', v: '' }, ap1: { op: 'contiene', v: '' }, ap2: { op: 'contiene', v: '' },
    matricula: { op: 'contiene', v: '' }, grupo: '', altaAnio: ''
  });
  const clone = S => JSON.parse(JSON.stringify(S));
  const OPS = { contiene: 'contiene', empieza: 'empieza por', igual: 'es igual a' };
  const opTest = (val, op, q) => { const a = norm(val), b = norm(q); return op === 'empieza' ? a.startsWith(b) : op === 'igual' ? a === b : a.includes(b); };

  function test(a, S) {
    if (S.nivel && a.nivel !== S.nivel && a.etapa !== S.nivel) return false;
    if (S.alta !== S.baja && (S.alta ? !a.alta : a.alta)) return false;
    if (S.noMatric && a.matriculado) return false;
    if (S.tutor && !a.tutorizado) return false;
    if (S.matHoy && !a.matHoy) return false;
    if (S.nombre.v && !opTest(a.nombre, S.nombre.op, S.nombre.v)) return false;
    if (S.ap1.v && !opTest(a.ap1, S.ap1.op, S.ap1.v)) return false;
    if (S.ap2.v && !opTest(a.ap2, S.ap2.op, S.ap2.v)) return false;
    if (S.matricula.v && !opTest(a.matricula, S.matricula.op, S.matricula.v)) return false;
    if (S.grupo && a.grupo !== S.grupo) return false;
    if (S.altaAnio && String(a.altaAnio) !== String(S.altaAnio)) return false;
    return true;
  }
  const apply = (rows, S) => rows.filter(a => test(a, S));

  /* Lista de filtros activos, con su clave para poder quitarlos uno a uno */
  function activos(S) {
    const f = [];
    if (S.nivel) f.push({ key: 'nivel', label: 'Nivel: ' + (S.nivel.includes(' ') ? S.nivel : 'toda ' + S.nivel) });
    if (S.alta !== S.baja) f.push({ key: 'estado', label: 'Estado: ' + (S.alta ? 'Alta' : 'Baja') });
    if (S.noMatric) f.push({ key: 'noMatric', label: 'No matriculados' });
    if (S.tutor) f.push({ key: 'tutor', label: 'Tutorizados' });
    if (S.matHoy) f.push({ key: 'matHoy', label: 'Matrícula vigente hoy' });
    [['nombre', 'Nombre'], ['ap1', 'Primer apellido'], ['ap2', 'Segundo apellido'], ['matricula', 'Núm. matrícula']]
      .forEach(([k, n]) => { if (S[k].v) f.push({ key: k, label: n + ' ' + OPS[S[k].op] + ' «' + S[k].v + '»' }); });
    if (S.grupo) f.push({ key: 'grupo', label: 'Grupo: ' + S.grupo });
    if (S.altaAnio) f.push({ key: 'altaAnio', label: 'Alta en ' + S.altaAnio });
    return f;
  }
  function quitar(S, key) {
    const D = DEFAULT(), n = clone(S);
    if (key === 'estado') { n.alta = false; n.baja = false; }
    else n[key] = D[key];
    return n;
  }

  /* ---------- "IA" simulada: texto a filtros ---------- */
  function parse(texto) {
    let t = ' ' + norm(texto) + ' ';
    const P = {}; let hit = false;
    const take = (re, fn) => { const m = t.match(re); if (m) { t = t.replace(re, ' '); fn(m); hit = true; } return !!m; };
    const opDe = w => /empiec|comienc/.test(w || '') ? 'empieza' : 'contiene';
    const cap = s => { const c = NOMBRES.concat(APELL).find(x => norm(x) === s); return c || s.charAt(0).toUpperCase() + s.slice(1); };

    take(/(?:dad[oa]s?\s+de\s+)?alta\s+en\s+(20\d\d)/, m => { P.altaAnio = m[1]; });
    if (!take(/altas?\s+y\s+bajas?|incluid\w+\s+(?:las\s+)?bajas|todos\s+los\s+estados/, () => { P.alta = true; P.baja = true; })) {
      if (!take(/\b(?:de\s+)?bajas?\b/, () => { P.alta = false; P.baja = true; })) take(/\b(?:de\s+)?altas?\b|\bactiv[oa]s\b/, () => { P.alta = true; P.baja = false; });
    }
    take(/no\s+(?:estan\s+)?matriculad[oa]s?|sin\s+matricula(?:r|s)?\b/, () => { P.noMatric = true; });
    take(/\btutorizad[oa]s?\b|\bcon\s+tutor(?:ia|a)?\b/, () => { P.tutor = true; });
    take(/matricula\s+vigente|matriculad[oa]s?\s+(?:a\s+fecha\s+de\s+)?hoy|a\s+fecha\s+de\s+hoy|vigente/, () => { P.matHoy = true; });
    take(/(?:numero\s+de\s+|num(?:ero)?\s+)?matricula\s*(?:(?:que\s+)?(empiec\w+|comienc\w+)\s+por|contiene|contenga|igual\s+a|es)?\s*(\d[\d-]*)/, m => { P.matricula = { op: /igual|\bes\b/.test(m[0]) ? 'igual' : opDe(m[1]), v: m[2] }; });

    let m;
    if ((m = t.match(/infantil\s*([123])\b|\b([123])\s*(?:de\s*)?infantil/))) { P.nivel = 'Infantil ' + (m[1] || m[2]); t = t.replace(m[0], ' '); hit = true; }
    else if ((m = t.match(/primaria\s*([1-6])\b|\b([1-6])\s*(?:de\s*)?primaria/))) { P.nivel = 'Primaria ' + (m[1] || m[2]) + 'º'; t = t.replace(m[0], ' '); hit = true; }
    else if (/infantil/.test(t)) { P.nivel = 'Infantil'; t = t.replace(/infantil/, ' '); hit = true; }
    else if (/primaria/.test(t)) { P.nivel = 'Primaria'; t = t.replace(/primaria/, ' '); hit = true; }

    take(/grupo\s*([abc])\b/, m => { P.grupo = m[1].toUpperCase(); });

    const nom = '(?:es\\s+|que\\s+)?(?:(empiec\\w+|comienc\\w+)\\s+por\\s+)?([a-zñ]+)';
    take(new RegExp('segundo\\s+apellido\\s+' + nom), m => { P.ap2 = { op: opDe(m[1]), v: cap(m[2]) }; });
    take(new RegExp('(?:primer\\s+)?apellido\\s+' + nom), m => { P.ap1 = { op: opDe(m[1]), v: cap(m[2]) }; });
    take(new RegExp('(?:se\\s+llam\\w+|llamad[oa]s?|de\\s+nombre|nombre)\\s+' + nom), m => { P.nombre = { op: opDe(m[1]), v: cap(m[2]) }; });
    return hit ? P : null;
  }
  const completo = P => Object.assign(DEFAULT(), P);

  /* Si no hay resultados: qué quitar para recuperarlos */
  function relajar(S, rows) {
    return activos(S).map(f => ({ key: f.key, texto: 'Quitar «' + f.label + '»', n: apply(rows, quitar(S, f.key)).length }))
      .filter(s => s.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
  }

  window.MAT = { ALUMNOS, NIVELES, DEFAULT, clone, OPS, test, apply, activos, quitar, parse, completo, relajar, norm, esc };
})();
