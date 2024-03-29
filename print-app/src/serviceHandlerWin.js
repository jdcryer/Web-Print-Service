const { exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

//System definitions
const SERVICE_ID = "webprintservice";
const PROGRAM_EXE_NAME = "web-print-service-win-x64.exe";

//Paths
const SERVICE_WRAPPER_DIR_PATH = path.join(
  __dirname.replaceAll(" ", "^ "),
  "static"
);

//Windows
const SERVICE_WRAPPER_EXE_PATH = path.join(
  SERVICE_WRAPPER_DIR_PATH,
  "service-wrapper.exe"
);
const SERVICE_WRAPPER_CONFIG_TEMPLATE_PATH = path.join(
  SERVICE_WRAPPER_DIR_PATH,
  "service-wrapper-template.xml"
);
const SERVICE_WRAPPER_CONFIG_PATH = path.join(
  SERVICE_WRAPPER_DIR_PATH,
  "service-wrapper.xml"
);
const SERVICE_WRAPPER_LOG_PATH = path.join(
  SERVICE_WRAPPER_DIR_PATH,
  `service-wrapper.wrapper.log`
);
const SERVICE_APP_LOG_PATH = path.join(
  SERVICE_WRAPPER_DIR_PATH,
  `service-wrapper.out.log`
);
const SERVICE_ERR_LOG_PATH = path.join(
  SERVICE_WRAPPER_DIR_PATH,
  `service-wrapper.err.log`
);

const STATUS_RUNNING = "running";
const STATUS_STOPPED = "stopped";
const STATUS_NOT_INSTALLED = "not_installed";

let state = "idle";

//Commands
const installServiceCommand = `${SERVICE_WRAPPER_EXE_PATH} install`;
const uninstallServiceCommand = `${SERVICE_WRAPPER_EXE_PATH} uninstall`;
const startServiceCommand = `${SERVICE_WRAPPER_EXE_PATH} start`;
const stopServiceCommand = `${SERVICE_WRAPPER_EXE_PATH} stop`;
const getStatCommand = `${SERVICE_WRAPPER_EXE_PATH} status`;

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
 * @returns {Promise} Promise
 */
function service(command) {
  let prom;
  // Post process is a function that will take the stdout from the command and process it into a more useful form
  // By defualt just returns stdout
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
      // When no wrapper has been created yet, we need to catch and return "not_installed" so the frontend makes the wrapper.
      if (
        error &&
        stdout.includes(
          "System.IO.FileNotFoundException: Unable to locate service-wrapper"
        ) &&
        command === "status"
      ) {
        resolve({ data: STATUS_NOT_INSTALLED });
        return;
      }
      if (error) {
        reject({
          error: error,
          stdout: stdout,
          stderr: stderr,
          dir: SERVICE_WRAPPER_DIR_PATH,
        });
        return;
      }

      resolve({ data: postProcess(stdout) });
    });
  });
}

async function init() {
  let attempts = 0;
  state = "Initialising";

  // Abritrary number, normaly should only take 2 commands to start: install and start
  // But more is added as the user could click "no" when admin is requested by the wrapper
  while (attempts < 6) {
    let commandRes;
    try {
      commandRes = await service("status");
    } catch (err) {
      // Service wrapper cannot be accessed so exit
      throw new Error(
        `Cannot access services 
      error: ${err.error}
      stdout: ${err.stdout}
      stderr: ${err.stderr}`
      );
    }
    console.log(commandRes.data);
    switch (commandRes.data) {
      case STATUS_NOT_INSTALLED:
        state = "Installing";
        try {
          commandRes = await service("install");
          state = "Installed";
        } catch (err) {
          console.error(`Cannot install service
    error: ${err.error}
    stdout: ${err.stdout}
    stderr: ${err.stderr}`);
        }
        break;
      case STATUS_STOPPED:
        state = "Starting";
        try {
          commandRes = await service("start");
          state = "Started";
        } catch (err) {
          console.error(`Cannot start service
    error: ${err.error}
    stdout: ${err.stdout}
    stderr: ${err.stderr}`);
        }
        break;
      case STATUS_RUNNING:
        state = "Running";
        return;
      default:
        throw new Error(`Unknown status`);
    }
    attempts++;
  }

  throw new Error(`Cannot install and start service`);
}

function makeWinConfigFile(domain, username, password) {
  return new Promise((resolve, reject) => {
    fs.readFile(
      SERVICE_WRAPPER_CONFIG_TEMPLATE_PATH,
      { encoding: "utf8" },
      (err, data) => {
        if (err) {
          reject({ success: false, error: err });
          return;
        }
        const configFile = data
          .replaceAll("**DOMAIN**", domain)
          .replaceAll("**USERNAME**", username)
          .replaceAll("**PASSWORD**", password);
        fs.writeFile(
          SERVICE_WRAPPER_CONFIG_PATH,
          configFile,
          {
            encoding: "utf8",
          },
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve({ success: true, error: "" });
          }
        );
      }
    );
  });
}

// Uninstall the service from tmp directory
function finalUninstall() {
  try {
    execSync(
      `powershell -command "Invoke-WebRequest -Uri 'http://localhost:3001/uninstall'"`
    );
  } catch (err) {
    console.log("Failed to send uninstall request to service");
  }

  const folderName = `WebPrintService-${Date.now()}`;
  const dirPath = path.join(os.tmpdir(), folderName);

  const wrapperExe = fs.readFileSync(SERVICE_WRAPPER_EXE_PATH);

  const wrapperConfig = `<service>
<name>Web Print Service</name>
<id>WebPrintService</id>

<!-- Path to the executable, which should be started -->
<!-- CAUTION: Don't put arguments here. Use <arguments> instead. -->
<executable>${path.join(dirPath, PROGRAM_EXE_NAME)}</executable>
<description>This is the service</description>
<workingdirectory>%BASE%\\</workingdirectory>
</service>`;

  fs.mkdirSync(dirPath);
  fs.writeFileSync(path.join(dirPath, "service-wrapper.exe"), wrapperExe);
  fs.writeFileSync(path.join(dirPath, "service-wrapper.xml"), wrapperConfig);
  fs.writeFileSync(
    path.join(dirPath, PROGRAM_EXE_NAME),
    fs.readFileSync(path.join(SERVICE_WRAPPER_DIR_PATH, PROGRAM_EXE_NAME))
  );

  try {
    execSync("service-wrapper.exe stop", {
      cwd: dirPath,
      timeout: 4000,
    });
    execSync("service-wrapper.exe uninstall", {
      cwd: dirPath,
      timeout: 4000,
    });
  } catch (e) {
    path.join(dirPath, "uninstall-error.txt"), "error " + e, { flag: "a" };
    return;
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
module.exports.makeWinConfigFile = makeWinConfigFile;
module.exports.init = init;
