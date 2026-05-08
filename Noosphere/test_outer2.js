
/* === SQUAD BUILDER V2 — layout alinhado ao Template - Unit; facção/tática globais === */
const isObs = typeof app !== "undefined";
const bid = "sb_" + Math.random().toString(36).substr(2,8);

// --- LOAD ALL DATA ---
const pages = dv.pages('"Wargame/02 Models"').where(p => p.tipo === "Model" || p.faccao !== undefined);
function legacyTacticsFromBannerSB(f) {
  const arr = [];
  for (let n = 1; n <= 12; n++) {
    const nm = f[`tactic${n}_name`];
    if (nm) arr.push({ nome: String(nm).trim(), efeitos: {} });
  }
  return arr;
}
function normalizeUpgradesSB(arr) {
  if (!arr) return [];
  return arr.map(u => {
    if (!u) return null;
    var ef = u.efeitos;
    if (ef && typeof ef === "object" && !Array.isArray(ef)) ef = { ...ef };
    else if (ef != null && typeof ef !== "object") ef = {};
    else ef = ef || {};
    if (ef.caracteristicas != null && ef.caracteristica == null) {
      ef.caracteristica = ef.caracteristicas;
      delete ef.caracteristicas;
    }
    return {
      nome: String(u.nome || u.name || "").trim(),
      pontos: Number(u.pontos != null ? u.pontos : (u.cost || 0)) || 0,
      descricao: String(u.descricao || u.desc || "").trim(),
      efeitos: ef,
    };
  }).filter(u => u && u.nome);
}
function normalizeTacticSB(t) {
  if (!t) return null;
  return {
    nome: String(t.nome || "").trim(),
    sub: String(t.sub || "").trim(),
    descricao: String(t.descricao || "").trim(),
    requisito: String(t.requisito || "").trim(),
    efeitos: t.efeitos ? {...t.efeitos} : {},
    upgrades: normalizeUpgradesSB(t.upgrades),
  };
}
const factionsRaw = dv.pages('"Wargame/03 Facções"').map(f => {
  const rawT = (f.taticas && f.taticas.length > 0) ? f.taticas : legacyTacticsFromBannerSB(f);
  const taticas = rawT.map(normalizeTacticSB).filter(Boolean);
  const passiva = f.faccao_passiva ? {
    nome: String(f.faccao_passiva.nome || "").trim(),
    descricao: String(f.faccao_passiva.descricao || "").trim(),
    efeitos: f.faccao_passiva.efeitos ? {...f.faccao_passiva.efeitos} : {},
  } : null;
  return { name: f.file.name, noosphera: f.noosphera, passiva, taticas };
}).array();
const glossPages = {
  active:   dv.page("Wargame/05 Glossários/Glossário - Ações.md")?.file?.lists || [],
  passive:  dv.page("Wargame/05 Glossários/Glossário - Passivas.md")?.file?.lists || [],
};

function buildMap(lists) {
  let m = {};
  (lists||[]).forEach(l => { if(l.text.includes(':')) { const [k,d] = l.text.split(':'); m[k.trim().toLowerCase()] = d.trim(); } });
  return m;
}
const glossPassMap = buildMap(glossPages.passive);
const gMaps = {
  active:   buildMap(glossPages.active),
  passive:  glossPassMap,
  weapon:   glossPassMap,
  utilpass: glossPassMap,
  utilityPassive: glossPassMap,
};

function resolveLinkedUtilityPage(pathStr) {
  let pg = dv.page(pathStr);
  if (pg) return pg;
  const baseName = pathStr.replace(/\\/g, "/").split("/").pop().replace(/\.md$/i, "");
  let found = null;
  dv.pages().forEach(function (q) {
    if (found) return;
    if (q.file.name.replace(/\.md$/i, "") === baseName) found = q;
  });
  return found;
}

// Helper: resolve image to raw path and app path (export / fallback)
function resolveImg(imgRaw, contextPath) {
  if (!imgRaw) return { src:"", raw:"" };
  let path = imgRaw.path || String(imgRaw).replace(/\[\[|\]\]/g,"");
  if (!path || !isObs) return { src:path, raw:path };
  if (path.startsWith("http")) return { src:path, raw:path };
  const file = app.metadataCache.getFirstLinkpathDest(path, contextPath);
  if (!file) return { src:"", raw:"" };
  return { src: app.vault.adapter.getResourcePath(file.path), raw: file.path };
}

function bufferToBase64SB(buf) {
  let binStr = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binStr += String.fromCharCode(bytes[i]);
  return window.btoa(binStr);
}

/** Resolve imagens sem async/base64 — necessário para Webpage HTML Export (bloque dataviewjs vazio com muitos awaits + payload enorme). Base64 opcional: resolveImgToDisplay (não usar no loop principal). */
async function resolveImgToDisplay(imgRaw, contextPath) {
  if (!imgRaw) return { src: "", raw: "" };
  let path = imgRaw.path || String(imgRaw).replace(/\[\[|\]\]/g, "");
  if (!path) return { src: "", raw: "" };
  if (path.startsWith("http")) return { src: path, raw: path };
  if (!isObs) return resolveImg(imgRaw, contextPath);
  const file = app.metadataCache.getFirstLinkpathDest(path, contextPath || "");
  if (!file) return { src: "", raw: "" };
  const raw = file.path;
  try {
    const buffer = await app.vault.readBinary(file);
    const b64 = bufferToBase64SB(buffer);
    const ext = file.extension.toLowerCase();
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
    return { src: `data:${mime};base64,${b64}`, raw };
  } catch (_e) {
    return { src: app.vault.adapter.getResourcePath(file.path), raw };
  }
}

const sbSelfPath = dv.current()?.file?.path || "";

