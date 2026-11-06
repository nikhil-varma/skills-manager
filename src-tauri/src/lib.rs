use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, RunEvent};

struct ServerProcess(Mutex<Option<Child>>);

fn is_backend_running() -> bool {
  TcpStream::connect_timeout(
    &"127.0.0.1:3001".parse().unwrap(),
    Duration::from_millis(150),
  )
  .is_ok()
}

fn spawn_backend(_app: &AppHandle) -> Option<Child> {
  if is_backend_running() {
    println!("[SkillDesk Tauri] Backend server is already running on port 3001.");
    return None;
  }

  println!("[SkillDesk Tauri] Starting background server process on port 3001...");

  // Look for server/index.js in parent or current directory
  let candidates = [
    std::env::current_dir().unwrap_or_default().join("server/index.js"),
    std::env::current_dir().unwrap_or_default().join("../server/index.js"),
  ];

  let server_script = candidates.into_iter().find(|p| p.exists());

  if let Some(script_path) = server_script {
    // Try node first, then bun
    let node_res = Command::new("node")
      .arg(&script_path)
      .env("PORT", "3001")
      .spawn();

    if let Ok(child) = node_res {
      println!("[SkillDesk Tauri] Spawned backend using node: {:?}", script_path);
      return Some(child);
    }

    let bun_res = Command::new("bun")
      .arg("run")
      .arg(&script_path)
      .env("PORT", "3001")
      .spawn();

    if let Ok(child) = bun_res {
      println!("[SkillDesk Tauri] Spawned backend using bun: {:?}", script_path);
      return Some(child);
    }
  }

  // Also check if compiled binary skilldesk-server exists
  let bin_candidates = [
    std::env::current_dir().unwrap_or_default().join("skilldesk-server"),
    std::env::current_dir().unwrap_or_default().join("../skilldesk-server"),
  ];

  if let Some(bin_path) = bin_candidates.into_iter().find(|p| p.exists()) {
    if let Ok(child) = Command::new(&bin_path).env("PORT", "3001").spawn() {
      println!("[SkillDesk Tauri] Spawned compiled binary: {:?}", bin_path);
      return Some(child);
    }
  }

  eprintln!("[SkillDesk Tauri] Note: Could not auto-spawn server; expecting manual backend on port 3001.");
  None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(ServerProcess(Mutex::new(None)))
    .setup(|app| {
      #[cfg(debug_assertions)]
      {
        let _ = app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        );
      }

      // Apply macOS Sequoia native vibrancy
      #[cfg(target_os = "macos")]
      {
        if let Some(window) = app.get_webview_window("main") {
          use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
          let _ = apply_vibrancy(
            &window,
            NSVisualEffectMaterial::UnderWindowBackground,
            None,
            None,
          );
        }
      }

      // Spawn backend process if needed
      if let Some(child) = spawn_backend(app.handle()) {
        if let Some(state) = app.try_state::<ServerProcess>() {
          if let Ok(mut lock) = state.0.lock() {
            *lock = Some(child);
          }
        }
      }

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app_handle, event| {
      if let RunEvent::Exit = event {
        // Kill spawned server when app terminates
        if let Some(state) = app_handle.try_state::<ServerProcess>() {
          if let Ok(mut lock) = state.0.lock() {
            if let Some(mut child) = lock.take() {
              println!("[SkillDesk Tauri] Terminating background server process...");
              let _ = child.kill();
            }
          }
        }
      }
    });
}
