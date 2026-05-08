(function(){
try {
const BID="sb_123";
const FAV="favicon.png";
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
            var apMatch = cleanDesc.match(/^[([🔴]+)]s*/);
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
function escCssUrl(s){ return String(s||"").replace(/\/g,"\\").replace(/'/g,"\'"); }
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
  return JSON.stringify(obj!=null?obj:[]).replace(/</g,"\u003c");
}
function stripDiacriticsSB(s){
  return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"");
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

function normBareMirrorSB(s){ return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").trim().toLowerCase(); }
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
    trackerDots += '<div style="width:24px; height:24px; border:1px solid '+color+'; background:'+bg+'; display:flex; align-items:center; justify-content:center; font-size:0.65rem; color:'+color+'; font-weight:bold; cursor:pointer; user-select:none; clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%); margin:1px;" onclick="this.style.background=this.style.background.includes('rgb(255, 51, 102)')?'transparent':'#ff3366'; this.style.color=this.style.background.includes('rgb(255, 51, 102)')?'#000':''+color+'';">'+i+'</div>';
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
  var r=document.getElementById("sb_123")||document.querySelector(".js-squad-builder-app");
  if(r) r._sbInit=false;
}
})();