function stripDiacriticsDV(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function normKwBareDV(s) {
  return stripDiacriticsDV(String(s || "").trim()).toLowerCase();
}
function modelHasMercenaryKeywordDV(keywords) {
  const arr = Array.isArray(keywords) ? keywords : (keywords ? String(keywords).split(",").map((x) => x.trim()) : []);
  return arr.some((k) => {
    const x = normKwBareDV(k);
    return x === "mercenary" || x === "mercenario" || x === "mercenarios";
  });
}

// Build model data (hero usa background-image — base64/Obsidian via resolveImgToDisplay; armas ficam resolveImg para não inchár o JSON export)
const modelData = [];
for (const p of pages) {
  const imgObj = resolveImg(p.model_image, p.file.path);
  const chars = Array.isArray(p.caracteristicas) ? p.caracteristicas : (p.caracteristicas ? String(p.caracteristicas).split(",").map(s=>s.trim()) : []);
  const kws   = Array.isArray(p.keywords) ? p.keywords : (p.keywords ? String(p.keywords).split(",").map(s=>s.trim()) : []);
  const facs  = Array.isArray(p.faccao) ? p.faccao : (p.faccao ? [p.faccao] : []);
  const loadouts = [];
  // Read utility_list first, fallback to legacy utility1..10
  let utilLinks = [];
  if (p.utility_list && Array.isArray(p.utility_list) && p.utility_list.length > 0) {
    utilLinks = p.utility_list;
  } else if (p.utility_list && typeof p.utility_list === "string" && p.utility_list.trim()) {
    utilLinks = [p.utility_list];
  } else {
    for (let i=1;i<=10;i++) { const ul = p[`utility${i}`]; if (ul) utilLinks.push(ul); }
  }
  for (const ul of utilLinks) {
    if (!ul) continue;
    const raw = ul.path || String(ul).replace(/\[\[|\]\]/g,"").trim();
    const name = raw.split("/").pop().replace(/\.md$/i,"");
    if (name) loadouts.push(name);
  }
  // Fetch weapon pages — sync resolveImg to avoid export freeze
  const weaponPages = [];
  for (const ul of utilLinks) {
    if (!ul) continue;
    const path = ul.path || String(ul).replace(/\[\[|\]\]/g,"").trim();
    const wp = resolveLinkedUtilityPage(path);
    if(!wp) continue;
    const wImgObj = resolveImg(wp.utility_image || wp.model_image || "", wp.file.path);
    const atk = wp.equipamento_ataques, mir = wp.equipamento_mira, dist = wp.equipamento_distancia,
          dmg = wp.damage_type, pes = wp.equipamento_loadout;
    const pmRaw = wp.point_mod;
    const hasPm = pmRaw !== undefined && pmRaw !== null && String(pmRaw).trim() !== "";
    weaponPages.push({
      name: wp.file?.name || path.split("/").pop().replace(".md",""),
      tipo: wp.tipo || "Weapon",
      image: (wImgObj && wImgObj.src) || "",
      imageObj: wImgObj,
      ataques: atk != null && atk !== '' ? atk : null,
      mira: mir != null && mir !== '' ? mir : null,
      distancia: dist != null && dist !== '' ? dist : null,
      dano: dmg != null && dmg !== '' ? dmg : null,
      peso: pes != null && pes !== '' ? pes : null,
      point_mod: hasPm ? pmRaw : null,
      equipamento_ataques: atk,
      equipamento_mira: mir,
      equipamento_distancia: dist,
      damage_type: dmg,
      equipamento_loadout: pes,
      keywords: wp.equipamento_keywords||[],
      caracteristicas: wp.equipamento_caracteristicas||[],
      passivas_de_utility: wp.passivas_de_utility||[],
    });
  }
  modelData.push({
    path: p.file.path, name: p.file.name,
    pontos: parseInt(p.pontos)||0,
    faccao: facs, noosphera: p.noosphera||"",
    caracteristicas: chars, keywords: kws,
    vida: p.vida||0, movimento: p.movimento||0,
    decoerencia: p.decoerencia||0, ap: Number(p.ap != null && p.ap !== '' ? p.ap : p.AP) || 0,
    armadura_melee: p.armadura_melee||0,
    armadura_ranged: p.armadura_ranged||0,
    armadura_special: p.armadura_special||0,
    loadout_max: p.loadout_max||0,
    habilidades_ativas: p.habilidades_ativas||[],
    habilidades_passivas: p.habilidades_passivas||[],
    habilidades_padrao: p.habilidades_padrao||[],
    imgObj, weapons: weaponPages,
    mercenary: modelHasMercenaryKeywordDV(kws),
    updatedStr: (typeof window !== "undefined" && window.moment)
      ? window.moment(p.file.mtime).format("DD/MM/YYYY")
      : new Date(p.file.mtime).toLocaleDateString(),
  });
}

const faviconURL = resolveImg("Recursos/Main Logo/Favicon fill White.png", sbSelfPath).src;
const noospheras = [...new Set(modelData.map(p=>p.noosphera).filter(Boolean))].sort();
const faccoes    = [...new Set(modelData.flatMap(p=>p.faccao).filter(Boolean))].sort();

/** JSON inside <textarea>: forbid raw `<` so `</textarea>` in data cannot break the DOM (\\u003c stays valid JSON). */
function jsonForTextareaEmbed(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
const globalFacOpts = factionsRaw.map(f => `<option value="${String(f.name).replace(/"/g, "&quot;")}">${f.name}</option>`).join("");

// ======== CSS ========
const css = `
<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@300;400;700;900&family=Inter:wght@200;300;400;600&display=swap');
#${bid} * { box-sizing: border-box; }
#${bid} { font-family: 'Inter', sans-serif; color: #e0d8f0; width: 100%; position: relative; z-index: 5; isolation: isolate; }
#${bid} input, #${bid} select, #${bid} button, #${bid} .sb-add-btn { pointer-events: auto; touch-action: manipulation; }
/* Some static exports can drop inline styles; keep this engine payload hidden. */

/* LAYOUT */
.sb-layout { display: grid; grid-template-columns: 360px 1fr; gap: 30px; align-items: start; }
@media(max-width:900px){ .sb-layout { grid-template-columns: 1fr; } }

/* BROWSER PANEL */
.sb-browser { background: rgba(15,5,25,.7); border: 1px solid rgba(190,99,255,.2); border-radius: 20px; padding: 20px; }
.sb-browser-title { font-family:'Orbitron',sans-serif; font-size:.75rem; letter-spacing:3px; color:#d8b4fe; text-transform:uppercase; margin-bottom:15px; }
.sb-search, .sb-sel { width:100%; background:rgba(10,0,20,.7); border:1px solid rgba(190,99,255,.25); color:#fff; padding:12px 18px; font-family:'Orbitron',sans-serif; font-size:.8rem; border-radius:30px; outline:none; margin-bottom:10px; height:auto; line-height:1.4; display:block; }
.sb-sel { cursor:pointer; -webkit-appearance:none; appearance:none; }
.sb-model-list { display:flex; flex-direction:column; gap:8px; max-height:600px; overflow-y:auto; scrollbar-width:thin; scrollbar-color:#be63ff rgba(0,0,0,.2); }
.sb-model-list::-webkit-scrollbar { width:3px; }
.sb-model-list::-webkit-scrollbar-thumb { background:#be63ff; border-radius:10px; }
.sb-mcard { display:flex; align-items:center; gap:10px; background:rgba(5,0,15,.6); border:1px solid rgba(190,99,255,.1); border-radius:12px; padding:10px; cursor:pointer; transition:.3s; }
.sb-mcard:hover { border-color:rgba(190,99,255,.5); background:rgba(20,5,40,.8); }
.sb-mcard.hidden { display:none; }
.sb-mcard-img { width:45px; height:45px; border-radius:8px; object-fit:cover; object-position:top; flex-shrink:0; background:#0a0014; }
.sb-mcard-info { flex-grow:1; min-width:0; }
.sb-mcard-name { font-family:'Orbitron',sans-serif; font-size:.65rem; letter-spacing:2px; text-transform:uppercase; color:#f0eaff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sb-mcard-sub { font-size:.6rem; color:#a99bbd; margin-top:2px; }
.sb-mcard-pts { font-family:'Orbitron',sans-serif; font-size:.7rem; color:#00ff88; white-space:nowrap; }
.sb-add-btn { background:rgba(190,99,255,.15); border:1px solid rgba(190,99,255,.4); color:#d8b4fe; padding:6px 12px; border-radius:20px; font-size:.65rem; font-family:'Orbitron',sans-serif; cursor:pointer; transition:.2s; white-space:nowrap; }
.sb-add-btn:hover { background:rgba(190,99,255,.4); color:#fff; }

/* SQUAD PANEL */
.sb-squad { display:flex; flex-direction:column; gap:20px; }
.sb-squad-header { background:rgba(15,5,25,.8); border:1px solid rgba(0,255,136,.2); border-radius:16px; padding:20px 25px; display:flex; align-items:flex-start; justify-content:space-between; gap:20px; flex-wrap:wrap; }
.sb-pts-total { font-family:'Orbitron',sans-serif; }
.sb-pts-total small { font-size:.6rem; letter-spacing:3px; text-transform:uppercase; color:#a99bbd; display:block; }
.sb-pts-total .sb-pts-num { font-size:2.5rem; font-weight:900; color:#00ff88; text-shadow:0 0 20px rgba(0,255,136,.4); line-height:1; }
.sb-invalid-banner { display:none; font-size:.72rem; font-weight:900; color:#ff3366; letter-spacing:.5px; margin-left:4px; vertical-align:middle; max-width:280px; }
.sb-unique-banner { display:none; font-size:.72rem; font-weight:900; color:#ffaa00; letter-spacing:.5px; margin-left:4px; vertical-align:middle; max-width:340px; }
.sb-points-banner { display:none; font-size:.72rem; font-weight:900; color:#ff6644; letter-spacing:.5px; margin-left:4px; vertical-align:middle; max-width:380px; }
.sb-global-tactics { display:flex; gap:14px; align-items:flex-end; flex-wrap:wrap; flex:1; min-width:280px; }
.sb-global-tactics label { display:block; font-size:.58rem; letter-spacing:2px; text-transform:uppercase; color:#a99bbd; margin-bottom:4px; font-family:'Orbitron',sans-serif; font-weight:700; }
.sb-export-btns { display:flex; gap:10px; flex-wrap:wrap; }
.sb-btn { background:rgba(190,99,255,.15); border:1px solid rgba(190,99,255,.4); color:#d8b4fe; padding:10px 20px; border-radius:30px; font-size:.7rem; font-family:'Orbitron',sans-serif; cursor:pointer; transition:.3s; letter-spacing:1px; }
.sb-btn:hover { background:rgba(190,99,255,.4); color:#fff; box-shadow:0 0 20px rgba(190,99,255,.3); }
.sb-empty { text-align:center; padding:60px 20px; color:#555; font-family:'Orbitron',sans-serif; font-size:.8rem; letter-spacing:2px; border:1px dashed rgba(190,99,255,.15); border-radius:16px; }
.sb-unit-wrap { position:relative; display:grid; grid-template-columns: minmax(0, 1654px) minmax(260px, 300px); gap:18px; align-items:start; margin-bottom:28px; width:100%; max-width:calc(1654px + 18px + 300px); box-sizing:border-box; }
@media(max-width:1100px){ .sb-unit-wrap { grid-template-columns:1fr; } }
.sb-unit-wrap > .hud-outer-v13 { margin:0 !important; }
.sb-side-panel { background:rgba(15,5,25,.7); border:1px solid rgba(190,99,255,.2); border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:14px; }
.sb-remove-btn { background:rgba(255,51,102,.18); border:1px solid rgba(255,51,102,.5); color:#ff3366; padding:9px 14px; border-radius:22px; font-size:.65rem; letter-spacing:1.5px; font-family:'Orbitron',sans-serif; font-weight:700; cursor:pointer; transition:.2s; width:100%; }
.sb-remove-btn:hover { background:rgba(255,51,102,.5); color:#fff; }
.sb-upgrades-title { font-family:'Orbitron',sans-serif; font-size:.62rem; letter-spacing:3px; color:#d8b4fe; text-transform:uppercase; padding:6px 0 8px; border-bottom:1px solid rgba(190,99,255,.18); }
.sb-upgrades-list { display:flex; flex-direction:column; gap:8px; }
.sb-upgrade-row { background:rgba(5,0,15,.55); border:1px solid rgba(190,99,255,.16); border-radius:10px; padding:10px 12px; cursor:pointer; transition:.15s; user-select:none; }
.sb-upgrade-row:hover { border-color:rgba(190,99,255,.5); background:rgba(20,5,40,.7); }
.sb-upgrade-row.is-active { background:rgba(0,255,136,.10); border-color:rgba(0,255,136,.55); box-shadow:0 0 14px rgba(0,255,136,.12); }
.sb-upgrade-row.is-active .sb-upgrade-name { color:#00ff88; }
.sb-upgrade-name { font-family:'Orbitron',sans-serif; font-size:.66rem; letter-spacing:1.2px; text-transform:uppercase; color:#f0eaff; display:flex; justify-content:space-between; align-items:center; gap:8px; font-weight:700; }
.sb-upgrade-cost { color:#00ff88; font-size:.7rem; white-space:nowrap; font-family:'Orbitron',sans-serif; }
.sb-upgrade-row.is-active .sb-upgrade-cost { color:#aaffcc; }
.sb-upgrade-desc { font-size:.72rem; line-height:1.4; color:#a99bbd; margin-top:6px; }
.sb-upgrade-empty { font-size:.72rem; color:#555; text-align:center; padding:14px 0; font-style:italic; }
.sb-upgrade-noticestrip { font-size:.62rem; color:#a99bbd; text-align:center; }

/* Header info da facção e tática */
.sb-faction-info { display:none; flex-basis:100%; margin-top:10px; padding:14px 18px; background:rgba(5,0,15,.6); border:1px solid rgba(190,99,255,.22); border-radius:14px; }
.sb-faction-info.is-active { display:block; }
.sb-fi-block { margin-bottom:14px; }
.sb-fi-block:last-child { margin-bottom:0; }
.sb-fi-label { font-family:'Orbitron',sans-serif; font-size:.55rem; letter-spacing:3px; color:#a99bbd; text-transform:uppercase; margin-bottom:4px; }
.sb-fi-name { font-family:'Orbitron',sans-serif; font-size:.95rem; font-weight:700; color:#d8b4fe; letter-spacing:1.5px; text-transform:uppercase; }
.sb-fi-name.tatica { color:#ffcc00; }
.sb-fi-sub { font-size:.78rem; color:#00ff88; margin-top:2px; font-style:italic; letter-spacing:.5px; }
.sb-fi-desc { font-size:.85rem; color:#cfc4e3; margin-top:8px; line-height:1.55; }
.sb-fi-req { font-size:.72rem; color:#ffaa00; margin-top:8px; background:rgba(255,170,0,.07); border-left:3px solid #ffaa00; padding:6px 12px; border-radius:0 6px 6px 0; }
.sb-fi-effects { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
.sb-fi-effect { font-family:'Orbitron',sans-serif; font-size:.62rem; letter-spacing:1px; padding:3px 9px; border-radius:14px; background:rgba(255,204,0,.08); border:1px solid rgba(255,204,0,.4); color:#ffcc00; text-transform:uppercase; }
#${bid} .sb-active-upgrades-summary { display:none; margin-top:14px; margin-bottom:0; padding:10px 12px; background:rgba(5,0,15,.55); border:1px solid rgba(190,99,255,.25); border-radius:8px; border-left:3px solid #ffcc00; box-sizing:border-box; }
#${bid} .sb-active-upgrades-summary[data-active="1"] { display:block; }
#${bid} .sb-upgrades-na .sb-upgrade-empty { margin-top:8px; }
#${bid} .sb-aus-head { font-family:'Orbitron',sans-serif; font-size:.55rem; letter-spacing:2px; color:#ffcc00; text-transform:uppercase; margin-bottom:8px; }
#${bid} .sb-aus-line { display:flex; justify-content:space-between; align-items:baseline; gap:10px; font-size:.74rem; color:#e0d8f0; padding:5px 0; border-bottom:1px solid rgba(255,255,255,.08); }
#${bid} .sb-aus-line:last-child { border-bottom:none; }
#${bid} .sb-aus-name { font-family:'Orbitron',sans-serif; letter-spacing:.5px; text-transform:uppercase; flex:1; min-width:0; }
#${bid} .sb-aus-pts { color:#00ff88; font-weight:700; white-space:nowrap; font-family:'Orbitron',sans-serif; font-size:.68rem; }

/* Ficha do cartão — espelha Template - Unit.md */
/* Ficha do cartão — espelha Template - Unit.md (1654x869) */
.hud-outer-v13{position:relative;width:100%;aspect-ratio:1654/869;max-width:1654px;max-height:869px;margin:0 auto 28px;background:#080808;border:1px solid #3a3a3a;font-family:'Orbitron',sans-serif;color:#fff;display:flex;flex-direction:column;box-sizing:border-box;box-shadow:0 10px 40px rgba(0,0,0,.9);overflow:hidden;}
.ryke-scrollbox::-webkit-scrollbar{width:3px;} .ryke-scrollbox::-webkit-scrollbar-thumb{background:#be63ff;border-radius:10px;} .ryke-scrollbox{overflow-y:auto!important;scrollbar-width:thin;scrollbar-color:#be63ff #111;}
.top-bar{position:relative;width:100%;overflow:hidden;background:linear-gradient(135deg,#0e0e0e 0%,#141414 100%);border-bottom:2px solid #be63ff;}
.top-bar::after{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(to right,#0e0e0e 38%,rgba(14,14,14,.85) 58%,rgba(14,14,14,.2) 80%,transparent 100%);pointer-events:none;}
.top-hero-img{position:absolute;right:0;top:0;height:100%;width:50%;background-size:auto 120%;background-position:top center;background-repeat:no-repeat;z-index:0;display:block;pointer-events:none;-webkit-mask-image:linear-gradient(to right,transparent 0%,black 30%);mask-image:linear-gradient(to right,transparent 0%,black 30%);}
.top-content{position:relative;z-index:2;padding:16px 24px;max-width:62%;display:flex;flex-direction:column;gap:6px;}
.badge-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.favicon-logo{width:36px;height:36px;object-fit:contain;opacity:.9;}
.pts-badge-new{background:#00ff88;color:#000;padding:2px 10px;font-weight:900;font-size:.78rem;display:inline-block;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);}
.unique-badge{background:#ff3366;color:#fff;padding:2px 10px;font-weight:900;font-size:.78rem;display:inline-block;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);}
.elite-badge{background:#d4a017;color:#0a0a0a;padding:2px 10px;font-weight:900;font-size:.78rem;display:inline-block;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);text-shadow:0 0 12px rgba(255,220,120,.35);}
.mercenary-badge{background:#2a6aa8;color:#e8f4ff;padding:2px 10px;font-weight:900;font-size:.78rem;display:inline-block;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);border:1px solid rgba(120,190,255,.45);}
.sb-noos-warn{display:none;background:#aa0022;color:#fff;padding:2px 8px;font-size:.62rem;font-weight:900;border-radius:2px;letter-spacing:1px;}
.hud-main-name{font-size:1.9rem!important;font-weight:900;text-transform:uppercase;line-height:1;letter-spacing:-1px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.9);margin:2px 0;}
.kw-row{display:flex;flex-wrap:wrap;gap:4px;}
.model-kw{font-size:.58rem;background:rgba(255,255,255,.08);color:#ccc;border:1px solid rgba(255,255,255,.25);padding:2px 6px;text-transform:uppercase;font-weight:bold;border-radius:2px;}
.all-stats-row{display:flex;gap:5px;flex-wrap:wrap;align-items:flex-start;margin-top:2px;}
.stat-box{display:flex;flex-direction:column;align-items:center;background:rgba(0,0,0,.65);border:1px solid rgba(0,255,255,.3);padding:3px 9px;border-radius:2px;cursor:help;min-width:48px;}
.stat-box.def{border-color:rgba(190,99,255,.4);}
.stat-box.vida{border-color:rgba(255,50,100,.5);}
.stat-lbl{font-size:.5rem;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#00ffff;line-height:1.2;}
.stat-box.def .stat-lbl{color:#be63ff;}
.stat-box.vida .stat-lbl{color:#ff6688;}
.stat-val{font-size:1.05rem;font-weight:900;color:#fff;line-height:1.1;margin-top:1px;}
.stat-div{width:1px;background:rgba(190,99,255,.3);align-self:stretch;margin:0 3px;}
.date-line{font-size:.55rem;color:#555;font-family:monospace;margin-top:4px;}
.hud-body-grid{display:grid;grid-template-columns:1fr minmax(252px,300px);background:#0d0d0d;flex-grow:1;min-height:0;border-top:0;}
.col-abilities{padding:18px 20px;border-right:1px solid #242424;display:flex;flex-direction:column;gap:8px;min-height:0;}
.col-equipment{padding:12px 12px 44px 12px;min-height:0;display:flex;flex-direction:column;gap:8px;height:100%;box-sizing:border-box;}
.weapon-equipment-head{flex-shrink:0;}
.weapon-equipment-scroll{flex:1;min-height:0;}
.col-equipment .weapon-art{display:none;width:auto;max-width:100%;height:auto;max-height:120px;object-fit:contain;object-position:top center;margin:0 auto 6px;box-sizing:border-box;}
.col-equipment .weapon-art.is-visible{display:block;}
.weapon-selector-wrapper{position:relative;width:100%;height:32px;background:rgba(0,255,255,.04);border:1px solid rgba(0,255,255,.4);border-radius:3px;margin-bottom:10px;}
.weapon-selector-wrapper:hover{background:rgba(0,255,255,.1);border-color:#00ffff;}
.weapon-selector-display{position:absolute;inset:0;display:flex;align-items:center;padding-left:12px;color:#00ffff;font-weight:900;font-size:.78rem;text-transform:uppercase;pointer-events:none;z-index:1;}
.weapon-selector-wrapper::after{content:'';position:absolute;right:12px;top:50%;transform:translateY(-50%);width:12px;height:12px;background:url('data:image/svg+xml;charset=US-ASCII,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22292%22 height%3D%22292%22%3E%3Cpath fill%3D%22%2300ffff%22 d%3D%22M287%2069a18%2018%200%200%200-13-5H18a18%2018%200%200%200-13%2018c0%205%202%209%205%2013l128%20128c4%204%208%205%2013%205s9-1%2013-5l128-128c4-4%205-8%205-13%200-5-2-9-5-13z%22%2F%3E%3C%2Fsvg%3E') center/contain no-repeat;pointer-events:none;z-index:1;}
.weapon-selector{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0 28px 0 12px;box-sizing:border-box;border:none;border-radius:3px;cursor:pointer;z-index:4;opacity:1;color:transparent;-webkit-text-fill-color:transparent;background-color:transparent;font-family:inherit;font-size:max(16px,.78rem);line-height:32px;appearance:none;-webkit-appearance:none;-moz-appearance:none;}
.col-equipment .w-stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px;align-items:stretch;}
.col-equipment .w-stats-grid .w-stat-item{display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.65);border:1px solid rgba(0,255,255,.3);padding:3px 6px;border-radius:2px;box-sizing:border-box;min-height:46px;max-height:46px;min-width:0;width:100%;}
.col-equipment .w-stats-grid .w-stat-val{font-size:1.05rem;font-weight:900;color:#fff;line-height:1.1;margin-top:1px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;}
.col-equipment .w-stats-grid .w-stat-lbl{font-size:.5rem;font-weight:900;color:#00ffff;letter-spacing:.5px;text-transform:uppercase;line-height:1.2;}
.col-equipment .w-peso-inline{display:flex;align-items:center;gap:3px;border-color:rgba(0,255,255,.35)!important;background:rgba(0,255,255,.07)!important;padding:2px 6px!important;border-radius:2px;flex-direction:row!important;min-height:auto!important;max-height:none!important;}
.col-equipment .w-peso-inline .w-stat-val{font-size:.82rem!important;font-weight:900;color:#00ffff!important;line-height:1!important;margin:0!important;}
.col-equipment .w-peso-inline .w-stat-lbl{font-size:.48rem!important;font-weight:900;color:#00ffff!important;letter-spacing:.4px;opacity:.9!important;margin:0!important;}
.model-tag{font-size:.68rem;background:rgba(0,0,0,.7);color:#fff;border:1px solid rgba(0,191,255,.45);padding:3px 7px;text-transform:uppercase;font-weight:bold;border-radius:2px;display:inline-block;cursor:help;}
.weapon-tag{font-size:.68rem;background:rgba(0,0,0,.7);color:#fff;border:1px solid rgba(0,255,255,.45);padding:3px 7px;text-transform:uppercase;font-weight:bold;border-radius:2px;display:inline-block;cursor:help;}
.tc-tooltip{position:relative;cursor:help;}
.tc-tooltip:hover::after{content:attr(data-desc);position:absolute;bottom:120%;left:0;width:max-content;max-width:240px;background:#000;color:#ddd;border:1px solid #444;border-left:3px solid #be63ff;padding:10px;font-family:sans-serif;font-size:.85rem;line-height:1.4;font-weight:normal;white-space:normal;text-transform:none;z-index:9999;pointer-events:none;}
@media(max-width:900px){
  .sb-layout{grid-template-columns:1fr;}
  .sb-squad-header{flex-direction:column;}
  .hud-outer-v13{min-width:unset;}
  .top-content{max-width:100%!important;}
  .top-hero-img{display:none;}
  .top-bar::after{display:none;}
  .hud-body-grid{grid-template-columns:1fr!important;}
  .col-abilities{border-right:none!important;border-bottom:1px solid #222!important;}
  .hud-main-name{font-size:1.45rem!important;}
}
</style>`;

// ======== BROWSER HTML ========
let browserCards = "";
for (const m of modelData) {
  const _imgSrc = m.imgObj ? m.imgObj.src : "";
  const imgEl = _imgSrc
    ? `<img class="sb-mcard-img" src="${_imgSrc}" data-export-src="${m.imgObj.raw}">`
    : `<div class="sb-mcard-img" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;opacity:.2;">⬡</div>`;
  const facs = m.faccao.join(", ");
  const facFilter = [...m.faccao.map((f) => String(f).toLowerCase()), ...(m.mercenary ? ["mercenarios"] : [])].join("|");
  browserCards += `<div class="sb-mcard js-sbcard" data-name="${m.name.toLowerCase()}" data-noos="${m.noosphera.toLowerCase()}" data-fac="${facFilter}">
  ${imgEl}
  <div class="sb-mcard-info">
    <div class="sb-mcard-name">${m.name}</div>
    <div class="sb-mcard-sub">${facs || m.noosphera}</div>
  </div>
  <div class="sb-mcard-pts">${m.pontos}<small>pts</small></div>
  <button class="sb-add-btn js-add-btn" data-mpath="${m.path}">➕ ADD</button>
</div>`;
}

// ======== FULL HTML ========
/* JSON e motor em <textarea> preenchidos via .value após innerHTML: evita & … quebrar o parser HTML e permite initSB no site (SPA). */
const html = `${css}
<div class="js-squad-builder-app" id="${bid}" data-sb-bid="${bid}">
<textarea class="js-sb-data-models" readonly tabindex="-1" aria-hidden="true" style="display:none!important;width:0;height:0;opacity:0;pointer-events:none;"></textarea>
<textarea class="js-sb-data-factions" readonly tabindex="-1" aria-hidden="true" style="display:none!important;width:0;height:0;opacity:0;pointer-events:none;"></textarea>
<textarea class="js-sb-data-maps" readonly tabindex="-1" aria-hidden="true" style="display:none!important;width:0;height:0;opacity:0;pointer-events:none;"></textarea>
<textarea class="js-sb-engine-script" readonly tabindex="-1" aria-hidden="true" style="display:none!important;width:0;height:0;opacity:0;pointer-events:none;"></textarea>
<h1 style="font-family:'Orbitron',sans-serif;font-size:1.5rem;letter-spacing:4px;text-transform:uppercase;color:#d8b4fe;margin-bottom:25px;font-weight:300;">⚔ SQUAD BUILDER</h1>
<div class="sb-layout">

<!-- BROWSER -->
<div class="sb-browser">
  <div class="sb-browser-title">📋 Roster de Modelos</div>
  <input class="sb-search js-sb-search" type="text" placeholder="Buscar por nome...">
  <select class="sb-sel js-sb-noos"><option value="">Todas Noospheras</option>${noospheras.map(n=>`<option value="${n.toLowerCase()}">${n}</option>`).join("")}</select>
  <select class="sb-sel js-sb-fac"><option value="">Todas Facções</option><option value="mercenarios">Mercenários</option>${faccoes.map(f=>`<option value="${f.toLowerCase()}">${f}</option>`).join("")}</select>
  <div class="sb-model-list">${browserCards}</div>
</div>

<!-- SQUAD -->
<div class="sb-squad">
  <div class="sb-squad-header">
    <div class="sb-pts-total"><small>Total do Esquadrão</small><div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;"><span class="sb-pts-num"><span id="${bid}-total">0</span></span> <span style="font-size:1rem;color:#a99bbd;font-weight:300;">PTS</span><span id="${bid}-invalid" class="sb-invalid-banner">⚠ Esquadrão inválido (noosphera)</span><span id="${bid}-unique-warn" class="sb-unique-banner">⚠ UNIQUE repetido (mesmo modelo mais de uma vez)</span><span id="${bid}-points-warn" class="sb-points-banner">⚠ Esquadrão acima de 1000 pontos</span></div></div>
    <div class="sb-global-tactics">
      <div><label>Facção do esquadrão</label><select class="sb-sel js-sb-fac-global"><option value="">— Nenhuma —</option>${globalFacOpts}</select></div>
      <div style="flex:1;min-width:160px;"><label>Tática global</label><select class="sb-sel js-sb-tat-global" disabled><option value="">— Escolha —</option></select></div>
    </div>
    <div class="sb-export-btns">
      <button class="sb-btn js-export-zip">📦 Exportar ZIP</button>
      <button class="sb-btn js-export-deck-tts" title="Uma folha PNG em grelha para Objects → Custom → Deck">🃏 Exportar deck TTS (folha PNG)</button>
    </div>
    <div id="${bid}-fac-info" class="sb-faction-info"></div>
  </div>
  <div id="${bid}-squad-empty" class="sb-empty">⬡ Nenhuma unidade no esquadrão.<br><small style="font-size:.65rem;margin-top:8px;display:block;">Use o painel esquerdo para adicionar modelos.</small></div>
  <div id="${bid}-cards-wrap"></div>
</div>

</div><!-- .sb-layout -->
</div><!-- #bid -->`;

const wrap = dv.container.createEl("div");
wrap.innerHTML = html;

(function fillSbTextareas() {
  const dm = wrap.querySelector(".js-sb-data-models");
  const df = wrap.querySelector(".js-sb-data-factions");
  const dk = wrap.querySelector(".js-sb-data-maps");
  const payloadModels = jsonForTextareaEmbed(modelData);
  const payloadFacs = jsonForTextareaEmbed(factionsRaw);
  const payloadMaps = jsonForTextareaEmbed(gMaps);
  function setTa(el, payload) {
    if (!el) return;
    el.textContent = "";
    el.appendChild(document.createTextNode(payload));
  }
  setTa(dm, payloadModels);
  setTa(df, payloadFacs);
  setTa(dk, payloadMaps);
})();

function buildEngineScript() {
  const BID = bid;
  const FAV = JSON.stringify(faviconURL || '');
  const code = buildEngineScript.toString().match(/\/\*!ENGINE!([\s\S]*?)!ENGINE!\*\//)[1];
  return code.replace('__BID__', BID).replace('__FAV__', FAV);
}
/*
!ENGINE!(function(){
try {
const BID="__BID__";
const FAV=__FAV__;
var root=document.getElementById(BID);
if(!root) root=document.querySelector(".js-squad-builder-app");
if(!root) return;
if(root._sbInit === true) return;
if(root._sbInit === "loading") return;
root._sbInit = "loading";
if(root.id!==BID && !root.getAttribute("data-sb-bid")) root.setAttribute("data-sb-bid",BID);

function parseSbDataJson(el){var raw=(el)?String(el.value||el.textContent||"").trim():"";if(!raw)return null;try{return JSON.parse(raw);}catch(e1){try{return JSON.parse(raw.replace(/&lt;/g,"<").replace(/&gt;/g,">"));}catch(e2){throw e2;}}}
const ALL_MODELS=parseSbDataJson(root.querySelector(".js-sb-data-models"));
const ALL_FACTIONS=parseSbDataJson(root.querySelector(".js-sb-data-factions"));
const MAPS=parseSbDataJson(root.querySelector(".js-sb-data-maps"));
if(!ALL_MODELS||!ALL_FACTIONS||!MAPS)throw new Error("Squad Builder: JSON de dados vazio ou inválido.");
;(function rykeWeaponAbilityBootstrap() {
    if (window.__rykeWeaponAbilBlocks) return;
    window.__rykeWeaponAbilBlocks = true;

    function getWeapons(root) {
        var weapons = [];
        var jel = root.querySelector(".js-weapons-json");
        if (jel && jel.textContent) { try { weapons = JSON.parse(jel.textContent); } catch (e) {} }
        if (!weapons.length) { try { weapons = JSON.parse(decodeURIComponent(root.getAttribute("data-weapons") || "%5B%5D")); } catch (e2) {} }
        return weapons;
    }
    function getMaps(root) {
        try { return JSON.parse(decodeURIComponent(root.getAttribute("data-maps") || "%7B%7D")); } catch (e) { return {}; }
    }
    function findWeapon(weapons, name) {
        if (!name || name === "__none__") return null;
        for (var i = 0; i < weapons.length; i++) { if (weapons[i] && String(weapons[i].name) === name) return weapons[i]; }
        return null;
    }
    function abilBlocks(list, map, color) {
        if (!list || !list.length) return "";
        var html = "";
        for (var j = 0; j < list.length; j++) {
            var item = String(list[j] || "").trim();
            if (!item) continue;
            var k = item.toLowerCase();
            var desc = (map && map[k]) || "Descrição não encontrada no glossário.";
            var apCost = "", cleanDesc = desc;
            var apMatch = cleanDesc.match(/^\[([🔴]+)\]\s*/);
            if (apMatch) { apCost = '<span style="margin-left:4px;font-size:0.68rem;letter-spacing:1px;">' + apMatch[1] + "</span>"; cleanDesc = cleanDesc.substring(apMatch[0].length); }
            html += '<div style="margin-bottom:4px;font-family:sans-serif;font-size:0.72rem;line-height:1.3;padding:2px 6px;border-left:3px solid ' + color + ';break-inside:avoid;page-break-inside:avoid">';
            html += '<strong style="color:' + color + ';text-transform:uppercase;font-size:0.74rem;">' + item + apCost + ":</strong> ";
            html += '<span style="color:#ccc;">' + cleanDesc + "</span></div>";
        }
        return html;
    }

    function updateSlot(root, suffix, weaponName) {
        var uid = root.id;
        if (!uid) return;
        var weapons = getWeapons(root);
        var maps = getMaps(root);
        var wMap = maps.weapon || maps.passive || {};
        var uMap = maps.utilityPassive || maps.passive || {};
        var isNone = (weaponName === "__none__");
        var w = isNone ? null : findWeapon(weapons, weaponName);
        var s = suffix; 

        var disp = document.getElementById("w-sel-display-" + s + "-" + uid);
        var statsGrid = document.getElementById("w-stats-grid-" + s + "-" + uid);
        var pesoEl = document.getElementById("w-peso-" + s + "-" + uid);
        var pmEl = document.getElementById("w-pts-mod-" + s + "-" + uid);
        var kwsEl = document.getElementById("w-kws-" + s + "-" + uid);
        var tagsEl = document.getElementById("w-tags-" + s + "-" + uid);
        var pasEl = document.getElementById("w-passives-" + s + "-" + uid);
        var atkEl = document.getElementById("w-atk-" + s + "-" + uid);
        var miraEl = document.getElementById("w-mira-" + s + "-" + uid);
        var distEl = document.getElementById("w-dist-" + s + "-" + uid);
        var dmgEl = document.getElementById("w-dmg-" + s + "-" + uid);

        function txt(v) { return v == null ? "" : String(v); }
        function nz(v, d) { var x = txt(v); return x.length ? x : d; }

        if (disp) disp.textContent = isNone ? "SEM LOADOUT" : (weaponName || "— ESCOLHA —");
        if (statsGrid) statsGrid.style.display = (w && w.tipo !== "Utility") ? "grid" : "none";
        if (atkEl) atkEl.textContent = w ? nz(w.ataques, "0") : "0";
        if (miraEl) miraEl.textContent = w ? nz(w.mira, "0") : "0";
        if (distEl) distEl.textContent = w && txt(w.distancia).length ? txt(w.distancia) : "-";
        if (dmgEl) dmgEl.textContent = w && txt(w.dano).length ? txt(w.dano) : "-";
        if (pesoEl) pesoEl.textContent = isNone ? "0" : (w && txt(w.peso).length ? txt(w.peso) : "0");
        if (pmEl) {
            var pm = w && w.point_mod, pn = parseInt(pm, 10), showPm = !isNone && pm != null && pm !== "" && !isNaN(pn);
            if (showPm) { pmEl.classList.add("is-visible"); pmEl.textContent = (pn > 0 ? "+" : "") + pn + " PTS"; }
            else { pmEl.classList.remove("is-visible"); pmEl.textContent = ""; }
        }
        if (kwsEl) {
            if (!w || !w.keywords || !w.keywords.length) kwsEl.innerHTML = "";
            else kwsEl.innerHTML = w.keywords.map(function(k) {
                return '<span style="font-size:0.5rem;text-transform:uppercase;color:#80e5ff;border:1px solid rgba(0,217,255,0.35);padding:1px 5px;border-radius:10px;">' + txt(k).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;") + "</span>";
            }).join(" ");
        }
        if (tagsEl) tagsEl.innerHTML = w && w.caracteristicas ? abilBlocks(w.caracteristicas, wMap, "#00ffff") : "";
        if (pasEl) pasEl.innerHTML = w && w.passivas_de_utility ? abilBlocks(w.passivas_de_utility, uMap, "#00bfff") : "";
    }

    function syncSelectors(root) {
        var selA = root.querySelector(".js-weapon-sel-A");
        var selB = root.querySelector(".js-weapon-sel-B");
        if (!selA || !selB) return;
        var valA = selA.value, valB = selB.value;
        [selA, selB].forEach(function(sel) {
            for (var i = 0; i < sel.options.length; i++) sel.options[i].disabled = false;
        });
        if (valA && valA !== "__none__") {
            for (var i = 0; i < selB.options.length; i++) { if (selB.options[i].value === valA) selB.options[i].disabled = true; }
        }
        if (valB && valB !== "__none__") {
            for (var i = 0; i < selA.options.length; i++) { if (selA.options[i].value === valB) selA.options[i].disabled = true; }
        }
    }

    var prevInit = window.initUnitDashboard;
    window.initUnitDashboard = function (root) {
        if (typeof prevInit === "function") prevInit(root);
        var selA = root.querySelector(".js-weapon-sel-A");
        var selB = root.querySelector(".js-weapon-sel-B");
        if (selA) updateSlot(root, "A", selA.value);
        if (selB) updateSlot(root, "B", selB.value);
        syncSelectors(root);
    };

    document.addEventListener("change", function (ev) {
        var t = ev.target;
        if (!t) return;
        var suffix = null;
        if (t.classList.contains("js-weapon-sel-A")) suffix = "A";
        else if (t.classList.contains("js-weapon-sel-B")) suffix = "B";
        else if (t.classList.contains("js-weapon-sel")) suffix = "A"; 
        if (!suffix) return;
        var r = t.closest(".js-unit-dashboard");
        if (!r) return;
        updateSlot(r, suffix, t.value);
        syncSelectors(r);
    }, true);
})();

