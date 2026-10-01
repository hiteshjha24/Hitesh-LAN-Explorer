package main

import (
	"context"
	"os"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetLocalHostname returns the computer's name. 
func (a *App) GetLocalHostname() string {
	hostname, err := os.Hostname()
	if err != nil {
		return "Unknown-Device"
	}
	return hostname
}