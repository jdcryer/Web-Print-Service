const printerHandler = require("@thiagoelg/node-printer");
const fs = require("fs");
const { print } = require("pdf-to-printer");
const PRINT_CONFIG_PATH = process.cwd() + "/printer-config.json";
const EDITABLE_ATTRIBUTES = ["displayName", "acceptedTypes", "enabled"];

class PrinterConnector {
  constructor() {
    this.config = [];
    try {
      fs.statSync(PRINT_CONFIG_PATH);
      this.config = JSON.parse(fs.readFileSync(PRINT_CONFIG_PATH, "utf-8"));
    } catch (err) {
      fs.writeFileSync(PRINT_CONFIG_PATH, JSON.stringify(this.config));
    }
  }

  getConfig() {
    let printersConfig, //Stores current configuration of printers
      printersStatus; //Stores status of printers to be applied onto the current config to update it
    //If a printer appears in a status but is not in config it means its a new printer so it creates a new entry with knew default settings
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
        print("output.pdf", {
          printer: printerName,
          scale: "noscale",
          orientation: "landscape",
        })
          .then(resolve)
          .catch(console.log);
      } else {
        printerHandler.printDirect({
          data: data,
          type: "RAW",
          printer: printerName,
          success: function (jobId) {
            resolve({ success: true, jobId: jobId });
          },
          error: function (err) {
            reject(err.message);
          },
        });
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
    saveConfig(this.config);
    return true;
  }

  #getPrinterConfig(name) {
    return this.getConfig().find((x) => x.name == name);
  }

  #saveConfig(config) {
    fs.writeFileSync(PRINT_CONFIG_PATH, JSON.stringify(config));
  }
}

module.exports.default = PrinterConnector;
