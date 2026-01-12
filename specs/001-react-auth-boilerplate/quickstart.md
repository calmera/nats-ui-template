# Quickstart: React NATS Authentication Boilerplate

**Date**: 2026-01-12 | **Branch**: `001-react-auth-boilerplate`

## Overview

This guide covers setup, configuration, and customization of the React NATS authentication boilerplate.

---

## Prerequisites

- **Node.js**: 18.x or later
- **npm**: 9.x or later (or pnpm/yarn)
- **NATS Server**: With WebSocket support enabled
- **Credential File**: Valid `.creds` file from your NATS administrator

---

## Quick Setup

### 1. Clone and Install

```bash
# Navigate to the react folder
cd react

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` with your NATS server URL:

```env
# NATS server WebSocket URL (use wss:// in production)
VITE_NATS_URL=wss://your-nats-server.example.com:9443
```

### 3. Start Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### 4. Authenticate

1. Navigate to the authentication page
2. Upload your `.creds` file
3. You're connected!

---

## Project Structure

```
react/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ConnectionStatus.tsx   # Connection state indicator
│   │   ├── CredentialUpload.tsx   # File upload component
│   │   └── ProtectedRoute.tsx     # Route guard component
│   ├── contexts/             # React Context providers
│   │   ├── AuthContext.tsx        # Auth state management
│   │   └── NatsContext.tsx        # NATS connection context
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts             # Auth operations hook
│   │   ├── useNatsConnection.ts   # Connection management
│   │   └── useConnectionSync.ts   # Cross-tab sync hook
│   ├── pages/                # Route components
│   │   ├── HomePage.tsx           # Public landing page
│   │   ├── AuthPage.tsx           # Credential upload page
│   │   └── DashboardPage.tsx      # Protected content
│   ├── services/             # Business logic services
│   │   ├── nats/                  # NATS connection services
│   │   ├── credentials/           # Credential parsing/storage
│   │   └── sync/                  # Tab synchronization
│   ├── utils/                # Utility functions
│   ├── App.tsx               # Root component with routes
│   └── main.tsx              # Application entry point
├── tests/                    # Test suites
├── .env.example              # Environment template
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_NATS_URL` | Yes | - | NATS server WebSocket URL |

### NATS Connection Options

Customize connection behavior in `src/services/nats/connection.ts`:

```typescript
const connectionOptions = {
  // Reconnection settings
  reconnect: true,
  maxReconnectAttempts: -1,        // -1 = unlimited
  reconnectTimeWait: 2000,          // Initial wait (ms)
  reconnectJitter: 100,             // Jitter for non-TLS
  reconnectJitterTLS: 1000,         // Jitter for TLS

  // Timeouts
  timeout: 20000,                   // Connection timeout (ms)
  pingInterval: 120000,             // Ping frequency (ms)
  maxPingOut: 2,                    // Pings before stale
};
```

### Credential Storage Options

Customize storage in `src/services/credentials/storage.ts`:

```typescript
const storageOptions = {
  dbName: "NATSCredentials",
  storeName: "credentials",
  iterations: 100000,               // PBKDF2 iterations
};
```

---

## Customization Points

### Adding New Routes

1. Create page component in `src/pages/`:

```typescript
// src/pages/SettingsPage.tsx
export function SettingsPage() {
  return <div>Settings Content</div>;
}
```

2. Add route in `src/App.tsx`:

```typescript
import { SettingsPage } from "./pages/SettingsPage";

// In the Routes component
<Route
  path="/settings"
  element={
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  }
/>
```

### Customizing Authentication UI

Modify `src/pages/AuthPage.tsx` and `src/components/CredentialUpload.tsx` to match your design.

### Adding NATS Messaging

Use the NATS connection in components:

