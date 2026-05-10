export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const OWNER_EMAIL = __ENV.OWNER_EMAIL || 'owner@example.com';
export const PASSWORD = __ENV.PASSWORD || 'Admin@123';

export const READ_THRESHOLDS = {
  'http_req_duration{type:read}': ['p(95)<500'],
};

export const WRITE_THRESHOLDS = {
  'http_req_duration{type:write}': ['p(95)<1000'],
};

export const ERROR_THRESHOLDS = {
  http_req_failed: ['rate<0.01'],
};
