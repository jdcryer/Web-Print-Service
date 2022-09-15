const printerHandler = require("@thiagoelg/node-printer");
const fs = require("fs");
const { print } = require("unix-print");
const { exec } = require("child_process");
const homeDir = require("os").homedir();

/**
 *
 * @param {String} command
 * @return {Promise}
 */
function execute(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject({ error, stderr });
      resolve({ stdout });
    });
  });
}

const PRINT_CONFIG_PATH =
  process.platform === "darwin"
    ? `${homeDir}/Library/Application Support/Web Print Service/service/printer-config.json`
    : process.cwd() + "/printer-config.json";

const UNINSTALLER_CONFIG_PATH =
  process.platform === "darwin"
    ? `${homeDir}/Library/Application Support/Web Print Service/service/printer-config.txt`
    : false;

const EDITABLE_ATTRIBUTES = ["displayName", "acceptedTypes", "enabled"];
const PRINT_WRAPPER_PATH = `"${process.cwd()}\\static\\PDFtoPrinter.exe"`;

function writeUninstallPrinterFile(ids) {
  if (!UNINSTALLER_CONFIG_PATH) return;
  fs.writeFileSync(UNINSTALLER_CONFIG_PATH, ids);
}

class PrinterConnector {
  constructor() {
    this.config = [];
    try {
      fs.statSync(PRINT_CONFIG_PATH);
      this.config = JSON.parse(fs.readFileSync(PRINT_CONFIG_PATH, "utf-8"));
    } catch (err) {
      fs.writeFileSync(PRINT_CONFIG_PATH, JSON.stringify(this.config));
      writeUninstallPrinterFile(this.config.map((x) => x.id).join(","));
    }
  }

  getConfig() {
    let printersConfig, //Stores current configuration of printers
      printersStatus; //Stores status of printers to be applied onto the current config to update it
    //If a printer appears in status but is not in config it means its a new printer so a new entry is created with new default settings
    printersStatus = printerHandler.getPrinters();
    if (!printersStatus) {
      throw new Error("Cannot get printers status");
    }
    printersConfig = this.config;

    printersConfig = printersStatus.map((printer) => {
      let status = {
        name: printer.name,
        shareName: printer.shareName,
        statusNumber: printer.statusNumber,
        online:
          printer?.attributes?.find((x) => x == "OFFLINE") != undefined
            ? false
            : true,
      };

      let c = printersConfig.find((x) => x.name == printer.name);
      let out = {};
      if (!c) {
        //This means the printer is new and has no config
        out = {
          ...status,
          enabled: false,
          displayName: printer.displayName,
          acceptedTypes: [],
        };
      } else {
        out = { ...c, ...status };
      }

      return out;
    });

    // Can get current print width to do checks
    /*
    if (process.platform === "win32") {
      //execSync(`Get-CimInstance -ClassName Win32_PrinterConfiguration | Where-Object {$_.Name -eq "${}"} | Select-Object -Property PaperWidth`)
    } else {}
    */

    this.#saveConfig(printersConfig);
    this.config = printersConfig;
    return printersConfig;
  }

  sendPrint(printerName, data, printType) {
    return new Promise((resolve, reject) => {
      let p = this.#getPrinterConfig(printerName);
      if (p == undefined) {
        reject("printer does not exist");
        return;
      }

      if (p.enabled == false) {
        reject("printer disabled");
        return;
      }

      if (p.acceptedTypes.find((x) => x == printType) === undefined && false) {
        reject(
          `Printer only accepts print types of ${p.acceptedTypes} not ${printType}`
        );
        return;
      }
      if (process.platform === "win32") {
        console.log("Printing using PDFtoPrinter");
        execute(`${PRINT_WRAPPER_PATH} output.pdf "${printerName}"`)
          .then(resolve)
          .catch((e) => console.log(e.error));
      } else {
        console.log("Printing using CUPS");
        print("output.pdf", printerName, ["-o portrait"])
          .then(resolve)
          .catch(console.log);
      }
    });
  }

  addPrinter(name, id, displayName) {
    const index = this.getConfig().findIndex((x) => x.name === name);
    if (index === -1) {
      console.error(`Could not match printer name "${name}" to a printer`);
      return false;
    }
    this.config[index].displayName = displayName;
    this.config[index].id = id;
    this.config[index].enabled = true;
    this.#saveConfig(this.config);
    return true;
  }
  getPrinterById(id) {
    // Given a printer name and ID
    return this.getConfig().find((x) => x.id === id);
  }

  editPrinter(name, data) {
    this.config = this.getConfig();
    const pIndex = this.config.findIndex((x) => x.name == name);
    const p = this.config[pIndex];

    Object.keys(data).forEach((key) => {
      if (EDITABLE_ATTRIBUTES.find((x) => x === key) === undefined)
        throw `Cannot change attribute ${key}.`;
      p[key] = data[key];
    });
    this.config[pIndex] = p;
    this.#saveConfig(this.config);
  }

  removePrinter(id) {
    const index = this.getConfig().findIndex((x) => x.id === id);
    if (index === -1) {
      console.error(`Could not match printer id "${id}" to a printer`);
      return false;
    }
    this.config[index].id = undefined;
    this.config[index].enabled = false;
    this.#saveConfig(this.config);
    return true;
  }

  #getPrinterConfig(name) {
    return this.getConfig().find((x) => x.name == name);
  }

  #saveConfig(config) {
    fs.writeFileSync(PRINT_CONFIG_PATH, JSON.stringify(config));
    writeUninstallPrinterFile(config.map((x) => x.id).join(","));
  }
}

module.exports.default = PrinterConnector;
