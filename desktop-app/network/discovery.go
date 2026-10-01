package network

import (
	"context"
	"time"

	"github.com/grandcat/zeroconf"
)

// Device represents a VEDA device found on the LAN
type Device struct {
	Hostname string `json:"hostname"`
	IP       string `json:"ip"`
	Port     int    `json:"port"`
}

// StartBroadcasting announces this device to the local network
func StartBroadcasting(hostname string, port int) (*zeroconf.Server, error) {
	// Register a service _veda._tcp on the local network
	server, err := zeroconf.Register(hostname, "_veda._tcp", "local.", port, []string{"txtv=1"}, nil)
	if err != nil {
		return nil, err
	}
	return server, nil
}

// Discover scans the network for a specific number of seconds
func Discover(timeoutSeconds int) ([]Device, error) {
	resolver, err := zeroconf.NewResolver(nil)
	if err != nil {
		return nil, err
	}

	entries := make(chan *zeroconf.ServiceEntry)
	var devices []Device

	// Background goroutine to collect discovered devices
	go func(results <-chan *zeroconf.ServiceEntry) {
		for entry := range results {
			ip := ""
			if len(entry.AddrIPv4) > 0 {
				ip = entry.AddrIPv4[0].String()
			}
			devices = append(devices, Device{
				Hostname: entry.Instance,
				IP:       ip,
				Port:     entry.Port,
			})
		}
	}(entries)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*time.Duration(timeoutSeconds))
	defer cancel()

	// Browse for our specific VEDA service
	err = resolver.Browse(ctx, "_veda._tcp", "local.", entries)
	if err != nil {
		return nil, err
	}

	<-ctx.Done() // Wait for the timeout to finish collecting
	return devices, nil
}