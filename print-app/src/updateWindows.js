const compileLog = require("electron-log");
const os = require("os");
const fs = require("fs");
const nodePath = require("path");
const nodeUrl = require("url");
const electronDialog = require("electron").dialog;
const { autoUpdater } = require("electron");
const execSync = require("child_process").execSync;
const doServiceCommand = require("./serviceHandlerWin").service;

const TMP_FOLDER_NAME = `print-service-update`;
const TMP_PATH = nodePath.join(os.tmpdir(), TMP_FOLDER_NAME);
const STATIC_DIR_PATH = nodePath.join(
  __dirname.replaceAll(" ", "^ "),
  "static"
);

// Set to true if the dialog for updating is already open
let globalDialogOpen = false;

// Setup update feed and events
function updateEvents(releasesFolder) {
  return new Promise((finishedUpdateResolve, finishedUpdateReject) => {
    compileLog.info(releasesFolder);
    autoUpdater.setFeedURL(releasesFolder);

    //Remove all files in directory
    try {
      execSync("rm *", { cwd: releasesFolder, shell: "cmd" });
    } catch (err) {}

    // Download file from server
    const serverPath = new nodeUrl.URL(
      `http://localhost:5500/latest/WebPrintService.zip`
    );

    const zipName = nodePath.join(releasesFolder, "WebPrintService.zip");
    const zipFile = fs.createWriteStream(zipName);

    const finishDownLoadProm = new Promise((resolve, reject) => {
      require("http")
        .get(serverPath, (response) => {
          compileLog.info("http callback");
          response.pipe(zipFile);

          zipFile.on("finish", function () {
            zipFile.close(() => {
              fs.createReadStream(zipName)
                // The modeule unzipper is used here to extract the zip file
                .pipe(require("unzipper").Extract({ path: releasesFolder }))
                .on("finish", resolve)
                .on("error", (err) => {
                  compileLog.error(err.message);
                  reject(err);
                });
            });
          });
        })
        .on("error", function (err) {
          compileLog.error(err.message);
        });
    });

    // Save files and stop service
    compileLog.info("Starting file save");
    const saveFilesProm = saveServiceFiles().catch((err) => {
      compileLog.error(err.message);
    });
    let fileExist = {};

    finishDownLoadProm
      .then(() => {
        compileLog.info("Finished downloading");
        try {
          fs.statSync(nodePath.join(releasesFolder, "RELEASES"));
          if (!globalDialogOpen) {
            compileLog.info("Started updated check");
            saveFilesProm
              .then((res) => {
                compileLog.info("Successfully saved files");
                fileExist = res;
                autoUpdater.checkForUpdates();
              })
              .catch((err) => {
                compileLog.error(err.message);
              });
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
              message:
                process.platform === "win32" ? releaseNotes : releaseName,
              detail:
                "A new version has been downloaded. Restart the application to apply the updates.",
            };

            electronDialog
              .showMessageBox(dialogOpts)
              .then((returnValue) => {
                if (returnValue.response === 0) autoUpdater.quitAndInstall();
                finishedUpdateResolve();
              })
              .catch((err) => {
                compileLog.error(err.message);
                finishedUpdateReject(err);
              })
              .finally(() => {
                globalDialogOpen = false;
              });
          }
        );

        autoUpdater.on("update-not-available", finishedUpdateResolve);
        autoUpdater.on("error", (error) => {
          compileLog.error(error.message);
          finishedUpdateReject();
        });
      })
      .catch(() => {
        compileLog.info("Could not update");
      });
  });
}

// steps to take when update is triggered
/**
 * @returns {Promise} Promise that resolves when the apps files have been copied
 */
function saveServiceFiles() {
  return new Promise((resolve, reject) => {
    compileLog.info("Save service files");

    // Create dir in temp director

    try {
      // Remove any files from a previous update
      fs.statSync(TMP_PATH);
      execSync("rm *", { cwd: TMP_PATH, shell: "cmd" });
    } catch (err) {
      // Will error if folder does not exist
      fs.mkdirSync(TMP_PATH);
    }

    // Copy user files into tmp dir

    const userProfilePath = nodePath.join(STATIC_DIR_PATH, "user-profile.json");
    const printerConfigPath = nodePath.join(
      STATIC_DIR_PATH,
      "printer-config.json"
    );

    // Check File exists and copy
    filesExist = { userProfile: true, printerConfig: true };
    try {
      fs.statSync(userProfilePath);
      fs.copyFileSync(
        userProfilePath,
        nodePath.join(TMP_PATH, "user-profile.json")
      );
    } catch (err) {
      compileLog.error(err.message);
      filesExist.userProfile = false;
    }

    try {
      fs.statSync(printerConfigPath);
      fs.copyFileSync(
        printerConfigPath,
        nodePath.join(TMP_PATH, "printer-config.json")
      );
    } catch (err) {
      compileLog.error(err.message);
      filesExist.printerConfig = false;
    }

    resolve(filesExist);
  });
}

/**
 *
 * @returns {Promise} Promise that will resolve once the service files have been copied back into the app
 */
function replaceServiceFiles() {
  return new Promise((resolve, reject) => {
    try {
      fs.statSync(TMP_PATH);
      compileLog.info("Files found");
    } catch (err) {
      // If folder does not exist then return as there are no files to copy
      compileLog.info("No files to load");
      resolve("No files to copy");
      return;
    }

    execSync(`cp ${nodePath.join(TMP_PATH, "*")} ${STATIC_DIR_PATH}`);

    execSync("rm print-service-update -r", { shell: "cmd" });
  });
}

module.exports.updateEvents = updateEvents;
module.exports.replaceServiceFiles = replaceServiceFiles;
