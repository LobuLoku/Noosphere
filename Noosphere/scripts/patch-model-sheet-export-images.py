#!/usr/bin/env python3
"""Patch Wargame model Dataview blocks: Web-export-safe image URLs (relative paths, no base64)."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "Wargame" / "02 Models"

OLD_AFTER_PREFER = "const nwModelPreferAssetPaths = nwModelHtmlExportRunning();\n"

HELPERS = (
    "const nwModelPreferAssetPaths = nwModelHtmlExportRunning();\n\n"
    "/** Site-relative asset URL for Webpage HTML Export (slug rules match Squad Builder). */\n"
    "function nwExportFolderDepth() {\n"
    "    try {\n"
    "        var m = typeof document !== \"undefined\" && document.querySelector('meta[name=\"pathname\"]');\n"
    "        var r = m ? String(m.getAttribute(\"content\") || \"\").trim() : \"\";\n"
    "        if (!r) return 0;\n"
    "        var n = parseInt(r, 10);\n"
    "        if (String(n) === r && !isNaN(n)) return n;\n"
    "        return Math.max(0, r.split(\"/\").filter(Boolean).length - 1);\n"
    "    } catch (_e) {\n"
    "        return 0;\n"
    "    }\n"
    "}\n"
    "function nwSlugAssetSeg(seg, isFile) {\n"
    "    var s = String(seg || \"\").toLowerCase();\n"
    "    if (isFile) {\n"
    "        var ext = \"\", dot = s.lastIndexOf(\".\");\n"
    "        if (dot > 0) {\n"
    "            ext = s.slice(dot).replace(/[^.a-z0-9]/gi, \"\");\n"
    "            s = s.slice(0, dot);\n"
    "        }\n"
    "        var stem = s.replace(/[^a-z0-9\\u00C0-\\u017F]+/gi, \"-\").replace(/^-+|-+$/g, \"\");\n"
    "        return stem + (ext || \"\");\n"
    "    }\n"
    "    return s.replace(/[^a-z0-9\\u00C0-\\u017F]+/gi, \"-\").replace(/^-+|-+$/g, \"\");\n"
    "}\n"
    "function nwVaultPathToSiteHref(vp) {\n"
    "    var raw = String(vp || \"\").trim().replace(/\\\\/g, \"/\");\n"
    "    if (!raw || /^https?:\\/\\//i.test(raw) || raw.startsWith(\"data:\") || raw.startsWith(\"/\")) return raw;\n"
    "    var parts = raw.split(\"/\").filter(Boolean);\n"
    "    if (!parts.length) return \"\";\n"
    "    var slugged = parts.map(function (seg, i) {\n"
    "        return nwSlugAssetSeg(seg, i === parts.length - 1);\n"
    "    }).join(\"/\");\n"
    "    var d = nwExportFolderDepth(), pfx = \"\";\n"
    "    for (var i = 0; i < d; i++) pfx += \"../\";\n"
    "    return pfx + slugged;\n"
    "}\n\n"
)

OLD_RESOLVE_BRANCH = (
    "            if (nwModelPreferAssetPaths) {\n"
    "                return app.vault.adapter.getResourcePath(file.path);\n"
    "            }\n"
)

NEW_RESOLVE_BRANCH = (
    "            if (nwModelPreferAssetPaths) {\n"
    "                return nwVaultPathToSiteHref(file.path.replace(/\\\\/g, \"/\"))\n"
    "                    || app.vault.adapter.getResourcePath(file.path);\n"
    "            }\n"
)

OLD_IMG_BLOCK = (
    "// IMAGEM E DATA\n"
    "let imgURL = \"\";\n"
    "let imgPath = p.model_image?.path || String(p.model_image || \"\").replace(/\\[\\[|\\]\\]/g, '');\n"
    "if (isObsidian && imgPath) {\n"
    "    const file = app.metadataCache.getFirstLinkpathDest(imgPath, p.file.path);\n"
    "    if (file) {\n"
    "        if (nwModelPreferAssetPaths) {\n"
    "            imgURL = app.vault.adapter.getResourcePath(file.path);\n"
    "        } else {\n"
    "            let buffer = await app.vault.readBinary(file);\n"
    "            let b64 = bufferToBase64(buffer);\n"
    "            let ext = file.extension.toLowerCase();\n"
    "            let mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : (ext === 'webp' ? 'image/webp' : 'image/png');\n"
    "            imgURL = `data:${mime};base64,${b64}`;\n"
    "        }\n"
    "    }\n"
    "} else { imgURL = imgPath; }\n"
)

NEW_IMG_BLOCK = (
    "// IMAGEM E DATA\n"
    "let imgURL = \"\";\n"
    "let heroExportSrc = \"\";\n"
    "let imgPath = p.model_image?.path || String(p.model_image || \"\").replace(/\\[\\[|\\]\\]/g, '');\n"
    "if (isObsidian && imgPath) {\n"
    "    const file = app.metadataCache.getFirstLinkpathDest(imgPath, p.file.path);\n"
    "    if (file) {\n"
    "        heroExportSrc = file.path.replace(/\\\\/g, \"/\");\n"
    "        if (nwModelPreferAssetPaths) {\n"
    "            imgURL = nwVaultPathToSiteHref(heroExportSrc) || app.vault.adapter.getResourcePath(file.path);\n"
    "        } else {\n"
    "            let buffer = await app.vault.readBinary(file);\n"
    "            let b64 = bufferToBase64(buffer);\n"
    "            let ext = file.extension.toLowerCase();\n"
    "            let mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : (ext === 'webp' ? 'image/webp' : 'image/png');\n"
    "            imgURL = `data:${mime};base64,${b64}`;\n"
    "        }\n"
    "    }\n"
    "} else { imgURL = imgPath; }\n"
)

OLD_WEAPON_LOOP = (
    "     let wImgRaw = wPage.utility_image || wPage.model_image || \"\";\n"
    "     let wImgB64 = await resolveImgBase64(wImgRaw);\n"
    "     const atk = wPage.equipamento_ataques;\n"
)

NEW_WEAPON_LOOP = (
    "     let wImgRaw = wPage.utility_image || wPage.model_image || \"\";\n"
    "     let wImgVault = \"\";\n"
    "     if (isObsidian && wImgRaw && wPage.file) {\n"
    "         let ip = wImgRaw.path || String(wImgRaw).replace(/\\[\\[|\\]\\]/g, \"\").trim();\n"
    "         if (ip) {\n"
    "             const wf = app.metadataCache.getFirstLinkpathDest(ip, wPage.file.path);\n"
    "             if (wf) wImgVault = wf.path.replace(/\\\\/g, \"/\");\n"
    "         }\n"
    "     }\n"
    "     let wImgB64 = await resolveImgBase64(wImgRaw);\n"
    "     const atk = wPage.equipamento_ataques;\n"
)

OLD_PUSH = (
    "         image: wImgB64,\n"
)

NEW_PUSH = (
    "         image: wImgB64,\n"
    "         imageRaw: wImgVault,\n"
)

OLD_ESC = (
    "function escCssUrl(u) {\n"
    "    return String(u || \"\").replace(/\\\\/g, \"\\\\\\\\\").replace(/'/g, \"\\\\'\");\n"
    "}\n"
)

NEW_ESC = (
    "function escCssUrl(u) {\n"
    "    return String(u || \"\").replace(/\\\\/g, \"\\\\\\\\\").replace(/'/g, \"\\\\'\");\n"
    "}\n"
    "function escHtmlAttr(s) {\n"
    "    return String(s || \"\").replace(/&/g, \"&amp;\").replace(/\"/g, \"&quot;\").replace(/</g, \"&lt;\");\n"
    "}\n"
)

OLD_HERO = (
    "        <div class=\"top-hero-img\" style=\"background-image: url('${escCssUrl(imgURL)}'); "
    "${imgURL ? '' : 'display:none;'}\"></div>\n"
)

NEW_HERO = (
    "        <div class=\"top-hero-img\" style=\"background-image: url('${escCssUrl(imgURL)}'); "
    "${imgURL ? '' : 'display:none;'}\""
    "${heroExportSrc ? ` data-export-src=\"${escHtmlAttr(heroExportSrc)}\"` : ''}></div>\n"
)

OLD_FAV = (
    '<img id="favicon-${uid}" class="favicon-logo" src="${faviconURL}" '
    'style="width:36px;height:36px;object-fit:contain;opacity:0.9;">'
)

NEW_FAV = (
    '<img id="favicon-${uid}" class="favicon-logo" src="${faviconURL}" '
    'data-export-src="${escHtmlAttr(\'Recursos/Main Logo/Favicon fill White.png\')}" '
    'style="width:36px;height:36px;object-fit:contain;opacity:0.9;">'
)

INLINE_PATCH = r'''
    <script>
(function(){
function _d(){var m=document.querySelector('meta[name="pathname"]'),r=m?String(m.getAttribute("content")||"").trim():"";if(!r)return 0;var n=parseInt(r,10);if(String(n)===r&&!isNaN(n))return n;return Math.max(0,r.split("/").filter(Boolean).length-1);}
function _slug(seg,isFile){var s=String(seg||"").toLowerCase();if(isFile){var ext="",dot=s.lastIndexOf(".");if(dot>0){ext=s.slice(dot).replace(/[^.a-z0-9]/gi,"");s=s.slice(0,dot);}var stem=s.replace(/[^a-z0-9\u00C0-\u017F]+/gi,"-").replace(/^-+|-+$/g,"");return stem+(ext||"");}return s.replace(/[^a-z0-9\u00C0-\u017F]+/gi,"-").replace(/^-+|-+$/g,"");}
function _href(vp){var raw=String(vp||"").trim().replace(/\\/g,"/");if(!raw||/^https?:\/\//i.test(raw)||raw.startsWith("data:")||raw.startsWith("/"))return raw;var parts=raw.split("/").filter(Boolean);if(!parts.length)return"";var slugged=parts.map(function(seg,i){return _slug(seg,i===parts.length-1);}).join("/");var x=_d(),pfx="";for(var i=0;i<x;i++)pfx+="../";return pfx+slugged;}
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
else if(el.classList&&el.classList.contains("top-hero-img"))el.style.backgroundImage="url('"+String(h).replace(/'/g,"\\'")+"')";
}
var jel=scope.querySelector(".js-weapons-json");
if(!jel)return;
try{
var W=JSON.parse(jel.textContent||"[]");
for(var j=0;j<W.length;j++){var w=W[j];if(!w)continue;var rr=w.imageRaw;if(rr){var hh=_href(rr);if(hh)w.image=hh;}}
jel.textContent=JSON.stringify(W);
}catch(_e){}
}
_patch(document.getElementById("__NW_UID__"));
})();
    </script>
'''.replace("__NW_UID__", "${uid}")

CLOSE_TAIL = (
    "    </div>\n"
    "</div>\n"
    "</div>\n"
    "`;\n"
    "\n"
    "// Initial Trigger for Obsidian view\n"
)

CLOSE_TAIL_NEW = (
    "    </div>\n"
    + INLINE_PATCH
    + "</div>\n"
    "</div>\n"
    "`;\n"
    "\n"
    "// Initial Trigger for Obsidian view\n"
)

NEEDLE_GETWEAPONS = (
    "        if (!weapons.length) { try { weapons = JSON.parse(decodeURIComponent(root.getAttribute(\"data-weapons\") || \"%5B%5D\")); } catch (e2) {} }\n"
    "        return weapons;\n"
)

REPLACE_GETWEAPONS = (
    "        if (!weapons.length) { try { weapons = JSON.parse(decodeURIComponent(root.getAttribute(\"data-weapons\") || \"%5B%5D\")); } catch (e2) {} }\n"
    "        if (typeof app === \"undefined\" && weapons.length) {\n"
    "            for (var _wi = 0; _wi < weapons.length; _wi++) {\n"
    "                var _ww = weapons[_wi];\n"
    "                if (!_ww) continue;\n"
    "                var _raw = _ww.imageRaw;\n"
    "                if (_raw && typeof nwVaultPathToSiteHref === \"function\") {\n"
    "                    var _nh = nwVaultPathToSiteHref(_raw);\n"
    "                    if (_nh) _ww.image = _nh;\n"
    "                }\n"
    "            }\n"
    "        }\n"
    "        return weapons;\n"
)


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if "function nwVaultPathToSiteHref(vp)" in text:
        return False
    if OLD_AFTER_PREFER not in text:
        print(f"SKIP (marker missing): {path}")
        return False

    orig = text
    text = text.replace(OLD_AFTER_PREFER, HELPERS, 1)
    text = text.replace(OLD_RESOLVE_BRANCH, NEW_RESOLVE_BRANCH, 1)

    if OLD_IMG_BLOCK not in text:
        print(f"SKIP (img block): {path}")
        return False
    text = text.replace(OLD_IMG_BLOCK, NEW_IMG_BLOCK, 1)

    if OLD_WEAPON_LOOP not in text:
        print(f"SKIP (weapon loop): {path}")
        return False
    text = text.replace(OLD_WEAPON_LOOP, NEW_WEAPON_LOOP, 1)

    if OLD_PUSH not in text:
        print(f"SKIP (push): {path}")
        return False
    text = text.replace(OLD_PUSH, NEW_PUSH, 1)

    if OLD_ESC not in text:
        print(f"SKIP escCssUrl: {path}")
        return False
    text = text.replace(OLD_ESC, NEW_ESC, 1)

    if OLD_HERO not in text:
        print(f"SKIP hero: {path}")
        return False
    text = text.replace(OLD_HERO, NEW_HERO, 1)

    if OLD_FAV not in text:
        print(f"SKIP favicon: {path}")
        return False
    text = text.replace(OLD_FAV, NEW_FAV, 1)

    if CLOSE_TAIL not in text:
        print(f"SKIP close tail: {path}")
        return False
    text = text.replace(CLOSE_TAIL, CLOSE_TAIL_NEW, 1)

    if NEEDLE_GETWEAPONS not in text:
        print(f"WARN getWeapons: {path}")
    else:
        text = text.replace(NEEDLE_GETWEAPONS, REPLACE_GETWEAPONS, 1)

    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main():
    n = 0
    for md in sorted(ROOT.rglob("*.md")):
        if patch_file(md):
            n += 1
            print(f"Patched: {md.relative_to(ROOT)}")
    print(f"Done. Patched {n} files.")


if __name__ == "__main__":
    main()
