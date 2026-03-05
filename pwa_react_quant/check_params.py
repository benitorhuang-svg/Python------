import os
import re

for f in os.listdir("src/units"):
    if not f.endswith(".ts") or f == "types.ts": continue
    with open("src/units/" + f, "r", encoding="utf-8") as file:
        content = file.read()
    
    code_match = re.search(r'defaultCode:\s*`([^`]+)`', content)
    if not code_match: continue
    code = code_match.group(1)
    
    vars_in_code = []
    param_section = False
    for line in code.split("\n"):
        if "策略參數" in line:
            param_section = True
            continue
        if param_section and line.strip() == "":
            param_section = False
        if param_section and "=" in line:
            parts = line.split("=")
            var_name = parts[0].strip()
            if var_name.isupper() and var_name.isidentifier():
                vars_in_code.append(var_name)
                
    params_match = re.search(r'params:\s*\[([^\]]*)\]', content)
    missing = []
    if params_match:
        params_array = params_match.group(1)
        for var_name in vars_in_code:
            if f"'{var_name}'" not in params_array:
                missing.append(var_name)
    if missing:
        print(f"{f}: {missing}")
