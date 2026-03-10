import os
import re

# Resolve paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

def audit_logs():
    print(f"Auditing console.log statements in {FRONTEND_DIR}...")
    count = 0
    modified_files = 0
    
    for root, _, files in os.walk(FRONTEND_DIR):
        if "node_modules" in root or ".next" in root:
            continue
            
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        
                    new_lines = []
                    file_modified = False
                    
                    for line in lines:
                        # Simple check and comment for lines with console.log that aren't already commented
                        if "console.log" in line and not line.lstrip().startswith("//"):
                            # Replace console.log completely or comment it
                            # Preferring a safer regex or simple replacement
                            # We'll prepend "// [AUDIT] " before console.log
                            new_line = re.sub(r'(console\.log\()', r'// [AUDIT] \1', line)
                            if new_line != line:
                                count += 1
                                file_modified = True
                                line = new_line
                        new_lines.append(line)
                        
                    if file_modified:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.writelines(new_lines)
                        modified_files += 1
                        print(f"Fixed logs in: {os.path.relpath(filepath, PROJECT_ROOT)}")
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
                    
    print(f"\nAudit complete!")
    print(f"- Files modified: {modified_files}")
    print(f"- console.log statements commented: {count}")

if __name__ == "__main__":
    audit_logs()
