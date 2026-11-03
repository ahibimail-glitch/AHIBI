const { body } = require('express-validator');

const isSafeButtonUrl = (value) => {
  if (value === '') return true;
  if (typeof value !== 'string') return false;

  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) {
    return true;
  }

  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.host);
  } catch {
    return false;
  }
};

module.exports = () => [
  body('buttonText')
    .optional()
    .trim()
    .isLength({ max: 40 })
    .withMessage('Button label must be 40 characters or fewer'),
  body('buttonUrl')
    .optional()
    .trim()
    .custom(isSafeButtonUrl)
    .withMessage('Button URL must be a site path or an http(s) URL'),
];
