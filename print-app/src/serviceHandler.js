const { exec } = require("child_process");
const SERVICE_WRAPPER_PATH = __dirname + "/static/service/service-wrapper.exe";
console.log(SERVICE_WRAPPER_PATH);
const installServiceCommand = `${SERVICE_WRAPPER_PATH} Install`;
const uninstallServiceCommand = `${SERVICE_WRAPPER_PATH} Uninstall`;
const startServiceCommand = `${SERVICE_WRAPPER_PATH} Start`;
const stopServiceCommand = `${SERVICE_WRAPPER_PATH} Stop`;

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
