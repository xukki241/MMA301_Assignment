# Windows Setup Notes

Specific instructions and known issues for running the LMS platform on Windows.

---

## Use `pnpm.cmd` Instead of `pnpm`

If PowerShell blocks the `pnpm` command due to execution policy, use `pnpm.cmd`:

```powershell
pnpm.cmd install
pnpm.cmd --filter core-api run seed:mongo
pnpm.cmd dev
pnpm.cmd seed
```

Or permanently allow scripts (run PowerShell as Administrator):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## MongoDB Port 27017 Conflict

### Problem

On Windows, if MongoDB is installed as a system service, it listens on `127.0.0.1:27017` before Docker can bind to that port.

The Docker container appears to start correctly, but all connections to `localhost:27017` route to the **Windows MongoDB Service**, not the Docker container.

**Symptoms:**
- `pnpm seed` reports success but data is not visible in Compass under `lms-db`
- Compass connects to `localhost:27017` but shows only `admin`, `config`, `local`
- `use lms-db; show collections` returns empty in Compass shell

### Diagnosis

```powershell
# Check what is listening on port 27017
netstat -ano | findstr ":27017"

# Check the MongoDB Windows service status
Get-Service -Name MongoDB
```

If you see **two PIDs** both with `LISTENING` on 27017, a conflict exists.

### Fix

1. Open `services.msc` (press `Win + R`, type `services.msc`, press Enter)
2. Find **MongoDB Server (MongoDB)** in the list
3. Right-click → **Stop**
4. Right-click → **Properties**
5. Set Startup type to **Disabled**
6. Click **OK**

Verify the fix:

```powershell
Get-Service -Name MongoDB
# Status: Stopped

netstat -ano | findstr ":27017"
# Should show only Docker process after running: docker compose up -d mongodb
```

Re-run the seed after fixing:

```powershell
pnpm.cmd seed
```

### Re-enabling for other projects

If you need the Windows MongoDB service again later:

1. Open `services.msc`
2. Find **MongoDB Server (MongoDB)**
3. Properties → Startup type: **Manual** or **Automatic**
4. Right-click → **Start**
5. Stop the Docker MongoDB container first to avoid conflicts:

```bash
docker compose stop mongodb
```

---

## Docker Desktop on Windows

### WSL 2 backend (recommended)

Docker Desktop on Windows uses WSL 2 by default. Ensure WSL 2 is installed:

```powershell
wsl --install
wsl --set-default-version 2
```

### File sharing

If Docker containers cannot read project files, ensure the drive is shared in Docker Desktop:

Settings → Resources → File Sharing → Add `C:\` (or your project drive)

### Port mapping on Windows

Docker port mappings bind to `0.0.0.0` on Windows, making ports accessible on `localhost` and the machine's IP. No extra configuration needed.

---

## MongoDB Compass on Windows

### Connecting after stopping the Windows MongoDB service

After stopping the Windows service, Docker will own port 27017.

1. Open Compass
2. Connection string: `mongodb://localhost:27017`
3. Click **Connect**
4. Sidebar should show `lms-db` with all 23 collections

### If Compass still shows old data

Disconnect and reconnect in Compass to refresh the connection.

### Compass shell — use lms-db

After opening the MongoDB shell tab in Compass:

```js
use lms-db
show collections
db.stats()
```

---

## PowerShell Command Reference

```powershell
# Start infrastructure
docker compose up -d mongodb redis localstack mock-cognito

# Seed MongoDB
pnpm.cmd seed
# or
pnpm.cmd --filter core-api run seed:mongo

# Verify seed
docker exec mma301_assignment-mongodb-1 mongosh "mongodb://localhost:27017/lms-db" --eval "db.stats()"

# Start all dev services
pnpm.cmd dev

# Check ports in use
netstat -ano | findstr ":27017"
netstat -ano | findstr ":3001"
netstat -ano | findstr ":3002"

# Check Docker containers
docker compose ps

# Stop Docker stack
docker compose down

# Full reset
docker compose down -v
```

---

## Required Ports

Ensure these ports are free before starting the stack:

| Port | Service |
|---|---|
| 80 | nginx |
| 3000 | admin-web |
| 3001 | auth-service |
| 3002 | core-api |
| 4566 | localstack |
| 5432 | postgres *(optional)* |
| 5050 | pgadmin *(optional)* |
| 6379 | redis |
| 9229 | mock-cognito |
| 27017 | mongodb |
| 50051 | auth gRPC |
| 50052 | notification gRPC |

Check if a port is in use:

```powershell
netstat -ano | findstr ":<PORT>"
# Example
netstat -ano | findstr ":3002"
```

Find and kill a process by PID:

```powershell
# Get PID from netstat output, then:
taskkill /PID <PID> /F
```
