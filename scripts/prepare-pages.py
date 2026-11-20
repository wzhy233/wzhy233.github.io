"""Package the website while retaining legacy routes and their assets."""
from hashlib import sha256
from pathlib import Path
import re
import shutil


def version_modules(root):
    modules = sorted([*root.glob("assets/js/**/*.js"), *root.glob("config/*.js")])
    digest = sha256()
    for module in modules:
        digest.update(module.relative_to(root).as_posix().encode())
        digest.update(module.read_bytes())
    revision = digest.hexdigest()[:12]
    # Every relative import uses the same release to avoid mixing cached modules.
    module_url = re.compile(r"(\bfrom\s+|\bimport\s*\(\s*|^import\s+)(['\"])(\.{1,2}/[^'\"\s]+\.js)\2", re.MULTILINE)
    for module in modules:
        text = module.read_text(encoding="utf-8")
        versioned = module_url.sub(rf"\1\2\3?v={revision}\2", text)
        if versioned != text:
            module.write_text(versioned, encoding="utf-8")
    for page in (root / "index.html", root / "github/index.html"):
        text = page.read_text(encoding="utf-8")
        page.write_text(text.replace('assets/js/main.js"', f'assets/js/main.js?v={revision}"'), encoding="utf-8")


workspace = Path(__file__).resolve().parents[1]
source = workspace / "github-pages" if (workspace / "github-pages").is_dir() else workspace
output = workspace / "_site"
assert output.resolve().parent == workspace.resolve() and output.name == "_site"
if output.exists():
    shutil.rmtree(output)
output.mkdir()
excluded = {".git", ".github", ".idea", ".delivery", "scripts", "node_modules", "_site", ".gitignore", "README.md", "package.json", "package-lock.json"}
for item in source.iterdir():
    if item.name in excluded:
        continue
    target = output / item.name
    if item.is_dir():
        shutil.copytree(item, target)
    else:
        shutil.copy2(item, target)
assert (output / "index.html").is_file()
assert (output / "github/index.html").is_file()
assert (output / "data/accounts.json").is_file()
version_modules(output)
for name in ["404.html", "CNAME", "BingSiteAuth.xml"]:
    if (source / name).is_file():
        assert (source / name).read_bytes() == (output / name).read_bytes(), name
if (source / "pastebin").is_dir():
    for item in (source / "pastebin").rglob("*"):
        if item.is_file():
            assert item.read_bytes() == (output / item.relative_to(source)).read_bytes(), item
print("Pages package verified, including legacy routes and pastebin files.")
