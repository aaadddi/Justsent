use tauri::Manager;

mod platform;

struct BackendState(std::sync::Mutex<Option<std::process::Child>>);

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

#[tauri::command]
fn get_file_size(path: String) -> Result<u64, String> {
    std::fs::metadata(path)
        .map(|m| m.len())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    platform::reveal_in_finder(&path)
}

#[tauri::command]
fn exit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let backend_child = {
                #[cfg(not(dev))]
                {
                    let resource_dir = app.path().resource_dir()
                        .map_err(|e| format!("Failed to resolve resource directory: {}", e))?;
                    
                    let backend_path = resource_dir.join("resources").join(platform::BACKEND_FILENAME);
                    
                    println!("Checking for backend sidecar at: {:?}", backend_path);
                    
                    let path_to_use = if backend_path.exists() {
                        backend_path
                    } else {
                        let fallback_path = resource_dir.join("justsent-backend");
                        fallback_path
                    };
                    
                    let actual_resources_dir = path_to_use.parent().unwrap_or(&resource_dir);
                    println!("Spawning backend from: {:?} with resources: {:?}", path_to_use, actual_resources_dir);
                    
                    let child = std::process::Command::new(&path_to_use)
                        .arg("-resources-dir")
                        .arg(actual_resources_dir)
                        .spawn()
                        .map_err(|e| format!("Failed to spawn backend process from {:?}: {}", path_to_use, e))?;
                    
                    Some(child)
                }
                #[cfg(dev)]
                {
                    None
                }
            };
            
            app.manage(BackendState(std::sync::Mutex::new(backend_child)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_file_size, reveal_in_finder, exit_app])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let state = app_handle.state::<BackendState>();
                let mut lock = state.0.lock().unwrap();
                if let Some(mut child) = lock.take() {
                    println!("Killing backend process...");
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }
        });
}

