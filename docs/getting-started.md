# Getting Started

This guide walks you through setting up and running the NATS UI Template for the first time.

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Minimum Version | Check Command |
|-------------|-----------------|---------------|
| Node.js | 20.x | `node --version` |
| npm | 10.x | `npm --version` |
| Git | 2.x | `git --version` |
| Docker (optional) | 20.x | `docker --version` |

**NATS Server**: You'll need access to a NATS server with WebSocket support. You can either:
- Use a local NATS server (covered below)
- Connect to an existing NATS infrastructure

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/nats-ui-template.git
cd nats-ui-template
```

## Step 2: Install Dependencies

Navigate to the React application directory and install dependencies:

```bash
cd react
npm install
```

This installs all required packages including:
- `@nats-io/nats-core` - NATS JavaScript client
- `@nats-io/nkeys` - NKey authentication support
- `react`, `react-dom` - React framework
- `react-router-dom` - Client-side routing
- `dexie` - IndexedDB wrapper
- Development tools (Vite, TypeScript, ESLint, etc.)

## Step 3: Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your NATS server details:

```bash
# NATS server WebSocket URL
# For local development:
VITE_NATS_URL=ws://localhost:4222

# For production (use wss://):
# VITE_NATS_URL=wss://nats.example.com:9443

# Namespace for NATS subjects (optional, default: app)
VITE_NATS_NAMESPACE=app

# Authentication type: "credsfile" (default) or "userpass"
VITE_AUTH_TYPE=credsfile
```

**Important**: Always use `wss://` (secure WebSocket) in production environments.

## Step 4: Start NATS Server (Local Development)

If you don't have an existing NATS server, start one locally using Docker:

```bash
# Start NATS with WebSocket and JetStream enabled
docker run -d \
  --name nats \
  -p 4222:4222 \
  -p 8222:8222 \
  nats:latest \
  -js \
  --http_port 8222
```

**Port Reference:**
- `4222` - NATS client connections (including WebSocket)
- `8222` - HTTP monitoring interface

Verify the server is running:

```bash
# Check container status
docker ps | grep nats

# View NATS monitoring
curl http://localhost:8222/varz
```

### Alternative: Install NATS Locally

If you prefer not to use Docker:

```bash
# macOS with Homebrew
brew install nats-server

# Start with JetStream
nats-server -js
```

## Step 5: Create Test Credentials (Optional)

For credential file authentication, you'll need a `.creds` file. If your NATS server uses operator/account model:

```bash
# Using the nsc tool (NATS account management)
nsc add user --name testuser --account MYACCOUNT
nsc generate creds --account MYACCOUNT --name testuser > testuser.creds
```

The `.creds` file contains your JWT and NKey seed for authentication.

For username/password authentication, configure your NATS server with users and set `VITE_AUTH_TYPE=userpass`.

## Step 6: Run Development Server

Start the Vite development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

You should see the login page with an option to upload credentials or enter username/password.

## Step 7: Verify Setup

### Connection Test

1. Open `http://localhost:5173` in your browser
2. Upload your `.creds` file or enter username/password
3. Click "Connect"

**Expected Result**: You should see the dashboard with:
- Connection status showing "Connected"
- User information (from `$SYS.REQ.USER.INFO`)
- No error messages

### Check Browser Console

Open browser developer tools (F12) and check the console. You should see:
- "NATS connection established" or similar
- No error messages

### Verify State Sync

1. Open the application in two browser tabs
2. Make a change in one tab (e.g., update profile)
3. The other tab should reflect the change automatically

## Troubleshooting Quick Reference

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| "Connection refused" | NATS server not running | Start NATS server (Step 4) |
| "Authentication failed" | Invalid credentials | Verify .creds file or username/password |
| "WebSocket error" | Wrong URL protocol | Use `ws://` for local, `wss://` for production |
| "Invalid credential file" | Malformed .creds | Regenerate credentials with nsc |
| "CORS error" | Browser security | Ensure NATS allows WebSocket connections |

For detailed troubleshooting, see [Troubleshooting Guide](./troubleshooting.md).

## Available Scripts

Run these commands from the `react/` directory:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |

## Project Structure

After setup, your project should look like this:

```
nats-ui-template/
├── react/
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # NATS and storage services
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilities
│   ├── .env                # Your environment config
│   ├── .env.example        # Example config
│   └── package.json
└── docs/                   # Documentation
```

See [Project Structure](./project-structure.md) for detailed file descriptions.

## Next Steps

Now that you have the template running:

1. **Understand the Architecture**: Read [Architecture Overview](./architecture.md) to understand how components interact
2. **Learn NATS Concepts**: Review [NATS Fundamentals](./concepts/nats-fundamentals.md) for messaging patterns
3. **Explore Authentication**: See [Authentication](./concepts/authentication.md) for credential options
4. **Build Features**: Use [State Management](./concepts/state-management.md) to add new functionality
5. **API Reference**: Check [Quick Reference](./quick-reference.md) for hook and type details

## Example: Your First Feature

Here's a minimal example of adding a feature that subscribes to notifications:

```tsx
import { useAppState } from '@/hooks/useAppState';
import { useEventSubscription } from '@/hooks/useEventSubscription';

function NotificationBadge() {
  const { unreadNotificationCount } = useAppState();

  // Optional: React to new notifications
  useEventSubscription('notification.received', (event) => {
    console.log('New notification:', event.payload.title);
  });

  return (
    <span className="badge">
      {unreadNotificationCount}
    </span>
  );
}
```

## Getting Help

- **Documentation Issues**: Check [Troubleshooting](./troubleshooting.md)
- **NATS Questions**: See [NATS Fundamentals](./concepts/nats-fundamentals.md)
- **Code Patterns**: Review [Best Practices](./best-practices/security.md)
