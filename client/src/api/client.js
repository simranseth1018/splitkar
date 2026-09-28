async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    headers,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Auth
export const googleLogin = (credential) => request('/auth/google', { method: 'POST', body: { credential } });
export const devLogin = (name, email) => request('/auth/dev-login', { method: 'POST', body: { name, email } });
export const getMe = () => request('/auth/me');

// Groups
export const getGroups = () => request('/groups');
export const createGroup = (name) => request('/groups', { method: 'POST', body: { name } });
export const getGroup = (id) => request(`/groups/${id}`);
export const deleteGroup = (id) => request(`/groups/${id}`, { method: 'DELETE' });

// Members
export const getMembers = (groupId) => request(`/groups/${groupId}/members`);
export const addMember = (groupId, name, phone, email) => request(`/groups/${groupId}/members`, { method: 'POST', body: { name, phone, email } });
export const updateMember = (groupId, id, data) => request(`/groups/${groupId}/members/${id}`, { method: 'PATCH', body: data });
export const removeMember = (groupId, id) => request(`/groups/${groupId}/members/${id}`, { method: 'DELETE' });

// Expenses
export const getExpenses = (groupId, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();
  return request(`/groups/${groupId}/expenses${qs ? '?' + qs : ''}`);
};
export const createExpense = (groupId, data) => request(`/groups/${groupId}/expenses`, { method: 'POST', body: data });
export const getExpense = (groupId, id) => request(`/groups/${groupId}/expenses/${id}`);
export const updateExpense = (groupId, id, data) => request(`/groups/${groupId}/expenses/${id}`, { method: 'PUT', body: data });
export const deleteExpense = (groupId, id) => request(`/groups/${groupId}/expenses/${id}`, { method: 'DELETE' });

// Settlements
export const getBalances = (groupId) => request(`/groups/${groupId}/settlements/balances`);
export const getSettlements = (groupId) => request(`/groups/${groupId}/settlements`);
export const recordSettlement = (groupId, data) => request(`/groups/${groupId}/settlements`, { method: 'POST', body: data });
export const deleteSettlement = (groupId, id) => request(`/groups/${groupId}/settlements/${id}`, { method: 'DELETE' });
export const getStats = (groupId) => request(`/groups/${groupId}/settlements/stats`);

// Notifications
export const getNotifications = () => request('/notifications');
export const markNotificationRead = (id) => request(`/notifications/${id}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () => request('/notifications/read-all', { method: 'POST' });

// Invites
export const createInviteLink = (groupId) => request(`/groups/${groupId}/invite`, { method: 'POST' });
export const getInviteInfo = (code) => request(`/invite/${code}`);
export const acceptInvite = (code) => request(`/invite/${code}`, { method: 'POST' });
