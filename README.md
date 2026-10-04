# VEDA LAN Explorer

VEDA LAN Explorer is a Windows-oriented desktop application for browsing files on the local computer and on discovered VEDA devices on the same local network. It also displays local machine resource usage and compares local and remote folder manifests to report which files appear newer or exist on only one side.

The application is in [`desktop-app/`](./desktop-app/). It combines a Go backend and a React/TypeScript frontend in a Wails desktop window.

## What is implemented

- **Local system dashboard:** displays the host name, CPU usage, RAM used/total, and disk used/total. The UI requests updated statistics every two seconds.
- **Local file explorer:** lists available disk roots and lets you navigate directories, with folders sorted before files.
- **LAN device discovery:** advertises the application as the `_veda._tcp` mDNS service and scans for that service for three seconds when you choose **Scan Network**.
- **Paired-device list:** saves discovered device host name, IP address, and port to a local JSON file. A saved device can be selected to browse its shared file API.
- **Remote file browsing and transfers:** lists remote roots and directories, downloads individual files, and uploads one selected file into the current remote directory.
- **Folder comparison:** compares file paths and modification timestamps from a local and a remote manifest, then labels files for upload, download, or no action. This is a comparison/report only; it does **not** transfer or synchronize files automatically.
- **Headless agent:** an optional Go command-line process advertises a VEDA service and starts the same file API on port `8081`, without the desktop UI.

## How it works

### Application components

| Component | Implementation |
| --- | --- |
| Desktop shell | [Wails v2](https://wails.io/) embeds the built frontend and exposes Go methods to it. |
| Frontend | React 19, TypeScript, and Vite. The interface has Dashboard, Files, Project Sync, Devices, and Settings views. |
| Backend | Go modules provide file-system operations, system statistics, mDNS discovery/advertising, local JSON persistence, and an HTTP API. |
| System metrics | `gopsutil` reads CPU, virtual-memory, disk-usage, and partition information. |
| Device discovery | `grandcat/zeroconf` advertises and browses the `_veda._tcp` service on the `local.` mDNS domain. |

The desktop app starts its HTTP API and advertises the device on port `8080`. The headless agent uses port `8081`. The API currently provides:

| Route | Purpose |
| --- | --- |
| `GET /api/stats` | Return host system statistics. |
| `GET /api/fs/roots` | Return available file-system roots. |
| `GET /api/fs/list?path=...` | List a directory. |
| `GET /api/fs/download?path=...` | Serve a file for download. |
| `GET /api/fs/manifest?path=...` | Return a recursive directory manifest for comparison. |
| `POST /api/fs/upload?path=...` | Accept a multipart form field named `file` and write it to the target directory. |

Manifests contain each item's relative path, size, modification time, and directory flag. The comparison currently uses relative paths and modification times to produce its file actions; file size is included in the manifest but is not used to decide which copy is newer. Directories are not shown as transfer actions.

## Requirements

- Go `1.25` (the version declared in [`desktop-app/go.mod`](./desktop-app/go.mod))
- Node.js and npm (the frontend build uses Vite)
- Wails CLI v2
- On Windows, the Wails desktop build prerequisites, including WebView2 and a C/C++ toolchain

Install the Wails CLI at the version used by the project:

```powershell
go install github.com/wailsapp/wails/v2/cmd/wails@v2.16.0
```

Ensure the Go `bin` directory is on your `PATH` so the `wails` command is available.

## Run the desktop application

From PowerShell, at the repository root:

```powershell
cd .\desktop-app
wails dev
```

Wails uses the frontend install/build commands configured in [`desktop-app/wails.json`](./desktop-app/wails.json). The UI opens in the Wails desktop window. On first run, open **Devices** and select **Scan Network** to look for other devices advertising `_veda._tcp`.

To create a production build:

```powershell
cd .\desktop-app
wails build
```

Wails places the build output under `desktop-app/build/bin/`.

## Run the headless agent

The headless agent exposes the HTTP API and mDNS service without launching the desktop UI:

```powershell
cd .\desktop-app
go run .\cmd\agent
```

It announces itself as `<computer-hostname>-Agent` on port `8081`. Stop it with `Ctrl+C`. The agent is useful when a device should provide the API but does not need the GUI.

## Using device browsing and comparison

1. Run the desktop application (or the headless agent) on the devices you want to use.
2. In the desktop app, use **Devices** → **Scan Network** to discover VEDA services.
3. Choose **Pair Device** to save a discovered device locally. Paired devices appear in the list and can be opened with **Browse Files**.
4. In the remote file view, navigate to a directory to upload a file there, or use the download button beside a file to download it.
5. In **Project Sync**, enter a local directory, choose a paired device, enter a remote directory, and choose **Compare Directories**. Review the reported file actions; transfers must be performed separately.

## Local state and network access

The backend reads and writes `veda_identity.json` and `veda_paired.json` relative to the process's current working directory. The identity file contains a generated Ed25519 key pair. The paired-device file stores device host names, IP addresses, and ports.

The API's current access check accepts loopback requests and requests whose source IP matches an entry in that process's paired-device file. Pairing stores the discovered device locally; it does not perform a reciprocal pairing handshake. The API does not currently use the Ed25519 key for request authentication, and it does not configure TLS. Use it only on a network you trust; it is not an Internet-facing or cryptographically authenticated file-sharing service.

## Project layout

```text
desktop-app/
├── api/             HTTP file and statistics API
├── cmd/agent/       Headless agent entry point
├── fs/              Local file browsing and manifest generation
├── network/         mDNS advertising and discovery
├── security/        Identity and paired-device JSON persistence
├── system/          Host resource statistics
└── frontend/        React/TypeScript UI
```