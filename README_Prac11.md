# Practical 11: Containerization with Docker and Docker Compose

**Course Outcome / Program Outcome:** CO5 / PO3, PO5  
**Module:** Full-Stack Containerization & Multi-Container Service Orchestration

---

## 1. Objective

To containerize the complete full-stack Task Management application (React Frontend, Node.js/Express Backend, and MongoDB Database) using Docker and orchestrate all services seamlessly using Docker Compose so that the complete stack launches with a single command:
```bash
docker compose up --build
```

---

## 2. Architecture & Networking Diagram

```
                 HOST MACHINE (Browser: http://localhost:5173)
                                      │
                                      ▼
                        ┌───────────────────────────┐
                        │    docker-compose.yml     │
                        └─────────────┬─────────────┘
                                      │
                ══════════════ Docker Bridge Network: app-network ══════════════
               │                                                                │
    ┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
    │       frontend       │        │       backend        │        │       mongodb        │
    │  (React Vite Build)  │───────►│    (Node/Express)    │───────►│   (Official Mongo)   │
    │  Container Port 5173 │  HTTP  │ Container Port 5000  │ Mongoose Container Port 27017 │
    │    Host: 5173        │        │      Host: 5000      │        │     Host: 27017      │
    └──────────────────────┘        └──────────────────────┘        └──────────┬───────────┘
                                                                               │
                                                                    ┌──────────▼───────────┐
                                                                    │ Named Volume:        │
                                                                    │ mongo-data:/data/db  │
                                                                    └──────────────────────┘
```

- **Frontend:** Serves React production preview build on port `5173`.
- **Backend:** Node.js Express API running on port `5000`. Connected to MongoDB via internal service name `mongodb://mongodb:27017/taskdb`.
- **MongoDB:** Official MongoDB container storing data in named volume `mongo-data` for data persistence.
- **Network:** `app-network` (Docker bridge) providing automatic DNS resolution between containers using service names.

---

## 3. Key Questions & In-Depth Technical Analysis

### Q1: Why does the backend container need to reference the MongoDB container by its service name (`mongodb`) rather than `localhost`?
* **Analysis:** In Docker, each container has its own isolated network namespace with its own loopback interface (`localhost` / `127.0.0.1`). If the backend container attempts to connect to `mongodb://localhost:27017`, it searches for MongoDB inside its *own* container filesystem, where MongoDB is not running.
* When containers are attached to a user-defined Docker bridge network (e.g., `app-network`), Docker provides built-in DNS resolution. The service name defined in `docker-compose.yml` (`mongodb`) is automatically resolved to the MongoDB container's internal IP address. Therefore, the connection URI must be `mongodb://mongodb:27017/taskdb`.

### Q2: What is the difference between `EXPOSE` in a Dockerfile and the `ports` mapping in `docker-compose.yml`?
* **`EXPOSE` (Dockerfile):**
  * Acts as internal documentation and metadata indicating which port the application inside the image listens on.
  * It does **not** publish the port to the host machine. Outside traffic cannot reach the container via host ports simply by exposing them.
* **`ports` (docker-compose.yml):**
  * Actually configures Docker's port-forwarding (`HOST_PORT:CONTAINER_PORT`).
  * Maps traffic from the host machine (e.g., host `5173` or host `5000`) into the internal container port, allowing users to access services via `http://localhost:5173` and `http://localhost:5000` in their web browser.

### Q3: Why is it considered bad practice to copy `node_modules` into a Docker image instead of running `npm install` inside the container?
* **Binary Incompatibility (Architecture/OS mismatch):** Native binary dependencies (such as `bcrypt` or precompiled bindings) compiled on the host OS (e.g., Windows x64 or macOS ARM64) will fail or crash inside a Linux-based Docker container.
* **Build Context Bloat & Slowness:** `node_modules` often contains tens of thousands of files and hundreds of megabytes. Copying `node_modules` over the Docker daemon socket drastically slows down the build context transfer.
* **Clean Layer Caching:** By copying only `package*.json` first and executing `RUN npm install`, Docker caches the installed dependencies in an image layer. Code modifications will only invalidate subsequent `COPY . .` layers, making rebuilds take seconds instead of minutes.

---

## 4. Implementation Details

### 4.1 Backend Dockerfile (`backend/Dockerfile`)
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json .npmrc* ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

### 4.2 Backend Dockerignore (`backend/.dockerignore`)
```
node_modules
.env
npm-debug.log
package-lock.json
```

### 4.3 Frontend Dockerfile (`frontend/Dockerfile`)
```dockerfile
FROM node:18 AS build
WORKDIR /app
COPY package*.json .npmrc* ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host"]
```

### 4.4 Frontend Dockerignore (`frontend/.dockerignore`)
```
node_modules
dist
npm-debug.log
.env
package-lock.json
```

### 4.5 Orchestration (`docker-compose.yml`)
```yaml
services:
  mongodb:
    image: mongo:latest
    container_name: mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    networks:
      - app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - MONGO_URI=mongodb://mongodb:27017/taskdb
      - JWT_SECRET=pr9_super_secret_jwt_key_2026_spec
      - JWT_EXPIRES_IN=1h
    depends_on:
      - mongodb
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: frontend
    restart: unless-stopped
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:5000
    depends_on:
      - backend
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  mongo-data:
```

---

## 5. Execution & Verification

### Step 1: Start the Entire Application Stack
```bash
docker compose up --build -d
```

### Step 2: Confirm All Containers are Running
```bash
docker ps
```
Expected output shows 3 running containers:
- `frontend` (Port `0.0.0.0:5173->5173/tcp`)
- `backend` (Port `0.0.0.0:5000->5000/tcp`)
- `mongodb` (Port `0.0.0.0:27017->27017/tcp`)

### Step 3: Test End-to-End
- **Frontend Web UI:** Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Backend API Health:** `curl http://localhost:5000/` returns `{"status":"Backend running","version":"PR10"}`.
- **Database Persistence:** Create tasks via the UI, run `docker compose down`, followed by `docker compose up -d`, and verify that all tasks remain intact in the database.

### Step 4: Stop the Stack
```bash
docker compose down
```
*(To remove volumes as well: `docker compose down -v`)*
