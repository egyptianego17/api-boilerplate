import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { OWNER_EMAIL, PASSWORD, ERROR_THRESHOLDS } from '../config.js';
import { login } from '../helpers/auth.js';
import { authenticatedGet } from '../helpers/http.js';
import {
  fetchSiteIds,
  fetchActionIds,
  fetchChecklistIds,
  fetchDepartmentIds,
  fetchTeamIds,
} from '../helpers/data.js';

const siteListDuration = new Trend('site_list_duration', true);
const actionListDuration = new Trend('action_list_duration', true);
const detailDuration = new Trend('detail_duration', true);

export const options = {
  vus: 30,
  duration: '10m',
  thresholds: {
    'http_req_duration{type:read}': ['p(95)<500'],
    site_list_duration: ['p(95)<500'],
    action_list_duration: ['p(95)<400'],
    detail_duration: ['p(95)<300'],
    ...ERROR_THRESHOLDS,
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

  // Site list
  let res = authenticatedGet('/sites', token);
  check(res, { 'sites list 200': (r) => r.status === 200 });
  siteListDuration.add(res.timings.duration);

  // Action list
  if (siteIds.length > 0) {
    res = authenticatedGet(`/sites/${randomItem(siteIds)}/actions`, token);
    check(res, { 'actions list 200': (r) => r.status === 200 });
    actionListDuration.add(res.timings.duration);
  }

  // Detail endpoints (random pick)
  const detailEndpoints = [];
  if (siteIds.length > 0) detailEndpoints.push(`/sites/${randomItem(siteIds)}`);
  if (actionIds.length > 0)
    detailEndpoints.push(`/actions/${randomItem(actionIds)}`);
  if (checklistIds.length > 0)
    detailEndpoints.push(`/checklists/${randomItem(checklistIds)}`);
  if (departmentIds.length > 0)
    detailEndpoints.push(`/departments/${randomItem(departmentIds)}`);
  if (teamIds.length > 0) detailEndpoints.push(`/teams/${randomItem(teamIds)}`);

  if (detailEndpoints.length > 0) {
    res = authenticatedGet(randomItem(detailEndpoints), token);
    check(res, { 'detail 200': (r) => r.status === 200 });
    detailDuration.add(res.timings.duration);
  }

  sleep(1 + Math.random() * 2);
}
