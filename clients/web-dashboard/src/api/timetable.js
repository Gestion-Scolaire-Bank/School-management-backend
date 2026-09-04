import apiClient from "./client";

// --- ClassTime ---
export const fetchClassTimes = (params = {}) => apiClient.get("/api/v1/timetable/class-times", { params }).then(r=>r.data);
export const fetchClassTime = (id) => apiClient.get(`/api/v1/timetable/class-times/${id}`).then(r=>r.data);
export const createClassTime = (payload) => apiClient.post("/api/v1/timetable/class-times", payload).then(r=>r.data);
export const updateClassTime = (id, payload) => apiClient.patch(`/api/v1/timetable/class-times/${id}`, payload).then(r=>r.data);
export const deleteClassTime = (id) => apiClient.delete(`/api/v1/timetable/class-times/${id}`).then(r=>r.data);

// --- BreakTime ---
export const fetchBreakTimes = (params={}) => apiClient.get("/api/v1/timetable/break-times", { params }).then(r=>r.data);
export const createBreakTime = (payload) => apiClient.post("/api/v1/timetable/break-times", payload).then(r=>r.data);
export const updateBreakTime = (id,p) => apiClient.patch(`/api/v1/timetable/break-times/${id}`, p).then(r=>r.data);
export const deleteBreakTime = (id) => apiClient.delete(`/api/v1/timetable/break-times/${id}`).then(r=>r.data);

// --- Holiday ---
export const fetchHolidays = (params={}) => apiClient.get("/api/v1/timetable/holidays", { params }).then(r=>r.data);
export const createHoliday = (payload) => apiClient.post("/api/v1/timetable/holidays", payload).then(r=>r.data);
export const updateHoliday = (id,p) => apiClient.patch(`/api/v1/timetable/holidays/${id}`, p).then(r=>r.data);
export const deleteHoliday = (id) => apiClient.delete(`/api/v1/timetable/holidays/${id}`).then(r=>r.data);
export const fetchHolidayClassrooms = (params={}) => apiClient.get("/api/v1/timetable/holiday-classrooms", { params }).then(r=>r.data);
export const createHolidayClassroom = (payload) => apiClient.post("/api/v1/timetable/holiday-classrooms", payload).then(r=>r.data);

// --- Occurrences ---
export const moveOccurrence = (classTimeId, date, payload) => apiClient.patch(`/api/v1/timetable/class-times/${classTimeId}/occurrences/${date}/move`, payload).then(r=>r.data);
export const cancelOccurrence = (classTimeId, date, payload) => apiClient.patch(`/api/v1/timetable/class-times/${classTimeId}/occurrences/${date}/cancel`, payload).then(r=>r.data);
export const deleteOccurrence = (classTimeId, date) => apiClient.delete(`/api/v1/timetable/class-times/${classTimeId}/occurrences/${date}`).then(r=>r.data);
export const restoreOccurrence = (classTimeId, date) => apiClient.patch(`/api/v1/timetable/class-times/${classTimeId}/occurrences/${date}/restore`).then(r=>r.data);

// --- Simulate ---
export const fetchClassroomTimetable = (classroomId, params={}) => apiClient.get(`/api/v1/timetable/classroom/${classroomId}/simulate`, { params }).then(r=>r.data);
export const fetchTeacherTimetable = (teacherId, params={}) => apiClient.get(`/api/v1/timetable/teacher/${teacherId}/simulate`, { params }).then(r=>r.data);

// --- Seed defaults (wyscolars SessionCreateEventListener parity) + print pivot ---
export const seedDefaults = (params={}) => apiClient.post("/api/v1/timetable/seed-defaults", null, { params }).then(r=>r.data);
export const fetchClassroomPrint = (classroomId, params={}) => apiClient.get(`/api/v1/timetable/classroom/${classroomId}/print`, { params }).then(r=>r.data);
