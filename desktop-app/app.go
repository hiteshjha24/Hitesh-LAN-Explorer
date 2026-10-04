package main

import (
	"context"
	"os"

	"desktop-app/network"
	"desktop-app/security"
	"desktop-app/fs"
	"desktop-app/api"
	"desktop-app/system" // Import the new system module

	"github.com/grandcat/zeroconf"
)

type App struct {
	ctx           context.Context
	networkServer *zeroconf.Server
	myPublicKey   string
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	hostname := a.GetLocalHostname()

	pubKey, err := security.LoadOrGenerateIdentity()
	if err == nil {
		a.myPublicKey = pubKey
	}

	// 1. Start broadcasting this device on the network
	go func() {
		server, err := network.StartBroadcasting(hostname, 8080)
		if err != nil {
			println("Failed to start mDNS broadcast:", err.Error())
		}
		a.networkServer = server 
	}()

	// 2. Start the secure LAN API Server to listen for paired devices
	api.StartServer("8080")
}

func (a *App) GetLocalHostname() string {
	hostname, err := os.Hostname()
	if err != nil {
		return "Unknown-Device"
	}
	return hostname
}

func (a *App) DiscoverNetworkDevices() []network.Device {
	devices, err := network.Discover(3)
	if err != nil {
		return []network.Device{}
	}
	return devices
}

func (a *App) GetPairedDevices() []security.PairedDevice {
	return security.GetPairedDevices()
}

func (a *App) PairWithDevice(device security.PairedDevice) error {
	return security.SavePairedDevice(device)
}

// NEW: Expose System Stats to React
func (a *App) GetSystemStats() system.SystemStats {
	return system.GetStats()
}

func (a *App) GetRootPaths() []fs.FileNode {
	return fs.GetRootPaths()
}

func (a *App) ListDirectory(path string) ([]fs.FileNode, error) {
	return fs.ListDirectory(path)
}

// NEW: Generate local folder manifest for Sync comparison
func (a *App) GenerateLocalManifest(path string) ([]fs.ManifestItem, error) {
	return fs.GenerateManifest(path)
}