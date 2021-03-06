import { app, BrowserWindow, screen } from "electron";
import { autoUpdater } from "electron-updater";
import * as log from "electron-log";
import * as path from "path";
import * as url from "url";
import * as fs from "fs";
import * as request from "request-promise-native";

let win, aux_window, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === "--serve");

autoUpdater.logger = log;
autoUpdater.autoDownload = false;

log.info("App starting...");

try {
  app.on("ready", () => {
    aux_window = new BrowserWindow({
      frame: true,
      icon: path.join(__dirname, "dist/assets/icon.png"),
      width: 600,
      autoHideMenuBar: true,
      height: 300,
      show: true,
      backgroundColor: "#221F2A",
      webPreferences: {
        nodeIntegration: true,
        webSecurity: false,
        partition: "persist:twitch"
      }
    });

    if (serve) {
      createMainWindow();
    } else {
      aux_window.on("close", event => {
        autoUpdater.removeAllListeners();
        aux_window.removeAllListeners();
        createMainWindow();
        event.preventDefault();
      });

      aux_window.loadURL(
        url.format({
          pathname: path.join(__dirname, `dist/update.html`),
          protocol: "file:",
          slashes: true
        })
      );

      autoUpdater.checkForUpdates();
    }
  });

  autoUpdater.on("checking-for-update", () => {
    sendStatusToWindow("Checking for updates");
  });

  autoUpdater.on("update-available", info => {
    sendStatusToWindow("New update avaliable.");
    autoUpdater.downloadUpdate();
  });

  autoUpdater.on("update-not-available", info => {
    aux_window.close();
  });

  autoUpdater.on("error", err => {
    sendStatusToWindow("Error in auto-updater. " + err);
    aux_window.close();
  });

  autoUpdater.on("download-progress", progressObj => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + " - Downloaded " + progressObj.percent + "%";
    log_message =
      log_message +
      " (" +
      progressObj.transferred +
      "/" +
      progressObj.total +
      ")";
    sendStatusToWindow(log_message);
  });

  autoUpdater.on("update-downloaded", info => {
    sendStatusToWindow("Update downloaded");
    setImmediate(() => autoUpdater.quitAndInstall());
  });
} catch (e) {
  log.error(e);
}

async function createMainWindow() {
  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;
  let icon = path.join(__dirname, "dist/assets/icon.png");

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    frame: false,
    icon: icon,
    title: "Twitch Desktop",
    backgroundColor: "#221F2A",
    show: false,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      partition: "persist:twitch"
    }
  });

  // We set this to be able to acces the main window object inside angular application
  (<any>global).mainWindow = win;

  aux_window.close();

  if (serve) {
    (<any>global).betterttv = await request("http://localhost:4200/assets/betterttv.js");
    require("electron-reload")(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    win.loadURL("http://localhost:4200");
    win.show();
  } else {
    (<any>global).betterttv = fs.readFileSync(path.resolve(__dirname, "dist/assets/betterttv.js"), "utf8");
    win.loadURL(
      url.format({
        pathname: path.join(__dirname, "dist/index.html"),
        protocol: "file:",
        slashes: true
      })
    );
    win.show();
  }

  if (serve) {
    win.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  win.on("closed", () => {
    win = null;
    app.quit();
  });
}

function sendStatusToWindow(text) {
  log.info(text);
  aux_window.webContents.send("message", text);
}
