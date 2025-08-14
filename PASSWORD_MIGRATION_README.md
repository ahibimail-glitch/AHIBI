# Password Authentication Migration Guide

This document outlines the migration from OTP-only authentication to password-based authentication while maintaining OTP as a fallback option.

## Overview

The system now supports both password-based and OTP-based authentication methods:

- **Password-based login**: Primary method for users who have set passwords
- **OTP-based login**: Fallback method for users without passwords or when password is forgotten
- **Mixed authentication**: System automatically detects which method to use based on user's account state

## What Changed

### 1. User Model Updates

- Added `passwordHash` field to store hashed passwords (defaults to `null`)
- Maintained backward compatibility with existing `password` field
- Added new methods for password management

### 2. New Authentication Routes

- `POST /api/auth/check-user` - Check if user exists and has password
- `POST /api/auth/login` - Password-based login
- `POST /api/auth/setup-password` - Set password after OTP verification
- Existing OTP routes remain unchanged

### 3. Frontend Updates

- Login form now includes password field
- Password setup modal for new users
- Automatic fallback to OTP when password is not set

## Authentication Flow

### Login Flow
1. **Step 1**: User enters phone number
2. **Step 2a**: If user has password → Ask for password → Login
3. **Step 2b**: If user has no password → Send OTP → Verify OTP → Show password setup dialog

### Signup Flow
1. Fill signup form
2. Verify phone with OTP
3. **NEW**: Set password (required)
4. Account created and logged in

## API Endpoints

### Check User Existence
```http
POST /api/auth/check-user
Content-Type: application/json

{
  "phone": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exists": true,
    "hasPassword": true,
    "phone": "1234567890"
  }
}
```

### Password Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "1234567890",
  "password": "userpassword"
}
```

### Setup Password
```http
POST /api/auth/setup-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "newpassword"
}
```

### OTP Verification (Updated Response)
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "1234567890",
  "otp": "123456"
}
```

**Response now includes:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "needsPasswordSetup": true, // New field
    "user": { ... }
  }
}
```

## Frontend Components

### Password Setup Modal
- Automatically appears after OTP verification for users without passwords
- Required for new signups
- Optional for existing users (can skip)

### Login Form
- **Step 1**: Phone number input
- **Step 2a**: Password input (if user has password)
- **Step 2b**: OTP input (if user has no password)
- Automatic detection of authentication method

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt with salt rounds of 10
2. **Secure Storage**: `passwordHash` field is excluded from queries by default
3. **Validation**: Password must be at least 6 characters long
4. **Fallback Security**: OTP remains as secure fallback authentication

## User Experience Flow

### New User Signup
1. Fill signup form
2. Verify phone with OTP
3. **NEW**: Set password (required)
4. Account created and logged in

### Existing User Login (With Password)
1. Enter phone number
2. System detects password exists
3. Enter password
4. Direct login

### Existing User Login (No Password)
1. Enter phone number
2. System detects no password
3. Receive OTP via SMS
4. Verify OTP
5. Show password setup modal
6. User can set password or skip

## Testing the Migration

### 1. Test New Signup Flow
```bash
# Create new user account
# Should see password setup modal after OTP verification
```

### 2. Test Existing User Login (No Password)
```bash
# Enter phone number
# Should automatically send OTP
# After OTP verification, should see password setup modal
```

### 3. Test Existing User Login (With Password)
```bash
# Enter phone number
# Should ask for password
# Direct login if credentials are correct
```

## Monitoring and Analytics

Track these metrics during migration:

1. **Password Adoption Rate**: Percentage of users who set passwords
2. **Login Method Usage**: Password vs OTP login frequency
3. **Password Setup Completion**: Success rate of password setup flow
4. **Fallback Usage**: How often users fall back to OTP

## Future Considerations

### Phase Out OTP (Optional)
When ready to remove OTP authentication:

1. Remove OTP-related routes and controllers
2. Remove OTP fields from User model
3. Update frontend to remove OTP options
4. Ensure all users have passwords set

### Password Reset
Consider implementing password reset functionality:

1. Send reset link via email/SMS
2. Allow users to set new password without OTP
3. Maintain security with time-limited reset tokens

## Troubleshooting

### Common Issues

1. **Password not being set**: Check if `passwordHash` field exists in User model
2. **OTP still required**: Ensure `needsPasswordSetup` logic is working
3. **User check failing**: Verify the `check-user` endpoint is working

### Debug Mode

Enable debug logging in auth controller to see authentication flow:

```javascript
console.log('User auth method:', user.hasPasswordAuth());
console.log('Needs password setup:', !user.hasPasswordAuth());
```

## Rollback Plan

If issues arise, the system can be rolled back:

1. Remove password-related routes
2. Revert User model changes
3. Frontend will fall back to OTP-only authentication
4. No data loss - existing OTP functionality remains intact

## Support

For technical support during migration:

1. Check server logs for authentication errors
2. Verify database schema updates
3. Test with sample user accounts
4. Monitor API response patterns

---

**Migration Status**: ✅ Complete  
**Last Updated**: $(date)  
**Version**: 1.0.0
