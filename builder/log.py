"""Coloured console output (ANSI). On Windows, run with PYTHONIOENCODING=utf-8 for ✔ / →."""

GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(msg):  print(f"  {GREEN}✔{RESET}  {msg}")
def err(msg): print(f"  {RED}✘{RESET}  {msg}")
def info(msg):print(f"  {YELLOW}→{RESET}  {msg}")
