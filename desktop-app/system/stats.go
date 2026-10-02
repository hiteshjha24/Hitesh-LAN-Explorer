package system

import (
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
)

// SystemStats represents the hardware metrics we send to the frontend
type SystemStats struct {
	CPUUsage    float64 `json:"cpu_usage"`
	RAMTotal    uint64  `json:"ram_total"`
	RAMUsed     uint64  `json:"ram_used"`
	DiskTotal   uint64  `json:"disk_total"`
	DiskUsed    uint64  `json:"disk_used"`
}

// GetStats reads the current hardware usage from the host OS
func GetStats() SystemStats {
	var stats SystemStats

	// CPU - get percentage (0 = don't wait for interval)
	cpuPercents, err := cpu.Percent(0, false)
	if err == nil && len(cpuPercents) > 0 {
		stats.CPUUsage = cpuPercents[0]
	}

	// RAM
	vMem, err := mem.VirtualMemory()
	if err == nil {
		stats.RAMTotal = vMem.Total
		stats.RAMUsed = vMem.Used
	}

	// Disk (checking the root drive/C: drive)
	d, err := disk.Usage("/")
	if err == nil {
		stats.DiskTotal = d.Total
		stats.DiskUsed = d.Used
	} else {
		// Fallback for Windows if "/" fails
		dWin, errWin := disk.Usage("C:\\")
		if errWin == nil {
			stats.DiskTotal = dWin.Total
			stats.DiskUsed = dWin.Used
		}
	}

	return stats
}