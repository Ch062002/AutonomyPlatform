#!/bin/bash

echo "Aerospace Autonomy Platform Status Check"
echo "======================================="

echo ""
echo "Backend:"
curl -s http://127.0.0.1:8000/health || echo "Backend not reachable"

echo ""
echo ""
echo "ROS2 Topics:"
ros2 topic list 2>/dev/null || echo "ROS2 not sourced or not running"

echo ""
echo "PX4:"
pgrep -f px4 >/dev/null && echo "PX4 running" || echo "PX4 not running"

echo ""
echo "Gazebo:"
pgrep -f gz >/dev/null && echo "Gazebo running" || echo "Gazebo not running"

echo ""
echo "Frontend:"
curl -s http://localhost:5173 >/dev/null && echo "Frontend running" || echo "Frontend not reachable"
