# Auth Module

Complete authentication system with Redux state management.

## Files

- **types.ts** - TypeScript interfaces for auth
- **authApi.ts** - API service for auth endpoints
- **authSlice.ts** - Redux slice for auth state
- **authThunks.ts** - Async thunks for auth actions
- **pages/** - Auth pages (LoginPage, SignupPage)

## Usage

### Using the useAuth Hook

```tsx
import { useAuth } from "@/hooks/useAuth";

const MyComponent = () => {
  const { user, loading, error, login, logout, isAuthenticated } = useAuth();

  const handleLogin = async () => {
    const result = await login({
      email: "user@example.com",
      password: "password123",
    });
    
    if (result.type === "auth/login/fulfilled") {
      // Login successful
      debugLog("Logged in!");
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.name}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
};
```

## API Endpoints

The auth module expects these endpoints on your backend:

- `POST /auth/login` - Login with email and password
- `POST /auth/signup` - Sign up with email, password, and name
- `POST /auth/logout` - Logout user
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user info

## Response Format

All auth endpoints should return:

```json
{
  "access_token": "jwt_token_here",
  "refresh_token": "refresh_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": "avatar_url",
    "role": "user"
  }
}
```

## Features

✅ Login/Signup with Redux state management
✅ Automatic token storage in localStorage
✅ Token refresh on 401 errors
✅ Automatic logout on token expiration
✅ Error handling and display
✅ Loading states
✅ TypeScript support
✅ Protected routes ready

## Next Steps

1. Update LoginPage.tsx to use the useAuth hook
2. Update SignupPage.tsx to use the useAuth hook
3. Create ProtectedRoute component for route protection
4. Add token refresh interceptor to axios
