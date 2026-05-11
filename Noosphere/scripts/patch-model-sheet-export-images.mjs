/**
 * Patch Wargame model Dataview blocks for Web-export-safe image URLs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "Wargame", "02 Models");

const OLD_AFTER_PREFER = "const nwModelPreferAssetPaths = nwModelHtmlExportRunning();\n";

const HELPERS =
  `const nwModelPreferAssetPaths = nwModelHtmlExportRunning();

/** Site-relative asset URL for Webpage HTML Export (slug rules match Squad Builder). */
function nwExportFolderDepth() {
    try {
        var m = typeof document !== "undefined" && document.querySelector('meta[name="pathname"]');
        var r = m ? String(m.getAttribute("content") || "").trim() : "";
        if (!r) return 0;
        var n = parseInt(r, 10);
        if (String(n) === r && !isNaN(n)) return n;
        return Math.max(0, r.split("/").filter(Boolean).length - 1);
    } catch (_e) {
        return 0;
    }
}
function nwSlugAssetSeg(seg, isFile) {
    var s = String(seg || "").toLowerCase();
    if (isFile) {
        var ext = "", dot = s.lastIndexOf(".");
        if (dot > 0) {
            ext = s.slice(dot).replace(/[^.a-z0-9]/gi, "");
            s = s.slice(0, dot);
        }
        var stem = s.replace(/[^a-z0-9\\u00C0-\\u017F]+/gi, "-").replace(/^-+|-+$/g, "");
        return stem + (ext || "");
    }
    return s.replace(/[^a-z0-9\\u00C0-\\u017F]+/gi, "-").replace(/^-+|-+$/g, "");
}
function nwVaultPathToSiteHref(vp) {
    var raw = String(vp || "").trim().replace(/\\\\/g, "/");
    if (!raw || /^https?:\\/\\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("/")) return raw;
    var parts = raw.split("/").filter(Boolean);
    if (!parts.length) return "";
    var slugged = parts.map(function (seg, i) {
        return nwSlugAssetSeg(seg, i === parts.length - 1);
    }).join("/");
    var d = nwExportFolderDepth(), pfx = "";
    for (var i = 0; i < d; i++) pfx += "../";
    return pfx + slugged;
}

`;

const OLD_RESOLVE_BRANCH = `            if (nwModelPreferAssetPaths) {
                return app.vault.adapter.getResourcePath(file.path);
            }
`;

const NEW_RESOLVE_BRANCH = `            if (nwModelPreferAssetPaths) {
                return nwVaultPathToSiteHref(file.path.replace(/\\\\/g, "/"))
                    || app.vault.adapter.getResourcePath(file.path);
            }
`;

/** Exact snippets as they appear in model .md files (avoid nested Node `${}`). */
const OLD_IMG_BLOCK = [
  "// IMAGEM E DATA",
  'let imgURL = "";',
  'let imgPath = p.model_image?.path || String(p.model_image || "").replace(/\\[\\[|\\]\\]/g, \'\');',
  "if (isObsidian && imgPath) {",
  "    const file = app.metadataCache.getFirstLinkpathDest(imgPath, p.file.path);",
  "    if (file) {",
  "        if (nwModelPreferAssetPaths) {",
  "            imgURL = app.vault.adapter.getResourcePath(file.path);",
  "        } else {",
  "            let buffer = await app.vault.readBinary(file);",
  "            let b64 = bufferToBase64(buffer);",
  "            let ext = file.extension.toLowerCase();",
  "            let mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : (ext === 'webp' ? 'image/webp' : 'image/png');",
  "            imgURL = `data:${mime};base64,${b64}`;",
  "        }",
  "    }",
  "} else { imgURL = imgPath; }",
  "",
].join("\n");

const NEW_IMG_BLOCK = [
  "// IMAGEM E DATA",
  'let imgURL = "";',
  'let heroExportSrc = "";',
  'let imgPath = p.model_image?.path || String(p.model_image || "").replace(/\\[\\[|\\]\\]/g, \'\');',
  "if (isObsidian && imgPath) {",
  "    const file = app.metadataCache.getFirstLinkpathDest(imgPath, p.file.path);",
  "    if (file) {",
  "        heroExportSrc = file.path.replace(/\\\\/g, '/');",
  "        if (nwModelPreferAssetPaths) {",
  "            imgURL = nwVaultPathToSiteHref(heroExportSrc) || app.vault.adapter.getResourcePath(file.path);",
  "        } else {",
  "            let buffer = await app.vault.readBinary(file);",
  "            let b64 = bufferToBase64(buffer);",
  "            let ext = file.extension.toLowerCase();",
  "            let mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : (ext === 'webp' ? 'image/webp' : 'image/png');",
  "            imgURL = `data:${mime};base64,${b64}`;",
  "        }",
  "    }",
  "} else { imgURL = imgPath; }",
  "",
].join("\n");

const OLD_WEAPON_LOOP = `     let wImgRaw = wPage.utility_image || wPage.model_image || "";
     let wImgB64 = await resolveImgBase64(wImgRaw);
     const atk = wPage.equipamento_ataques;
