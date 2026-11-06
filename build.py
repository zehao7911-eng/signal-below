from pathlib import Path
import base64
import re

root = Path(__file__).resolve().parent
read = lambda name: (root / name).read_text(encoding="utf-8-sig")
strip_exports = lambda source: re.sub(r"^export ", "", source, flags=re.M)
strip_imports = lambda source: re.sub(r"^import .*;\n", "", source, flags=re.M)

core = strip_exports(read("core.mjs"))
art = strip_exports(strip_imports(read("art.mjs")))
sdk = strip_exports(read("sdk.mjs"))
game = strip_imports(read("game.mjs"))
script = (
    "(()=>{\n'use strict';\nconst game=(()=>{\n" + core
    + "\nreturn {directions,sectors,point,neighbor,freshProfile,freshRun,cleanProfile,mergeProfiles,action,settle,rating,width,height,scoutPositions};\n})();\n"
    + "const makeScene=(()=>{\nconst {width,height,point,scoutPositions}=game;\n"
    + art + "\nreturn makeScene;\n})();\n" + sdk + "\n" + game + "\n})();"
)
icon = base64.b64encode((root / "assets/icon.svg").read_bytes()).decode()
entry = read("index-source.html").replace(
    '<link rel="icon" href="./assets/icon.svg">',
    '<link rel="icon" href="data:image/svg+xml;base64,' + icon + '">',
).replace(
    '<link rel="stylesheet" href="./style.css">', "<style>\n" + read("style.css") + "\n</style>",
).replace(
    '<script type="module" src="./game.mjs"></script>', "<script>\n" + script + "\n</script>",
)
for file in ("index.html", "standalone.html"):
    (root / file).write_bytes(entry.encode())
print("Built two identical self-contained HTML entries.")
