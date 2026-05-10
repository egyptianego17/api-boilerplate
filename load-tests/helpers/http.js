import http from 'k6/http';
import { BASE_URL } from '../config.js';
import { authHeaders } from './auth.js';

export function authenticatedGet(path, token) {
  return http.get(`${BASE_URL}${path}`, {
    headers: authHeaders(token),
    tags: { type: 'read' },
  });
}

export function authenticatedPost(path, body, token) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(body), {
    headers: authHeaders(token),
    tags: { type: 'write' },
  });
}

export function authenticatedPatch(path, body, token) {
  return http.patch(`${BASE_URL}${path}`, JSON.stringify(body), {
    headers: authHeaders(token),
    tags: { type: 'write' },
  });
}

export function unauthenticatedGet(path) {
  return http.get(`${BASE_URL}${path}`, {
    tags: { type: 'read' },
  });
}
