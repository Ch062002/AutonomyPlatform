#!/bin/bash
cd ~/Aerospace/Startup/AutonomyPlatform/backend
source .venv/bin/activate
uvicorn app.main:app --reload
