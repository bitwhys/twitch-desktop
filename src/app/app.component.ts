import { Component } from "@angular/core";
import { ElectronService } from "./providers/electron.service";
import { TwitchAuthService } from "./providers/twitch-auth-graphql.service"
import { SettingsService } from "./providers/settings.service";
import { Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { AppConfig } from "../environments/environment";


let mainWindow = require("electron").remote.getGlobal("mainWindow");
let auth_token = localStorage.getItem('auth_token');

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent {
  sidebarState = "visible";

  constructor(
    public electronService: ElectronService,
    private translate: TranslateService,
    private router: Router,
    private twitchAuthService: TwitchAuthService,
    private settingsService: SettingsService
  ) {
    translate.setDefaultLang("en");
    console.log("AppConfig", AppConfig);

    if (electronService.isElectron()) {
      console.log("Mode electron");
      console.log("Electron ipcRenderer", electronService.ipcRenderer);
      console.log("NodeJS childProcess", electronService.childProcess);
    } else {
      console.log("Mode web");
    }
  }

  ngOnInit() {
    if (auth_token && this.settingsService.getConfig().autologin) {
      this.twitchAuthService.setAuthToken(auth_token);
    } else {
      localStorage.removeItem('auth_token');
    }

    // Browse games as start page
    this.router.navigate(["/games"]);
  }

  closeWindow() {
    mainWindow.close();
  }

  maximizeWindow() {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }

  minimizeWindow() {
    mainWindow.minimize();
  }

  enterFullscreen() {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }

  toggleSidebar() {
    if (this.sidebarState === "visible") this.sidebarState = "hidden";
    else if (this.sidebarState === "hidden") this.sidebarState = "visible";
  }
}
