from pathlib import Path
from shutil import copy2, rmtree

Import("env")

project_dir = Path(env.subst("$PROJECT_DIR"))
repository_root = project_dir.parents[1]
source_dir = repository_root / "3D"
data_dir = project_dir / "data"

if data_dir.exists():
    rmtree(data_dir)
data_dir.mkdir(parents=True)

for filename in ("index.html", "styles.css", "app.js"):
    copy2(source_dir / filename, data_dir / filename)

print(f"Synced Web UI from {source_dir} to {data_dir}")
