package tunnel

import (
	"backend-app/config"
	"bufio"
	"log/slog"
	"os/exec"
	"regexp"
	"runtime"
)

type Tunnel struct {
	Process *exec.Cmd
	URL     string
}

func cleanupOldTunnels() {
	// Kill any existing cloudflared processes running for our server port
	if runtime.GOOS == "darwin" || runtime.GOOS == "linux" {
		// Use pkill to match cloudflared processes targeting our port
		// -9 sends SIGKILL, -f matches the full command line
		_ = exec.Command("pkill", "-9", "-f", "cloudflared.*"+config.ServerPort).Run()
	} else if runtime.GOOS == "windows" {
		_ = exec.Command("taskkill", "/F", "/IM", "cloudflared.exe").Run()
	}
}

func Start() (*Tunnel, error) {
	// Clean up any orphaned cloudflared processes from previous runs first
	cleanupOldTunnels()

	cmd := exec.Command(
		config.CloudflaredPath(),
		"tunnel",
		"--url",
		config.ServerURL(),
	)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, err
	}

	if err := cmd.Start(); err != nil {
		return nil, err
	}

	regex := regexp.MustCompile(`https://[a-zA-Z0-9\-]+\.trycloudflare\.com`)

	readPipe := func(scanner *bufio.Scanner) string {
		for scanner.Scan() {
			line := scanner.Text()

			slog.Info("cloudflared output", "line", line)

			match := regex.FindString(line)
			if match != "" {
				return match
			}
		}

		return ""
	}

	urlChan := make(chan string)

	go func() {
		scanner := bufio.NewScanner(stdout)
		if url := readPipe(scanner); url != "" {
			urlChan <- url
		}
	}()

	go func() {
		scanner := bufio.NewScanner(stderr)
		if url := readPipe(scanner); url != "" {
			urlChan <- url
		}
	}()

	url := <-urlChan

	return &Tunnel{
		Process: cmd,
		URL:     url,
	}, nil
}
