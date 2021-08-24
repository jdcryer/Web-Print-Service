const { exec } = require("child_process");
const SERVICE_WRAPPER_PATH = __dirname + "/static/service/";
const SERVICE_WRAPPER_PATH_WIN = SERVICE_WRAPPER_PATH + `service-wrapper.exe`;
const SERVICE_WRAPPER_PATH_MAC = SERVICE_WRAPPER_PATH + `service-mac.xml`
const MAC_CONFIG_LOCATION = `~/Library/LaunchAgents/`;
const SERVICE_NAME = "webprintservice";
const isWin = process.platform === "win32";


let installServiceCommand,
  uninstallServiceCommand,
  startServiceCommand,
  stopServiceCommand;

//Commands
if (isWin) {
  installServiceCommand = `${SERVICE_WRAPPER_PATH_WIN} Install`;
  uninstallServiceCommand = `${SERVICE_WRAPPER_PATH_WIN} Uninstall`;
  startServiceCommand = `${SERVICE_WRAPPER_PATH_WIN} Start`;
  stopServiceCommand = `${SERVICE_WRAPPER_PATH_WIN} Stop`;
} else {
  installServiceCommand = undefined;
  uninstallServiceCommand = undefined;
  startServiceCommand = `sudo launchctl start`;
  stopServiceCommand = `sudo launchctl stop`;
}

function execute(command, callback) {
  exec(command, (error, stdout, stderr) => {
    callback(stdout, stderr);
  });
}

/**
 *
 * @param {install || uninstall || start || stop} command
 * @param {(stdout, stderr)} callback
 * @returns
 */
function service(
  command,
  callback = (stdout, stderr) => {
    console.log(stdout);
    console.error(stderr);
  }
) {
  switch (command) {
    case "install":
      execute(installServiceCommand, callback);
      return;
    case "uninstall":
      execute(stopServiceCommand, callback);
      execute(uninstallServiceCommand, callback);
      return;
    case "start":
      execute(startServiceCommand, callback);
      return;
    case "stop":
      execute(stopServiceCommand, callback);
      return;
    default:
      throw new Error("Unknown command");
  }
}

module.exports.service = service;