const CORE_RULES={
  mov:"MOVIMENTO: Distância máxima em polegadas que o modelo pode se deslocar com uma ação de movimento, medida no terreno.",
  dec:"DECOERÊNCIA: Quanto o esquadrão é afetado quando esta unidade morre — representa a coesão do grupo. Decoerência acumulada demais passa a gerar problemas ou penalidades ao squad.",
  ap:"AP: Quantidade de ações que o modelo pode gastar por ativação (habilidades, manobras, etc.).",
  peso:"PESO MÁX: O limite de peso total que este modelo pode carregar em utilitários e armas.",
  vida:"VIDA: Quantidade de dano que o modelo pode sofrer antes de ser destruído.",
  melee:"DEFESA CORPO A CORPO: Quanto de dano corpo a corpo o modelo absorve antes que o excesso cause dano à vida.",
  ranged:"DEFESA À DISTÂNCIA: Quanto de dano à distância o modelo absorve antes que o excesso cause dano à vida.",
  special:"DEFESA ESPECIAL: Quanto de dano especial o modelo absorve antes que o excesso cause dano à vida."
};

const squad=[];
const totalEl=document.getElementById(BID+"-total");
const cardsWrap=document.getElementById(BID+"-cards-wrap");
const emptyEl=document.getElementById(BID+"-squad-empty");

