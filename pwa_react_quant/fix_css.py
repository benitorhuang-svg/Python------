import re

with open("src/styles/global.css", "r", encoding="utf-8") as f:
    content = f.read()

# Add new semantic variables to :root
root_vars = """    --border-glow: rgba(34, 211, 238, 0.2);

    --bg-header: rgba(0, 0, 0, 0.2);
    --bg-header-strong: rgba(0, 0, 0, 0.35);
    --bg-hover: rgba(255, 255, 255, 0.04);
    --bg-hover-strong: rgba(255, 255, 255, 0.08);
    --bg-active: rgba(34, 211, 238, 0.08);
    --brand-primary-muted: rgba(34, 211, 238, 0.04);

    --radius-xs: 6px;"""
content = content.replace("    --border-glow: rgba(34, 211, 238, 0.2);\n\n    --radius-xs: 6px;", root_vars)

light_vars = """    --border-glow: rgba(14, 165, 233, 0.2);

    --bg-header: rgba(0, 0, 0, 0.03);
    --bg-header-strong: rgba(0, 0, 0, 0.06);
    --bg-hover: rgba(0, 0, 0, 0.04);
    --bg-hover-strong: rgba(0, 0, 0, 0.08);
    --bg-active: rgba(14, 165, 233, 0.08);
    --brand-primary-muted: rgba(14, 165, 233, 0.04);

    --gradient-primary: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);"""
content = content.replace("    --border-glow: rgba(14, 165, 233, 0.2);\n\n    --gradient-primary: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);", light_vars)

content = content.replace("background: rgba(0, 0, 0, 0.15);", "background: var(--bg-header);")
content = content.replace("background: rgba(0, 0, 0, 0.2);", "background: var(--bg-header);")
content = content.replace("background: rgba(0, 0, 0, 0.3);", "background: var(--bg-header-strong);")
content = content.replace("background: rgba(0, 0, 0, 0.35);", "background: var(--bg-header-strong);")
content = content.replace("background: rgba(0, 0, 0, 0.4);", "background: var(--bg-header-strong);")

content = content.replace("background: rgba(255, 255, 255, 0.01);", "background: var(--bg-hover);")
content = content.replace("background: rgba(255, 255, 255, 0.02);", "background: var(--bg-hover);")
content = content.replace("background: rgba(255, 255, 255, 0.03);", "background: var(--bg-hover);")
content = content.replace("background: rgba(255, 255, 255, 0.04);", "background: var(--bg-hover);")
content = content.replace("background: rgba(255, 255, 255, 0.05);", "background: var(--bg-hover-strong);")
content = content.replace("background: rgba(255, 255, 255, 0.06);", "background: var(--bg-hover-strong);")
content = content.replace("background: rgba(255, 255, 255, 0.08);", "background: var(--bg-hover-strong);")
content = content.replace("background: rgba(255, 255, 255, 0.1);", "background: var(--bg-hover-strong);")

content = content.replace("background: rgba(34, 211, 238, 0.02);", "background: var(--brand-primary-muted);")
content = content.replace("background: rgba(34, 211, 238, 0.03);", "background: var(--brand-primary-muted);")
content = content.replace("background: rgba(34, 211, 238, 0.04);", "background: var(--brand-primary-muted);")
content = content.replace("background: rgba(34, 211, 238, 0.06);", "background: var(--brand-primary-muted);")
content = content.replace("background: rgba(34, 211, 238, 0.08);", "background: var(--bg-active);")

content = content.replace("background: rgba(129, 140, 248, 0.08);", "background: var(--brand-primary-muted);")

with open("src/styles/global.css", "w", encoding="utf-8") as f:
    f.write(content)
