const printer = require("@thiagoelg/node-printer");
const fs = require("fs");
const PRINT_CONFIG_PATH = process.cwd() + "/printer-config.json";
const EDITABLE_ATTRIBUTES = ["displayName", "acceptedTypes", "enabled"];

//Stores data loaded from file
//Gets updating by the getPrinters and updateConfig functions
let config = [];
try {
  fs.statSync(PRINT_CONFIG_PATH);
  config = JSON.parse(fs.readFileSync(PRINT_CONFIG_PATH, "utf-8"));
} catch (err) {
  fs.writeFileSync(PRINT_CONFIG_PATH, JSON.stringify(config));
}

function getPrinterConfig(name) {
  return config.find((x) => x.name == name);
}

function getPrinterById(id) {
  // Given a printer name and ID, return that printer name
  const pd = getPrinters();
  return pd.find((x) => x.id === id)?.name;
}

function saveConfig() {
  fs.writeFileSync(PRINT_CONFIG_PATH, JSON.stringify(config));
}

function addPrinter(name, id, displayName) {
  // Given a printer name and ID, put that printer ID on that printer object
  updateConfig(); //Printer data

  const index = config.findIndex((x) => x.name === name);
  if (index === -1) {
    console.error(`Could not match printer name "${name}" to a printer`);
    return false;
  }
  config[index].displayName = displayName;
  config[index].id = id;
  config[index].enabled = true;
  saveConfig();
  return true;
}

function removePrinter(id) {
  // Given a printer name and ID, put that printer ID on that printer object
  updateConfig(); //Printer data

  const index = config.findIndex((x) => x.id === id);
  if (index === -1) {
    console.error(`Could not match printer id "${id}" to a printer`);
    return false;
  }
  config[index].id = undefined;
  config[index].enabled = false;
  saveConfig();
  return true;
}

function editPrinter(name, data) {
  const p = getPrinterConfig(name);

  Object.keys(data).forEach((key) => {
    if (EDITABLE_ATTRIBUTES.find((x) => x === key) === undefined)
      throw `Cannot change attribute ${key}.`;
    p[key] = data[key];
  });
  updateConfig();
}

//Gets all the printers and matches them to their config in printer-config.json
//If a printer has no config it will be assigned a defualt one and saved to file
function updateConfig() {
  changedConfig = false;
  config = printer.getPrinters().map((el) => {
    //data from the printer itself
    const p = {
      name: el.name,
      shareName: el.shareName,
      statusNumber: el.statusNumber,
      online:
        el.attributes.find((x) => x == "OFFLINE") != undefined ? false : true,
    };

    //get configuration from local file
    const con = getPrinterConfig(el.name);
    //If does not exist yet create new file
    if (con == undefined) {
      changedConfig = true;
      return {
        ...p,
        enabled: false,
        displayName: el.name,
        acceptedTypes: [],
      };
    }

    return {
      ...con,
      ...p,
    };
    //return Object.assign(con, p);
  });

  saveConfig();
  return config;
}

function getPrinters() {
  return updateConfig();
}

function sendPrint(printerName, data, printType) {
  updateConfig();

  return new Promise((resolve, reject) => {
    let p = getPrinters().find((x) => x.name == printerName);
    if (p == undefined) {
      reject("printer does not exist");
      return;
    }

    if (p.enabled == false) {
      reject("printer disabled");
      return;
    }
    printer.printDirect({
      data: data,
      printer: printerName,
      success: function (jobID) {
        resolve("success");
      },
      error: function (err) {
        reject(err.message);
      },
    });
  });
}

updateConfig();

module.exports.getPrinters = getPrinters;
module.exports.sendPrint = sendPrint;
module.exports.addPrinter = addPrinter;
module.exports.getPrinterById = getPrinterById;
module.exports.editPrinter = editPrinter;
module.exports.removePrinter = removePrinter;
