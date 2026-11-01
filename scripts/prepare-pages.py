"""Package the website while retaining legacy routes and their assets."""
from pathlib import Path
import shutil

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
for name in ["404.html", "CNAME", "BingSiteAuth.xml"]:
    if (source / name).is_file():
        assert (source / name).read_bytes() == (output / name).read_bytes(), name
if (source / "pastebin").is_dir():
    for item in (source / "pastebin").rglob("*"):
        if item.is_file():
            assert item.read_bytes() == (output / item.relative_to(source)).read_bytes(), item
print("Pages package verified, including legacy routes and pastebin files.")
