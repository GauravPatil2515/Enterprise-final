import sys
import os

# Add the project root (one level up from 'api' directory) to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(project_root)

# Attempt to import the app
try:
    from backend.app.main import app
except ImportError:
    # Fallback if 'backend' is not a package or structure is different
    sys.path.append(os.path.join(project_root, 'backend'))
    from app.main import app

# Vercel expects 'app' to be available for WSGI/ASGI
# For Vercel Python runtime, having 'app' variable at module level is key.
