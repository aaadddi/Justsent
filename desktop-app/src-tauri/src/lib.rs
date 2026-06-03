use tauri_plugin_shell::ShellExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_file_size(path: String) -> Result<u64, String> {
    std::fs::metadata(path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Spawn Go backend sidecar
            match app.shell().sidecar("justsent-backend") {
                Ok(cmd) => {
                    match cmd.spawn() {
                        Ok(_) => println!("Successfully spawned Go backend sidecar"),
                        Err(e) => eprintln!("Failed to spawn Go backend sidecar: {}", e),
                    }
                }
                Err(e) => eprintln!("Failed to find Go backend sidecar: {}", e),
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, get_file_size])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
