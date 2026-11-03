"""Baut die Seite aus src/: docs/index.html (GitHub Pages, vollständiges Dokument) und dist/artifact.html (ohne Rahmen)."""
from pathlib import Path

root = Path(__file__).resolve().parent
src = root / "src"
read = lambda n: (src / n).read_text(encoding="utf-8")

page = read("page.html")
css = read("style.css")
base = "\n".join(read(n) for n in ["data.js", "lod2.js", "sun.js", "house.js", "elevation.js", "siteplan.js", "floorplan.js"])
view3d = "\n".join([
    "import * as THREE from 'three';",
    "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",
    "import { Sky } from 'three/addons/objects/Sky.js';",
    "import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';",
    "import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';",
    "import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';",
    read("view3d.js"),
    "window.View3D = View3D;",
])
main = read("main.js")


def assemble(downloads):
    p = page.replace("/*CSS*/", css)
    p = p.replace("/*JSBASE*/", f"const BUILD = {{ downloads: {'true' if downloads else 'false'} }};\n" + base)
    p = p.replace("/*JS3D*/", view3d).replace("/*JSMAIN*/", main)
    head, body = p.split("<!--BODY-->")
    return head.strip(), body.strip()


head, body = assemble(True)
(root / "docs").mkdir(exist_ok=True)
(root / "docs" / "index.html").write_text(
    '<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    f"{head}\n</head>\n<body>\n{body}\n</body>\n</html>\n", encoding="utf-8")
head, body = assemble(False)
(root / "dist").mkdir(exist_ok=True)
(root / "dist" / "artifact.html").write_text(f"{head}\n{body}\n", encoding="utf-8")
print("docs/index.html", (root / "docs" / "index.html").stat().st_size, "bytes")
print("dist/artifact.html", (root / "dist" / "artifact.html").stat().st_size, "bytes")
