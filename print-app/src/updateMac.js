const { autoUpdater, dialog } = require("electron");
const compileLog = require("electron-log");

const { service } = require("./serviceHandlerMac");
const feedURL = `http://localhost:3002/out/test.json`;

function updateEvents() {
  return new Promise((finishedUpdateResolve, finishedUpdateReject) => {
    service("update")
      .then((data) => {
        compileLog.info(`Made update.txt: ${JSON.stringify(data)}`);
        compileLog.info(feedURL);
        autoUpdater.setFeedURL({ url: feedURL, serverType: "json" });
        compileLog.info(autoUpdater.getFeedURL());
        autoUpdater.checkForUpdates();

        autoUpdater.on(
          "update-downloaded",
          (event, releaseNotes, releaseName) => {
            console.log("Update:)");
            compileLog.info("Update window");
            compileLog.info("About to uninstall service.");
            service("uninstall")
              .then((data) => {
                compileLog.info(`Uninstalled service: ${JSON.stringify(data)}`);
                autoUpdater.quitAndInstall();
              })
              .catch((data) => {
                compileLog.info(
                  `Failed to uninstall service: ${JSON.stringify(data)}`
                );
                const dialogOpts = {
                  type: "error",
                  buttons: ["Okay"],
                  title: "Application Update Error",
                  message: "Web Print Service",
                  detail:
                    "The service could not be uninstalled while applying an update. Please seek support.",
                };

                dialog.showMessageBox(dialogOpts);
              });
          }
        );
      })
      .catch((data) => {
        compileLog.info(`Something went wrong: ${JSON.stringify(data)}`);
        finishedUpdateReject();
      });

    autoUpdater.on("update-not-available", finishedUpdateResolve);

    autoUpdater.on("error", (message) => {
      compileLog.error("Uh oh");
      compileLog.error(message);
      finishedUpdateReject();
    });
  });
}

function replaceServiceFiles() {}

module.exports.updateEvents = updateEvents;
module.exports.replaceServiceFiles = replaceServiceFiles;

/*
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
}*/
