# Deploying MetalWorks on a VM (on another PC)

Target: a VirtualBox VM running **Ubuntu Server 24.04 LTS** with **Docker Compose** (4 containers: `web` nginx, `api` Node, `db` PostgreSQL, optional `ollama`).
The app is reachable from the host PC's browser at `http://<VM_IP>`.

```
Windows PC (host) ── browser ──▶ http://VM_IP
   └── VirtualBox VM: Ubuntu 24.04
         └── docker compose
               web  (nginx :80)  ── /api, /uploads ──▶ api (Node :8080) ──▶ db (Postgres :5432)
                                                        └──▶ LLM (Groq/Gemini over internet, or ollama container)
```

---

## Part A — Prepare on THIS PC (development PC)

1. Finish P4-01 and P4-02 (Claude Code tasks). Commit everything in both repos.
2. In the frontend repo, run in PowerShell:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\deploy\make-release.ps1
   ```
   This creates `release\metalworks-release-<date>.zip` containing `backend/`, `frontend/`, `docker-compose.yml`, `.env.example`, `scripts/`, `README-DEPLOY.md`.
3. Put on a USB stick (or cloud drive):
   - the release zip
   - the Ubuntu Server 24.04 LTS ISO (ubuntu.com/download/server, about 3 GB)
   - the VirtualBox 7.x installer for Windows (virtualbox.org)
   - your LLM API key (Groq or Gemini) in a text file, if you use the cloud assistant
4. (Optional but recommended) If you have Docker Desktop here, test the zip once with `docker compose up -d --build`. Every problem you catch here is one you won't hit on demo day.

## Part B — On the OTHER PC

### Requirements
- Windows 10/11, **virtualization enabled in BIOS** (Intel VT-x / AMD-V). Check: Task Manager → Performance → CPU → "Virtualization: Enabled".
- Free RAM: 4 GB for the VM (8 GB if you run Ollama locally). Free disk: 40 GB.
- **Internet during setup.** The first build downloads Docker images and npm packages.

### 1. Install VirtualBox
Run the installer with the defaults. If Windows has Hyper-V/WSL enabled, VirtualBox still works but slower. That's fine.

### 2. Create the VM
VirtualBox → New:
- Name `metalworks`, ISO = Ubuntu Server ISO, tick **Skip Unattended Installation**.
- Memory **4096 MB** (8192 for Ollama), CPUs **2** (4 for Ollama).
- Disk **30 GB** VDI, dynamically allocated.

Then Settings → Network → Adapter 1. Choose one mode:
- **Bridged Adapter** (recommended): pick the PC's active Wi-Fi/Ethernet card. The VM gets its own IP on the network, so the host and other devices can open it.
- **NAT + port forwarding** (use this if bridged gets no IP, which is common on school/eduroam Wi-Fi): Advanced → Port Forwarding → add `http TCP host 8080 → guest 80` and `ssh TCP host 2222 → guest 22`. Then the app is at `http://localhost:8080` on the host.

### 3. Install Ubuntu Server
Start the VM and accept the defaults, except:
- Profile: name `metalworks`, server name `metalworks`, username `metalworks`, a password you'll remember.
- **Tick "Install OpenSSH server"**.
- Featured snaps: select none.

At the end: Reboot. If asked, remove the ISO (Devices → Optical drives → Remove disk).

### 4. Find the VM's IP and connect over SSH (easier than typing in the VM window)
In the VM console:
```bash
ip -4 addr show | grep inet        # e.g. 192.168.1.47 (bridged) or 10.0.2.15 (NAT)
```
From Windows PowerShell on the host:
```powershell
ssh metalworks@192.168.1.47          # bridged
ssh -p 2222 metalworks@localhost      # NAT
```
Optional, bridged only: give the VM a fixed IP so it never changes. Edit `/etc/netplan/50-cloud-init.yaml`:
```yaml
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: false
      addresses: [192.168.1.200/24]
      routes: [{ to: default, via: 192.168.1.1 }]
      nameservers: { addresses: [1.1.1.1, 8.8.8.8] }
```
Then run `sudo netplan apply`. Use your own network's gateway and a free address.

### 5. Install Docker
```bash
sudo apt-get update && sudo apt-get -y upgrade
sudo apt-get install -y ca-certificates curl unzip
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER && exit     # log in again over SSH afterwards
docker run --rm hello-world               # should print "Hello from Docker!"
```

