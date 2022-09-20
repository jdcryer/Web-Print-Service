const { app, BrowserWindow, ipcMain, session } = require("electron");

const path = require("path");
const os = require("os");
const fs = require("fs");
const childProcess = require("child_process");
const compileLog = require("electron-log");

const { replaceServiceFiles, updateEvents } =
  process.platform === "win32"
    ? require("./updateWindows")
    : { replaceServiceFiles: () => {}, updateEvents: () => {} };

let appReadyToStart = Promise.resolve();

function formatError(data) {
  return `${data.error}\nstdout:${data.stdout}\nstderr: ${data.stderr}\n`;
}

if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

function getWinUserInfo() {
  return new Promise((resolve, reject) => {
    childProcess.exec(`powershell -command "whoami"`, (err, stdout, stderr) => {
      if (err) {
        reject({
          success: false,
          error: `Error in getting win user information: ${formatError(err)}`,
        });
        return;
      }
      let username, domain;
      [domain, username] = stdout.replaceAll("\r\n", "").split("\\");
      resolve({
        success: true,
        username: username,
        domain: domain,
      });
    });
  });
}

function handleSquirrelEvent() {
  // Get paths to execs and folders
  const appFolder = path.resolve(process.execPath, "..");
  const mainFolder = path.resolve(appFolder, "..");
  const updateDotExe = path.join(mainFolder, "Update.exe");
  const exeName = path.basename(process.execPath);
  const releasesFolder = path.join(mainFolder, "Releases");

  // If no arguements are provided then carry on to normal exec
  if (process.argv.length === 1) {
    return false;
  }

  // Below are the events that occur on install, update, uninstall...

  const spawn = function (command, args) {
    let spawnedProcess;

    try {
      spawnedProcess = childProcess.spawn(command, args, { detached: true });
    } catch (error) {
      throw new Error(error);
    }
    return spawnedProcess;
  };

  const spawnUpdate = function (args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case "--squirrel-install":
      if (process.platform === "win32") {
        try {
          fs.statSync(releasesFolder);
        } catch (err) {
          fs.mkdirSync(releasesFolder);
        }
      }
    case "--squirrel-updated":
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(["--createShortcut", exeName]);

      app.quit();
      return true;

    case "--squirrel-uninstall":
      const { finalUninstall } = require("./serviceHandlerWin");

      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers
      finalUninstall();
      // Remove desktop and start menu shortcuts
      spawnUpdate(["--removeShortcut", exeName]);

      app.quit();
      return true;

    case "--squirrel-obsolete":
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated
      app.quit();
      return true;
    case "--squirrel-firstrun":
      replaceServiceFiles();
      return false;

    case "--update":
      appReadyToStart = updateEvents(releasesFolder);
      return false;
  }
  compileLog.info(squirrelEvent);
  return true;
}

// Setup update feed and events
function updateEventsMac() {
  //const feedURL = `http://localhost:3002/updates/latest?v=${app.getVersion()}`;
  const feedURL = `http://localhost:3002/out/test.json`;

  compileLog.info(feedURL);
  autoUpdater.setFeedURL({ url: feedURL, serverType: "json" });
  compileLog.info(autoUpdater.getFeedURL());

  setInterval(() => {
    compileLog.info("Started updated check");
    autoUpdater.checkForUpdates();
    compileLog.info("Ended updated check");
  }, 10000);

  autoUpdater.on("checking-for-update", () =>
    compileLog.info("Checking for updates")
  );

  autoUpdater.on("update-available", () => compileLog.info("Update available"));

  autoUpdater.on("update-not-available", () =>
    compileLog.info("Update not available")
  );

  autoUpdater.on("update-downloaded", (event, releaseNotes, releaseName) => {
    console.log("Update:)");
    compileLog.info("Update window");

    const dialogOpts = {
      type: "info",
      buttons: ["Restart", "Later"],
      title: "Application Update",
      message: process.platform === "win32" ? releaseNotes : releaseName,
      detail:
        "A new version has been downloaded. Restart the application to apply the updates.",
    };

    dialog
      .showMessageBox(dialogOpts)
      .then((returnValue) => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall();
      })
      .catch((err) => {
        compileLog.error(err.message);
      });
  });

  autoUpdater.on("error", (message) => {
    compileLog.error("Uh oh");
    compileLog.error(message);
  });
}

console.log(
  "\n---------------------------PROGRAM LOG START---------------------------"
);