function normStr(s){ return String(s||"").trim().toLowerCase(); }
function escHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function escAttr(s){ return String(s||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;"); }
function escCssUrl(s){ return String(s||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'"); }
function modelIsUnique(m){
  if(!m)return false;
  var kw=(m.keywords||[]).some(function(k){ return String(k).toLowerCase()==="unique"; });
  var ch=(m.caracteristicas||[]).some(function(c){ return String(c).toLowerCase().indexOf("unique")>=0; });
  return kw||ch;
}
function hasDuplicateUniqueModels(){
  var counts={};
  squad.forEach(function(slot){
    if(!modelIsUnique(slot.model))return;
    var key=slot.model.path||slot.mpath||slot.model.name||"";
    counts[key]=(counts[key]||0)+1;
  });
  for(var k in counts){ if(counts[k]>1)return true; }
  return false;
}
/** Opcionais de tática: só keywords UNIQUE / ELITE (ou mesmas como característica de modelo). */
function modelAllowsOptionalUpgrades(m){
  if(!m) return false;
  var kws=(m.keywords||[]).map(function(k){ return normStr(k); });
  if(kws.indexOf("unique")>=0||kws.indexOf("elite")>=0) return true;
  var ch=(m.caracteristicas||[]).map(function(c){ return normStr(c); });
  for(var i=0;i<ch.length;i++){
    if(ch[i]==="unique"||ch[i]==="elite") return true;
  }
  return false;
}
function jsonForSbWeapons(obj){
  return JSON.stringify(obj!=null?obj:[]).replace(/</g,"\\u003c");
}
function stripDiacriticsSB(s){
  return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}
function normKwBareSB(s){
  return stripDiacriticsSB(String(s||"").trim()).toLowerCase();
}
function modelIsMercenaryFromObj(m){
  if(!m)return false;
  if(m.mercenary===true)return true;
  var kws=m.keywords||[];
  for(var i=0;i<kws.length;i++){
    var x=normKwBareSB(kws[i]);
    if(x==="mercenary"||x==="mercenario"||x==="mercenarios")return true;
  }
  return false;
}
function modelHasEliteKeywordSB(m){
  if(!m)return false;
  var i,kws=m.keywords||[];
  for(i=0;i<kws.length;i++){ if(normStr(kws[i])==="elite")return true; }
  var ch=m.caracteristicas||[];
  for(i=0;i<ch.length;i++){ if(normStr(ch[i])==="elite")return true; }
  return false;
}
function isBadgeKeywordSB(raw){
  var x=normKwBareSB(raw);
  return x==="unique"||x==="elite"||x==="mercenary"||x==="mercenario"||x==="mercenarios";
}
var SB_CROSS_FACTION_COST=20;
function slotFactionPenalty(slot){
  if(!slot||modelIsMercenaryFromObj(slot.model))return 0;
  var gSel=getGlobalFacSel(); var armyRaw=gSel&&gSel.value?String(gSel.value).trim():"";
  if(!armyRaw)return 0;
  var mf=(slot.model&&slot.model.faccao)||[];
  if(!mf.length)return SB_CROSS_FACTION_COST;
  var armyN=normStr(armyRaw);
  for(var i=0;i<mf.length;i++){
    if(normStr(mf[i])===armyN)return 0;
  }
  return SB_CROSS_FACTION_COST;
}

function getCurrentTactic(){
  var fSel=getGlobalFacSel(), tSel=getGlobalTatSel();
  var fn=fSel&&fSel.value||"", tn=tSel&&tSel.value||"";
  if(!fn||!tn) return null;
  var fac=ALL_FACTIONS.find(function(f){ return f.name===fn; }); if(!fac) return null;
  var tat=(fac.taticas||[]).find(function(t){ return normStr(t.nome)===normStr(tn); });
  return tat||null;
}
function slotUpgradesPts(slot){
  if(!slot||!slot.upgrades||!slot.upgrades.length) return 0;
  var tat=getCurrentTactic(); if(!tat||!tat.upgrades||!tat.upgrades.length) return 0;
  var s=0;
  slot.upgrades.forEach(function(idx){
    var u=tat.upgrades[idx]; if(u) s+=Number(u.pontos)||0;
  });
  return s;
}
function weaponPointsCost(slot){
  if(!slot) return 0;
  var list=slot.model&&slot.model.weapons?slot.model.weapons:[];
  function getCost(want){
    if(!want||want==="__none__") return 0;
    var w=null;
    for(var i=0;i<list.length;i++){
      if(list[i]&&String(list[i].name)===want){ w=list[i]; break; }
    }
    if(!w||w.point_mod==null||w.point_mod==="") return 0;
    var n=parseInt(w.point_mod,10);
    return isNaN(n)?0:n;
  }
  return getCost(slot.weaponNameA) + getCost(slot.weaponNameB);
}

function updateSlotTotalPeso(slot) {
  var list=slot.model&&slot.model.weapons?slot.model.weapons:[];
  function getPeso(want){
    if(!want||want==="__none__") return 0;
    var w=null;
    for(var i=0;i<list.length;i++){
      if(list[i]&&String(list[i].name)===want){ w=list[i]; break; }
    }
    if(!w||w.equipamento_loadout==null||w.equipamento_loadout==="") return 0;
    var n=parseInt(w.equipamento_loadout,10);
    return isNaN(n)?0:n;
  }
  var tPeso = getPeso(slot.weaponNameA) + getPeso(slot.weaponNameB);
  var maxPeso = slot.model.loadout_max||0;
  var el=document.getElementById("peso-max-"+slot.uid);
  if(el) el.textContent = tPeso + "/" + maxPeso;
}
/** Badge da ficha: base + modificador da arma + upgrades da tática (Obsidian sem export-fixes). */
function refreshSlotPointsBadge(slot){
  var el=document.getElementById("t-pts-"+slot.uid);
  if(!el||!slot) return;
  var dash=document.getElementById(slot.uid);
  var base=slot.model&&slot.model.pontos!=null?parseInt(slot.model.pontos,10)||0:0;
  if(dash){ var bb=parseInt(dash.getAttribute("data-base-pts"),10); if(!isNaN(bb)) base=bb; }
  var total=base+weaponPointsCost(slot)+slotUpgradesPts(slot)+slotFactionPenalty(slot);
  el.textContent=total+" PONTOS";
  slot.currentPts=total;
}

function recalcTotal(){
  squad.forEach(function(s){ refreshSlotPointsBadge(s); });
  var t=0;
  squad.forEach(function(u){ t+=(parseInt(u.currentPts,10)||0); });
  if(totalEl) totalEl.textContent=t;
  updateInvalidBanner();
}

function normBareMirrorSB(s){ return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase(); }
function omitEliteMirrorListSB(listRaw){
  if(listRaw==null||listRaw==="")return[];
  var list=Array.isArray(listRaw)?listRaw:String(listRaw).split(",").map(function(x){return x.trim();});
  return list.filter(function(item){ return normBareMirrorSB(item)!=="elite"; });
}
function renderAbil(list,map,color){
  if(!list||!list.length)return"";
  return list.map(function(item){
    var k=String(item).toLowerCase();
    var desc=(map&&map[k])||"Descrição não encontrada.";
    var ap=""; var m=desc.match(/^\[([🔴]+)\]\s*/);
    if(m){ap='<span style="margin-left:6px;font-size:.9rem;">'+m[1]+'</span>';desc=desc.substring(m[0].length);}
    return '<div style="margin-bottom:5px;font-family:sans-serif;font-size:1rem;line-height:1.4;padding:2px 8px;border-left:3px solid '+color+'"><strong style="color:'+color+';text-transform:uppercase;">'+item+ap+':</strong> <span style="color:#ccc">'+desc+'</span></div>';
  }).join("");
}
function renderCaracteristicas(list,map,color){
  if(!list||!list.length)return"";
  return list.map(function(item){
    var k=String(item).toLowerCase();
    var desc=(map&&map[k])||"Descrição não encontrada no glossário.";
    var ap=""; var am=desc.match(/^\[([🔴]+)\]\s*/);
    if(am){ap='<span style="margin-left:5px;font-size:.78rem;letter-spacing:1px;">'+am[1]+'</span>';desc=desc.substring(am[0].length);}
    return '<div class="model-char-row" data-char-key="'+escAttr(k)+'" style="margin-bottom:5px;font-family:sans-serif;font-size:1rem;line-height:1.4;padding:2px 8px;border-left:3px solid '+color+';break-inside:avoid;page-break-inside:avoid"><strong style="color:'+color+';text-transform:uppercase;">'+item+ap+':</strong> <span style="color:#ccc">'+desc+'</span></div>';
  }).join("");
}
function renderCarRowFromUpgrade(item,map,color,suffix){
  var k=String(item).toLowerCase();
  var desc=(map&&map[k])||"Descrição não encontrada no glossário.";
  var ap=""; var am=desc.match(/^\[([🔴]+)\]\s*/);
  if(am){ap='<span style="margin-left:5px;font-size:.78rem;letter-spacing:1px;">'+am[1]+'</span>';desc=desc.substring(am[0].length);}
  var suf=suffix||"";
  return '<div class="model-char-row" data-char-key="'+escAttr(k)+'" data-char-source="upgrade" style="margin-bottom:5px;font-family:sans-serif;font-size:1rem;line-height:1.4;padding:2px 8px;border-left:3px solid '+color+';break-inside:avoid;page-break-inside:avoid"><strong style="color:'+color+';text-transform:uppercase;">'+item+ap+suf+':</strong> <span style="color:#ccc">'+desc+'</span></div>';
}
function charRowExistsInMTags(mTags,keyNorm){
  if(!mTags)return false;
  var rows=mTags.querySelectorAll(".model-char-row[data-char-key]");
  for(var i=0;i<rows.length;i++){
    if(normStr(rows[i].getAttribute("data-char-key"))===keyNorm)return true;
  }
  return false;
}

function kwTagsHtml(m){
  var kwList=[];
  if(m.noosphera) kwList.push(m.noosphera);
  (m.faccao||[]).forEach(function(f){ kwList.push(f); });
  (m.keywords||[]).forEach(function(k){
    if(isBadgeKeywordSB(k))return;
    if(kwList.indexOf(k)<0) kwList.push(k);
  });
  return kwList.map(function(k){ return '<span class="model-kw">'+escHtml(k)+'</span>'; }).join("");
}

function getGlobalFacSel(){ return root.querySelector(".js-sb-fac-global"); }
function getGlobalTatSel(){ return root.querySelector(".js-sb-tat-global"); }

function populateGlobalTactics(facName){
  var sel=getGlobalTatSel(); if(!sel)return;
  var prev=sel.value;
  sel.innerHTML='<option value="">— Escolha —</option>';
  if(!facName){ sel.disabled=true; sel.value=""; return; }
  var fac=ALL_FACTIONS.find(function(f){ return f.name===facName; });
  if(!fac||!fac.taticas||!fac.taticas.length){ sel.disabled=true; return; }
  fac.taticas.forEach(function(t){
    var nm=(t&&t.nome)||"";
    sel.innerHTML+='<option value="'+nm.replace(/"/g,"&quot;")+'">'+nm+'</option>';
  });
  sel.disabled=false;
  if(prev){ var ok=false; fac.taticas.forEach(function(x){ if(x.nome===prev) ok=true; }); if(ok) sel.value=prev; }
}

var lastTacticKey = null;

function activeUpgradesFor(slot){
  var tat=getCurrentTactic();
  if(!tat || !tat.upgrades || !Array.isArray(slot.upgrades)) return [];
  return slot.upgrades.map(function(i){ return tat.upgrades[i]; }).filter(Boolean);
}

/** Garante efeitos mecânicos dos upgrades na ficha (tags, passivas, ações) mesmo se o export-fixes não mesclar o vetor de upgrades. */
function collectCharsFromUpgradeEfeitos(ef){
  var out=[];
  if(!ef||typeof ef!=="object") return out;
  var a=ef.caracteristica;
  if(a){
    if(Array.isArray(a)) a.forEach(function(x){ x=String(x||"").trim(); if(x) out.push(x); });
    else String(a).split(",").forEach(function(x){ x=x.trim(); if(x) out.push(x); });
  }
  var pl=ef.caracteristicas;
  if(pl){
    if(Array.isArray(pl)) pl.forEach(function(x){ x=String(x||"").trim(); if(x) out.push(x); });
    else String(pl).split(",").forEach(function(x){ x=x.trim(); if(x) out.push(x); });
  }
  return out.filter(function(v,i,ar){ return ar.indexOf(v)===i; });
}
function collectAbilFromUpgradeEfeitos(ef,key){
  var out=[];
  if(!ef||typeof ef!=="object") return out;
  var a=ef[key];
  if(!a) return out;
  if(Array.isArray(a)) a.forEach(function(x){ x=String(x||"").trim(); if(x) out.push(x); });
  else String(a).split(",").forEach(function(x){ x=x.trim(); if(x) out.push(x); });
  return out.filter(function(v,i,ar){ return ar.indexOf(v)===i; });
}
function updateActiveUpgradesSummary(slot, ups){
  var el=document.getElementById("t-sb-active-upgrades-"+slot.uid);
  if(!el) return;
  if(!ups||!ups.length){
    el.innerHTML="";
    el.removeAttribute("data-active");
    return;
  }
  var html='<div class="sb-aus-head">Upgrades ativos (esta ficha)</div>';
  ups.forEach(function(u){
    if(!u) return;
    var nm=escHtml(String(u.nome||"Upgrade").trim())||"Upgrade";
    var pts=Number(u.pontos)||0;
    html+='<div class="sb-aus-line"><span class="sb-aus-name">'+nm+'</span><span class="sb-aus-pts">+'+pts+" pts</span></div>";
  });
  el.innerHTML=html;
  el.setAttribute("data-active","1");
}

function mergeUpgradeMechanicsIntoFicha(slot, ups){
  var uid=slot.uid;
  var chEl=document.getElementById("t-tat-chars-"+uid);
  var mTags=chEl&&chEl.parentElement;
  var glossPas=MAPS.passive||{};
  if(chEl){
    chEl.querySelectorAll('.model-char-row[data-char-source="upgrade"]').forEach(function(n){ n.remove(); });
  }
  var chars=[];
  (ups||[]).forEach(function(u){ if(u&&u.efeitos) chars=chars.concat(collectCharsFromUpgradeEfeitos(u.efeitos)); });
  chars=chars.filter(function(v,i,a){ return a.indexOf(v)===i; });
  if(chEl&&chars.length){
    chars.forEach(function(c){
      var low=normStr(c);
      if(charRowExistsInMTags(mTags,low)) return;
      chEl.insertAdjacentHTML("beforeend",renderCarRowFromUpgrade(String(c).trim(),glossPas,"#ffcc00"," (UPGRADE)"));
    });
  }
  var passUps=[]; var atvUps=[];
  (ups||[]).forEach(function(u){ if(!u||!u.efeitos) return; passUps=passUps.concat(collectAbilFromUpgradeEfeitos(u.efeitos,"passiva")); atvUps=atvUps.concat(collectAbilFromUpgradeEfeitos(u.efeitos,"ativa")); });
  passUps=passUps.filter(function(v,i,a){ return a.indexOf(v)===i; });
  atvUps=atvUps.filter(function(v,i,a){ return a.indexOf(v)===i; });
  var glossAct=MAPS.active||{};
  function renderExtraAbil(list,map,color){
    if(!list||!list.length) return "";
    return list.map(function(item){
      var k=String(item).toLowerCase();
      var desc=(map&&map[k])||"Descrição não encontrada.";
      return'<div style="margin-bottom:5px;font-family:sans-serif;font-size:1rem;line-height:1.4;padding:2px 8px;border-left:3px solid '+color+'"><strong style="color:'+color+';text-transform:uppercase;">'+escHtml(item)+':</strong> <span style="color:#ccc">'+escHtml(desc)+'</span></div>';
    }).join("");
  }
  if(passUps.length){
    var pEl=document.getElementById("t-tat-passivas-"+uid);
    if(pEl){
      var ph=pEl.innerHTML;
      if(ph.indexOf("PASSIVAS (UPGRADES OPCIONAIS)")<0){
        pEl.insertAdjacentHTML("beforeend",'<div style="color:#33ddaa;font-size:0.72rem;font-weight:900;letter-spacing:1px;margin:10px 0 6px;">PASSIVAS (UPGRADES OPCIONAIS)</div>'+renderExtraAbil(passUps,glossPas,"#33ddaa"));
      } else {
        passUps.forEach(function(name){
          var low=normStr(name);
          if(ph.toLowerCase().indexOf(">"+low+"<")>=0||ph.toLowerCase().indexOf(">"+low+":")>=0) return;
          pEl.insertAdjacentHTML("beforeend",renderExtraAbil([name],glossPas,"#33ddaa"));
          ph=pEl.innerHTML;
        });
      }
    }
  }
  if(atvUps.length){
    var aEl=document.getElementById("t-tat-ativas-"+uid);
    if(aEl){
      var ah=aEl.innerHTML;
      if(ah.indexOf("AÇÕES (UPGRADES OPCIONAIS)")<0){
        aEl.insertAdjacentHTML("beforeend",'<div style="color:#ffcc00;font-size:0.72rem;font-weight:900;letter-spacing:1px;margin:10px 0 6px;">AÇÕES (UPGRADES OPCIONAIS)</div>'+renderExtraAbil(atvUps,glossAct,"#ffcc00"));
      } else {
        atvUps.forEach(function(name){
          var low=normStr(name);
          if(ah.toLowerCase().indexOf(">"+low+"<")>=0||ah.toLowerCase().indexOf(">"+low+":")>=0) return;
          aEl.insertAdjacentHTML("beforeend",renderExtraAbil([name],glossAct,"#ffcc00"));
          ah=aEl.innerHTML;
        });
      }
    }
  }
}

function applySlotEffects(slot){
  var dash=document.getElementById(slot.uid); if(!dash) return;
  if(!dash._initialized && window.initUnitDashboard) window.initUnitDashboard(dash);
  var fSel=getGlobalFacSel(), tSel=getGlobalTatSel();
  var fn=fSel&&fSel.value||"", tn=tSel&&tSel.value||"";
  var ups=activeUpgradesFor(slot);
  if(dash._updateTatica) dash._updateTatica(fn, tn, ups);
  try { mergeUpgradeMechanicsIntoFicha(slot, ups); } catch(e){ console.warn("SB mergeUpgradeMechanics", e); }
  try { updateActiveUpgradesSummary(slot, ups); } catch(e2){ console.warn("SB updateActiveUpgradesSummary", e2); }
}

function applyGlobalTacticsToAll(){
  var fSel=getGlobalFacSel(), tSel=getGlobalTatSel();
  var fn=fSel&&fSel.value||"", tn=tSel&&tSel.value||"";
  var key=fn+"::"+tn;
  // Limpa upgrades só quando a tática realmente mudou (preserva ao adicionar/remover unidades, etc.)
  if(lastTacticKey!==null && lastTacticKey!==key){
    squad.forEach(function(s){ s.upgrades=[]; });
  }
  lastTacticKey=key;
  if(!cardsWrap) return;
  squad.forEach(function(slot){ applySlotEffects(slot); });
  renderAllUpgrades();
  renderFactionInfo();
  recalcTotal();
}

function fmtEffectsList(ef){
  if(!ef) return [];
  var keysMap={vida:"+VIDA",defesa_melee:"+DEF MELEE",defesa_ranged:"+DEF RANGED",defesa_special:"+DEF SPECIAL",movimento:"+MOV",decoerencia:"+DEC",ap:"+AP",loadout_max:"+PESO MÁX"};
  var out=[];
  Object.keys(keysMap).forEach(function(k){
    if(ef[k]==null||ef[k]==="")return;
    var n=Number(ef[k]); if(isNaN(n))return;
    var label=keysMap[k]; if(n<0) label=label.replace("+","");
    out.push((n>0?"+":"")+n+" "+label.replace(/^[+-]/,"").trim());
  });
  if(ef.caracteristica){ out.push("Ganha "+ef.caracteristica); }
  if(ef.passiva){ out.push("Passiva: "+(Array.isArray(ef.passiva)?ef.passiva.join(", "):ef.passiva)); }
  if(ef.ativa){ out.push("Ação: "+(Array.isArray(ef.ativa)?ef.ativa.join(", "):ef.ativa)); }
  return out;
}

function renderFactionInfo(){
  var box=document.getElementById(BID+"-fac-info"); if(!box) return;
  var fSel=getGlobalFacSel(), tSel=getGlobalTatSel();
  var fn=fSel&&fSel.value||"", tn=tSel&&tSel.value||"";
  if(!fn){ box.classList.remove("is-active"); box.innerHTML=""; return; }
  var fac=ALL_FACTIONS.find(function(f){ return f.name===fn; });
  if(!fac){ box.classList.remove("is-active"); box.innerHTML=""; return; }
  
  var tat=null;
  var effectsHtml="";
  if(tn){
    tat=(fac.taticas||[]).find(function(t){ return normStr(t.nome)===normStr(tn); });
    if(tat){
      effectsHtml = fmtEffectsList(tat.efeitos).map(function(e){ return '<span style="background:rgba(190,99,255,0.15); border:1px solid rgba(190,99,255,0.5); padding:3px 8px; border-radius:3px; color:#e0b3ff; font-size:0.75rem;">'+escHtml(e)+'</span>'; }).join("");
    }
  }

  var trackerDots = "";
  for(var i=1; i<=40; i++){
    var isFive = (i%5===0);
    var color = isFive ? '#ff3366' : '#555';
    var bg = isFive ? 'rgba(255,51,102,0.1)' : 'transparent';
    trackerDots += '<div style="width:24px; height:24px; border:1px solid '+color+'; background:'+bg+'; display:flex; align-items:center; justify-content:center; font-size:0.65rem; color:'+color+'; font-weight:bold; cursor:pointer; user-select:none; clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); margin:1px;" onclick="this.style.background=this.style.background.includes(\'rgb(255, 51, 102)\')?\'transparent\':\'#ff3366\'; this.style.color=this.style.background.includes(\'rgb(255, 51, 102)\')?\'#000\':\''+color+'\';">'+i+'</div>';
  }

  var html='<div class="hud-outer-v13 tactic-card" style="margin-top:20px; aspect-ratio:unset; height:auto; min-height:400px; box-shadow:0 0 20px rgba(0,255,255,0.1);">'+
    '<div class="top-bar" style="background: linear-gradient(135deg, #0e0e0e 0%, #151515 100%); border-bottom: 2px solid #00ffff; padding:15px 24px;">'+
      '<div class="hud-main-name" style="font-size:1.6rem !important;">TACTICAL UPLINK // '+escHtml(fac.name)+'</div>'+
    '</div>'+
    '<div class="hud-body-grid" style="grid-template-columns: 1fr 1fr 1.2fr; padding:20px; gap:20px;">'+
      '<div class="col-slot" style="border:none; padding:0;">'+
        '<div class="section-label" style="color:#00ffff; border-bottom:1px solid rgba(0,255,255,0.2);">PASSIVA DA FACÇÃO</div>'+
        (fac.passiva&&fac.passiva.nome?'<div style="font-weight:900; color:#00ffff; font-size:1.1rem; margin-bottom:8px; text-transform:uppercase;">'+escHtml(fac.passiva.nome)+'</div>'+
        '<div style="color:#ccc; font-size:0.85rem; line-height:1.5;">'+escHtml(fac.passiva.descricao||"")+'</div>':'')+
      '</div>'+
      '<div class="col-slot" style="border:none; border-left:1px solid #222; padding:0 0 0 20px;">'+
        '<div class="section-label" style="color:#be63ff; border-bottom:1px solid rgba(190,99,255,0.2);">TÁTICA SELECIONADA</div>'+
        '<div style="font-weight:900; color:#be63ff; font-size:1.1rem; margin-bottom:8px; text-transform:uppercase;">'+escHtml(tat?tat.nome:"— NENHUMA —")+'</div>'+
        (tat ? 
          '<div style="color:#ccc; font-size:0.85rem; line-height:1.5; margin-bottom:12px;">'+escHtml(tat.descricao||"")+'</div>'+
          '<div style="display:flex; flex-wrap:wrap; gap:6px;">'+effectsHtml+'</div>' 
        : '')+
      '</div>'+
      '<div class="col-slot" style="border:none; border-left:1px solid #222; padding:0 0 0 20px;">'+
        '<div class="section-label" style="color:#ff3366; border-bottom:1px solid rgba(255,51,102,0.2);">DECOERÊNCIA TRACKER</div>'+
        '<div style="display:flex; flex-wrap:wrap; gap:4px; max-width:280px; align-content:flex-start;">'+trackerDots+'</div>'+
      '</div>'+
    '</div>'+
  '</div>';
  
  box.innerHTML=html;
  box.classList.toggle("is-active",!!html);
}
function renderUpgradesFor(slot){
  var listEl=document.getElementById("upgrades-"+slot.uid); if(!listEl) return;
  if(!modelAllowsOptionalUpgrades(slot.model)){
    listEl.innerHTML='<div class="sb-upgrade-empty" style="border-left:2px solid #ff3366; padding-left:10px; color:#ccc; font-size:0.85rem; margin-top:10px;">Indisponível para modelos sem a keyword <strong style="color:#ff3366;">UNIQUE</strong> ou <strong style="color:#ff3366;">ELITE</strong>.</div>';
    if(slot.upgrades&&slot.upgrades.length){
      slot.upgrades=[];
      applySlotEffects(slot);
      recalcTotal();
    }
    return;
  }
  var tat=getCurrentTactic();
  if(!tat){
    listEl.innerHTML='<div class="sb-upgrade-empty" style="color:#888; font-style:italic; margin-top:10px;">Selecione uma tática global para ver os upgrades.</div>';
    return;
  }
  if(!tat.upgrades||!tat.upgrades.length){
    listEl.innerHTML='<div class="sb-upgrade-empty" style="color:#888; font-style:italic; margin-top:10px;">Esta tática não possui upgrades opcionais.</div>';
    return;
  }
  if(!Array.isArray(slot.upgrades)) slot.upgrades=[];
  var html=tat.upgrades.map(function(u,idx){
    var active=slot.upgrades.indexOf(idx)>=0;
    var activeClass=active?' is-active':'';
    var activeStyles=active?'background: rgba(0, 255, 136, 0.15); border-color: #00ff88;':'background: rgba(0, 255, 255, 0.05); border-color: rgba(0, 255, 255, 0.2);';
    var titleColor=active?'#00ff88':'#00ffff';
    return '<div class="sb-upgrade-row'+activeClass+'" data-uid="'+slot.uid+'" data-upg-idx="'+idx+'" style="margin-top:8px; padding:10px; border:1px solid; border-radius:4px; cursor:pointer; transition:all 0.2s; '+activeStyles+'">'+
      '<div class="sb-upgrade-name" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">'+
        '<span style="font-weight:900; font-size:0.95rem; text-transform:uppercase; color:'+titleColor+';">'+escHtml(u.nome)+'</span>'+
        '<span class="sb-upgrade-cost" style="font-size:0.8rem; font-weight:bold; background:rgba(0,0,0,0.5); padding:2px 6px; border-radius:3px; color:'+titleColor+';">+'+(Number(u.pontos)||0)+' pts</span>'+
      '</div>'+
      (u.descricao?'<div class="sb-upgrade-desc" style="font-size:0.8rem; line-height:1.4; color:#ccc;">'+escHtml(u.descricao)+'</div>':'')+
    '</div>';
  }).join("");
  listEl.innerHTML=html;
}
function renderAllUpgrades(){ squad.forEach(renderUpgradesFor); }

function toggleUpgrade(slotUid,idx){
  var slot=squad.find(function(s){return s.uid===slotUid;}); if(!slot) return;
  if(!modelAllowsOptionalUpgrades(slot.model)) return;
  if(!Array.isArray(slot.upgrades)) slot.upgrades=[];
  var pos=slot.upgrades.indexOf(idx);
  if(pos>=0) slot.upgrades.splice(pos,1); else slot.upgrades.push(idx);
  renderUpgradesFor(slot);
  // Reaplica efeitos da tática + upgrades ativos na ficha (badge de pontos, stats, características)
  applySlotEffects(slot);
  recalcTotal();
}

function updateInvalidBanner(){
  var inv=document.getElementById(BID+"-invalid");
  var uniqBanner=document.getElementById(BID+"-unique-warn");
  var ptsBanner=document.getElementById(BID+"-points-warn");
  var gFacName=(getGlobalFacSel()&&getGlobalFacSel().value)||"";
  var selectedFac=gFacName?ALL_FACTIONS.find(function(f){ return f.name===gFacName;}):null;
  var badNoos=false;
  if(!squad.length){
    if(inv) inv.style.display="none";
    if(uniqBanner) uniqBanner.style.display="none";
    if(ptsBanner) ptsBanner.style.display="none";
    root.querySelectorAll(".js-sb-noos-warn").forEach(function(x){ x.style.display="none"; });
    return;
  }
  if(selectedFac){
    var targetNoos=normStr(selectedFac.noosphera);
    squad.forEach(function(slot){
      var unitBad=normStr(slot.model.noosphera)!==targetNoos;
      if(unitBad) badNoos=true;
      var badge=document.querySelector("#wrap_"+slot.uid+" .js-sb-noos-warn");
      if(badge) badge.style.display=unitBad?"inline-block":"none";
    });
  } else {
    var ref=squad.length?normStr(squad[0].model.noosphera):"";
    var uniq={};
    squad.forEach(function(s){ uniq[normStr(s.model.noosphera)]=true; });
    badNoos=Object.keys(uniq).length>1;
    squad.forEach(function(slot){
      var unitBad=badNoos&&normStr(slot.model.noosphera)!==ref;
      var badge=document.querySelector("#wrap_"+slot.uid+" .js-sb-noos-warn");
      if(badge) badge.style.display=unitBad?"inline-block":"none";
    });
  }
  if(inv) inv.style.display=badNoos?"inline":"none";
  if(uniqBanner) uniqBanner.style.display=hasDuplicateUniqueModels()?"inline":"none";
  var totPts=parseInt(totalEl?totalEl.textContent:"0",10)||0;
  if(ptsBanner) ptsBanner.style.display=totPts>1000?"inline":"none";
}

function buildCard(m){
  var cid="sbu_"+Math.random().toString(36).substr(2,8);
  var isUniq=(m.keywords||[]).some(function(k){return String(k).toLowerCase()==="unique"})||(m.caracteristicas||[]).some(function(c){ return String(c).toLowerCase().indexOf("unique")>=0; });
  var badgeUnique=isUniq?'<span class="unique-badge">UNIQUE</span>':"";
  var badgeElite=modelHasEliteKeywordSB(m)?'<span class="elite-badge">ELITE</span>':"";
  var badgeMerc=modelIsMercenaryFromObj(m)?'<span class="mercenary-badge">MERCENARY</span>':"";
  var roleBadges=badgeUnique+badgeElite+badgeMerc;
  var kwHtml=kwTagsHtml(m);
  var charHtml=renderCaracteristicas(omitEliteMirrorListSB(m.caracteristicas||[]),MAPS.passive,"#d8b4fe");
  var passH=renderAbil(omitEliteMirrorListSB(m.habilidades_passivas||[]),MAPS.passive,"#00bfff");
  var actH=renderAbil(m.habilidades_ativas,MAPS.active,"#be63ff");
  var padH=renderAbil(m.habilidades_padrao,MAPS.active,"#ffffff");
  var wOptsHtml='<option value="">— Escolha uma arma/utility —</option>'+'<option value="__none__">Sem loadout</option>'+(m.weapons||[]).map(function(w){
    var pmN=parseInt(w.point_mod,10);
    var hasPm=w.point_mod!=null && w.point_mod!=="" && !isNaN(pmN);
    var suffix=hasPm?' ('+(pmN>0?'+':'')+pmN+' pts)':'';
    return'<option value="'+w.name.replace(/"/g,"&quot;")+'">'+w.name+suffix+'</option>';
  }).join("");
  var weaponsJsonEmbed='<textarea class="js-weapons-json" readonly tabindex="-1" aria-hidden="true" style="display:none!important">'+jsonForSbWeapons(m.weapons||[])+'</textarea>';
  var upgAside=modelAllowsOptionalUpgrades(m)
    ?'<div class="sb-upgrades-section">'+
      '<div class="sb-upgrades-title">⚡ Upgrades Opcionais</div>'+
      '<div class="sb-upgrades-list js-upgrades-list" id="upgrades-'+cid+'" data-uid="'+cid+'"></div>'+
    '</div>'
    :'<div class="sb-upgrades-section sb-upgrades-na">'+
      '<div class="sb-upgrades-title">⚡ Upgrades Opcionais</div>'+
      '<div class="sb-upgrades-list js-upgrades-list" id="upgrades-'+cid+'" data-uid="'+cid+'">'+
      '<div class="sb-upgrade-empty">Disponível só para unidades com keyword <strong>UNIQUE</strong> ou <strong>ELITE</strong>.</div></div>'+
    '</div>';
  var _src=m.imgObj?m.imgObj.src:""; var _raw=m.imgObj?m.imgObj.raw:"";
  var apNum=Number(m.ap!=null&&m.ap!==""?m.ap:m.AP)||0;
  var favImg=FAV?'<img class="favicon-logo" src="'+escAttr(FAV)+'" alt="" onerror="this.style.display=\'none\'"/>':'';
  var heroImg=_src?'<div class="top-hero-img" style="background-image: url(\''+escCssUrl(_src)+'\');" data-export-src="'+escAttr(_raw)+'"></div>':'';
  var updated=m.updatedStr||"—";
  return{uid:cid,html:
'<div class="sb-unit-wrap" id="wrap_'+cid+'">'+
'<div class="hud-outer-v13 js-unit-dashboard" id="'+cid+'"'+
' data-weapons=\''+encodeURIComponent(JSON.stringify(m.weapons||[]))+'\''+
' data-factions=\''+encodeURIComponent(JSON.stringify(ALL_FACTIONS))+'\''+
' data-base-stats=\''+encodeURIComponent(JSON.stringify({vida:m.vida,armadura_melee:m.armadura_melee,armadura_ranged:m.armadura_ranged,armadura_special:m.armadura_special,movimento:m.movimento,decoerencia:m.decoerencia,ap:apNum}))+'\''+
' data-maps=\''+encodeURIComponent(JSON.stringify(MAPS))+'\''+
' data-unit-noos="'+escAttr(m.noosphera)+'"'+
' data-unit-faccao="'+escAttr(m.faccao&&m.faccao[0]||"")+'"'+
' data-base-pts="'+m.pontos+'"'+
' data-max-peso="'+(m.loadout_max||0)+'"'+
' data-unit-name="'+escAttr(m.name)+'"'+
' data-mercenary="'+(m.mercenary?"1":"0")+'">'+
weaponsJsonEmbed+
'<div class="top-bar">'+
heroImg+
'<div class="top-content">'+
'<div class="badge-row">'+
favImg+
'<span class="pts-badge-new js-pts-badge" id="t-pts-badge-'+cid+'"><span id="t-pts-'+cid+'">'+m.pontos+' PONTOS</span></span>'+
'<span class="sb-noos-warn js-sb-noos-warn">NOOSPHERA</span>'+
roleBadges+
'</div>'+
'<div class="hud-main-name">'+escHtml(m.name)+'</div>'+
'<div class="kw-row">'+kwHtml+'</div>'+
'<div class="all-stats-row">'+
'<div class="stat-box tc-tooltip" data-desc="'+CORE_RULES.mov+'"><span class="stat-lbl">MOV</span><span class="stat-val" id="t-mov-'+cid+'">'+m.movimento+'</span></div>'+
'<div class="stat-box tc-tooltip" data-desc="'+CORE_RULES.dec+'"><span class="stat-lbl">DEC</span><span class="stat-val" id="t-dec-'+cid+'">'+m.decoerencia+'</span></div>'+
'<div class="stat-box tc-tooltip" data-desc="'+CORE_RULES.ap+'"><span class="stat-lbl">AP</span><span class="stat-val" id="t-ap-'+cid+'">'+apNum+' <span style="font-size:0.75rem;color:#ff3366;">🔴</span></span></div>'+
'<div class="stat-box tc-tooltip" data-desc="'+CORE_RULES.peso+'"><span class="stat-lbl">PESO</span><span class="stat-val" id="peso-max-'+cid+'">0/'+(m.loadout_max||0)+'</span></div>'+
'<div class="stat-div"></div>'+
'<div class="stat-box vida tc-tooltip" data-desc="'+CORE_RULES.vida+'"><span class="stat-lbl">VIDA</span><span class="stat-val" id="t-vida-'+cid+'">❤️ '+m.vida+'</span></div>'+
'<div class="stat-box def tc-tooltip" data-desc="'+CORE_RULES.melee+'"><span class="stat-lbl">MELEE</span><span class="stat-val" id="t-def-melee-'+cid+'">🛡️ ⚔️ '+m.armadura_melee+'</span></div>'+
'<div class="stat-box def tc-tooltip" data-desc="'+CORE_RULES.ranged+'"><span class="stat-lbl">RANGED</span><span class="stat-val" id="t-def-ranged-'+cid+'">🛡️ 🔫 '+m.armadura_ranged+'</span></div>'+
'<div class="stat-box def tc-tooltip" data-desc="'+CORE_RULES.special+'"><span class="stat-lbl">SPECIAL</span><span class="stat-val" id="t-def-special-'+cid+'">🛡️ ⚠️ '+m.armadura_special+'</span></div>'+
'</div>'+
'<div class="date-line">ATUALIZADO EM: '+escHtml(updated)+'</div>'+
'</div>'+
'</div>'+
'<div class="hud-body-grid">'+
'<div class="col-abilities ryke-scrollbox">'+
passH+
'<div id="t-tat-desc-'+cid+'" style="margin-bottom:8px;"></div>'+
'<div id="m-tags-'+cid+'" style="display:flex;flex-direction:column;gap:4px;margin-bottom:16px;">'+charHtml+'<div id="t-tat-chars-'+cid+'"></div></div>'+
'<div id="t-tat-passivas-'+cid+'" style="margin-bottom:12px;"></div>'+
'<div style="flex-grow:1;">'+padH+actH+
'<div id="t-tat-ativas-'+cid+'"></div></div>'+
'</div>'+
'<div class="col-slot">'+
'<div class="slot-head">'+
'<div class="section-label">SLOT A</div>'+
'<div class="slot-info-bar">'+
'<div class="slot-peso-badge"><span class="spb-lbl">PESO</span><span class="spb-val" id="w-peso-A-'+cid+'">0</span></div>'+
'<div class="slot-pts-badge" id="w-pts-mod-A-'+cid+'"></div>'+
'</div>'+
'<div class="weapon-selector-wrapper"><div id="w-sel-display-A-'+cid+'" class="weapon-selector-display">— ESCOLHA —</div>'+
'<select class="weapon-selector js-weapon-sel-A" data-uid="'+cid+'" id="w-sel-A-'+cid+'">'+wOptsHtml+'</select></div>'+
'<div id="w-kws-A-'+cid+'" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;min-height:16px;"></div>'+
'<div class="w-stats-grid" id="w-stats-grid-A-'+cid+'" style="display:none;">'+
'<div class="w-stat-item"><span class="w-stat-lbl">ATK</span><span class="w-stat-val" id="w-atk-A-'+cid+'">0</span></div>'+
'<div class="w-stat-item"><span class="w-stat-lbl">MIRA</span><span class="w-stat-val" id="w-mira-A-'+cid+'">0</span></div>'+
'<div class="w-stat-item"><span class="w-stat-lbl">DIST</span><span class="w-stat-val" id="w-dist-A-'+cid+'">-</span></div>'+
'<div class="w-stat-item"><span class="w-stat-lbl">DANO</span><span class="w-stat-val" id="w-dmg-A-'+cid+'">-</span></div>'+
'</div>'+
'</div>'+
'<div class="slot-scroll ryke-scrollbox">'+
'<div id="w-tags-A-'+cid+'"></div>'+
'<div id="w-passives-A-'+cid+'" style="margin-top:6px;"></div>'+
'</div>'+
'</div>'+
'<div class="col-slot">'+
'<div class="slot-head">'+
'<div class="section-label">SLOT B</div>'+
'<div class="slot-info-bar">'+
'<div class="slot-peso-badge"><span class="spb-lbl">PESO</span><span class="spb-val" id="w-peso-B-'+cid+'">0</span></div>'+
'<div class="slot-pts-badge" id="w-pts-mod-B-'+cid+'"></div>'+
'</div>'+
'<div class="weapon-selector-wrapper"><div id="w-sel-display-B-'+cid+'" class="weapon-selector-display">— ESCOLHA —</div>'+
'<select class="weapon-selector js-weapon-sel-B" data-uid="'+cid+'" id="w-sel-B-'+cid+'">'+wOptsHtml+'</select></div>'+
'<div id="w-kws-B-'+cid+'" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;min-height:16px;"></div>'+
'<div class="w-stats-grid" id="w-stats-grid-B-'+cid+'" style="display:none;">'+
'<div class="w-stat-item"><span class="w-stat-lbl">ATK</span><span class="w-stat-val" id="w-atk-B-'+cid+'">0</span></div>'+
'<div class="w-stat-item"><span class="w-stat-lbl">MIRA</span><span class="w-stat-val" id="w-mira-B-'+cid+'">0</span></div>'+
'<div class="w-stat-item"><span class="w-stat-lbl">DIST</span><span class="w-stat-val" id="w-dist-B-'+cid+'">-</span></div>'+
'<div class="w-stat-item"><span class="w-stat-lbl">DANO</span><span class="w-stat-val" id="w-dmg-B-'+cid+'">-</span></div>'+
'</div>'+
'</div>'+
'<div class="slot-scroll ryke-scrollbox">'+
'<div id="w-tags-B-'+cid+'"></div>'+
'<div id="w-passives-B-'+cid+'" style="margin-top:6px;"></div>'+
'</div>'+
'</div></div></div>'+
'<div class="sb-side-panel">'+
'<button type="button" class="sb-remove-btn js-remove-btn" data-uid="'+cid+'">🗑 REMOVER</button>'+
upgAside+
'</div>'+
'</div>'
  };
}

function addUnit(mpath){
  var m=ALL_MODELS.find(function(x){return x.path===mpath;}); if(!m)return;
  // Sem arma inicial: o usuário escolhe explicitamente. slot.weaponName = "" → custo zero de arma.
  var slot={uid:null,mpath:mpath,model:m,currentPts:m.pontos,weaponName:"",upgrades:[]};
  var card=buildCard(m); slot.uid=card.uid;
  squad.push(slot);
  if(emptyEl) emptyEl.style.display="none";
  var div=document.createElement("div"); div.innerHTML=card.html;
  if(cardsWrap) cardsWrap.appendChild(div);
  var dashEl=document.getElementById(card.uid);
  if(dashEl&&window.initUnitDashboard) window.initUnitDashboard(dashEl);
  // Reset do dashboard com arma vazia (atualiza UI, zera custo de arma)
  if(dashEl&&dashEl._updateWeapon) dashEl._updateWeapon("");
  // Garante que o select não vá pra primeira opção sozinho
  var sel=document.getElementById("w-sel-"+card.uid); if(sel) sel.value="";
  applySlotEffects(slot);
  renderUpgradesFor(slot);
  renderFactionInfo();
  recalcTotal();
}

function removeUnit(cardUid){
  var idx=squad.findIndex(function(s){return s.uid===cardUid;}); if(idx<0)return;
  squad.splice(idx,1);
  var w=document.getElementById("wrap_"+cardUid); if(w)w.remove();
  if(!squad.length && emptyEl) emptyEl.style.display="";
  recalcTotal();
}

function applyFilters(){
  var name=root.querySelector(".js-sb-search").value.toLowerCase();
  var noos=root.querySelector(".js-sb-noos").value;
  var fac=root.querySelector(".js-sb-fac").value;
  root.querySelectorAll(".js-sbcard").forEach(function(c){
    var ok=(!name||c.dataset.name.includes(name))&&(!noos||c.dataset.noos===noos)&&(!fac||c.dataset.fac.split("|").includes(fac));
    c.classList.toggle("hidden",!ok);
  });
}

var sbSearch = root.querySelector(".js-sb-search");
if(sbSearch) sbSearch.addEventListener("input",applyFilters);
var sbNoos = root.querySelector(".js-sb-noos");
if(sbNoos) sbNoos.addEventListener("change",applyFilters);
var sbFac = root.querySelector(".js-sb-fac");
if(sbFac) sbFac.addEventListener("change",applyFilters);

root.addEventListener("click",function(e){
  var addBtn=e.target.closest(".js-add-btn");
  if(addBtn){addUnit(addBtn.dataset.mpath);return;}
  var remBtn=e.target.closest(".js-remove-btn");
  if(remBtn){removeUnit(remBtn.dataset.uid);return;}
  var upgRow=e.target.closest(".sb-upgrade-row");
  if(upgRow){
    var uid=upgRow.getAttribute("data-uid");
    var idx=parseInt(upgRow.getAttribute("data-upg-idx"),10);
    if(uid && !isNaN(idx)) toggleUpgrade(uid,idx);
    return;
  }
});

root.addEventListener("change",function(e){
  var t=e.target;
  if(t.classList.contains("js-sb-fac-global")){
    populateGlobalTactics(t.value);
    var ts=getGlobalTatSel(); if(ts) ts.value="";
    applyGlobalTacticsToAll();
    return;
  }
  if(t.classList.contains("js-sb-tat-global")){
    applyGlobalTacticsToAll();
    return;
  }
  var root2=t.closest(".js-unit-dashboard");
  if(!root2&&t.getAttribute("data-uid")) root2=document.getElementById(t.getAttribute("data-uid"));
  if(!root2||!root2.classList.contains("js-unit-dashboard"))return;
  var uid2=root2.id;
  var slot=squad.find(function(s){return s.uid===uid2;}); if(!slot)return;
  if(t.classList.contains("js-weapon-sel-A")){ slot.weaponNameA=t.value; updateSlotTotalPeso(slot); }
  else if(t.classList.contains("js-weapon-sel-B")){ slot.weaponNameB=t.value; updateSlotTotalPeso(slot); }
  else if(t.classList.contains("js-weapon-sel")){ slot.weaponNameA=t.value; updateSlotTotalPeso(slot); }
  setTimeout(function(){ recalcTotal(); },50);
});

var btnZip = root.querySelector(".js-export-zip");
if(btnZip) btnZip.addEventListener("click",function(){
  var huds=cardsWrap?cardsWrap.querySelectorAll(".hud-outer-v13"):[];
  if(!huds.length){alert("Adicione unidades ao esquadrão primeiro!");return;}
  var btn=btnZip;
  var origLabel=btn.textContent;
  function setBusy(on, extra){
    btn.disabled=!!on;
    btn.textContent=on?("Exportando…"+(extra||"")):origLabel;
  }
  function loadLib(src, globalName, onload){
    if(typeof window[globalName]!=="undefined"){ onload(); return; }
    var s=document.createElement("script");
    s.src=src;
    s.async=true;
    s.onload=function(){ onload(); };
    s.onerror=function(){
      setBusy(false);
      alert("Não foi possível carregar "+globalName+" (rede bloqueada ou offline).");
    };
    document.head.appendChild(s);
  }
  function safeFileBase(name, fallback){
    var n=String(name||fallback||"unit").replace(/[\/:*?"<>|]/g,"_");
    n=n.replace(/\s+/g," ").trim();
    if(!n.length) n=String(fallback||"unit");
    return n;
  }
  setBusy(true," (preparar)");
  loadLib("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js","html2canvas",function(){
    loadLib("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js","JSZip",function(){
      if(typeof html2canvas==="undefined"||typeof JSZip==="undefined"){
        setBusy(false);
        alert("Bibliotecas de exportação não carregaram.");
        return;
      }
      var zip=new JSZip();
      var idx=0;
      var total=huds.length;
      function afterAll(){
        setBusy(true," (compactar)");
        zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}})
          .then(function(blob){
            var url=URL.createObjectURL(blob);
            var a=document.createElement("a");
            a.download="squad_noosphera.zip";
            a.href=url;
            a.rel="noopener";
            document.body.appendChild(a);
            a.click();
            setTimeout(function(){
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            },1500);
            setBusy(false);
          })
          .catch(function(e){
            console.error("JSZip",e);
            setBusy(false);
            alert("Erro ao gerar o ZIP: "+(e&&e.message?e.message:String(e)));
          });
      }
      function runNext(){
        if(idx>=total){ afterAll(); return; }
        var hud=huds[idx];
        var nDone=idx+1;
        idx++;
        setBusy(true," ("+nDone+"/"+total+")");
        var scale=1;
        if(typeof window.matchMedia==="function" && window.matchMedia("(min-width:1200px)").matches) scale=1.25;
        html2canvas(hud,{
          backgroundColor:"#050505",
          scale:scale,
          useCORS:true,
          allowTaint:true,
          logging:false
        }).then(function(canvas){
          var base=safeFileBase(hud.dataset&&hud.dataset.unitName,"unit_"+nDone);
          canvas.toBlob(function(b){
            if(!b){
              console.warn("toBlob falhou para",base);
            } else {
              zip.file(base+".jpg",b);
            }
            setTimeout(runNext,40);
          },"image/jpeg",0.82);
        }).catch(function(err){
          console.error("html2canvas",err);
          alert("Falha ao capturar a ficha "+nDone+"/"+total+". Tente reduzir o zoom da página ou exportar uma unidade por vez.");
          setTimeout(runNext,40);
        });
      }
      runNext();
    });
  });
});

var btnDeckTts = root.querySelector(".js-export-deck-tts");
if(btnDeckTts) btnDeckTts.addEventListener("click",function(){
  var huds=cardsWrap?cardsWrap.querySelectorAll(".hud-outer-v13"):[];
  if(!huds.length){alert("Adicione unidades ao esquadrão primeiro!");return;}
  var btn=btnDeckTts;
  var origLabel=btn.textContent;
  function setBusy(on, extra){
    btn.disabled=!!on;
    btn.textContent=on?("Gerando folha…"+(extra||"")):origLabel;
  }
  function loadLib(src, globalName, onload){
    if(typeof window[globalName]!=="undefined"){ onload(); return; }
    var s=document.createElement("script");
    s.src=src;
    s.async=true;
    s.onload=function(){ onload(); };
    s.onerror=function(){
      setBusy(false);
      alert("Não foi possível carregar "+globalName+" (rede bloqueada ou offline).");
    };
    document.head.appendChild(s);
  }
  var n=huds.length;
  var HUD_RATIO=1654/869;
  /* Folha alta-res: TTS aceita texturas grandes; 512px/carta ficava ilegível ao encolher no tabuleiro. */
  var MAX_SIDE=8192;
  var IDEAL_CARD_W=1080;
  var MIN_CARD_W=640;
  var cols=Math.ceil(Math.sqrt(n));
  var rows=Math.ceil(n/cols);
  function deckCellDims(cardW){
    var cardH=Math.round(cardW/HUD_RATIO);
    return { cardW:cardW, cardH:cardH, sheetW:cols*cardW, sheetH:rows*cardH };
  }
  var CARD_W=IDEAL_CARD_W;
  var d=deckCellDims(CARD_W);
  var shrink=Math.min(MAX_SIDE/Math.max(d.sheetW,1), MAX_SIDE/Math.max(d.sheetH,1), 1);
  if(shrink<1){
    CARD_W=Math.max(MIN_CARD_W, Math.floor(CARD_W*shrink));
    d=deckCellDims(CARD_W);
    if(d.sheetW>MAX_SIDE||d.sheetH>MAX_SIDE){
      shrink=Math.min(MAX_SIDE/d.sheetW, MAX_SIDE/d.sheetH);
      CARD_W=Math.max(MIN_CARD_W, Math.floor(CARD_W*shrink));
      d=deckCellDims(CARD_W);
    }
  }
  var CARD_H=d.cardH, sheetW=d.sheetW, sheetH=d.sheetH;
  var gfs=getGlobalFacSel(), gts=getGlobalTatSel();
  var gFac=gfs&&gfs.value||"", gTat=gts&&gts.value||"";
  var totPts=parseInt(totalEl?totalEl.textContent:"0",10)||0;

  setBusy(true," (0/"+n+")");
  loadLib("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js","html2canvas",function(){
    loadLib("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js","JSZip",function(){
      if(typeof html2canvas==="undefined"||typeof JSZip==="undefined"){
        setBusy(false);
        alert("Bibliotecas não carregaram.");
        return;
      }
      var canvases=new Array(n);
      var idx=0;
      var dpr=(typeof window.devicePixelRatio==="number"&&window.devicePixelRatio>1)?window.devicePixelRatio:1;
      var scale=Math.min(2.75, Math.max(2, Math.round(dpr*1.35)));
      function runCap(){
        if(idx>=n){
          try{
            var master=document.createElement("canvas");
            master.width=sheetW;
            master.height=sheetH;
            var ctx=master.getContext("2d");
            if(ctx.imageSmoothingEnabled!==undefined){ ctx.imageSmoothingEnabled=true; }
            if(ctx.imageSmoothingQuality!==undefined){ ctx.imageSmoothingQuality="high"; }
            ctx.fillStyle="#050505";
            ctx.fillRect(0,0,sheetW,sheetH);
            var pi;
            for(pi=0;pi<n;pi++){
              var row=Math.floor(pi/cols);
              var col=pi%cols;
              var cv=canvases[pi];
              ctx.drawImage(cv,0,0,cv.width,cv.height,col*CARD_W,row*CARD_H,CARD_W,CARD_H);
            }
            for(;pi<cols*rows;pi++){
              row=Math.floor(pi/cols);
              col=pi%cols;
              ctx.fillStyle="#121212";
              ctx.fillRect(col*CARD_W,row*CARD_H,CARD_W,CARD_H);
              ctx.strokeStyle="#333";
              ctx.strokeRect(col*CARD_W+0.5,row*CARD_H+0.5,CARD_W-1,CARD_H-1);
            }
            var orderLines=[];
            for(pi=0;pi<n;pi++){
              var nm=(huds[pi].dataset&&huds[pi].dataset.unitName)||("(unidade "+(pi+1)+")");
              orderLines.push(String(pi+1)+". "+nm);
            }
            var readme=[
              "Noosphera — Custom Deck (Tabletop Simulator)",
              "https://kb.tabletopsimulator.com/custom-content/custom-deck/",
              "",
              "1) Descompacte este ZIP.",
              "2) Aloje noosphera_deck_face.png num URL público (HTTPS), ou use ficheiro local.",
              "3) No TTS: Objects → Components → Custom → Deck.",
              "   Face: URL ou caminho da imagem da folha.",
              "   Width  (cartas na horizontal da folha): "+cols,
              "   Height (cartas na vertical da folha):   "+rows,
              "   Number (quantidade de cartas no baralho): "+n,
              "",
              "Recomendado: Unique Backs = Não; carregue um verso único em Back.",
              "Opcional: Back is Hidden = Sim → usa o verso normal quando a carta está na mão.",
              "",
              "Ordem das cartas no deck (fileiras da folha: esquerda→direita, topo→baixo):",
              orderLines.join("\n"),
              "",
              "Resumo do builder: facção="+gFac+" | tática="+gTat+" | total "+totPts+" pts",
              "",
              "Dimensões da folha: "+sheetW+"×"+sheetH+" px ("+CARD_W+"×"+CARD_H+" px por célula).",
              "",
              "Legibilidade: esta folha usa resolução alta (até "+MAX_SIDE+" px de lado). Se o TTS ou o hosting recusarem o ficheiro, reduza unidades por deck ou comprima num editor."
            ].join("\n");

            master.toBlob(function(faceBlob){
              if(!faceBlob){ setBusy(false); alert("Falha ao gerar PNG."); return; }
              var zip=new JSZip();
              zip.file("noosphera_deck_face.png", faceBlob);
              zip.file("LEIA-ME_deck_TTS.txt", readme);
              zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6}})
                .then(function(blob){
                  var url=URL.createObjectURL(blob);
                  var a=document.createElement("a");
                  a.download="noosphera_tts_deck.zip";
                  a.href=url;
                  a.rel="noopener";
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(function(){
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  },1500);
                  setBusy(false);
                  alert("ZIP gerado. Width="+cols+", Height="+rows+", Number="+n+". \nUse LEIA-ME_deck_TTS.txt ao criar o Custom Deck no TTS.");
                })
                .catch(function(e){
                  console.error(e);
                  setBusy(false);
                  alert("Erro ao compactar: "+(e&&e.message?e.message:String(e)));
                });
            },"image/png");
          }catch(ex){
            console.error(ex);
            setBusy(false);
            alert("Erro ao montar folha: "+(ex&&ex.message?ex.message:String(ex)));
          }
          return;
        }
        var hud=huds[idx];
        var cur=idx+1;
        idx++;
        setBusy(true," ("+cur+"/"+n+")");
        html2canvas(hud,{
          backgroundColor:"#050505",
          scale:scale,
          useCORS:true,
          allowTaint:true,
          logging:false
        }).then(function(cv){
          canvases[cur-1]=cv;
          setTimeout(runCap,40);
        }).catch(function(err){
          console.error("html2canvas deck",err);
          alert("Falha ao capturar unidade "+cur+"/"+n+".");
          setBusy(false);
        });
      }
      runCap();
    });
  });
});
root._sbInit=true;
root.setAttribute("data-sb-engine-ready","1");
} catch (err) {
  console.error("Squad Builder engine:", err);
  var r=document.getElementById("__BID__")||document.querySelector(".js-squad-builder-app");
  if(r) r._sbInit=false;
}
})();
!ENGINE!
*/

const engineScript = buildEngineScript();

(function fillSbEngineTextarea() {
  const te = wrap.querySelector(".js-sb-engine-script");
  if (!te) return;
  te.textContent = "";
  te.appendChild(document.createTextNode(engineScript));
})();

const sc = document.createElement("script");
sc.className = "js-sb-engine-inline";
sc.setAttribute("data-sb-bid", bid);
sc.textContent = engineScript;
wrap.appendChild(sc);

// Obsidian-only: executa imediatamente para que a preview funcione ao vivo
if (isObs) {
  setTimeout(function() {
    try { eval(engineScript); } catch(e) { console.error("SB Engine error:", e); }
  }, 100);
}
