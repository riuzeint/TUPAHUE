/* =====================================================
   CONFIGURACIÓN — puedes editar esto sin miedo
   Coordenadas de los 5 checkpoints (en orden).
   Cómo obtenerlas: en Google Maps mantén presionado el punto,
   copia los números (ej: -33.4250, -70.6330) y pégalos aquí.
   Mientras diga null, la página funciona solo en modo demo.
   radio = metros a la redonda para "llegar".
   ===================================================== */
const CHECKPOINTS = [
    { lat: null, lng: null, radio: 30 },  // 1 · el último poste
    { lat: null, lng: null, radio: 30 },  // 2 · la cinta roja
    { lat: null, lng: null, radio: 30 },  // 3 · las piedras blancas
    { lat: null, lng: null, radio: 30 },  // 4 · la roca cortada
    { lat: null, lng: null, radio: 30 },  // 5 · el mirador ciego
];
const PORCENTAJE_ROJO = 2;   // % mínimo de píxeles rojos para aceptar la foto
/* ===================================================== */

const S = { name: "caminante", mail: "", cp: 0, stars: 0, view: null };
function go(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('on')); document.getElementById(id).classList.add('on'); window.scrollTo(0, 0) }
document.getElementById('f-login').addEventListener('submit', e => { e.preventDefault(); S.name = document.getElementById('u-name').value.trim() || "caminante"; S.mail = document.getElementById('u-mail').value; document.getElementById('hello').textContent = S.name; go('s-home') });

/* ---------- brújula ---------- */
let heading = 0, realCompass = false, spin = false, t0 = performance.now();
function loopCompass(t) { if (spin) { heading += 6 } else if (!realCompass) { heading = Math.sin((t - t0) / 1700) * 28 + Math.sin((t - t0) / 530) * 6 } document.getElementById('needle').style.transform = `rotate(${-heading}deg)`; requestAnimationFrame(loopCompass) }
requestAnimationFrame(loopCompass);
function initSensors() {
    try {
        const on = e => { let h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.alpha != null ? 360 - e.alpha : null); if (h != null) { realCompass = true; heading = h } };
        if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') { DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', on) }).catch(() => { }) }
        else if (window.DeviceOrientationEvent) { addEventListener('deviceorientationabsolute', on); addEventListener('deviceorientation', on) }
    } catch (e) { }
    try { navigator.geolocation.watchPosition(p => { document.getElementById('gps').textContent = '±' + Math.round(p.coords.accuracy) + 'm'; onPos(p.coords) }, () => { document.getElementById('gps').textContent = 'modo demo' }, { enableHighAccuracy: true }) } catch (e) { document.getElementById('gps').textContent = 'modo demo' }
    setTimeout(() => { const g = document.getElementById('gps'); if (g.textContent === 'buscando…') g.textContent = 'modo demo' }, 4000);
}

function dist(a, b, c, d) { const R = 6371e3, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r, h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)) }
let waiting = false;
function onPos(c) {
    const t = CHECKPOINTS[S.cp]; if (!t || t.lat == null || !waiting) return;
    const m = dist(c.latitude, c.longitude, t.lat, t.lng);
    const bars = m < 60 ? '▂▄▆█' : m < 150 ? '▂▄▆_' : m < 300 ? '▂▄__' : '▂___';
    document.getElementById('gps').textContent = 'señal ' + bars;
    if (m <= t.radio) { waiting = false; simArrive() }
}

/* ---------- diálogos ---------- */
let queue = [], typing = false, full = "", after = null, timer = null;
function say(lines, cb, opts = {}) { queue = lines.slice(); after = cb || null; const d = document.getElementById('dialog'); d.style.display = 'block'; d.classList.toggle('red', !!opts.red); next() }
function next() { if (!queue.length) { document.getElementById('dialog').style.display = 'none'; const c = after; after = null; c && c(); return } full = queue.shift().replace(/\{n\}/g, S.name); type() }
function type() { const el = document.getElementById('dtext'); el.textContent = ''; let i = 0; typing = true; clearInterval(timer); timer = setInterval(() => { el.textContent = full.slice(0, ++i); if (i >= full.length) { clearInterval(timer); typing = false } }, 28) }
function advance() { if (typing) { clearInterval(timer); document.getElementById('dtext').textContent = full; typing = false } else next() }
function actions(html) { const a = document.getElementById('actions'); a.innerHTML = html ? '<div class="box">' + html + '</div>' : ''; a.style.display = html ? 'block' : 'none' }
function setCp(n, label) { S.cp = n; document.getElementById('cpcount').textContent = `checkpoint ${n}/5`; document.getElementById('cpinfo').textContent = label }
function lockSim(b) { document.getElementById('simbtn').disabled = b; waiting = !b }