if (handleSquirrelEvent()) {
  if (app.isPackaged) {
    compileLog.info("Exiting app");
  }
} else {
  appReadyToStart
    .then(() => {
      // Include service functions (dependent on os)
      const {
        service,
        getLogs,
        getState,
        init,
        makeWinConfigFile,
        makeMacConfigFile,
      } =
        process.platform === "win32"
          ? require("./serviceHandlerWin")
          : require("./serviceHandlerMac");

      if (app.isPackaged) compileLog.info("Starting normal processes");

      serviceHandlerUpdateInt = undefined;

      ipcMain.on("install", (event, arg) => {
        service("install")
          .then((data) => {
            event.reply("install", data);
          })
          .catch((data) => {
            console.log(`Error: ${formatError(data)}`);
            event.reply("install", data);
            throw new Error(`Error: ${formatError(data)}`);
          });
      });

      ipcMain.on("uninstall", (event, arg) => {
        service("uninstall")
          .then((data) => {
            event.reply("uninstall", data);
          })
          .catch((data) => {
            console.log(`Error: ${formatError(data)}`);
            event.reply("install", data);
            throw new Error(`Error: ${formatError(data)}`);
          });
      });

      ipcMain.on("start", (event, arg) => {
        service("start")
          .then((data) => {
            event.reply("start", data);
          })
          .catch((data) => {
            console.log(`Error: ${formatError(data)}`);
            event.reply("install", data);
            throw new Error(`Error: ${formatError(data)}`);
          });
      });

      ipcMain.on("stop", (event, arg) => {
        service("stop")
          .then((data) => {
            event.reply("stop", data);
          })
          .catch((data) => {
            console.log(`Error: ${formatError(data)}`);
            event.reply("install", data);
            throw new Error(`Error: ${formatError(data)}`);
          });
      });

      ipcMain.on("status", (event, arg) => {
        service("status")
          .then((data) => {
            event.reply("status", {
              ...data,
              isWin: process.platform === "win32",
            }); // Lets frontend know if user login modal is needed
          })
          .catch((data) => {
            console.log(`Error: ${formatError(data)}`);
            event.reply("install", data);
            throw new Error(`Error: ${formatError(data)}`);
          });
      });

      ipcMain.on("username", (event, arg) => {
        // only used for Windows
        getWinUserInfo()
          .then((data) => {
            event.reply("username", data.username);
          })
          .catch((data) => {
            const errString = "Error getting windows user info:" + data.error;
            event.reply("username", errString);
            console.log(errString);
            throw new Error(errString);
          });
      });

      ipcMain.on("makeConfigFile", (event, arg) => {
        if (process.platform === "win32") {
          getWinUserInfo()
            .then((data) => {
              makeWinConfigFile(data.domain, data.username, arg.password)
                .then((data) => {
                  event.reply("makeConfigFile", data);
                })
                .catch((data) => {
                  const errString = "Error making config file:" + data.error;
                  event.reply("makeConfigFile", {
                    success: false,
                    error: errString,
                  });
                  console.log(errString);
                  throw new Error(errString);
                });
            })
            .catch((data) => {
              const errString = "Error getting Windows user info:" + data;
              event.reply("makeConfigFile", {
                success: false,
                error: errString,
              });
              compileLog.info(errString);
              throw new Error(errString);
            });
        } else {
          makeMacConfigFile()
            .then((data) => {
              compileLog.info("Made config file!");
              event.reply("makeConfigFile", data);
            })
            .catch((data) => {
              const errString = "Error making config file:" + data.error;
              event.reply("makeConfigFile", data);
              compileLog.info(errString);
            });
        }
      });
      ipcMain.on("startServiceHandlerUpdate", (event, arg) => {
        serviceHandlerUpdateInt = setInterval(() => {
          event.reply("serviceHandlerState", getState());
        }, 200);
        init(0, 0)
          .then((data) => {
            if (data.success) clearInterval(serviceHandlerUpdateInt);
            event.reply("serviceHandlerState", getState());
          })
          .catch((err) => {
            if (err.stdout.includes("Cannot start service")) {
              compileLog.info("Failed to login on service start");
              service("uninstall")
                .then((data) => {
                  console.log("Made config file!");
                  event.reply("makeConfigFile", data);
                })
                .catch((err) => {
                  const strErr = `Fatal error in uninstalling service after error:\nstdout: ${err.stdout}\nstderr: ${err.stderr} \nerror: ${err.error}`;
                  event.reply("windowsLoginFailed", err);
                  event.reply("serviceHandlerState", getState());
                  compileLog.info(strErr);
                  throw new Error(strErr);
                });
            }
            const strErr = `Fatal error in service handling:\nstdout: ${err.stdout}\nstderr: ${err.stderr} \nerror: ${err.error}`;
            event.reply("serviceHandlerState", getState());
            compileLog.info(strErr);
            throw new Error(strErr);
          });
      });

      ipcMain.on("stopServiceHandlerState", (event, arg) => {
        if (serviceHandlerUpdateInt) {
          clearInterval(serviceHandlerUpdateInt);
        }
      });

      ipcMain.on("getLogs", (event, arg) => {
        getLogs(arg)
          .then((data) => {
            event.reply("getLogs", { success: true, data: data });
          })
          .catch((err) => {
            event.reply("getLogs", { success: false, error: err });
          });
      });

      if (app.isPackaged) compileLog.info("Creating window");
      const createWindow = () => {
        // Create the browser window.
        const mainWindow = new BrowserWindow({
          width: 600,
          height: 600,
          minWidth: 600,
          maxWidth: 800,
          minHeight: 600,
          maxHeight: 800,
          titleBarStyle: "hidden",

          webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
            allowRunningInsecureContent: true,
          },
        });
        mainWindow.setMenuBarVisibility(false);

        mainWindow.webContents.openDevTools();
        // and load the index.html of the app.
        mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
      };

      // This method will be called when Electron has finished
      // initialization and is ready to create browser windows.
      // Some APIs can only be used after this event occurs.
      app.on("ready", () => {
        if (app.isPackaged) compileLog.info("app is ready");
        createWindow();
      });

      // Quit when all windows are closed, except on macOS. There, it's common
      // for applications and their menu bar to stay active until the user quits
      // explicitly with Cmd + Q.
      app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
          app.quit();
        }
      });

      app.on("activate", () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
    })
    .catch((err) => {
      app.quit();
      compileLog.error("App not started");
      compileLog.error(err.toString());
      throw new Error(err.message);
    });
}
