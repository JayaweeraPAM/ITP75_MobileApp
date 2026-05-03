import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

function getExpoHostApiUrl() {
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest?.hostUri;

  if (typeof hostUri !== 'string' || !hostUri.length) return null;
  const host = hostUri.split(':')[0];
  return host ? `http://${host}:3001` : null;
}

function resolveApiCandidates() {
  const list = [];
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    let url = String(envUrl).trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    url = url.replace(/\/+$/, '');
    if (url.endsWith('/api')) {
      url = url.slice(0, -4);
    }
    list.push(url);
  }

  const expoHostUrl = getExpoHostApiUrl();
  if (expoHostUrl) list.push(expoHostUrl);

  list.push('http://localhost:3001');
  list.push('http://10.0.2.2:3001');
  if (Platform.OS === 'web') list.unshift('http://localhost:3001');

  return Array.from(new Set(list.filter(Boolean)));
}

const API_CANDIDATES = resolveApiCandidates();
const API_URL = API_CANDIDATES[0];
const API_BASE = `${API_URL}/api`;
const API_AUTH_FALLBACK_BASES = API_CANDIDATES.slice(1).map((url) => `${url}/api`);

const api = axios.create({
  baseURL: API_BASE,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// In-memory token cache — avoids calling AsyncStorage on every request
// Updated by AuthContext when user logs in/out
let _cachedToken = null;
let _cachedGuestId = null;

export function setApiToken(token) {
  _cachedToken = token;
}

export function setApiGuestId(guestId) {
  _cachedGuestId = guestId || null;
}

export function getApiBase() {
  return API_BASE;
}

// Request interceptor — reads the cached token or fallback to AsyncStorage
api.interceptors.request.use(
  async (config) => {
    let token = _cachedToken;
    if (!token) {
      try {
        token = await AsyncStorage.getItem('tutorhub_token');
        if (token) _cachedToken = token;
      } catch (err) {
        // Ignore
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize common network failures so UI can show a clear message.
    if (error?.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please check backend connection and try again.'));
    }

    if (!error?.response) {
      return Promise.reject(new Error('Cannot reach server. Check EXPO_PUBLIC_API_URL and backend status.'));
    }

    const serverMsg =
      error.response?.data?.error ||
      error.response?.data?.message ||
      'Request failed';

    return Promise.reject(new Error(serverMsg));
  }
);

function normalizeUser(rawUser, token) {
  if (!rawUser) return null;
  const role = String(rawUser.role ?? rawUser.userRole ?? '').trim().toLowerCase();
  return {
    ...rawUser,
    id: rawUser.id || rawUser._id,
    name: rawUser.name || rawUser.fullName,
    role,
    token,
  };
}

function unwrapData(response, fallback) {
  return response?.data ?? fallback;
}

function aiHeaders() {
  if (!_cachedToken && _cachedGuestId) {
    return { 'x-guest-id': _cachedGuestId };
  }
  return undefined;
}

async function fetchAuth(endpoint, payload) {
  try {
    const res = await api.post(endpoint, payload);
    const token = res.data?.token;
    const user = normalizeUser(res.data?.user, token);
    return { token, user, raw: res.data };
  } catch (err) {
    const msg = String(err?.response?.data?.error || err?.response?.data?.message || err?.message || '')
      .trim()
      .toLowerCase();

    const isNetworkLikeFailure =
      !err?.response || err?.code === 'ECONNABORTED' || msg.includes('network') || msg.includes('timeout');

    const isAuthEndpoint = endpoint === '/auth/login' || endpoint === '/auth/register';

    // Retry alternate base URLs for auth when the current base is unreachable (common on devices),
    // or when the backend responds in a way that indicates we reached the server but the auth failed.
    const shouldRetryAuth =
      isAuthEndpoint && (isNetworkLikeFailure || (endpoint === '/auth/login' && msg.includes('invalid email or password')));

    if (!shouldRetryAuth || API_AUTH_FALLBACK_BASES.length === 0) throw err;

    for (const fallbackBase of API_AUTH_FALLBACK_BASES) {
      try {
        const res = await axios.post(`${fallbackBase}${endpoint}`, payload, {
          timeout: 12000,
          headers: { 'Content-Type': 'application/json' },
        });
        // If auth works on a fallback base, persist it for the rest of the session
        // so subsequent API calls don't keep hitting an unreachable baseURL.
        api.defaults.baseURL = fallbackBase;
        const token = res.data?.token;
        const user = normalizeUser(res.data?.user, token);
        return { token, user, raw: res.data };
      } catch {
        // Try next candidate silently.
      }
    }

    throw err;
  }
}

export const authAPI = {
  login: (email, password) => fetchAuth('/auth/login', { email: String(email).trim().toLowerCase(), password }),
  signup: (payload) => fetchAuth('/auth/register', payload),
  registerTutor: (payload) => fetchAuth('/tutors/register', payload),
};

export const usersAPI = {
  getMe: async () => unwrapData(await api.get('/users/me'), { user: null }),
  updateMe: async (payload) => unwrapData(await api.patch('/users/me', payload), { success: false }),
  getProfileById: async (id) => unwrapData(await api.get(`/users/${id}/profile`), { user: null }),
};

export const tutorAPI = {
  search: async (params = {}) => unwrapData(await api.get('/tutors/search', { params }), { tutors: [] }),
  getPublicList: async (search = '') => unwrapData(await api.get('/tutors', { params: { search } }), []),
  getDetails: async (tutorId) => unwrapData(await api.get(`/tutors/${tutorId}/details`), { tutor: null }),
  getById: async (tutorId) => unwrapData(await api.get(`/tutors/${tutorId}`), { tutor: null }),
  getMyProfile: async () => unwrapData(await api.get('/tutors/me/profile'), { profile: null }),
  upsertProfile: async (payload) => unwrapData(await api.put('/tutors/profile', payload), { success: false }),
  saveMaterials: async (learningMaterials) =>
    unwrapData(await api.put('/tutors/me/materials', { learningMaterials }), { success: false }),
  getMaterials: async (tutorId) =>
    unwrapData(await api.get(`/tutors/${tutorId}/materials`), { materials: [], locked: false }),
  submitReview: async (tutorId, rating, comment = '') =>
    unwrapData(await api.post(`/tutors/${tutorId}/reviews`, { rating, comment }), { success: false }),
  getReviews: async (tutorId) => unwrapData(await api.get(`/tutors/${tutorId}/reviews`), { reviews: [] }),
};

export const bookingAPI = {
  create: async (payload) => unwrapData(await api.post('/bookings', payload), { success: false }),
  updatePending: async (id, payload) => unwrapData(await api.put(`/bookings/${id}`, payload), { success: false }),
  getStudentBookings: async () => unwrapData(await api.get('/bookings/student'), { bookings: [] }),
  getTutorBookings: async () => unwrapData(await api.get('/bookings/tutor'), { bookings: [] }),
  accept: async (id) => unwrapData(await api.patch(`/bookings/${id}/accept`), { success: false }),
  reject: async (id) => unwrapData(await api.patch(`/bookings/${id}/reject`), { success: false }),
  cancel: async (id) => unwrapData(await api.patch(`/bookings/${id}/cancel`), { success: false }),
  pay: async (id, payload = {}) => unwrapData(await api.post(`/bookings/${id}/pay`, payload), { success: false }),
  markDone: async (id) => unwrapData(await api.put(`/bookings/${id}/done`), { success: false }),
  earnings: async () => unwrapData(await api.get('/bookings/earnings'), { totalEarnings: 0, completedCount: 0 }),
};

export const chatAPI = {
  getThreads: async () => unwrapData(await api.get('/chat/threads'), { threads: [] }),
  getMessages: async (threadId) =>
    unwrapData(await api.get(`/chat/threads/${threadId}/messages`), { messages: [] }),
  createRequest: async (tutorId) => unwrapData(await api.post('/chat/requests', { tutorId }), { request: null }),
  getTutorPendingRequests: async () =>
    unwrapData(await api.get('/chat/requests/tutor/pending'), { requests: [] }),
  getTutorRequests: async (status = 'PENDING') =>
    unwrapData(await api.get('/chat/tutor/chat/requests', { params: { status } }), { requests: [] }),
  acceptRequest: async (id) => unwrapData(await api.patch(`/chat/requests/${id}/accept`), { request: null }),
  rejectRequest: async (id) => unwrapData(await api.patch(`/chat/requests/${id}/reject`), { request: null }),
};

export const subscriptionAPI = {
  startTrial: async () => unwrapData(await api.post('/subscription/trial'), { subscription: null }),
  pay: async (plan) => unwrapData(await api.post('/subscription/pay', { plan }), { subscription: null }),
  getByTutorId: async (tutorId) =>
    unwrapData(await api.get(`/subscription/${tutorId}`), { subscription: null }),
};

export const instituteAPI = {
  list: async () => unwrapData(await api.get('/institutes'), { institutes: [] }),
  getById: async (id) => unwrapData(await api.get(`/institutes/${id}`), { institute: null, tutors: [] }),
  getManagerInfo: async (id) => unwrapData(await api.get(`/institutes/${id}/manager-info`), { institute: null }),
  getMyInstitute: async () => unwrapData(await api.get('/institutes/my-institute'), { institute: null }),
  requestNew: async (instituteName) =>
    unwrapData(await api.post('/institutes/requests', { instituteName }), { success: false }),
  join: async (id) => unwrapData(await api.post(`/institutes/${id}/join`), { success: false }),
  myJoinRequest: async () => unwrapData(await api.get('/institutes/my/tutor-join-request'), { request: null }),
  updateSettings: async (id, payload) =>
    unwrapData(await api.put(`/institutes/${id}/settings`, payload), { success: false }),
  approveJoinRequest: async (requestId) =>
    unwrapData(await api.post(`/institutes/join-requests/${requestId}/approve`), { success: false }),
  rejectJoinRequest: async (requestId) =>
    unwrapData(await api.post(`/institutes/join-requests/${requestId}/reject`), { success: false }),
  updateTutorTimetable: async (instituteId, tutorId, instituteTimetable) =>
    unwrapData(await api.put(`/institutes/${instituteId}/tutors/${tutorId}/timetable`, { instituteTimetable }), {
      success: false,
    }),
};

export const adminAPI = {
  getUsers: async () => unwrapData(await api.get('/admin/users'), { users: [] }),
  getOrganizedUsers: async (role = 'all') =>
    unwrapData(await api.get(role === 'all' ? '/admin/users/organized/all' : `/admin/users/organized/${role}`), {}),
  refreshOrganization: async () =>
    unwrapData(await api.post('/admin/users/refresh-organization'), { success: false }),
  updateUserRole: async (id, role) => unwrapData(await api.patch(`/admin/users/${id}/role`, { role }), { user: null }),
  updateUserEmail: async (id, email) =>
    unwrapData(await api.patch(`/admin/users/${id}/email`, { email }), { user: null }),
  deleteUser: async (id) => unwrapData(await api.delete(`/admin/users/${id}`), { success: false }),
  getTutorRequests: async (status = '') =>
    unwrapData(await api.get('/admin/tutor-requests', { params: status ? { status } : undefined }), { requests: [] }),
  getTutorRequest: async (id) => unwrapData(await api.get(`/admin/tutor-requests/${id}`), { request: null }),
  approveTutorRequest: async (id) =>
    unwrapData(await api.patch(`/admin/tutor-requests/${id}/approve`), { success: false }),
  rejectTutorRequest: async (id, reason = '') =>
    unwrapData(await api.patch(`/admin/tutor-requests/${id}/reject`, { reason }), { success: false }),
  getSubjects: async () => unwrapData(await api.get('/admin/subjects'), { categories: [], subjectsByCategory: {} }),
  saveSubjects: async (payload) => unwrapData(await api.put('/admin/subjects', payload), { success: false }),
  getQuizzes: async () => unwrapData(await api.get('/admin/quizzes'), { quizzes: [] }),
  saveQuizzes: async (quizzes) => unwrapData(await api.put('/admin/quizzes', { quizzes }), { success: false }),
  getReviews: async () => unwrapData(await api.get('/admin/reviews'), { reviews: [] }),
  deleteReview: async (id) => unwrapData(await api.delete(`/admin/reviews/${id}`), { success: false }),
  getFinancials: async () => unwrapData(await api.get('/admin/financials'), {}),
  deleteBookingPayment: async (id) =>
    unwrapData(await api.delete(`/admin/financials/bookings/${id}`), { success: false }),
  deleteSubscriptionPayment: async (id) =>
    unwrapData(await api.delete(`/admin/financials/subscriptions/${id}`), { success: false }),
  wipeData: async () => unwrapData(await api.post('/admin/wipe-data'), { success: false }),
  getManagerRegistrations: async () =>
    unwrapData(await api.get('/institutes/manager-registrations'), { registrations: [] }),
  approveManagerRegistration: async (requestId) =>
    unwrapData(await api.post(`/institutes/manager-registrations/${requestId}/approve`), { success: false }),
  rejectManagerRegistration: async (requestId, reason = '') =>
    unwrapData(await api.patch(`/institutes/manager-registrations/${requestId}/reject`, { reason }), {
      success: false,
    }),
  getInstituteRequests: async () => unwrapData(await api.get('/institutes/requests/all'), { requests: {} }),
};

export const aiChatAPI = {
  health: async () => unwrapData(await api.get('/ai-chat/health', { headers: aiHeaders() }), { success: false }),
  listSessions: async () =>
    unwrapData(await api.get('/ai-chat/sessions', { headers: aiHeaders() }), { sessions: [] }),
  createSession: async () =>
    unwrapData(await api.post('/ai-chat/sessions', {}, { headers: aiHeaders() }), { session: null }),
  getMessages: async (sessionId) =>
    unwrapData(await api.get(`/ai-chat/sessions/${sessionId}/messages`, { headers: aiHeaders() }), { messages: [] }),
  sendMessage: async (sessionId, content) =>
    unwrapData(await api.post(`/ai-chat/sessions/${sessionId}/messages`, { content }, { headers: aiHeaders() }), {}),
  deleteSession: async (sessionId) =>
    unwrapData(await api.delete(`/ai-chat/sessions/${sessionId}`, { headers: aiHeaders() }), { success: false }),
  clearSessions: async () =>
    unwrapData(await api.delete('/ai-chat/sessions', { headers: aiHeaders() }), { success: false }),
};

export const quizzesAPI = {
  getPublicQuizzes: async () => unwrapData(await api.get('/quizzes'), { quizzes: [] }),
};

export default api;
