import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:5202';

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const targets = [
    `${BASE_URL}/`,
    `${BASE_URL}/api/health`,
    `${BASE_URL}/api/ready`,
  ];

  for (const url of targets) {
    const response = http.get(url, {
      headers: { Accept: 'application/json,text/html;q=0.9,*/*;q=0.8' },
      timeout: '5s',
    });

    check(response, {
      'status 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
    });
  }

  sleep(1);
}
