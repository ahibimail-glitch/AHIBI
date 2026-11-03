const assert = require('node:assert/strict');
const test = require('node:test');
const { validationResult } = require('express-validator');
const heroImageButtonValidation = require('../utils/heroImageButtonValidation');

const validateBody = async (body) => {
  const request = { body };

  for (const validator of heroImageButtonValidation()) {
    await validator.run(request);
  }

  return validationResult(request).array();
};

test('accepts site-relative and HTTPS booking destinations for upload and update', async () => {
  for (const buttonUrl of ['/events/123', '/events/daily/abc', 'https://ahibi.in/events/123']) {
    assert.deepEqual(await validateBody({ buttonText: 'Book tickets', buttonUrl }), []);
  }
});

test('allows an empty booking URL to remove the button', async () => {
  assert.deepEqual(await validateBody({ buttonText: '', buttonUrl: '' }), []);
});

test('rejects unsafe booking URL formats for upload and update', async () => {
  for (const buttonUrl of ['javascript:alert(1)', '//example.com/events/123', '/\\\\example.com/events/123']) {
    const errors = await validateBody({ buttonUrl });
    assert.ok(errors.some((error) => error.path === 'buttonUrl'), `should reject ${buttonUrl}`);
  }
});

test('limits the button label to 40 characters', async () => {
  const errors = await validateBody({ buttonText: 'B'.repeat(41), buttonUrl: '/events/123' });
  assert.ok(errors.some((error) => error.path === 'buttonText'));
});
