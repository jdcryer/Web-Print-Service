const compileLog = require("electron-log");
const fs = require("fs");
const nodePath = require("path");
const nodeUrl = require("url");
const electronDialog = require("electron").dialog;
const { autoUpdater } = require("electron");
const execSync = require("child_process").execSync;

// Set to true if the dialog for updating is already open
let globalDialogOpen = false;

// Setup update feed and events
async function updateEvents(releasesFolder) {
  compileLog.info(releasesFolder);
  autoUpdater.setFeedURL(releasesFolder);

  //Remove all files in directory
  execSync("rm *", { cwd: releasesFolder, shell: "cmd" });

  // Download file from server
  const serverPath = new nodeUrl.URL(
    `http://localhost:5500/latest/WebPrintService.zip`
  );

  const unzipper = require("unzipper");
  const zipName = nodePath.join(releasesFolder, "WebPrintService.zip");
  const zipFile = fs.createWriteStream(zipName);

  const finishDownLoadProm = new Promise((resolve, reject) => {
    require("http")
      .get(serverPath, (response) => {
        response.pipe(zipFile);

        zipFile.on("finish", function () {
          zipFile.close(() => {
            fs.createReadStream(zipName)
              .pipe(unzipper.Extract({ path: releasesFolder }))
              .on("finish", resolve)
              .on("error", (err) => {
                compileLog.error(err.message);
                reject();
              });
          });
        });
      })
      .on("error", function (err) {
        compileLog.error(err.message);
      });
  });

  finishDownLoadProm
    .then(() => {
      compileLog.info("Finished downloading");
      try {
        fs.statSync(nodePath.join(releasesFolder, "RELEASES"));
        if (!globalDialogOpen) {
          compileLog.info("Started updated check");
          autoUpdater.checkForUpdates();
          compileLog.info("Ended updated check");
        } else {
          compileLog.info("Dialog already open");
        }
      } catch (err) {
        compileLog.info(
          "No RELEASES file has been file, skipping update check"
        );
      }

      autoUpdater.on(
        "update-downloaded",
        (event, releaseNotes, releaseName) => {
          if (globalDialogOpen) return;
          globalDialogOpen = true;
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

          electronDialog
            .showMessageBox(dialogOpts)
            .then((returnValue) => {
              if (returnValue.response === 0) autoUpdater.quitAndInstall();
            })
            .catch((err) => {
              compileLog.error(err.message);
            })
            .finally(() => {
              globalDialogOpen = false;
            });
        }
      );
    })
    .catch(() => {
      compileLog.info("Could not update");
    });
}

console.log(
  "\n---------------------------PROGRAM LOG START---------------------------"
);

// steps to take when update is triggered
async function saveServiceFiles() {
  const os = require("os");
  const fs = require("fs");

  // Create dir in temp director
  //Place to store temp files
  const tmpPath = path.join(os.tmpdir(), `print-service-update-${Date.now()}`);
  fs.mkdirSync(tmpPath);

  // Copy user files into tmp dir
  const staticDirPath = path.join(
    __dirname.replaceAll(" ", "^ "),
    "static"
  );

  fs.copyFileSync(nodePath.join(staticDirPath, "user-profile.json");

  // Start process that will run the installer
  // Kill this process
}

module.exports.saveServiceFiles = saveServiceFiles;
module.exports.updateEvents = updateEvents;
