import { authenticatedGet } from './http.js';

export function fetchSiteIds(token) {
  const res = authenticatedGet('/sites?take=10', token);
  const body = res.json();
  return (body.data || []).map((s) => s.id);
}

export function fetchActionIds(siteId, token) {
  const res = authenticatedGet(`/sites/${siteId}/actions?take=20`, token);
  const body = res.json();
  return (body.data || []).map((a) => a.id);
}

export function fetchChecklistIds(siteId, token) {
  const res = authenticatedGet(`/sites/${siteId}/checklists?take=20`, token);
  const body = res.json();
  return (body.data || []).map((c) => c.id);
}

export function fetchDepartmentIds(token) {
  const res = authenticatedGet('/departments?take=20', token);
  const body = res.json();
  return (body.data || []).map((d) => d.id);
}

export function fetchTeamIds(token) {
  const res = authenticatedGet('/teams?take=20', token);
  const body = res.json();
  return (body.data || []).map((t) => t.id);
}