`;

const NEW_WEAPON_LOOP = `     let wImgRaw = wPage.utility_image || wPage.model_image || "";
     let wImgVault = "";
     if (isObsidian && wImgRaw && wPage.file) {
         let ip = wImgRaw.path || String(wImgRaw).replace(/\\[\\[|\\]\\]/g, "").trim();
         if (ip) {
             const wf = app.metadataCache.getFirstLinkpathDest(ip, wPage.file.path);
             if (wf) wImgVault = wf.path.replace(/\\\\/g, "/");
         }
     }
     let wImgB64 = await resolveImgBase64(wImgRaw);
     const atk = wPage.equipamento_ataques;
`;

const OLD_PUSH = `         image: wImgB64,
`;

const NEW_PUSH = `         image: wImgB64,
         imageRaw: wImgVault,
`;

const OLD_ESC = `function escCssUrl(u) {
    return String(u || "").replace(/\\\\/g, "\\\\\\\\").replace(/'/g, "\\\\'");
}
`;

const NEW_ESC = `function escCssUrl(u) {
    return String(u || "").replace(/\\\\/g, "\\\\\\\\").replace(/'/g, "\\\\'");
}
function escHtmlAttr(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
`;

const OLD_HERO = `        <div class="top-hero-img" style="background-image: url('\${escCssUrl(imgURL)}'); \${imgURL ? '' : 'display:none;'}"></div>
`;

const NEW_HERO = `        <div class="top-hero-img" style="background-image: url('\${escCssUrl(imgURL)}'); \${imgURL ? '' : 'display:none;'}"\${heroExportSrc ? \` data-export-src="\${escHtmlAttr(heroExportSrc)}"\` : ''}></div>
`;

const OLD_FAV = `<img id="favicon-\${uid}" class="favicon-logo" src="\${faviconURL}" style="width:36px;height:36px;object-fit:contain;opacity:0.9;">`;

const NEW_FAV = `<img id="favicon-\${uid}" class="favicon-logo" src="\${faviconURL}" data-export-src="\${escHtmlAttr('Recursos/Main Logo/Favicon fill White.png')}" style="width:36px;height:36px;object-fit:contain;opacity:0.9;">`;

const INLINE_PATCH = `
    <script>
(function(){
function _d(){var m=document.querySelector('meta[name="pathname"]'),r=m?String(m.getAttribute("content")||"").trim():"";if(!r)return 0;var n=parseInt(r,10);if(String(n)===r&&!isNaN(n))return n;return Math.max(0,r.split("/").filter(Boolean).length-1);}
function _slug(seg,isFile){var s=String(seg||"").toLowerCase();if(isFile){var ext="",dot=s.lastIndexOf(".");if(dot>0){ext=s.slice(dot).replace(/[^.a-z0-9]/gi,"");s=s.slice(0,dot);}var stem=s.replace(/[^a-z0-9\\u00C0-\\u017F]+/gi,"-").replace(/^-+|-+$/g,"");return stem+(ext||"");}return s.replace(/[^a-z0-9\\u00C0-\\u017F]+/gi,"-").replace(/^-+|-+$/g,"");}
function _href(vp){var raw=String(vp||"").trim().replace(/\\\\/g,"/");if(!raw||/^https?:\\/\\//i.test(raw)||raw.startsWith("data:")||raw.startsWith("/"))return raw;var parts=raw.split("/").filter(Boolean);if(!parts.length)return"";var slugged=parts.map(function(seg,i){return _slug(seg,i===parts.length-1);}).join("/");var x=_d(),pfx="";for(var i=0;i<x;i++)pfx+="../";return pfx+slugged;}
function _patch(root){
if(typeof app!=="undefined")return;
var scope=root||document;
var els=scope.querySelectorAll("[data-export-src]");
for(var i=0;i<els.length;i++){
var el=els[i],raw=el.getAttribute("data-export-src");
if(!raw)continue;
var h=_href(raw);
if(!h)continue;
var tn=el.tagName&&el.tagName.toUpperCase();
if(tn==="IMG")el.setAttribute("src",h);
else if(el.classList&&el.classList.contains("top-hero-img"))el.style.backgroundImage="url('"+String(h).replace(/'/g,"\\\\'")+"')";
}
var jel=scope.querySelector(".js-weapons-json");
if(!jel)return;
try{
var W=JSON.parse(jel.textContent||"[]");
for(var j=0;j<W.length;j++){var w=W[j];if(!w)continue;var rr=w.imageRaw;if(rr){var hh=_href(rr);if(hh)w.image=hh;}}
jel.textContent=JSON.stringify(W);
}catch(_e){}
}
_patch(document.getElementById("\${uid}"));
})();
    </script>
`;

const CLOSE_TAIL = `    </div>
</div>
</div>
\`;

// Initial Trigger for Obsidian view
`;

const CLOSE_TAIL_NEW = `    </div>
${INLINE_PATCH}
</div>
</div>
\`;

// Initial Trigger for Obsidian view
`;

const NEEDLE_GETWEAPONS = `        if (!weapons.length) { try { weapons = JSON.parse(decodeURIComponent(root.getAttribute("data-weapons") || "%5B%5D")); } catch (e2) {} }
        return weapons;
`;

const REPLACE_GETWEAPONS = `        if (!weapons.length) { try { weapons = JSON.parse(decodeURIComponent(root.getAttribute("data-weapons") || "%5B%5D")); } catch (e2) {} }
        if (typeof app === "undefined" && weapons.length) {
            for (var _wi = 0; _wi < weapons.length; _wi++) {
                var _ww = weapons[_wi];
                if (!_ww) continue;
                var _raw = _ww.imageRaw;
                if (_raw && typeof nwVaultPathToSiteHref === "function") {
                    var _nh = nwVaultPathToSiteHref(_raw);
                    if (_nh) _ww.image = _nh;
                }
            }
        }
        return weapons;
`;

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

function patchFile(fp) {
  let text = fs.readFileSync(fp, "utf8");
  if (text.includes("function nwVaultPathToSiteHref(vp)")) return false;
  if (!text.includes(OLD_AFTER_PREFER)) {
    console.log(`SKIP (marker): ${fp}`);
    return false;
  }

  const orig = text;
  text = text.replace(OLD_AFTER_PREFER, HELPERS);
  text = text.replace(OLD_RESOLVE_BRANCH, NEW_RESOLVE_BRANCH);
  if (!text.includes(OLD_IMG_BLOCK)) {
    console.log(`SKIP img: ${fp}`);
    return false;
  }
  text = text.replace(OLD_IMG_BLOCK, NEW_IMG_BLOCK);
  if (!text.includes(OLD_WEAPON_LOOP)) {
    console.log(`SKIP weapon: ${fp}`);
    return false;
  }
  text = text.replace(OLD_WEAPON_LOOP, NEW_WEAPON_LOOP);
  text = text.replace(OLD_PUSH, NEW_PUSH);
  if (!text.includes(OLD_ESC)) {
    console.log(`SKIP esc: ${fp}`);
    return false;
  }
  text = text.replace(OLD_ESC, NEW_ESC);
  if (!text.includes(OLD_HERO)) {
    console.log(`SKIP hero: ${fp}`);
    return false;
  }
  text = text.replace(OLD_HERO, NEW_HERO);
  if (!text.includes(OLD_FAV)) {
    console.log(`SKIP fav: ${fp}`);
    return false;
  }
  text = text.replace(OLD_FAV, NEW_FAV);
  if (!text.includes(CLOSE_TAIL)) {
    console.log(`SKIP tail: ${fp}`);
    return false;
  }
  text = text.replace(CLOSE_TAIL, CLOSE_TAIL_NEW);
  if (text.includes(NEEDLE_GETWEAPONS)) {
    text = text.replace(NEEDLE_GETWEAPONS, REPLACE_GETWEAPONS);
  } else {
    console.warn(`WARN getWeapons: ${fp}`);
  }

  if (text !== orig) {
    fs.writeFileSync(fp, text, "utf8");
    return true;
  }
  return false;
}

let n = 0;
for (const fp of walk(ROOT).sort()) {
  if (patchFile(fp)) {
    n++;
    console.log(`Patched: ${path.relative(ROOT, fp)}`);
  }
}
console.log(`Done. Patched ${n} files.`);
