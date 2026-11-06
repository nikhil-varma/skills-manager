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

fn spawn_backend(app: &AppHandle) -> Option<Child> {
  if is_backend_running() {
    println!("[SkillDesk Tauri] Backend server is already running on port 3001.");
    return None;
  }

  println!("[SkillDesk Tauri] Starting background server process on port 3001...");

  // 1. Priority 1: Check bundled binary in app resources (for standalone DMG on any Mac)
  if let Ok(res_dir) = app.path().resource_dir() {
    let bundled_candidates = [
      res_dir.join("bin/skilldesk-server"),
      res_dir.join("skilldesk-server"),
      res_dir.join("../Resources/bin/skilldesk-server"),
      res_dir.join("../Resources/skilldesk-server"),
    ];

    for path in bundled_candidates {
      if path.exists() {
        if let Ok(child) = Command::new(&path).env("PORT", "3001").spawn() {
          println!("[SkillDesk Tauri] Spawned bundled server binary: {:?}", path);
          return Some(child);
        }
      }
    }
  }

  // 2. Priority 2: Local project binary (development / workspace build)
  let local_bin_candidates = [
    std::env::current_dir().unwrap_or_default().join("src-tauri/bin/skilldesk-server"),
    std::env::current_dir().unwrap_or_default().join("bin/skilldesk-server"),
    std::env::current_dir().unwrap_or_default().join("../src-tauri/bin/skilldesk-server"),
    std::env::current_dir().unwrap_or_default().join("skilldesk-server"),
  ];

  for path in local_bin_candidates {
    if path.exists() {
      if let Ok(child) = Command::new(&path).env("PORT", "3001").spawn() {
        println!("[SkillDesk Tauri] Spawned local compiled binary: {:?}", path);
        return Some(child);
      }
    }
  }

  // 3. Fallback: Node.js or Bun script
  let script_candidates = [
    std::env::current_dir().unwrap_or_default().join("server/index.js"),
    std::env::current_dir().unwrap_or_default().join("../server/index.js"),
  ];

  if let Some(script_path) = script_candidates.into_iter().find(|p| p.exists()) {
    if let Ok(child) = Command::new("node").arg(&script_path).env("PORT", "3001").spawn() {
      println!("[SkillDesk Tauri] Spawned backend using node: {:?}", script_path);
      return Some(child);
    }
    if let Ok(child) = Command::new("bun").arg("run").arg(&script_path).env("PORT", "3001").spawn() {
      println!("[SkillDesk Tauri] Spawned backend using bun: {:?}", script_path);
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
