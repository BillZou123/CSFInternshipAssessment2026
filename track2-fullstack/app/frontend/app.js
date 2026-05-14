const API_BASE = '/api';

async function readResponseBody(res) {
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return res.json();
  }

  return res.text();
}

async function request(path, options = {}) {
  const res = await fetch(API_BASE + path, options);
  const body = await readResponseBody(res);

  if (!res.ok) {
    const message = body && typeof body === 'object' && body.error
      ? body.error
      : `${options.method || 'GET'} ${path} failed: ${res.status}`;
    throw new Error(message);
  }

  return body;
}

const api = {
  async get(path) {
    return request(path);
  },
  async post(path, body) {
    return request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  async put(path, body) {
    return request(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  async delete(path) {
    return request(path, { method: 'DELETE' });
  },
};
