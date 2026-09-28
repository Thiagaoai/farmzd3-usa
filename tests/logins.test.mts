import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adminLogins, matchBasicAuth, matchLogin } from '../lib/auth/logins.ts';

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const keys = ['ADMIN_DASHBOARD_USER', 'ADMIN_DASHBOARD_PASSWORD', 'ADMIN_DASHBOARD_USER_2', 'ADMIN_DASHBOARD_PASSWORD_2'];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try {
    run();
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test('Thiago and Bruna each log in with their own password', () => {
  withEnv(
    { ADMIN_DASHBOARD_USER: 'thiago', ADMIN_DASHBOARD_PASSWORD: 'pass-one', ADMIN_DASHBOARD_USER_2: 'bruna', ADMIN_DASHBOARD_PASSWORD_2: 'pass-two' },
    () => {
      assert.equal(adminLogins().length, 2);
      assert.equal(matchLogin('thiago', 'pass-one'), 'thiago');
      assert.equal(matchLogin('Bruna ', 'pass-two'), 'bruna');
      assert.equal(matchLogin('bruna', 'pass-one'), null);
      assert.equal(matchLogin('thiago', 'pass-two'), null);
      assert.equal(matchBasicAuth(`Basic ${btoa('bruna:pass-two')}`), 'bruna');
      assert.equal(matchBasicAuth('Basic %%%'), null);
    },
  );
});

test('a single login still works and empty pairs are ignored', () => {
  withEnv({ ADMIN_DASHBOARD_USER: 'bruna', ADMIN_DASHBOARD_PASSWORD: 'only', ADMIN_DASHBOARD_USER_2: 'thiago' }, () => {
    assert.equal(adminLogins().length, 1);
    assert.equal(matchLogin('bruna', 'only'), 'bruna');
    assert.equal(matchLogin('thiago', ''), null);
  });
});
