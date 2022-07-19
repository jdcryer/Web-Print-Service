const { exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

//System definitions

//Paths
const SERVICE_NAME = `com.telekinetix.webprintservice`;
const SERVICE_CONFIG_NAME = `${SERVICE_NAME}.plist`;

const SERVICE_CONFIG_DIR_PATH = path.join(__dirname, `static`);

const SERVICE_CONFIG_TEMPLATE_PATH = path.join(
  SERVICE_CONFIG_DIR_PATH,
  `service-config-template.plist`
);
const SERVICE_CONFIG_PATH = path.join(
  SERVICE_CONFIG_DIR_PATH,
  SERVICE_CONFIG_NAME
);

const SERVICE_APP_LOG_PATH = path.join(
  SERVICE_CONFIG_DIR_PATH,
  `service.out.log`
);
const SERVICE_ERR_LOG_PATH = path.join(
  SERVICE_CONFIG_DIR_PATH,
  `service.err.log`
);

const SERVICE_INSTALL_PATH = path.join(
  `/Users/${process.env.USER}/Library/LaunchAgents/`,
  SERVICE_CONFIG_NAME
);

const STATUS_RUNNING = "running";
const STATUS_STOPPED = "stopped";
const STATUS_NOT_INSTALLED = "not_installed";

let state = "idle";

const esc = (str) => str.replaceAll(` `, `\\ `);
//Commands
const installServiceCommand = `cp ${esc(SERVICE_CONFIG_PATH)} ${esc(
  SERVICE_INSTALL_PATH
)} && launchctl load ${esc(SERVICE_INSTALL_PATH)}`;
const uninstallServiceCommand = `launchctl unload ${esc(SERVICE_INSTALL_PATH)}`;
const startServiceCommand = `launchctl start ${SERVICE_NAME}`;
const stopServiceCommand = `launchctl stop ${SERVICE_NAME}`;
const getStatCommand = `launchctl list | grep ${SERVICE_NAME}`;

function formatStatus(s) {
  if (s.length === 0) {
    return STATUS_NOT_INSTALLED;
  }
  s = s.split(` `); // split on tabs
  if (s[0] === `-`) {
    return STATUS_STOPPED;
  } else {
    return STATUS_RUNNING;
  }
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
 * @param {String} command Can be either install, uninstall, start, stop or status
 * @returns {Promise}
 */
function service(command) {
  let prom;
  let postProcess = (out) => out;
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
      break;
    case "start":
      prom = execute(startServiceCommand);
      break;
    case "stop":
      prom = execute(stopServiceCommand);
      break;
    case "status":
      postProcess = formatStatus;
      prom = execute(getStatCommand);
      break;
    default:
      throw new Error("Unknown command");
  }

  return new Promise((resolve, reject) => {
    prom.then(({ error, stdout, stderr }) => {
      if (error && error.code !== 1) {
        reject({
          success: false,
          error: error,
          stdout: stdout,
          stderr: stderr,
          dir: SERVICE_CONFIG_DIR_PATH,
        });
        return;
      }
      resolve({ success: true, data: postProcess(stdout) });
    });
  });
}

function init(failedAttempts, attempts) {
  if (failedAttempts > 5 || attempts > 20) {
    throw new Error("Too many failed attempts");
  }
  return new Promise((resolve, reject) => {
    state = "Initialising";
    //Check current status
    service("status").then((res) => {
      //If somehow this fails give up on installing/starting as theres something majorly wrong
      if (res.success == false) {
        reject(
          `Cannot access services, error: ${res.error}\nstdout: ${res.stdout}\nstderr: ${res.stderr}`
        );
        return;
      } else {
        //Check to see if installed
        if (res.data === STATUS_NOT_INSTALLED) {
          //Install service
          state = "Installing";
          service("install").then((data) => {
            if (data.success == true) {
              state = "Installed";
              init(failedAttempts, attempts);
            } else {
              reject(data);
            }
          });
        } else if (res.data === STATUS_STOPPED) {
          state = "Starting";
          service("start").then((data) => {
            if (data.success == true) {
              state = "Running";
              resolve({ success: true });
            } else {
              reject(data);
            }
          });
        } else if (res.data === STATUS_RUNNING) {
          state = "Running";
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `Do not recognise ${res.data}` });
        }
      }
    });
  });
}

function makeMacConfigFile() {
  return new Promise((resolve, reject) => {
    fs.readFile(
      SERVICE_CONFIG_TEMPLATE_PATH,
      { encoding: "utf8" },
      (err, data) => {
        if (err) {
          reject({ success: false, error: err });
          return;
        }
        const configFile = data.replaceAll("**PATH**", SERVICE_CONFIG_DIR_PATH);
        fs.writeFile(
          SERVICE_CONFIG_PATH,
          configFile,
          {
            encoding: "utf8",
          },
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve({ success: true });
          }
        );
      }
    );
  });
}

const logPath = new Map();
logPath.set("application", SERVICE_APP_LOG_PATH);
logPath.set("error", SERVICE_ERR_LOG_PATH);
/**
 * @param {String} from Can be either application, wrapper or error
 * @return {Promise}
 */
function getLogs(from) {
  return new Promise((resolve, reject) => {
    fs.readFile(logPath.get(from), `utf8`, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

module.exports.service = service;
module.exports.getLogs = getLogs;
module.exports.getState = () => {
  return state;
};
module.exports.makeMacConfigFile = makeMacConfigFile;
module.exports.init = init;
