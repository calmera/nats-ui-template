# Troubleshooting

This guide helps you resolve common issues when working with the NATS UI Template.

## Connection Issues

### "Connection refused" or "Failed to connect"

**Symptoms:**
- Connection status shows "failed"
- Browser console shows "WebSocket connection failed"
- Error code: `CONNECTION_REFUSED`

**Causes:**
1. NATS server is not running
2. Wrong server URL
3. Firewall blocking connection

**Solutions:**

1. **Verify NATS server is running:**
   ```bash
   # If using Docker
   docker ps | grep nats

   # If running locally
   pgrep nats-server
   ```

2. **Check server URL in `.env`:**
   ```bash
   # For local development
   VITE_NATS_URL=ws://localhost:4222

   # Note: Port 4222 is the default NATS client port
   ```

3. **Test connectivity:**
   ```bash
   # Using curl (HTTP monitoring port)
   curl http://localhost:8222/varz

   # Using nats CLI
   nats server info
   ```

4. **Check Docker networking (if applicable):**
   ```bash
   docker logs nats
   ```

### "WebSocket connection failed" or Protocol Errors

**Symptoms:**
- Connection fails immediately
- Console shows "Invalid frame" or "Protocol error"

**Causes:**
1. Using `http://` instead of `ws://` or `wss://`
2. NATS server doesn't have WebSocket enabled
3. Using wrong port

**Solutions:**

1. **Use correct protocol:**
   ```bash
   # Local development
   VITE_NATS_URL=ws://localhost:4222

   # Production (always use wss://)
   VITE_NATS_URL=wss://nats.example.com:443
   ```

2. **Verify WebSocket is enabled on NATS server:**
   NATS v2.2+ enables WebSocket by default on the client port (4222).

3. **Check if a separate WebSocket port is configured:**
   If your NATS server uses a dedicated WebSocket port, update accordingly:
   ```bash
   VITE_NATS_URL=ws://localhost:9222
   ```

### "Connection timeout"

**Symptoms:**
- Connection hangs then fails
- Error code: `CONNECTION_TIMEOUT`

**Causes:**
1. Network latency or instability
2. Server overloaded
3. DNS resolution issues

**Solutions:**

1. **Check network connectivity:**
   ```bash
   ping nats.example.com
   ```

2. **Try increasing timeout:**
   The default timeout is configured in the NatsService. For debugging, you can temporarily increase it.

3. **Check server health:**
   ```bash
   curl http://localhost:8222/healthz
   ```

## Authentication Errors

### "Authentication failed" or "Invalid credentials"

**Symptoms:**
- Connection established but immediately closed
- Error code: `AUTH_FAILED`
- Console shows "Authorization Violation"

**Causes:**
1. Invalid or expired JWT
2. Wrong NKey seed
3. User not authorized for the account

**Solutions:**

1. **Regenerate credentials:**
   ```bash
   nsc generate creds --account ACCOUNT --name USER > new.creds
   ```

2. **Verify credential file format:**
   A valid `.creds` file should contain:
   ```
   -----BEGIN NATS USER JWT-----
   eyJ0eXAiOiJKV1QiLCJhbGciOiJlZDI1NTE5...
   ------END NATS USER JWT------

   ************************* IMPORTANT *************************
   NKEY Seed printed below can be used to sign and prove identity.
   ...

   -----BEGIN USER NKEY SEED-----
   SUAM...
   ------END USER NKEY SEED------
   ```

3. **Check JWT expiration:**
   ```bash
   nsc describe user --account ACCOUNT --name USER
   ```

4. **For username/password auth:**
   - Verify username and password are correct
   - Check NATS server configuration for user definitions

### "Credential parse error" or "Invalid credential file"

**Symptoms:**
- Error shown immediately after file selection
- Error code: `INVALID_CREDENTIAL`

**Causes:**
1. File is not a valid .creds format
2. File is corrupted
3. File encoding issues

**Solutions:**

1. **Verify file content:**
   Open the file in a text editor and check it matches the expected format (see above).

2. **Check for hidden characters:**
   ```bash
   cat -A your.creds | head -5
   ```

3. **Regenerate the credential file:**
   ```bash
   nsc generate creds --account ACCOUNT --name USER > fresh.creds
   ```

4. **Ensure UTF-8 encoding:**
   The file should be plain text with no BOM (byte order mark).

### "Permission denied" Errors

**Symptoms:**
- Authentication succeeds but operations fail
- Error code: `PERMISSION_DENIED`

**Causes:**
1. User lacks publish/subscribe permissions
2. Subject namespace mismatch

**Solutions:**

1. **Check user permissions:**
   ```bash
   nsc describe user --account ACCOUNT --name USER
   ```

2. **Verify subject patterns match:**
   Ensure the user has permissions for subjects like:
   - `{namespace}.events.>`
   - `{namespace}.cmd.>`
   - `$SYS.REQ.USER.INFO`

