const printer = require("@thiagoelg/node-printer");
const fs = require("fs");
const { send } = require("process");
console.log(process.cwd() + "/printer-config.json", "utf-8");
let config = JSON.parse(fs.readFileSync(process.cwd() + "/printer-config.json", "utf-8"));
//console.log(config)

function getPrinterConfig(name) {
    return config.find(x => x.name == name);
}

function saveConfig() {
    fs.writeFileSync(process.cwd() + "/printer-config.json", JSON.stringify(config));
}

function updateConfig() {
    let printerData = []
    changedConfig = false;
    printer.getPrinters().forEach(el => {
        const con = getPrinterConfig(el.name);
        if (con != undefined) {
            el.config = con;
            printerData.push(el);
        } else {
            const newCon = { name: el.name, enabled: true, displayName: el.name }
            config.push(newCon)
            el.config = newCon;
            printerData.push(el);
            changedConfig = true;
        }
    });

    if (changedConfig) {
        saveConfig();
        console.log("Saved config");
    }

    return printerData
}

function getPrinters() {
    return updateConfig();
}

function sendPrint(printerName, data, printType) {
    updateConfig();
    return new Promise((resolve, reject) => {
        printer.printDirect(
            {
                data: data,
                printer: printerName, // printer name, if missing then will print to default printer
                success: function (jobID) {
                    resolve("success")
                },
                error: function (err) {
                    reject(err);
                }
            });
    });
}

updateConfig();

module.exports.getPrinters = getPrinters;
module.exports.sendPrint = sendPrint;