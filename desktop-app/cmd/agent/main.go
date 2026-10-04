package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"desktop-app/api"
	"desktop-app/network"
	"desktop-app/security"
)

func main() {
	fmt.Println("=====================================")
	fmt.Println("      VEDA Headless Agent v1.0       ")
	fmt.Println("=====================================")

	// Get actual hostname and append "-Agent" so we can test it on the same PC
	actualHost, err := os.Hostname()
	if err != nil {
		actualHost = "Unknown-Device"
	}
	agentHostname := actualHost + "-Agent"

	fmt.Println("[*] Device Name:", agentHostname)

	// 1. Load Cryptographic Identity
	pubKey, err := security.LoadOrGenerateIdentity()
	if err != nil {
		fmt.Println("[!] Error loading identity:", err)
		return
	}
	fmt.Println("[*] Identity Loaded. Public Key:", pubKey[:16]+"...")

	// 2. Start mDNS Broadcast
	server, err := network.StartBroadcasting(agentHostname, 8081) // Running on 8081 to avoid clashing with Wails on 8080
	if err != nil {
		fmt.Println("[!] Failed to start LAN broadcast:", err)
	} else {
		fmt.Println("[*] Broadcasting on LAN as _veda._tcp")
		defer server.Shutdown()
	}

	// 3. Start Secure API Server
	fmt.Println("[*] Starting secure File API on port 8081...")
	api.StartServer("8081")

	fmt.Println("\n[✓] VEDA Agent is running. Press Ctrl+C to stop.")

	// Keep the program running until you press Ctrl+C
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	fmt.Println("\n[*] Shutting down VEDA Agent...")
}