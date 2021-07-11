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

//Gets all the printers and matches them to their config in printe-config.json
//If a printer has no config it will be assigned a defualt one and saved to file
function updateConfig() {
  let printerData = [];
  changedConfig = false;
  printer.getPrinters().forEach((el) => {
    let p = {};
    p.name = el.name;
    p.shareName = el.shareName;
    p.statusNumber = el.statusNumber;
    p.online =
      el.attributes.find((x) => x == "OFFLINE") != undefined ? false : true;

    let con = getPrinterConfig(el.name);
    if (con == undefined) {
      con = {
        name: el.name,
        enabled: true,
        displayName: el.name,
        acceptedTypes: [],
      };
      config.push(con);
      changedConfig = true;
    }

    Object.assign(p, con);
    printerData.push(p);
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
      reject("printer does not exists");
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