### 6. Copy the release into the VM
From Windows PowerShell on the host, in the folder that has the zip:
```powershell
scp .\metalworks-release-<date>.zip metalworks@192.168.1.47:~        # bridged
scp -P 2222 .\metalworks-release-<date>.zip metalworks@localhost:~   # NAT
```
In the VM:
```bash
unzip metalworks-release-*.zip -d ~/ && cd ~/metalworks-release
```

### 7. Configure
```bash
./scripts/generate-env.sh      # creates .env with random secrets, asks for the VM IP
nano .env                       # check the values, add the LLM key, set SEED_ADMIN_PASSWORD
```
Key values:

| Variable | Value |
|---|---|
| `CORS_ORIGIN` | `same-origin` (works whatever the IP is) |
| `FRONTEND_URL` | `http://<VM_IP>` (only used in email links) |
| `SEED_ON_START` | `true` for the first start (seed is idempotent, so you can leave it) |
| `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY` | Groq or Gemini values. Leave empty to disable the assistant |

### 8. Start
```bash
docker compose up -d --build        # first time: 5–15 min
docker compose ps                   # db, api, web should be "running (healthy)"
docker compose logs -f api          # Ctrl+C to quit; look for "Metal HR API listening"
```

### 9. Firewall
```bash
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw --force enable
```

### 10. Test
On the host browser, open `http://<VM_IP>` (bridged) or `http://localhost:8080` (NAT). Then:
- Log in with `admin` and your `SEED_ADMIN_PASSWORD`, or a demo account (`Demo@1234`).
- Check the dashboard, open a machine, upload an image, ask the assistant a question.

### 11. Offline assistant (optional, if there's no internet on demo day)
```bash
docker compose --profile ai-local up -d
./scripts/pull-ollama-model.sh qwen2.5:3b       # about 2 GB download, do it while you still have internet
# .env → LLM_BASE_URL=http://ollama:11434/v1  LLM_MODEL=qwen2.5:3b  LLM_API_KEY=ollama
docker compose up -d api
```
Expect 10–40 s per answer on CPU. Test it before the demo.

### 12. Make it demo-proof
- Containers restart automatically (`restart: unless-stopped`), and Docker starts at boot.
- **Take a VirtualBox snapshot** once everything works: Machine → Take Snapshot → "demo-ready". If anything breaks, restore it.
- Backup the database: `./scripts/backup-db.sh` (writes `backups/*.sql.gz`).
- To start the VM without its window: right-click the VM → Start → Headless Start.

---

## Alternative: move a finished VM as an .ova file
If you build the VM on one PC and want it on another:
1. Shut the VM down. File → **Export Appliance** → OVF 2.0 → `metalworks.ova`.
2. On the other PC: File → **Import Appliance**. In MAC Address Policy, choose **Generate new MAC addresses for all network adapters**.
3. Settings → Network → Bridged → select that PC's network card. Start the VM. The IP will be different (`ip -4 addr`).
   Because `CORS_ORIGIN=same-origin`, nothing else needs to change. Optionally update `FRONTEND_URL` in `.env`, then `docker compose up -d`.

---

## Troubleshooting
| Symptom | Fix |
|---|---|
| VM won't start: "VT-x is not available" | Enable virtualization in BIOS. Or disable "Memory Integrity" (Core Isolation) in Windows Security |
| Bridged VM has no IP | Use NAT + port forwarding (step 2) |
| Browser can't reach `http://VM_IP` | `docker compose ps`; `sudo ufw status`; ping the VM from the host; try `curl localhost` inside the VM |
| Page loads but login fails with a network error | `docker compose logs api`; check `DATABASE_URL` uses host `db` |
| "Origin not allowed" | `CORS_ORIGIN=same-origin` in `.env`, then `docker compose up -d api` |
| api keeps restarting | `docker compose logs api`. Usually a missing/short JWT secret (≥32 chars) or a migration error |
| Images don't show | Check the nginx `/uploads/` proxy and the `uploads` volume: `docker compose exec api ls /app/uploads/machines` |
| Assistant says unavailable | Check the LLM key/URL; test internet in the VM: `curl -I https://api.groq.com` |
| Build fails while downloading | The VM has no internet: check the network adapter, or use NAT |
| Reset everything (deletes data!) | `docker compose down -v && docker compose up -d --build` |

## Demo-day checklist
- [ ] VM restored from the "demo-ready" snapshot, started 10 minutes before
- [ ] `docker compose ps` all healthy
- [ ] Logged in once with each demo account
- [ ] Assistant answered one question (cloud) or Ollama was warmed up with one question
- [ ] Backup of the DB plus the release zip on a USB stick