/* ---------- sonido (generado en el navegador, sin archivos) ---------- */
let AC = null, windGain = null, droneGain = null, soundOn = false;
function initAudio() {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const len = AC.sampleRate * 2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++)d[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.8;
    const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 250; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    windGain = AC.createGain(); windGain.gain.value = 0; src.connect(bp); bp.connect(windGain); windGain.connect(AC.destination); src.start();
    const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = 55; droneGain = AC.createGain(); droneGain.gain.value = 0; o.connect(droneGain); droneGain.connect(AC.destination); o.start()
}
function toggleSound() { try { if (!AC) initAudio(); soundOn = !soundOn; document.getElementById('sndbtn').textContent = 'sonido: ' + (soundOn ? 'on' : 'off'); setMood(soundOn ? 'calm' : 'off') } catch (e) { } }
function setMood(m) {
    if (!AC) return; const t = AC.currentTime, w = { off: 0, calm: .05, tense: .14 }[m], dr = { off: 0, calm: 0, tense: .08 }[m];
    windGain.gain.setTargetAtTime(soundOn ? w : 0, t, 1.2); droneGain.gain.setTargetAtTime(soundOn ? dr : 0, t, 1.5)
}

/* ---------- ruta ---------- */
function startRoute() {
    go('trav'); initSensors(); setCp(0, 'sin mapa · solo la voz'); lockSim(true);
    say(["Hola, {n}.", "Antes de que le pusieran nombre de santo, este cerro se llamaba Tupahue. Algunos todavía le dicen así. Yo nunca dejé de hacerlo.", "No me preguntes cómo sé tu nombre. Lo escribiste tú, hace un rato. ¿O no?", "Vamos a caminar por la cara del cerro que no mira a la ciudad. Desde ahí nadie te ve. Eso es bueno. Creo.", "No hay mapa. Solo la brújula y yo.", "Camina hacia el norte, hasta el último poste de luz. El que ya no tiene cable."], () => { lockSim(false); setCp(0, '→ busca el último poste') })
}
function simArrive() {
    lockSim(true); const n = S.cp + 1;
    if (n === 1) cp1(); else if (n === 2) cp2(); else if (n === 3) cp3(); else if (n === 4) cp4(); else if (n === 5) cp5()
}

function cp1() {
    setCp(1, 'checkpoint 1 · el último poste');
    say(["Llegaste. Mira hacia atrás.", "…ya no se ve Santiago, ¿cierto? Ni el ruido.", "Antes este poste alumbraba el camino. Lo desconectaron cuando la gente dejó de pasar por aquí de noche.", "¿Sabías que en la Colonia esta mitad del cerro era para los que no tenían lugar en otro lado? Los que no eran católicos. Los dejaban aquí, del lado que no se ve.", "Lejos de la vista. Como todo lo de este lado.", "Sigue el sendero de tierra, el que baja hacia donde el sol nunca llega. Busca un árbol con una cinta roja amarrada en una rama."], () => { lockSim(false); setCp(1, '→ busca la cinta roja') })
}

function cp2() {
    setCp(2, 'checkpoint 2 · la cinta roja');
    say(["¿La ves? La cinta roja en la rama.", "La amarró alguien hace años, para no perderse. Nunca volvió a buscarla.", "Sácale una foto. Necesito verla. Si me ayudas, te ayudo."], () => {
        actions(`<p class="mono" style="margin-top:0">sube la foto de la cinta roja</p><input type="file" accept="image/*" capture="environment" onchange="checkRed(this)"><img id="redprev" class="thumb" style="display:none" alt=""><p id="redres" class="mono small"></p><p class="small"><span class="lnk" onclick="redFail(true)">no encuentro la cinta</span></p>`)
    })
}
function checkRed(inp) {
    const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => {
        const img = new Image(); img.onload = () => {
            const c = document.createElement('canvas'); const W = 120, H = Math.round(120 * img.height / img.width); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H);
            const d = x.getImageData(0, 0, W, H).data; let red = 0; for (let i = 0; i < d.length; i += 4) { const R = d[i], G = d[i + 1], B = d[i + 2]; if (R > 120 && R > G * 1.7 && R > B * 1.7) red++ }
            const pct = red / (W * H) * 100; const p = document.getElementById('redprev'); p.src = r.result; p.style.display = 'block';
            document.getElementById('redres').textContent = `análisis: ${pct.toFixed(1)}% de píxeles rojos`;
            setTimeout(() => { if (pct >= PORCENTAJE_ROJO) { actions(''); say(["Sí. Esa es.", "Todavía está húmeda. Qué raro, si no ha llovido.", "Pista: más arriba hay piedras pintadas de blanco al costado del sendero. Cuéntalas mientras subes. Todas."], () => { lockSim(false); setCp(2, '→ cuenta las piedras blancas') }) } else redFail(false) }, 900)
        }; img.src = r.result
    }; r.readAsDataURL(f)
}
function redFail(skip) {
    actions('');
    if (skip) say(["¿No la encuentras?", "Está justo frente a ti, {n}. Siempre ha estado ahí.", "Da igual. Yo la veo por ti. Más arriba hay piedras pintadas de blanco al costado del sendero. Cuéntalas mientras subes."], () => { lockSim(false); setCp(2, '→ cuenta las piedras blancas') }, { red: true });
    else say(["Eso no es rojo. Eso no es la cinta.", "No me mientas. Vuelve a intentarlo."], () => cp2Retry())
}
function cp2Retry() { actions(`<p class="mono" style="margin-top:0">sube otra foto de la cinta roja</p><input type="file" accept="image/*" capture="environment" onchange="checkRed(this)"><img id="redprev" class="thumb" style="display:none" alt=""><p id="redres" class="mono small"></p><p class="small"><span class="lnk" onclick="redFail(true)">no encuentro la cinta</span></p>`) }

