import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

export const getBackendStatus = () => {
  return axios.get(`${API_BASE_URL}/health`);
};

export const getRos2Status = () => {
  return axios.get(`${API_BASE_URL}/ros2/status`);
};

export const getPx4Status = () => {
  return axios.get(`${API_BASE_URL}/px4/status`);
};

export const getGazeboStatus = () => {
  return axios.get(`${API_BASE_URL}/gazebo/status`);
};

export const getTelemetry = () => {
  return axios.get(`${API_BASE_URL}/telemetry`);
};