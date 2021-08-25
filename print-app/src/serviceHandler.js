const { exec } = require("child_process");
const { resolve } = require("path");
const SERVICE_WRAPPER_PATH = __dirname + "/../static/service/";
const SERVICE_WRAPPER_PATH_WIN = SERVICE_WRAPPER_PATH + `service-wrapper.exe`;
const SERVICE_WRAPPER_PATH_MAC = SERVICE_WRAPPER_PATH + `service-mac.xml`;
const MAC_CONFIG_LOCATION = `~/Library/LaunchAgents/`;
const SERVICE_NAME = "webprintservice";
const isWin = process.platform === "win32";

let installServiceCommand,
  uninstallServiceCommand,
  startServiceCommand,
  stopServiceCommand,
  getStatCommand;

//Commands
if (isWin) {
  installServiceCommand = `${SERVICE_WRAPPER_PATH_WIN} install`;
  uninstallServiceCommand = `${SERVICE_WRAPPER_PATH_WIN} uninstall`;
  startServiceCommand = `${SERVICE_WRAPPER_PATH_WIN} start`;
  stopServiceCommand = `${SERVICE_WRAPPER_PATH_WIN} stop`;
  getStatCommand = `${SERVICE_WRAPPER_PATH_WIN} status`;
} else {
  installServiceCommand = undefined;
  uninstallServiceCommand = undefined;
  startServiceCommand = `sudo launchctl start`;
  stopServiceCommand = `sudo launchctl stop`;
  getStatCommand = undefined;
}

/**
 *
 * @param {String} command
 * @return {Promise}
 */
function execute(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

/**
 *
 * @param {install || uninstall || start || stop} command
 * @returns {Promise}
 */
function service(command) {
  let prom;
  switch (command) {
    case "install":
      prom = execute(installServiceCommand);
      break;
    case "uninstall":
      prom = new Promise((resolve, reject) => {
        execute(stopServiceCommand).then(() =>
          resolve(execute(uninstallServiceCommand))
        );
      });

    case "start":
      prom = execute(startServiceCommand);
      break;
    case "stop":
      prom = execute(stopServiceCommand);
      break;
    case "status":
      prom = execute(getStatCommand);
      break;
    default:
      throw new Error("Unknown command");
  }

  return new Promise((resolve, reject) => {
    prom.then(({ error, stdout, stderr }) => {
      if (error) {
        resolve({ success: false, error: error, dir: SERVICE_WRAPPER_PATH });
        return;
      }
      resolve({ success: true, stdout: stdout });
    });
  });
}

module.exports.service = service;
