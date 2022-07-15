const { exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { resolve } = require("path");

//System definitions
const SERVICE_NAME = "webprintservice";
const isWin = process.platform === "win32";

//Paths
const STATIC_PATH = __dirname + "/static";
const SERVICE_WRAPPER_PATH = __dirname + "/static/";

//Windows
const SERVICE_WRAPPER_PATH_WIN =
  process.platform === "win32"
    ? `${path.join(
        SERVICE_WRAPPER_PATH.replace(" ", "^ "),
        "service-wrapper.exe"
      )}`
    : `${path.join(
        SERVICE_WRAPPER_PATH.replace(" ", "\\ "),
        "service-wrapper.exe"
      )}`;
const SERVICE_WRAPPER_LOG_PATH =
  SERVICE_WRAPPER_PATH + `service-wrapper.wrapper.log`;
const SERVICE_APP_LOG_PATH = SERVICE_WRAPPER_PATH + `service-wrapper.out.log`;
const SERVICE_ERR_LOG_PATH = SERVICE_WRAPPER_PATH + `service-wrapper.err.log`;

//Mac
const SERVICE_WRAPPER_PATH_MAC = SERVICE_WRAPPER_PATH + `service-mac.xml`;
const MAC_CONFIG_LOCATION = `~/Library/LaunchAgents/`;

const STATUS_RUNNING = "running";
const STATUS_STOPPED = "stopped";
const STATUS_NOT_INSTALLED = "not_installed";

let state = "idle";

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

function formatStatus(s) {
  s = s.toLowerCase();
  if (s.includes("started")) {
    return STATUS_RUNNING;
  }
  if (s.includes("stopped")) {
    return STATUS_STOPPED;
  }
  if (s.includes("nonexistent")) {
    return STATUS_NOT_INSTALLED;
  }
  return s;
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
      // The wrapper considers NonExistent an error when running status so we just ignore the "error"
      if (error && !stdout.includes("NonExistent")) {
        resolve({
          success: false,
          error: error,
          stdout: stdout,
          stderr: stderr,
          dir: SERVICE_WRAPPER_PATH,
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

function makeConfigFile(domain, username, password) {
  return new Promise((resolve, reject) => {
    fs.readFile(
      "static/service-wrapper-template.xml",
      { encoding: "utf8" },
      (err, data) => {
        if (err) {
          reject({ success: "false", error: err });
        }
        const configFile = data
          .replace("**DOMAIN**", domain)
          .replace("**USERNAME**", username)
          .replace("**PASSWORD**", password);
        fs.writeFile(
          "static/service-wrapper.xml",
          configFile,
          {
            encoding: "utf8",
          },
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve({ success: "true", error: "" });
          }
        );
      }
    );
  });
}

// Uninstall the service from tmp directory
function finalUninstall() {
  const folderName = `WebPrintService-${Date.now()}`;
  const dirPath = path.join(os.tmpdir(), folderName);

  const wrapperExe = fs.readFileSync(
    path.join(__dirname, "/static/service-wrapper.exe")
  );
  /*
  const wrapperConfig = `<service>
  <name>Web Print Service</name>
  <id>WebPrintService</id>

  <!-- Path to the executable, which should be started -->
  <!-- CAUTION: Don't put arguments here. Use <arguments> instead. -->
  <executable>${path.join(dirPath, "web-print-service-win.exe")}</executable>
  <description>This is the service</description>
  <workingdirectory>${dirPath}\\</workingdirectory>
</service>`;
*/

  const wrapperConfig = `<service>
<name>Web Print Service</name>
<id>WebPrintService</id>

<!-- Path to the executable, which should be started -->
<!-- CAUTION: Don't put arguments here. Use <arguments> instead. -->
<executable>${path.join(dirPath, "web-print-service-win.exe")}</executable>
<description>This is the service</description>
<workingdirectory>%BASE%\\</workingdirectory>
</service>`;

  fs.mkdirSync(dirPath);
  fs.writeFileSync(path.join(dirPath, "service-wrapper.exe"), wrapperExe);
  fs.writeFileSync(path.join(dirPath, "service-wrapper.xml"), wrapperConfig);
  fs.writeFileSync(
    path.join(dirPath, "web-print-service-win.exe"),
    fs.readFileSync(SERVICE_WRAPPER_PATH_WIN)
  );

  try {
    execSync("service-wrapper.exe uninstall", {
      cwd: dirPath,
      timeout: 4000,
    });
    /*
    execSync("service-wrapper.exe stop --no-wait", {
      cwd: dirPath,
      timeout: 4000,
    });
    */
  } catch (e) {
    path.join(dirPath, "uninstall-error.txt"), "error " + e, { flag: "a" };
  }
  fs.writeFileSync(
    path.join(dirPath, "success.txt"),
    "Service removed successfully"
  );
}

/**
 * @param {String} from Can be either application, wrapper or error
 * @return {Promise}
 */
function getLogs(from) {
  const path = new Map();
  path.set("application", SERVICE_APP_LOG_PATH);
  path.set("wrapper", SERVICE_WRAPPER_LOG_PATH);
  path.set("error", SERVICE_ERR_LOG_PATH);

  return new Promise((resolve, reject) => {
    fs.readFile(path.get(from), `utf8`, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

module.exports.service = service;
module.exports.finalUninstall = finalUninstall;
module.exports.getLogs = getLogs;
module.exports.getState = () => {
  return state;
};
module.exports.SERVICE_WRAPPER_PATH = SERVICE_WRAPPER_PATH;
module.exports.makeConfigFile = makeConfigFile;
module.exports.init = init;
