#[allow(dead_code)]
pub const BACKEND_FILENAME: &str = "justsent-backend";

pub fn reveal_in_finder(path: &str) -> Result<(), String> {
    let parent = std::path::Path::new(path)
        .parent()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string());
    std::process::Command::new("xdg-open")
        .arg(&parent)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
