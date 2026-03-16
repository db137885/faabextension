const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  getLeagues: () => request('/leagues'),
  getLeague: (id) => request(`/leagues/${id}`),
  createLeague: (data) => request('/leagues', { method: 'POST', body: JSON.stringify(data) }),
  importData: (id, data) => request(`/leagues/${id}/import`, { method: 'POST', body: JSON.stringify(data) }),
  generateRecommendations: (id) => request(`/leagues/${id}/recommendations`, { method: 'POST' }),
  getRecommendations: (id) => request(`/leagues/${id}/recommendations`),
  recordResult: (recId, data) => request(`/recommendations/${recId}/result`, { method: 'POST', body: JSON.stringify(data) }),
};
