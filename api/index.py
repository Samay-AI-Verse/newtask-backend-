import sys
import os

# Add root directory to sys.path so app imports work seamlessly on Vercel
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
