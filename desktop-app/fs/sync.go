package fs

import (
	"os"
	"path/filepath"
)

// ManifestItem represents a file's state for fast sync comparison
type ManifestItem struct {
	RelativePath string `json:"rel_path"`
	Size         int64  `json:"size"`
	ModTime      int64  `json:"mod_time"` // Unix timestamp for exact integer comparison
	IsDir        bool   `json:"is_dir"`
}

// GenerateManifest recursively walks a directory and maps all files
func GenerateManifest(baseDir string) ([]ManifestItem, error) {
	var manifest []ManifestItem

	err := filepath.Walk(baseDir, func(path string, info os.FileInfo, err error) error {
		// Skip files/folders we don't have permission to read
		if err != nil {
			return nil
		}

		// Calculate the relative path (e.g., "frontend/src/App.tsx")
		rel, err := filepath.Rel(baseDir, path)
		if err != nil || rel == "." {
			return nil
		}

		manifest = append(manifest, ManifestItem{
			RelativePath: filepath.ToSlash(rel), // Normalize slashes for cross-platform (Windows <-> Linux)
			Size:         info.Size(),
			ModTime:      info.ModTime().Unix(),
			IsDir:        info.IsDir(),
		})
		
		return nil
	})

	return manifest, err
}