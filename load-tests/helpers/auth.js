import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from '../config.js';

export function login(email, password) {
  const payload = JSON.stringify({
    email,
    password,
    sessionId: 'k6-load-test-session',
  });

  const res = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'auth' },
  });

  check(res, {
    'login status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });

  const body = res.json();

  return {
    token: body.accessToken.token,
    refreshToken: body.refreshToken,
    sessionId: body.sessionId,
  };
}

export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
