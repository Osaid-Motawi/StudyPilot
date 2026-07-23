"""Pytest configuration: make agent modules importable from the tests package.

Ensures `import agent`, `import asi_client`, etc. resolve regardless of how
pytest is invoked, and provides a dummy ASI:One key so importing modules never
requires real credentials (all network calls are mocked in the tests).
"""

import os
import sys
from pathlib import Path

AGENT_DIR = Path(__file__).parent.resolve()
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))

os.environ.setdefault("ASI_ONE_API_KEY", "test-key-not-used")
os.environ.setdefault("ASI_ONE_BASE_URL", "https://api.asi1.ai/v1")
os.environ.setdefault("ASI_ONE_MODEL", "asi1")
os.environ.setdefault("AGENT_PORT", "8001")
