package fs

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/shirou/gopsutil/v3/disk"
)

type FileNode struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	IsDir   bool   `json:"is_dir"`
	ModTime string `json:"mod_time"`
}

func GetRootPaths() []FileNode {
	var roots []FileNode
	
	partitions, err := disk.Partitions(false)
	if err == nil && len(partitions) > 0 {
		for _, p := range partitions {
			// Ignore strange virtual drives
			if strings.Contains(p.Mountpoint, "wsl") || p.Fstype == "" {
				continue
			}
			
			// CRITICAL FIX: Ensure Windows drives have a trailing backslash.
			// "C:" reads the current working directory. "C:\" reads the root drive.
			drivePath := p.Mountpoint
			if len(drivePath) == 2 && drivePath[1] == ':' {
				drivePath += "\\"
			}

			roots = append(roots, FileNode{
				Name:  drivePath,
				Path:  drivePath,
				IsDir: true,
			})
		}
		if len(roots) > 0 {
			return roots
		}
	}

	// Proper Windows Fallback
	return []FileNode{{Name: "C:\\", Path: "C:\\", IsDir: true}}
}

func ListDirectory(dirPath string) ([]FileNode, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var nodes []FileNode
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue 
		}
		nodes = append(nodes, FileNode{
			Name:    entry.Name(),
			Path:    filepath.Join(dirPath, entry.Name()),
			Size:    info.Size(),
			IsDir:   entry.IsDir(),
			ModTime: info.ModTime().Format("2006-01-02 15:04"),
		})
	}
	return nodes, nil
}