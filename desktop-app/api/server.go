package api

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"desktop-app/fs"
	"desktop-app/security"
	"desktop-app/system"
)

func StartServer(port string) {
	mux := http.NewServeMux()

	authMiddleware := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}

			clientIP := strings.Split(r.RemoteAddr, ":")[0]
			if clientIP == "127.0.0.1" || clientIP == "::1" {
				next(w, r)
				return
			}

			paired := security.GetPairedDevices()
			isPaired := false
			for _, d := range paired {
				if d.IP == clientIP {
					isPaired = true
					break
				}
			}

			if !isPaired {
				http.Error(w, "Unauthorized device", http.StatusUnauthorized)
				return
			}
			next(w, r)
		}
	}

	mux.HandleFunc("/api/stats", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		stats := system.GetStats()
		json.NewEncoder(w).Encode(stats)
	}))

	mux.HandleFunc("/api/fs/roots", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		roots := fs.GetRootPaths()
		json.NewEncoder(w).Encode(roots)
	}))

	mux.HandleFunc("/api/fs/list", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Query().Get("path")
		nodes, err := fs.ListDirectory(path)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(nodes)
	}))

	// --- NEW: DOWNLOAD ENDPOINT ---
	mux.HandleFunc("/api/fs/download", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		filePath := r.URL.Query().Get("path")
		if filePath == "" {
			http.Error(w, "Path is required", http.StatusBadRequest)
			return
		}
		// http.ServeFile automatically handles Range requests (pause/resume) and streams data efficiently
		w.Header().Set("Content-Disposition", "attachment; filename="+filepath.Base(filePath))
		http.ServeFile(w, r, filePath)
	}))

	// --- NEW: FOLDER SYNC MANIFEST ENDPOINT ---
	mux.HandleFunc("/api/fs/manifest", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Query().Get("path")
		if path == "" {
			http.Error(w, "Path is required", http.StatusBadRequest)
			return
		}
		
		manifest, err := fs.GenerateManifest(path)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		
		json.NewEncoder(w).Encode(manifest)
	}))

	// --- NEW: UPLOAD ENDPOINT ---
	mux.HandleFunc("/api/fs/upload", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Invalid method", http.StatusMethodNotAllowed)
			return
		}

		folderPath := r.URL.Query().Get("path")
		if folderPath == "" {
			http.Error(w, "Target path is required", http.StatusBadRequest)
			return
		}

		// Parse the multipart form.
		// 10 << 20 specifies a maximum of 10MB stored in RAM. The rest is streamed to temp files on disk.
		err := r.ParseMultipartForm(10 << 20) 
		if err != nil {
			http.Error(w, "Failed to parse form", http.StatusBadRequest)
			return
		}

		file, handler, err := r.FormFile("file")
		if err != nil {
			http.Error(w, "Error retrieving file", http.StatusBadRequest)
			return
		}
		defer file.Close()

		// Create the destination file
		dstPath := filepath.Join(folderPath, handler.Filename)
		dst, err := os.Create(dstPath)
		if err != nil {
			http.Error(w, "Failed to create file on disk", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		// Stream the data from the network directly to the disk
		if _, err := io.Copy(dst, file); err != nil {
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Upload successful"))
	}))

	go http.ListenAndServe(":"+port, mux)
}