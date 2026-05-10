# -*- coding: utf-8 -*-
"""One-shot: create Wargame/02 Models/<render-folder>/<Image Basename>.md from Casacos/Arkwright.md template.

After changing the shared dual DataviewJS HUD, sync all Model notes from the master:
  PowerShell: .\\tools\\sync_model_unit_dataview_from_master.ps1
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RENDERS = ROOT / "Recursos" / "Imagens" / "Renders"
TEMPLATE = ROOT / "Wargame" / "02 Models" / "Casacos" / "Arkwright.md"
MODELS_ROOT = ROOT / "Wargame" / "02 Models"

FM_REGEX = re.compile(r"(?s)^---.*?---\n")

CONFIG: dict[str, dict] = {
    "Casaca": {"faccao": ["Casacas"], "noosphera": "Ryke", "merc": False},
    "Chloriders": {"faccao": ["Chloriders"], "noosphera": "Ryke", "merc": False},
    "Linearch": {"faccao": ["Linearchs"], "noosphera": "Osmirate", "merc": False},
    "Technokrat": {"faccao": ["Technokratas"], "noosphera": "Ryke", "merc": False},
    "Undermovement": {"faccao": ["Undermovement"], "noosphera": "Ryke", "merc": False},
    "Osmirate Mercs": {"faccao": [], "noosphera": "Osmirate", "merc": True},
    "Ryke Mercs": {"faccao": [], "noosphera": "Ryke", "merc": True},
}


def yaml_quote(s: str) -> str:
    if re.search(r'[:#"\'\[\]]', s) or s.strip() != s:
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return s


def build_frontmatter(folder: str, img_base: str, cfg: dict) -> str:
    keywords: list[str] = []
    if cfg["merc"]:
        keywords.append("Mercenary")
    stub = img_base.strip()
    if stub not in keywords:
        keywords.append(stub)

    if cfg["faccao"]:
        fac_lines = "\n".join(f"  - {yaml_quote(x)}" for x in cfg["faccao"])
        fac_block = f"faccao:\n{fac_lines}"
    else:
        fac_block = "faccao: []"

    kw_lines = "\n".join(f"  - {yaml_quote(k)}" for k in keywords)
    img_inner = f"Recursos/Imagens/Renders/{folder}/{img_base}.png"

    lines = [
        "---",
        "tipo: Model",
        'pontos: "100"',
        fac_block,
        f"noosphera: {cfg['noosphera']}",
        "keywords:",
        kw_lines,
        "caracteristicas:",
        "habilidades_ativas:",
        "habilidades_passivas:",
        'movimento: "6"',
        'vida: "3"',
        'armadura_melee: "2"',
        'armadura_ranged: "2"',
        'armadura_special: "2"',
        'loadout_max: "8"',
        'decoerencia: "2"',
        f'model_image: "[[{img_inner}]]"',
        'AP: "3"',
        "habilidades_padrao:",
        "  - Mover",
        "  - Combater",
        "utility_list:",
        '  - "[[Utility Template]]"',
        '  - "[[Weapon Template]]"',
        "---",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    if not TEMPLATE.is_file():
        print("Missing template:", TEMPLATE, file=sys.stderr)
        return 1
    if not RENDERS.is_dir():
        print("Missing renders dir:", RENDERS, file=sys.stderr)
        return 1

    template_full = TEMPLATE.read_text(encoding="utf-8")
    m = FM_REGEX.match(template_full)
    if not m:
        print("Could not parse template frontmatter.", file=sys.stderr)
        return 1
    body = template_full[m.end() :]

    exts = {".png", ".jpg", ".jpeg", ".webp"}
    created = 0
    skipped = 0

    for sub in sorted(RENDERS.iterdir()):
        if not sub.is_dir():
            continue
        folder_name = sub.name
        cfg = CONFIG.get(folder_name)
        if not cfg:
            print("Skip unknown folder:", folder_name, file=sys.stderr)
            continue

        out_dir = MODELS_ROOT / folder_name
        out_dir.mkdir(parents=True, exist_ok=True)

        for img in sorted(sub.iterdir()):
            if img.suffix.lower() not in exts:
                continue
            img_base = img.stem
            md_path = out_dir / f"{img_base}.md"
            if md_path.is_file():
                skipped += 1
                continue

            fm = build_frontmatter(folder_name, img_base, cfg)
            md_path.write_text(fm + body, encoding="utf-8")
            created += 1

    print(f"Created {created} model notes, skipped {skipped} existing.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
