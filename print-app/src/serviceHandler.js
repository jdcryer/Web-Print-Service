const { exec } = require("child_process");
const fs = require("fs");

//System definitions
const SERVICE_NAME = "webprintservice";
const isWin = process.platform === "win32";

//Paths
const SERVICE_WRAPPER_PATH = __dirname + "/static/service/";

//Windows
const SERVICE_WRAPPER_PATH_WIN = SERVICE_WRAPPER_PATH + `service-wrapper.exe`;
const SERVICE_WRAPPER_LOG_PATH = SERVICE_WRAPPER_PATH + `service-wrapper.wrapper.log`;
const SERVICE_APP_LOG_PATH = SERVICE_WRAPPER_PATH + `service-wrapper.out.log`;
const SERVICE_ERR_LOG_PATH = SERVICE_WRAPPER_PATH + `service-wrapper.err.log`;


//Mac
const SERVICE_WRAPPER_PATH_MAC = SERVICE_WRAPPER_PATH + `service-mac.xml`;
const MAC_CONFIG_LOCATION = `~/Library/LaunchAgents/`;



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
 * @param {String} command Can be either install, uninstall, start, stop
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


/**
 * @param {String} from Can be either application, wrapper or error
 * @return {Promise}
 */
function getLogs(from){
  const path = new Map();
  path.set("application", SERVICE_APP_LOG_PATH);
  path.set("wrapper", SERVICE_WRAPPER_LOG_PATH);
  path.set("error", SERVICE_ERR_LOG_PATH);
  
  return new Promise((resolve, reject) => {
    fs.readFile(path.get(from), `utf8`, (err, data) => {
      if(err) reject(err);
      else resolve(data);    
    })
  });
}

module.exports.service = service;
module.exports.getLogs = getLogs;
