#[allow(dead_code)]
pub const BACKEND_FILENAME: &str = "justsent-backend";

pub fn reveal_in_finder(path: &str) -> Result<(), String> {
    std::process::Command::new("open")
        .arg("-R")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
