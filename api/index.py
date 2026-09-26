import os
import sys

# Ensure root folder is in python path for Vercel serverless functions
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
