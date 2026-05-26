package tunnel

import (
	"backend-app/config"
	"bufio"
	"fmt"
	"os/exec"
	"regexp"
)

type Tunnel struct {
	Process *exec.Cmd
	URL     string
}

func Start() (*Tunnel, error) {

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

			fmt.Println("[cloudflared]", line)

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
