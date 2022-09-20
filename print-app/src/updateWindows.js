const compileLog = require("electron-log");
const fs = require("fs");
const nodePath = require("path");
const nodeUrl = require("url");
const execSync = require("child_process").execSync;
const electron = require("electron");

const TMP_FOLDER_NAME = `update-tmp-dir`;
const STATIC_DIR_PATH = nodePath.join(
  __dirname.replaceAll(" ", "^ "),
  "static"
);

const USER_PROFILE_PATH = nodePath.join(STATIC_DIR_PATH, "user-profile.json");
const PRINTER_CONFIG_PATH = nodePath.join(
  STATIC_DIR_PATH,
  "printer-config.json"
);

// Set to true if the dialog for updating is already open
let globalDialogOpen = false;
let appHasUpdated = false;

// Setup update feed and events
/**
 *
 * @param {string} releasesFolder Path to folder to place update into
 * @param {string} tmpConfigFiles Path to where to save configuration files
 * @returns
 */
function updateEvents(releasesFolder, tmpConfigFiles) {
  return new Promise((finishedUpdateResolve, finishedUpdateReject) => {
    compileLog.info(releasesFolder);
    electron.autoUpdater.setFeedURL(releasesFolder);

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
    const saveFilesProm = saveServiceFiles(tmpConfigFiles).catch((err) => {
      compileLog.error(err.message);
    });

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
                electron.autoUpdater.checkForUpdates();
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

        electron.autoUpdater.on(
          "update-downloaded",
          (event, releaseNotes, releaseName) => {
            appHasUpdated = true;
            if (globalDialogOpen) return;
            globalDialogOpen = true;
            console.log("Update:)");
            compileLog.info("Update dialog");

            const dialogOpts = {
              type: "info",
              buttons: ["Restart", "Later"],
              title: "Application Update",
              message:
                process.platform === "win32" ? releaseNotes : releaseName,
              detail:
                "A new version has been downloaded. Restart the application to apply the updates.",
            };

            electron.dialog
              .showMessageBox(dialogOpts)
              .then((returnValue) => {
                if (returnValue.response === 0)
                  electron.autoUpdater.quitAndInstall();
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

        electron.autoUpdater.on("update-not-available", finishedUpdateResolve);
        electron.autoUpdater.on("error", (error) => {
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
 * @param {string} tmpConfigFiles Path where to save the configuration files
 * @returns {Promise} Promise that resolves when the apps files have been copied
 */
function saveServiceFiles(tmpConfigFiles) {
  return new Promise((resolve, reject) => {
    compileLog.info("Save service files");

    // Create dir in temp director

    try {
      fs.statSync(tmpConfigFiles);
    } catch (err) {
      // Will error if folder does not exist
      fs.mkdirSync(tmpConfigFiles);
    }

    // Remove any files from a previous update
    try {
      execSync("rm *", { cwd: tmpConfigFiles, shell: "cmd" });
    } catch (err) {
      // Means there are no files in directory
    }

    // Copy user files into tmp dir
    try {
      fs.statSync(USER_PROFILE_PATH);
      fs.copyFileSync(
        USER_PROFILE_PATH,
        nodePath.join(tmpConfigFiles, "user-profile.json")
      );
    } catch (err) {
      compileLog.error(err.message);
    }

    try {
      fs.statSync(PRINTER_CONFIG_PATH);
      fs.copyFileSync(
        PRINTER_CONFIG_PATH,
        nodePath.join(tmpConfigFiles, "printer-config.json")
      );
    } catch (err) {
      compileLog.error(err.message);
    }

    resolve();
  });
}

/**
 * @param {string} tmpConfigFiles Path to config files from previous version of the app
 * @returns {Promise} Promise that will resolve once the service files have been copied back into the app
 */
function replaceServiceFiles(tmpConfigFiles) {
  return new Promise((resolve, reject) => {
    try {
      fs.statSync(tmpConfigFiles);
      compileLog.info("Files found");
    } catch (err) {
      // If folder does not exist then return as there are no files to copy
      compileLog.info("No files to load");
      resolve("No files to copy");
      return;
    }

    // Remove any config files installed during the update
    try {
      fs.statSync(USER_PROFILE_PATH);
      fs.rmSync(USER_PROFILE_PATH);
    } catch (err) {
      compileLog.error(err.message);
    }

    try {
      fs.statSync(PRINTER_CONFIG_PATH);
      fs.rmSync(PRINTER_CONFIG_PATH);
    } catch (err) {
      compileLog.error(err.message);
    }

    try {
      fs.copyFileSync(
        nodePath.join(tmpConfigFiles, "user-profile.json"),
        USER_PROFILE_PATH
      );
    } catch (err) {
      compileLog.error(err.message);
    }

    try {
      fs.copyFileSync(
        nodePath.join(tmpConfigFiles, "printer-config.json"),
        PRINTER_CONFIG_PATH
      );
    } catch (err) {
      compileLog.error(err.message);
    }

    // Remove tmp files
    fs.rmSync(tmpConfigFiles, { recursive: true });

    resolve();
  });
}

module.exports.updateEvents = updateEvents;
module.exports.replaceServiceFiles = replaceServiceFiles;
