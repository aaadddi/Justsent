export default function StatusBar() {
  return (
    <footer className="status-bar">
      <div className="status-left">
        <span className="dot active"></span>
        Connected
      </div>
      <div className="status-right">
        Expires in 23h 59m
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginLeft: "6px", opacity: 0.6 }}
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
    </footer>
  );
}
