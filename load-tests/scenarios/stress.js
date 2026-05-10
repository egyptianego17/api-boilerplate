import { check, sleep } from 'k6';
import { OWNER_EMAIL, PASSWORD } from '../config.js';
import { login } from '../helpers/auth.js';
import { authenticatedGet } from '../helpers/http.js';
import {
  fetchSiteIds,
  fetchActionIds,
  fetchChecklistIds,
  fetchDepartmentIds,
  fetchTeamIds,
} from '../helpers/data.js';

export const options = {
  stages: [
    { duration: '1m', target: 25 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '1m', target: 150 },
    { duration: '1m', target: 200 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration{type:read}': ['p(95)<5000'],
    http_req_failed: ['rate<0.10'],
  },
};

export function setup() {
  const { token } = login(OWNER_EMAIL, PASSWORD);

  const siteIds = fetchSiteIds(token);
  const firstSiteId = siteIds.length > 0 ? siteIds[0] : null;
  const actionIds = firstSiteId ? fetchActionIds(firstSiteId, token) : [];
  const checklistIds = firstSiteId ? fetchChecklistIds(firstSiteId, token) : [];
  const departmentIds = fetchDepartmentIds(token);
  const teamIds = fetchTeamIds(token);

  return { token, siteIds, actionIds, checklistIds, departmentIds, teamIds };
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function (data) {
  const { token, siteIds, actionIds, checklistIds, departmentIds, teamIds } =
    data;

  const endpoints = [];

  endpoints.push('/sites');
  if (siteIds.length > 0) {
    endpoints.push(`/sites/${randomItem(siteIds)}`);
    endpoints.push(`/sites/${randomItem(siteIds)}/actions`);
    endpoints.push(`/sites/${randomItem(siteIds)}/checklists`);
  }
  if (actionIds.length > 0) endpoints.push(`/actions/${randomItem(actionIds)}`);
  if (checklistIds.length > 0)
    endpoints.push(`/checklists/${randomItem(checklistIds)}`);
  if (departmentIds.length > 0) {
    endpoints.push('/departments');
    endpoints.push(`/departments/${randomItem(departmentIds)}`);
  }
  if (teamIds.length > 0) {
    endpoints.push('/teams');
    endpoints.push(`/teams/${randomItem(teamIds)}`);
  }

  const endpoint = randomItem(endpoints);
  const res = authenticatedGet(endpoint, token);
  check(res, { 'status is 200': (r) => r.status === 200 });

  sleep(0.5 + Math.random() * 1);
}
