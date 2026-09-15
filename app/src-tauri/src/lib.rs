use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{Manager, RunEvent};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// Must match `DESKTOP_PORT` in `api/my_private_finances/desktop_main.py`.
const SIDECAR_PORT: u16 = 5179;
const HEALTH_CHECK_TIMEOUT: Duration = Duration::from_secs(20);
const HEALTH_CHECK_INTERVAL: Duration = Duration::from_millis(200);

/// Holds the running sidecar's handle so the exit hook can terminate it.
/// `None` before spawn and after the sidecar has been told to stop.
struct SidecarState(Mutex<Option<CommandChild>>);

/// Polls `GET /api/health` on the sidecar's loopback port until it responds
/// with a 2xx status or `timeout` elapses. A bare TCP connect isn't enough:
/// the port can accept connections slightly before FastAPI's lifespan
/// startup (DB engine, watch-folder supervisor) has actually finished.
fn wait_for_sidecar_health(port: u16, timeout: Duration) -> bool {
    let deadline = Instant::now() + timeout;
    let request =
        format!("GET /api/health HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nConnection: close\r\n\r\n");

    while Instant::now() < deadline {
        if let Ok(mut stream) = TcpStream::connect(("127.0.0.1", port)) {
            if stream.write_all(request.as_bytes()).is_ok() {
                let mut buf = [0u8; 16];
                if let Ok(n) = stream.read(&mut buf) {
                    if buf[..n].starts_with(b"HTTP/1.1 200") {
                        return true;
                    }
                }
            }
        }
        std::thread::sleep(HEALTH_CHECK_INTERVAL);
    }
    false
}

/// Terminates the sidecar gracefully so its FastAPI lifespan shutdown runs
/// (stops the watch-folder task, closes DB connections) instead of being
/// killed mid-request. SIGTERM has no real equivalent on Windows, so that
/// platform falls back to `CommandChild::kill()` (TerminateProcess) at the
/// call site in `run()`.
#[cfg(unix)]
fn terminate_unix(pid: u32) {
    // SAFETY: `pid` is a live child process we own (from `CommandChild::pid`);
    // sending SIGTERM to it is the documented, safe use of this call.
    unsafe {
        libc::kill(pid as i32, libc::SIGTERM);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarState(Mutex::new(None)))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // `.sidecar()` takes just the bundled binary's base name (Tauri
            // strips the "binaries/" prefix and target-triple suffix from the
            // `bundle.externalBin` entry in tauri.conf.json when installing it
            // next to the app binary).
            let sidecar = app.shell().sidecar("my-private-finance-api")?;
            let (mut rx, child) = sidecar.spawn().expect("failed to spawn backend sidecar");
            app.state::<SidecarState>().0.lock().unwrap().replace(child);

            // Drain the sidecar's stdout/stderr into the app log. Necessary
            // even outside dev builds: an unread pipe fills up and stalls
            // the child process once its OS pipe buffer is full.
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            log::info!("[backend] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stderr(line) => {
                            log::warn!("[backend] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Error(err) => {
                            log::error!("[backend] sidecar error: {err}");
                        }
                        CommandEvent::Terminated(payload) => {
                            log::info!("[backend] sidecar exited: {payload:?}");
                        }
                        _ => {}
                    }
                }
            });

            if !wait_for_sidecar_health(SIDECAR_PORT, HEALTH_CHECK_TIMEOUT) {
                log::error!(
                    "Backend sidecar did not report healthy within {HEALTH_CHECK_TIMEOUT:?}"
                );
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // Fires when the last window closes (default close behavior is
            // to request app exit) — stop the sidecar so no orphaned backend
            // process is left running after the window disappears.
            if let RunEvent::ExitRequested { .. } = event {
                if let Some(child) = app_handle.state::<SidecarState>().0.lock().unwrap().take() {
                    let pid = child.pid();
                    #[cfg(unix)]
                    {
                        let _ = &child; // keep `child` alive until the signal is sent
                        terminate_unix(pid);
                    }
                    #[cfg(not(unix))]
                    {
                        let _ = child.kill();
                    }
                }
            }
        });
}
