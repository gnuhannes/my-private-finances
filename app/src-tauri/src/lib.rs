use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, RunEvent, WindowEvent};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// Must match `DESKTOP_PORT` in `api/my_private_finances/desktop_main.py`.
const SIDECAR_PORT: u16 = 5179;
const HEALTH_CHECK_TIMEOUT: Duration = Duration::from_secs(20);
const HEALTH_CHECK_INTERVAL: Duration = Duration::from_millis(200);
const MAIN_WINDOW: &str = "main";

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

/// Shows, unminimizes, and focuses the main window. Used by both the tray's
/// left-click and the single-instance relaunch callback.
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be the first plugin registered: on a relaunch it detects the
        // already-running instance, forwards args/cwd to this callback, and
        // exits the newly-launched process before anything else runs.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // Registers the myprivatefinance:// scheme (see tauri.conf.json ->
        // plugins.deep-link). Stub only: nothing consumes deep-link events
        // yet, this just claims the scheme for future integrations.
        .plugin(tauri_plugin_deep_link::init())
        .manage(SidecarState(Mutex::new(None)))
        .setup(|app| {
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

            // System tray: left-click reopens the window, right-click shows
            // the menu (just Quit for now). Closing the window hides it
            // instead of exiting (see the on_window_event handler below), so
            // the tray icon is the only way back in once minimized to it.
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_item])?;
            TrayIconBuilder::new()
                .icon(
                    app.default_window_icon()
                        .cloned()
                        .expect("app icon is bundled"),
                )
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    if event.id() == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Minimize to tray instead of closing: the only way to actually
            // quit is the tray menu's Quit item (which calls app.exit(0) and
            // is handled by the RunEvent::ExitRequested arm below).
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // Fires on an actual app exit (tray Quit) — stop the sidecar so
            // no orphaned backend process is left running.
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
