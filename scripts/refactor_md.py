import os
import re

base_dir = "/Users/mmierzej/Desktop/code/gastroo-space"

mapping = {
    # Old path -> New path
    "EMULATORS.md": "docs/emulators.md",
    "AGENTS.md": "docs/agents.md",
    "TOKENS.md": "docs/design-tokens.md",
    "docs/ai/IMPLEMENTATION_PROGRESS.md": "docs/ai/implementation-progress.md",
    "docs/ai/API_ENDPOINTS.md": "docs/ai/api-endpoints.md",
    "docs/ai/SEED_DATA.md": "docs/ai/seed-data.md",
    "docs/ai/SESSION_SUMMARY.md": "docs/ai/session-summary.md",
    "docs/ai/QUICK_REFERENCE.md": "docs/ai/quick-reference.md",
    "docs/ai/audit-fixes-todo.md": "docs/ai/backlog.md",
}

# Collect all markdown files to modify links
all_md_files = []
for root, dirs, files in os.walk(base_dir):
    if "node_modules" in root or ".git" in root or ".next" in root:
        continue
    for f in files:
        if f.endswith(".md"):
            all_md_files.append(os.path.join(root, f))

# Iterate and replace text in all files
for file_path in all_md_files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = content
    # For every mapping, we replace standard occurrences of the old filename
    for old_rel, new_rel in mapping.items():
        old_basename = os.path.basename(old_rel)
        new_basename = os.path.basename(new_rel)
        
        # Replace `docs/ai/API_ENDPOINTS.md` -> `docs/ai/api-endpoints.md`
        new_content = new_content.replace(old_rel, new_rel)
        # Replace `./API_ENDPOINTS.md` -> `./api-endpoints.md`
        new_content = new_content.replace(f"./{old_basename}", f"./{new_basename}")
        # Replace just the basename if it's in a link [Text](API_ENDPOINTS.md)
        new_content = re.sub(r'\]\(' + re.escape(old_basename) + r'\)', f']({new_basename})', new_content)

    if content != new_content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated links in: {os.path.relpath(file_path, base_dir)}")

# Now rename files
for old_rel, new_rel in mapping.items():
    old_abs = os.path.join(base_dir, old_rel)
    new_abs = os.path.join(base_dir, new_rel)
    
    if os.path.exists(old_abs):
        # ensure dir exists
        os.makedirs(os.path.dirname(new_abs), exist_ok=True)
        os.rename(old_abs, new_abs)
        print(f"Renamed: {old_rel} -> {new_rel}")

print("Refactoring completed.")
