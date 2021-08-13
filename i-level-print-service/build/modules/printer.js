const printer = require("@thiagoelg/node-printer");
const fs = require("fs");
let config = JSON.parse(
  fs.readFileSync(process.cwd() + "/printer-config.json", "utf-8")
);
//console.log(config)

function getPrinterConfig(name) {
  return config.find((x) => x.name == name);
}

function saveConfig() {
  fs.writeFileSync(
    process.cwd() + "/printer-config.json",
    JSON.stringify(config)
  );
}

function addPrinterId(name, id) {
  // Given a printer name and ID, put that printer ID on that printer object
}

function getPrinterById(id) {
  // Given a printer name and ID, return that printer name
}

//Gets all the printers and matches them to their config in printer-config.json
//If a printer has no config it will be assigned a defualt one and saved to file
function updateConfig() {
  changedConfig = false;
  let printerData = printer.getPrinters().map((el) => {
    const p = {
      name: el.name,
      shareName: el.shareName,
      statusNumber: el.statusNumber,
      online:
        el.attributes.find((x) => x == "OFFLINE") != undefined ? false : true,
    };

    const con = getPrinterConfig(el.name);
    if (con == undefined) {
      const output = Object.assign(
        {
          name: el.name,
          enabled: true,
          displayName: el.name,
          acceptedTypes: [],
        },
        p
      );
      config.push(output);
      changedConfig = true;
    }

    return Object.assign(p, con);
  });

  if (changedConfig) {
    saveConfig();
    console.log("Saved config");
  }

  return printerData;
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
module.exports.addPrinterId = addPrinterId;
module.exports.getPrinterById = getPrinterById;
