package config

import (
	"os"
	"path/filepath"
	"runtime"
)

const (
	ServerHost = "localhost"
	ServerPort = "8787"
	SecretKey  = "HeHeHe"
)

func CloudflaredPath() string {
	// Get target triple for the current running binary
	var triple string
	switch runtime.GOOS {
	case "darwin":
		if runtime.GOARCH == "arm64" {
			triple = "aarch64-apple-darwin"
		} else {
			triple = "x86_64-apple-darwin"
		}
	case "windows":
		if runtime.GOARCH == "arm64" {
			triple = "aarch64-pc-windows-msvc.exe"
		} else {
			triple = "x86_64-pc-windows-msvc.exe"
		}
	case "linux":
		if runtime.GOARCH == "arm64" {
			triple = "aarch64-unknown-linux-gnu"
		} else {
			triple = "x86_64-unknown-linux-gnu"
		}
	}

	// 1. Try to find cloudflared with triple suffix in the same directory as the current executable (Tauri bundle sidecar path)
	if exePath, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exePath)
		sidecarPath := filepath.Join(exeDir, "cloudflared-"+triple)
		if info, err := os.Stat(sidecarPath); err == nil && !info.IsDir() {
			return sidecarPath
		}

		// Also try without triple just in case
		fallbackPath := filepath.Join(exeDir, "cloudflared")
		if runtime.GOOS == "windows" {
			fallbackPath += ".exe"
		}
		if info, err := os.Stat(fallbackPath); err == nil && !info.IsDir() {
			return fallbackPath
		}
	}

	// 2. Fall back to development paths
	switch runtime.GOOS {
	case "darwin":
		return "./bin/mac/cloudflared"
	case "windows":
		return "./bin/windows/cloudflared.exe"
	case "linux":
		return "./bin/linux/cloudflared"
	default:
		panic("unsupported platform")
	}
}

func ServerURL() string {
	return "http://" + ServerHost + ":" + ServerPort
}
