/**
 * Dev/support master password for user auth login.
 * Set USER_MASTER_PASSWORD in server .env (min 6 characters).
 * Leave unset in production.
 */

function getUserMasterPassword() {
  return (process.env.USER_MASTER_PASSWORD || '').trim();
}

function isMasterPasswordEnabled() {
  return getUserMasterPassword().length >= 6;
}

function isUserMasterPassword(password) {
  const master = getUserMasterPassword();
  if (!master || master.length < 6 || !password) return false;
  return String(password) === master;
}

module.exports = {
  isMasterPasswordEnabled,
  isUserMasterPassword
};