function cp3() {
    setCp(3, 'checkpoint 3 · las piedras');
    say(["¿Cuántas piedras blancas contaste?"], () => { actions(`<p class="mono" style="margin-top:0">escribe el número</p><input type="text" inputmode="numeric" id="stones"><p class="center"><button class="btn" onclick="stones()">responder</button></p>`) })
}
function stones() {
    const v = (document.getElementById('stones').value || '0').trim(); actions('');
    const lines = v === '7' ? ["Siete. Bien.", "Siempre son siete. Nadie sabe quién las pinta."] : [`¿${v}?`, "No. Son siete. Siempre son siete.", "Contaste mal. O alguna se movió."];
    lines.push("Sigue subiendo hasta donde la roca está cortada, como si alguien le hubiera sacado pedazos. Ahí te espero.");
    say(lines, () => { lockSim(false); setCp(3, '→ la roca cortada') })
}

function cp4() {
    setCp(4, 'checkpoint 4 · la roca cortada');
    say(["¿Ves los cortes en la piedra?", "De este cerro sacaron piedra para el puente de Cal y Canto. Y para los pisos de La Moneda.", "O sea que cuando caminas por el centro, caminas sobre él. Siempre lo has hecho, {n}.", "Y él se acuerda de cada paso.", "Pon la mano sobre la roca. Quédate así un rato. Quiero que te sienta."], () => {
        actions(`<p class="mono" style="margin-top:0">mantén presionado mientras tocas la roca</p><p class="center"><button class="btn" id="holdbtn" style="width:100%;padding:18px">mantener presionado</button></p><div style="border:1px solid #000;height:12px"><div id="holdbar" style="height:100%;width:0;background:#a40000"></div></div>`);
        let p = 0, iv = null; const b = document.getElementById('holdbtn'), bar = document.getElementById('holdbar');
        const start = e => { e.preventDefault(); clearInterval(iv); iv = setInterval(() => { p += 2; bar.style.width = p + '%'; if (p >= 100) { clearInterval(iv); actions(''); say(["…", "Está tibia, ¿cierto? A esta hora no debería.", "Bien. Ya te conoce.", "Ahora sube al mirador viejo, el de la baranda oxidada. Cuando llegues, no te des vuelta todavía."], () => { lockSim(false); setCp(4, '→ el mirador de la baranda oxidada') }) } }, 100) };
        const stop = () => { clearInterval(iv); if (p < 100) { p = 0; bar.style.width = '0'; b.textContent = 'no la sueltes. otra vez.' } };
        b.addEventListener('pointerdown', start); b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop)
    })
}

function cp5() {
    setCp(5, 'checkpoint 5 · el mirador ciego'); setMood('tense');
    say(["Llegaste al mirador.", "Ahora apunta el celular hacia el norte. Hacia donde marca la aguja roja.", "Quédate quieto. Escucha."], () => {
        actions(`<p class="center" style="margin:0"><button class="btn" onclick="scare()">ya estoy mirando al norte</button></p>`)
    })
}
function scare() {
    actions(''); setMood('tense'); const f = document.getElementById('flash'); f.classList.add('on'); spin = true;
    setTimeout(() => { say(["…", "¿Lo escuchaste?", "Seguro fue el viento. Aquí arriba el viento dice cosas raras.", "No te des vuelta. No hace falta.", "El tótem está pasando la última curva. Acércale tu celular, {n}. Ahí termina esto.", "O ahí empieza."], () => { f.classList.remove('on'); spin = false; setMood('calm'); go('s-final') }, { red: true }) }, 1800)
}

