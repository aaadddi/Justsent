//go:build windows

package main

import (
	"syscall"
)

func isParentAlive(initialPPID int) bool {
	// PROCESS_QUERY_LIMITED_INFORMATION (0x1000) is sufficient to call GetExitCodeProcess
	handle, err := syscall.OpenProcess(0x1000, false, uint32(initialPPID))
	if err != nil {
		return false
	}
	defer syscall.CloseHandle(handle)

	var exitCode uint32
	err = syscall.GetExitCodeProcess(handle, &exitCode)
	if err != nil {
		return false
	}

	// 259 is STILL_ACTIVE
	return exitCode == 259
}
