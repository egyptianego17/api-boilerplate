import { check, sleep } from 'k6';
import {
  OWNER_EMAIL,
  PASSWORD,
  READ_THRESHOLDS,
  ERROR_THRESHOLDS,
} from '../config.js';
import { login } from '../helpers/auth.js';
import { authenticatedGet, unauthenticatedGet } from '../helpers/http.js';
import {
  fetchSiteIds,
  fetchActionIds,
  fetchChecklistIds,
  fetchDepartmentIds,
  fetchTeamIds,
} from '../helpers/data.js';

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    ...READ_THRESHOLDS,
    ...ERROR_THRESHOLDS,
  },
};

export function setup() {
  const { token } = login(OWNER_EMAIL, PASSWORD);

  const siteIds = fetchSiteIds(token);
  const actionIds = siteIds.length > 0 ? fetchActionIds(siteIds[0], token) : [];
  const checklistIds =
    siteIds.length > 0 ? fetchChecklistIds(siteIds[0], token) : [];
  const departmentIds = fetchDepartmentIds(token);
  const teamIds = fetchTeamIds(token);

  return { token, siteIds, actionIds, checklistIds, departmentIds, teamIds };
}

export default function (data) {
  const { token, siteIds, actionIds, checklistIds, departmentIds, teamIds } =
    data;

  // Health endpoints
  let res = unauthenticatedGet('/health');
  check(res, { 'health returns 200': (r) => r.status === 200 });

  res = unauthenticatedGet('/health/liveness');
  check(res, { 'liveness returns 200': (r) => r.status === 200 });

  res = unauthenticatedGet('/health/readiness');
  check(res, { 'readiness returns 200': (r) => r.status === 200 });

  // Auth
  res = authenticatedGet('/auth/me', token);
  check(res, { 'auth/me returns 200': (r) => r.status === 200 });

  // Sites
  res = authenticatedGet('/sites', token);
  check(res, { 'sites list returns 200': (r) => r.status === 200 });

  if (siteIds.length > 0) {
    res = authenticatedGet(`/sites/${siteIds[0]}`, token);
    check(res, { 'site detail returns 200': (r) => r.status === 200 });
  }

  // Actions
  if (siteIds.length > 0) {
    res = authenticatedGet(`/sites/${siteIds[0]}/actions`, token);
    check(res, { 'actions list returns 200': (r) => r.status === 200 });
  }

  if (actionIds.length > 0) {
    res = authenticatedGet(`/actions/${actionIds[0]}`, token);
    check(res, { 'action detail returns 200': (r) => r.status === 200 });
  }

  // Checklists
  if (siteIds.length > 0) {
    res = authenticatedGet(`/sites/${siteIds[0]}/checklists`, token);
    check(res, { 'checklists list returns 200': (r) => r.status === 200 });
  }

  if (checklistIds.length > 0) {
    res = authenticatedGet(`/checklists/${checklistIds[0]}`, token);
    check(res, { 'checklist detail returns 200': (r) => r.status === 200 });
  }

  // Departments
  res = authenticatedGet('/departments', token);
  check(res, { 'departments list returns 200': (r) => r.status === 200 });

  if (departmentIds.length > 0) {
    res = authenticatedGet(`/departments/${departmentIds[0]}`, token);
    check(res, { 'department detail returns 200': (r) => r.status === 200 });
  }

  // Teams
  res = authenticatedGet('/teams', token);
  check(res, { 'teams list returns 200': (r) => r.status === 200 });

  if (teamIds.length > 0) {
    res = authenticatedGet(`/teams/${teamIds[0]}`, token);
    check(res, { 'team detail returns 200': (r) => r.status === 200 });
  }

  sleep(1);
}