```typescript
import { useNatsConnection } from "../hooks/useNatsConnection";

function MyComponent() {
  const { connection, publish, subscribe } = useNatsConnection();

  const sendMessage = async () => {
    await publish("my.subject", { data: "hello" });
  };

  useEffect(() => {
    const sub = subscribe("other.subject", (msg) => {
      console.log("Received:", msg);
    });
    return () => sub.unsubscribe();
  }, []);

  return <button onClick={sendMessage}>Send</button>;
}
```

### Styling

The boilerplate uses Tailwind CSS. Customize in `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Add custom colors
        brand: {
          primary: "#0066cc",
          secondary: "#00cc66",
        },
      },
    },
  },
};
```

---

## Security Considerations

### Production Checklist

- [ ] Use `wss://` (secure WebSocket) for NATS connection
- [ ] Configure CSP headers in your web server/CDN
- [ ] Enable HTTPS for the React application
- [ ] Review NATS credential permissions (principle of least privilege)
- [ ] Set appropriate credential expiration in NATS
- [ ] Test with production credentials in staging environment

### Content Security Policy

Recommended CSP headers for production:

```
Content-Security-Policy:
  default-src 'self';
  connect-src 'self' wss://your-nats-server.example.com:9443;
  script-src 'self';
  style-src 'self' 'unsafe-inline';
```

### Credential Security

- Credentials are encrypted at rest using AES-256-GCM
- Private key (seed) never leaves the browser
- Clear credentials on logout (IndexedDB wiped)
- Session timeout recommended for sensitive applications

---

## Testing

### Run Tests

```bash
# Unit tests
npm run test

# E2E tests (requires running dev server)
npm run test:e2e

# Test coverage
npm run test:coverage
```

### Test Structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── credentials.test.ts    # Credential parsing tests
│   │   └── storage.test.ts        # Storage encryption tests
│   └── hooks/
│       └── useAuth.test.ts        # Auth hook tests
├── integration/
│   └── auth-flow.test.ts          # Auth component tests
└── e2e/
    ├── auth.spec.ts               # Authentication E2E
    └── navigation.spec.ts         # Route protection E2E
```

---

## Troubleshooting

### Common Issues

**Connection Refused**
- Verify NATS server is running with WebSocket enabled
- Check `VITE_NATS_URL` uses correct port (usually 9443, not 4222)
- Ensure firewall allows WebSocket connections

**Authentication Failed**
- Verify `.creds` file is valid (not expired)
- Check credential has appropriate permissions
- Ensure server accepts credential-based auth

**Credential Upload Not Working**
- Verify file is a valid `.creds` format
- Check browser console for parsing errors
- Try re-downloading credential from NATS admin

**Cross-Tab Sync Not Working**
- Safari < 15.1 doesn't support BroadcastChannel
- Check for browser extensions blocking API
- Verify same origin for all tabs

### Debug Mode

Enable verbose logging:

```typescript
// In development, add to main.tsx
if (import.meta.env.DEV) {
  localStorage.setItem("nats-debug", "true");
}
```

---

## Building for Production

```bash
# Build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

### Deployment

The build outputs static files to `dist/`. Deploy to any static hosting:

- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy --prod`
- **Static hosting**: Upload `dist/` contents

### Environment Variables in Production

For Vite, environment variables must be prefixed with `VITE_`:

```bash
# Build with production NATS URL
VITE_NATS_URL=wss://prod-nats.example.com:443 npm run build
```

---

## Next Steps

1. **Customize UI** - Update styles and branding
2. **Add Features** - Build on the authenticated connection
3. **Configure Permissions** - Work with NATS admin on credential scopes
4. **Set Up CI/CD** - Automate testing and deployment
5. **Monitor** - Set up connection health monitoring

---

## Resources

- [NATS Documentation](https://docs.nats.io/)
- [@nats-io/nats-core on npm](https://www.npmjs.com/package/@nats-io/nats-core)
- [Synadia Cloud](https://www.synadia.com/cloud)
- [React Router Documentation](https://reactrouter.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
