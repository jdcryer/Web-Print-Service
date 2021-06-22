const printer = require("printer")
const fs = require("fs");
console.log(process.cwd() + "/printer-config.json", "utf-8");
let config = JSON.parse(fs.readFileSync(process.cwd() + "/printer-config.json", "utf-8"));
console.log(config)

function getPrinterConfig(name){
    return config.find(x => x.name == name);
}

function saveConfig(){
    fs.writeFileSync(process.cwd() + "/printer-config.json", JSON.stringify(config));
}

function getPrinters(){
    let printerData = []
    changedConfig = false;
    printer.getPrinters().forEach(el => {
        const con = getPrinterConfig(el.name);
        if(con != undefined){
            el.config = con;
            printerData.push(el);
        } else {
            const newCon = {name: el.name, enabled: true, displayName: el.name }
            config.push(newCon)
            el.config = newCon;
            printerData.push(el);
            changedConfig = true;
        }
    });

    if(changedConfig){
        saveConfig();
        console.log("Saved config");
    }
    
    return printerData
}

module.exports.getPrinters = getPrinters;