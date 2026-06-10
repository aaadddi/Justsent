//go:build !windows

package main

import (
	"os"
)

func isParentAlive(initialPPID int) bool {
	currentPPID := os.Getppid()
	return currentPPID != 1 && currentPPID == initialPPID
}
