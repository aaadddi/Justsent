import React, { type PointerEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { SettingsIcon } from "../assets/icons";

interface SidebarItemProps {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick }) => (
  <button className={`sidebar-item ${active ? "active" : ""}`} onClick={onClick}>
    <div className="sidebar-item-content">
      <span className="sidebar-icon">{icon}</span>
      <span className="sidebar-label">{label}</span>
    </div>
  </button>
);

const SidebarSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="sidebar-section">
    <div className="sidebar-section-items">{children}</div>
  </div>
);

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export default function Sidebar({ currentTab, setCurrentTab }: SidebarProps) {
  const startWindowDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target instanceof HTMLElement && event.target.closest("button"))) {
      return;
    }

    if ("__TAURI_INTERNALS__" in window) {
      void getCurrentWindow().startDragging();
    }
  };

  return (
    <aside className="sidebar" onPointerDown={startWindowDrag}>
      <div className="sidebar-traffic-lights" data-tauri-drag-region></div>

      <div className="sidebar-menu-items">
        <SidebarSection>
          <SidebarItem
            label="Transfers"
            active={currentTab === "transfers"}
            onClick={() => setCurrentTab("transfers")}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="14" width="18" height="6" rx="1" />
                <path d="m16 9-4-4-4 4" />
                <path d="M12 5v9" />
              </svg>
            }
          />
          <SidebarItem
            label="History"
            active={currentTab === "history"}
            onClick={() => setCurrentTab("history")}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          {/* <SidebarItem
            label="Devices"
            active={currentTab === "devices"}
            onClick={() => setCurrentTab("devices")}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            }
          /> */}
        </SidebarSection>
      </div>

      <div className="sidebar-footer">
        <SidebarItem
          label="Settings"
          active={currentTab === "settings"}
          onClick={() => setCurrentTab("settings")}
          icon={<SettingsIcon />}
        />
      </div>
    </aside>
  );
}
