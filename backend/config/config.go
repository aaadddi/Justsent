package config

import "runtime"

const (
	ServerHost = "localhost"
	ServerPort = "8787"
)

func CloudflaredPath() string {
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
