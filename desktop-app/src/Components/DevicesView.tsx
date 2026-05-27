import { useState } from "react";

type DeviceItem = {
  id: string;
  name: string;
  type: "mac" | "ios" | "windows" | "tv" | "android";
  statusText: string;
  isOnline: boolean;
};

const INITIAL_DEVICES: DeviceItem[] = [
  { id: "1", name: "Aditya's MacBook Pro", type: "mac", statusText: "Mac", isOnline: true },
  { id: "2", name: "iPhone 15 Pro", type: "ios", statusText: "iOS", isOnline: true },
  { id: "3", name: "Office PC", type: "windows", statusText: "Windows", isOnline: true },
  { id: "4", name: "Living Room TV", type: "tv", statusText: "Samsung TV", isOnline: false },
  { id: "5", name: "Pixel 8 Pro", type: "android", statusText: "Android", isOnline: false },
];

export default function DevicesView() {
  const [isSearching, setIsSearching] = useState(false);
  const [devices, setDevices] = useState<DeviceItem[]>(INITIAL_DEVICES);

  const handleRefresh = () => {
    setIsSearching(true);
    // Clear list temporarily to simulate refresh
    setDevices([]);
    
    setTimeout(() => {
      setIsSearching(false);
      setDevices(INITIAL_DEVICES);
    }, 2000);
  };

  // Device type SVG icons
  const renderIcon = (type: DeviceItem["type"]) => {
    switch (type) {
      case "mac":
      case "windows":
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        );
      case "ios":
      case "android":
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        );
      case "tv":
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <polyline points="8 21 12 17 16 21" />
          </svg>
        );
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          </svg>
        );
    }
  };

  return (
    <div className="devices-view-container">
      {/* Header Info Area */}
      <div className="devices-toolbar">
        <span className="devices-subtitle">
          {isSearching ? "Discovering devices on your network..." : "Discovering devices on your network..."}
        </span>
        <button className="devices-refresh-btn" onClick={handleRefresh} disabled={isSearching}>
          {isSearching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Grid List */}
      <div className="devices-grid">
        {devices.map((device) => (
          <div className="device-card" key={device.id}>
            {/* Status dot */}
            <span className={`device-status-dot ${device.isOnline ? "online" : "offline"}`} />
            
            {/* Device Icon */}
            <div className={`device-icon-container ${device.isOnline ? "online" : "offline"}`}>
              {renderIcon(device.type)}
            </div>

            {/* Device Info */}
            <h4 className="device-name">{device.name}</h4>
            <span className="device-type-label">{device.statusText}</span>
          </div>
        ))}

        {/* Searching Card */}
        {isSearching && (
          <div className="device-card searching">
            <div className="searching-spinner" />
            <span className="searching-text">Searching...</span>
          </div>
        )}
      </div>
    </div>
  );
}
