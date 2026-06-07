package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
)

var (
	ServerHost   = "localhost"
	ServerPort   = "8787"
	SecretKey    = "HeHeHe"
	ResourcesDir = ""
)

func UserDataDir() string {
	dir, err := os.UserConfigDir()
	if err != nil {
		dir = "."
	}
	appDir := filepath.Join(dir, "JustSent")
	_ = os.MkdirAll(appDir, 0755)
	return appDir
}

func LoadConfig() error {
	configPath := filepath.Join(UserDataDir(), "config.json")
	data, err := os.ReadFile(configPath)
	if err != nil {
		return err
	}
	var c ConfigSchema
	if err := json.Unmarshal(data, &c); err != nil {
		return err
	}
	if c.ServerHost != "" {
		ServerHost = c.ServerHost
	}
	if c.ServerPort != "" {
		ServerPort = c.ServerPort
	}
	if c.SecretKey != "" {
		SecretKey = c.SecretKey
	}
	return nil
}

func CloudflaredPath() string {
	// 1. Try to find cloudflared in the resources directory if provided
	if ResourcesDir != "" {
		binaryName := "cloudflared"
		if runtime.GOOS == "windows" {
			binaryName += ".exe"
		}
		path := filepath.Join(ResourcesDir, binaryName)
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			return path
		}
	}

	// 2. Try to find cloudflared next to the running executable
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

	if exePath, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exePath)
		sidecarPath := filepath.Join(exeDir, "cloudflared-"+triple)
		if info, err := os.Stat(sidecarPath); err == nil && !info.IsDir() {
			return sidecarPath
		}

		fallbackPath := filepath.Join(exeDir, "cloudflared")
		if runtime.GOOS == "windows" {
			fallbackPath += ".exe"
		}
		if info, err := os.Stat(fallbackPath); err == nil && !info.IsDir() {
			return fallbackPath
		}
	}

	// 3. Fall back to development paths
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
