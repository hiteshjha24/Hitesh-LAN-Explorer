package security

import (
	"encoding/json"
	"os"
	"sync"
)

const storeFile = "veda_paired.json"

type PairedDevice struct {
	Hostname string `json:"hostname"`
	IP       string `json:"ip"`
	Port     int    `json:"port"`
}

var mu sync.Mutex

// GetPairedDevices reads the trusted devices from disk
func GetPairedDevices() []PairedDevice {
	mu.Lock()
	defer mu.Unlock()

	data, err := os.ReadFile(storeFile)
	if err != nil {
		return []PairedDevice{}
	}

	var devices []PairedDevice
	json.Unmarshal(data, &devices)
	return devices
}

// SavePairedDevice adds a new device to the trusted list
func SavePairedDevice(dev PairedDevice) error {
	mu.Lock()
	defer mu.Unlock()

	// Read existing
	data, err := os.ReadFile(storeFile)
	var devices []PairedDevice
	if err == nil {
		json.Unmarshal(data, &devices)
	}

	// Prevent duplicates
	for _, d := range devices {
		if d.Hostname == dev.Hostname {
			return nil 
		}
	}

	devices = append(devices, dev)
	newData, _ := json.MarshalIndent(devices, "", "  ")
	return os.WriteFile(storeFile, newData, 0644)
}