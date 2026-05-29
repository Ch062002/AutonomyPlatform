# Aerospace Autonomy Platform

Software-first aerospace autonomy infrastructure platform focused on:

- UAV mission systems
- Guidance and control
- PX4/ROS2 integration
- Simulation infrastructure
- Swarm autonomy
- AI-assisted mission intelligence

---

# Core Technologies

- Ubuntu 24.04
- ROS2 Jazzy
- PX4
- Gazebo
- FastAPI
- React
- Docker
- Python

---

# Project Structure

```text
backend/
frontend/
mission-engine/
guidance-engine/
control-engine/
simulation-engine/
swarm-engine/
ai-engine/
scripts/
```

---

# Current Features

- FastAPI backend
- React frontend dashboard
- Live system status monitoring
- ROS2 telemetry node
- PX4 SITL status monitoring
- Gazebo status monitoring
- Live telemetry dashboard
- Mission creation/reset API
- Mission control panel
- Launch scripts

---

# Running the Platform

Open four terminals and run:

## 1. Backend

```bash
./scripts/run_backend.sh
```

## 2. Frontend

```bash
./scripts/run_frontend.sh
```

## 3. ROS2 Telemetry Node

```bash
./scripts/run_ros2_telemetry.sh
```

## 4. PX4 SITL + Gazebo

```bash
./scripts/run_px4_sitl.sh
```

---

# Access URLs

## Frontend Dashboard

```text
http://localhost:5173
```

## Backend API Docs

```text
http://127.0.0.1:8000/docs
```

---

# Current Architecture

```text
Frontend (React)
        ↕
Backend (FastAPI)
        ↕
ROS2 Middleware
        ↕
PX4 SITL
        ↕
Gazebo Simulation
```

---

# Status

Phase-0 infrastructure prototype completed.

Current capabilities:

- Modular frontend architecture
- Modular backend APIs
- ROS2 telemetry publishing
- PX4/Gazebo monitoring
- Live telemetry visualization
- Mission management prototype
- Aerospace autonomy software stack foundation
- Real PX4 telemetry through ROS2
- Real PX4 altitude and velocity display
- Real PX4 battery telemetry
- PX4 vehicle status display
- Human-readable nav state and arming states

---

# Future Roadmap

## Phase 1
- Real PX4 telemetry bridge
- MAVLink integration
- WebSocket telemetry streaming

## Phase 2
- Waypoint mission planner
- Map integration
- UAV path visualization

## Phase 3
- Swarm UAV architecture
- Multi-agent coordination
- Distributed telemetry

## Phase 4
- AI-assisted autonomy
- Mission intelligence
- Guidance optimization

## Phase 5
- Cloud deployment
- Fleet management
- Real UAV integration