## State Sync Problems

### State not updating after events

**Symptoms:**
- UI doesn't reflect changes
- `syncStatus` stuck on "syncing"
- State shows old values

**Causes:**
1. Event subscription not active
2. Reducer not handling event type
3. IndexedDB storage issue

**Solutions:**

1. **Verify subscription is active:**
   Check browser console for subscription messages. You should see events being received.

2. **Check EventContext provider:**
   Ensure your component is wrapped with `EventContextProvider`:
   ```tsx
   <EventContextProvider>
     <YourComponent />
   </EventContextProvider>
   ```

3. **Force refresh state:**
   ```tsx
   const { refreshState } = useAppState();
   await refreshState();
   ```

4. **Clear IndexedDB and reconnect:**
   In browser DevTools > Application > IndexedDB, delete the `nats-state` database.

### "State is stale" indicator showing

**Symptoms:**
- Yellow/orange staleness indicator
- `isStale` returns true
- State data appears outdated

**Causes:**
1. Disconnected from NATS
2. Events not being received
3. Time since last sync exceeds threshold

**Solutions:**

1. **Check connection status:**
   ```tsx
   const { status } = useNatsConnection();
   console.log('Connection status:', status);
   ```

2. **Manually refresh:**
   ```tsx
   const { refreshState } = useAppState();
   await refreshState();
   ```

3. **Verify network connectivity:**
   Check browser Network tab for WebSocket connection status.

## Cross-Tab Issues

### Tabs showing different state

**Symptoms:**
- Changes in one tab don't appear in another
- Tabs show conflicting data

**Causes:**
1. BroadcastChannel not working
2. Different IndexedDB databases
3. Tabs on different origins

**Solutions:**

1. **Verify same origin:**
   All tabs must be on the exact same origin (protocol + host + port).

2. **Check BroadcastChannel support:**
   ```javascript
   console.log('BroadcastChannel supported:', typeof BroadcastChannel !== 'undefined');
   ```

3. **Force state reload:**
   Each tab can manually refresh from IndexedDB:
   ```tsx
   const { refreshState } = useAppState();
   await refreshState();
   ```

### Logout not syncing across tabs

**Symptoms:**
- Logging out in one tab doesn't affect others
- Other tabs remain connected

**Causes:**
1. `CREDENTIAL_CLEARED` message not being sent
2. Tab not listening for sync messages

**Solutions:**

1. **Use the disconnect function:**
   Always use `useAuth().disconnect()` which broadcasts the logout:
   ```tsx
   const { disconnect } = useAuth();
   await disconnect(true); // true = clear stored credentials
   ```

2. **Check useConnectionSync hook:**
   Ensure the hook is being used in your app's root component.

## Build and Development Issues

### Node.js version errors

**Symptoms:**
- npm install fails
- Syntax errors in node_modules
- "Unsupported engine" warnings

**Solutions:**

1. **Check Node.js version:**
   ```bash
   node --version
   # Should be v20.x or later
   ```

2. **Use nvm to switch versions:**
   ```bash
   nvm install 20
   nvm use 20
   ```

3. **Clear npm cache and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm cache clean --force
   npm install
   ```

### TypeScript compilation errors

**Symptoms:**
- Red squiggles in IDE
- Build fails with type errors

**Solutions:**

1. **Restart TypeScript server:**
   In VS Code: Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server"

2. **Check tsconfig.json:**
   Ensure path aliases are configured:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

3. **Rebuild node_modules:**
   ```bash
   rm -rf node_modules
   npm install
   ```

### Vite dev server not starting

**Symptoms:**
- Port already in use
- Module resolution errors

**Solutions:**

1. **Kill process on port 5173:**
   ```bash
   lsof -ti:5173 | xargs kill -9
   ```

2. **Clear Vite cache:**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

3. **Check for conflicting dependencies:**
   ```bash
   npm ls
   ```

## Environment Variable Issues

### Environment variables not loading

**Symptoms:**
- `import.meta.env.VITE_NATS_URL` is undefined
- Application uses wrong values

**Solutions:**

1. **Ensure `.env` file exists:**
   ```bash
   ls -la .env
   ```

2. **Use correct prefix:**
   All client-side environment variables must start with `VITE_`:
   ```bash
   VITE_NATS_URL=ws://localhost:4222  # Correct
   NATS_URL=ws://localhost:4222       # Won't work
   ```

3. **Restart dev server:**
   Environment changes require a server restart:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

## Getting More Help

If you're still having issues:

1. **Check browser console** for detailed error messages
2. **Enable verbose logging** in NatsService for connection debugging
3. **Review NATS server logs** for server-side errors
4. **Check [NATS Fundamentals](./concepts/nats-fundamentals.md)** for messaging concepts
5. **See [Architecture](./architecture.md)** for system component understanding