/* ---------- final ---------- */
function nfcTap() { document.getElementById('nfcbtn').disabled = true; document.getElementById('nfcbtn').textContent = '((·)) tótem_02 leído'; document.getElementById('final-upload').style.display = 'block' }
document.getElementById('viewpic').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { S.view = r.result; const p = document.getElementById('viewprev'); p.src = r.result; p.style.display = 'block' }; r.readAsDataURL(f) });
document.querySelectorAll('#stars span').forEach((s, i, all) => s.onclick = () => { S.stars = i + 1; all.forEach((x, j) => x.classList.toggle('on', j <= i)) });
function publish() {
    const txt = document.getElementById('revtext').value.trim() || '(sin comentario)';
    makePostal(() => {
        document.getElementById('final-upload').style.display = 'none'; document.getElementById('nfcbtn').style.display = 'none'; document.getElementById('final-done').style.display = 'block';
        const st = n => '★'.repeat(n) + '☆'.repeat(5 - n);
        document.getElementById('wall').innerHTML = `<div class="rev"><b>${esc(S.name)}</b> · ${st(S.stars || 5)}<br>${esc(txt)}<br><span class="small">hace un momento</span></div>
    <div class="rev"><b>valentina_k</b> <span class="small">(ejemplo)</span> · ★★★★☆<br>no vuelvo a contar piedras en mi vida.<br><span class="small">hace 3 días</span></div>
    <div class="rev"><b>m.</b> <span class="small">(ejemplo)</span> · ★★★★★<br>la voz sabía cosas que yo no le dije.<br><span class="small">hace 1 semana</span></div>`; window.scrollTo(0, 0)
    })
}
function staticFx(x, b) {
    const [X, Y, W, H] = b;
    for (let y = Y; y < Y + H; y += 4) { x.fillStyle = 'rgba(0,0,0,.07)'; x.fillRect(X, y, W, 1.5) }
    for (let i = 0; i < 9000; i++) { x.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.10)'; x.fillRect(X + Math.random() * W, Y + Math.random() * H, 2, 2) }
    for (let k = 0; k < 3; k++) { const y = Y + Math.random() * H; x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(X, y, W, 2 + Math.random() * 4) }
    const g = x.createRadialGradient(X + W / 2, Y + H / 2, H * .3, X + W / 2, Y + H / 2, H * .8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = g; x.fillRect(X, Y, W, H)
}
function esc(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
function makePostal(cb) {
    const c = document.createElement('canvas'); c.width = 900; c.height = 1200; const x = c.getContext('2d');
    x.fillStyle = '#e8e6df'; x.fillRect(0, 0, 900, 1200);
    for (let y = 0; y < 1200; y += 4) { x.fillStyle = 'rgba(0,0,0,.04)'; x.fillRect(0, y, 900, 1) }
    x.strokeStyle = '#111'; x.lineWidth = 3; x.strokeRect(30, 30, 840, 1140);
    x.fillStyle = '#111'; x.font = '28px Courier New'; x.fillText('TUPAHUE', 70, 95);
    x.font = '22px Courier New'; x.fillStyle = '#555'; x.fillText('postal nº ' + String(14).padStart(4, '0'), 650, 95);
    const draw = () => {
        x.fillStyle = '#a40000'; x.font = 'bold 54px Times New Roman'; x.fillText('LLEGASTE AL HITO', 70, 840);
        x.fillStyle = '#111'; x.font = 'italic 40px Times New Roman'; x.fillText('La Ladera que No Mira', 70, 900);
        x.font = '26px Courier New'; x.fillText('Cerro San Cristóbal · Santiago', 70, 950);
        x.fillText('caminante: ' + S.name, 70, 1010); x.fillText(new Date().toLocaleDateString('es-CL'), 70, 1050);
        x.fillStyle = '#777'; x.font = '22px Courier New'; x.fillText('la voz te recordará.', 70, 1120);
        x.beginPath(); x.arc(760, 990, 80, 0, 7); x.strokeStyle = '#a40000'; x.lineWidth = 5; x.stroke(); x.fillStyle = '#a40000'; x.font = 'bold 22px Courier New'; x.textAlign = 'center'; x.fillText('5/5', 760, 980); x.fillText('CHECK', 760, 1010); x.textAlign = 'left';
        document.getElementById('postal').src = c.toDataURL('image/jpeg', .9); cb()
    };
    const box = [70, 130, 760, 620];
    if (S.view) { const im = new Image(); im.onload = () => { const r = Math.max(box[2] / im.width, box[3] / im.height), w = im.width * r, h = im.height * r; x.save(); x.beginPath(); x.rect(...box); x.clip(); x.drawImage(im, box[0] + (box[2] - w) / 2, box[1] + (box[3] - h) / 2, w, h); staticFx(x, box); x.restore(); x.strokeRect(...box); draw() }; im.src = S.view }
    else { x.fillStyle = '#bbb'; x.fillRect(...box); x.fillStyle = '#666'; x.font = '26px Courier New'; x.fillText('[ la vista desde el hito ]', 230, 450); x.strokeRect(...box); draw() }
}