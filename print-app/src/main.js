const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const axios = require("axios");
const { exec, spawn } = require("child_process");
const { resolve } = require("path");

function formatError(data) {
  return `${data.error}\nstdout:${data.stdout}\nstderr: ${data.stderr}\n`;
}

if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

function getWinUserInfo() {
  return new Promise((resolve, reject) => {
    exec(`powershell -command "whoami"`, (err, stdout, stderr) => {
      if (err) {
        reject({
          success: false,
          error: `Error in getting win user information: ${formatError(err)}`,
        });
        return;
      }
      let username, domain;
      [domain, username] = stdout.replace("\r\n", "").split("\\");
      resolve({
        success: true,
        username: username,
        domain: domain,
      });
    });
  });
}

function handleSquirrelEvent() {
  if (process.argv.length === 1) {
    return false;
  }

  const { finalUninstall } = require("./serviceHandler");

  const appFolder = path.resolve(process.execPath, "..");
  const mainFolder = path.resolve(appFolder, "..");
  const updateDotExe = path.join(mainFolder, "Update.exe");
  const exeName = path.basename(process.execPath);

  const spawn = function (command, args) {
    let spawnedProcess;

    try {
      spawnedProcess = spawn(command, args, { detached: true });
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
    case "--squirrel-updated":
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(["--createShortcut", exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case "--squirrel-uninstall":
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
  }
}

if (!handleSquirrelEvent()) {
  const {
    service,
    getLogs,
    getState,
    init,
    makeConfigFile,
  } = require("./serviceHandler");

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
        event.reply("status", data);
      })
      .catch((data) => {
        console.log(`Error: ${formatError(data)}`);
        event.reply("install", data);
        throw new Error(`Error: ${formatError(data)}`);
      });
  });

  ipcMain.on("username", (event, arg) => {
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
    getWinUserInfo()
      .then((data) => {
        makeConfigFile(data.domain, data.username, arg.password)
          .then((data) => {
            event.reply("makeConfigFile", data);
          })
          .catch((data) => {
            const errString = "Error making config file:" + data.error;
          });
      })
      .catch((data) => {
        const errString = "Error getting windows user info:" + data;
        event.reply("makeConfigFile", data);
        console.log(errString);
        throw new Error(errString);
      });
  });

  ipcMain.on("startServiceHandlerUpdate", (event, arg) => {
    serviceHandlerUpdateInt = setInterval(() => {
      event.reply("serviceHandlerState", getState());
    }, 200);
    console.log(
      "---------------------------PROGRAM LOG START---------------------------"
    );
    init(0, 0)
      .then((data) => {
        if (data.success) clearInterval(serviceHandlerUpdateInt);
        event.reply("serviceHandlerState", getState());
        console.log(data);
      })
      .catch((err) => {
        const strErr = `Fatal error in service handling:\nstdout: ${err.stdout}\nstderr: ${err.stderr} \nerror: ${err.error}`;
        console.log(strErr);
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

  // Handle creating/removing shortcuts on Windows when installing/uninstalling.

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

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and import them here.
}
