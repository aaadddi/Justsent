#[cfg(not(dev))]
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

#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let parent = std::path::Path::new(&path)
            .parent()
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or(path);
        std::process::Command::new("xdg-open")
            .arg(&parent)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| {
            #[cfg(not(dev))]
            {
                // Spawn Go backend sidecar
                match _app.shell().sidecar("justsent-backend") {
                    Ok(cmd) => {
                        match cmd.spawn() {
                            Ok(_) => println!("Successfully spawned Go backend sidecar"),
                            Err(e) => eprintln!("Failed to spawn Go backend sidecar: {}", e),
                        }
                    }
                    Err(e) => eprintln!("Failed to find Go backend sidecar: {}", e),
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, get_file_size, reveal_in_finder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
