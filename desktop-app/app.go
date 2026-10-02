package main

import (
	"context"
	"os"

	"desktop-app/network"
	"desktop-app/security"
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

	// 1. Load or Generate Cryptographic Identity
	pubKey, err := security.LoadOrGenerateIdentity()
	if err == nil {
		a.myPublicKey = pubKey
	}

	// 2. Start mDNS Broadcast
	go func() {
		server, err := network.StartBroadcasting(hostname, 8080)
		if err != nil {
			println("Failed to start mDNS broadcast:", err.Error())
		}
		a.networkServer = server
	}()
}

func (a *App) GetLocalHostname() string {
	hostname, err := os.Hostname()
	if err != nil {
		return "Unknown-Device"
	}
	return hostname
}

// Network functions
func (a *App) DiscoverNetworkDevices() []network.Device {
	devices, err := network.Discover(3)
	if err != nil {
		return []network.Device{}
	}
	return devices
}

// Security functions exposed to React
func (a *App) GetPairedDevices() []security.PairedDevice {
	return security.GetPairedDevices()
}

func (a *App) PairWithDevice(device security.PairedDevice) error {
	return security.SavePairedDevice(device)
}