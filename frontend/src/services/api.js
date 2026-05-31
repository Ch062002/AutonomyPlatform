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

export const getMission = () => {
  return axios.get(`${API_BASE_URL}/mission`);
};

export const createMission = (mission) => {
  return axios.post(`${API_BASE_URL}/mission`, mission);
};

export const resetMission = () => {
  return axios.delete(`${API_BASE_URL}/mission`);
};

export const armVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/arm`);
};

export const disarmVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/disarm`);
};

export const takeoffVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/takeoff`);
};

export const landVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/land`);
};

export const rtlVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/rtl`);
};

export const holdVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/hold`);
};

export const uploadMission = (mission) => {
  return axios.post(`${API_BASE_URL}/mission/upload`, mission);
};

export const getMissionUploadStatus = () => {
  return axios.get(`${API_BASE_URL}/mission/upload/status`);
};

export const offboardVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/offboard`);
};

export const stopOffboardVehicle = () => {
  return axios.post(`${API_BASE_URL}/command/stop-offboard`);
};

export const getMissionProgress = () => {
  return axios.get(`${API_BASE_URL}/mission/progress`);
};

export const abortMission = () => {
  return axios.post(`${API_BASE_URL}/command/abort-mission`);
};


export const resetMissionState = () => {
  return axios.post(`${API_BASE_URL}/mission/reset`);
};

export const pauseMission = () => {
  return axios.post(`${API_BASE_URL}/mission/pause`);
};

export const resumeMission = () => {
  return axios.post(`${API_BASE_URL}/mission/resume`);
};

export const setGuidanceMode = (mode) => {
  return axios.post(`${API_BASE_URL}/guidance/mode/${mode}`);
};