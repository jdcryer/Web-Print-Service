const express = require("express"); //Used for routing http requests
const fs = require("fs");
const printer = require("./modules/printer");
const labelConstructor = require("./modules/label_constructor");
const api = require("./modules/api");
const app = express();
require("dotenv").config();

let apiInstance = new api({
  user: process.env.USER,
  pass: process.env.PASS,
  printerIds: process.env.PRINTER_IDS.split(","), // needs to get this from printer-config.json
});

apiInstance.startPrintJobListener();

app.use(express.json());
//app.use(express.static("public"));

app.get("/newPrinter", async (req, res) => {
  const newUser = await apiInstance.postNewPrinterAsync(
    req.query.userId,
    req.query.printerName,
    req.query.displayName,
    req.query.type,
    true
  );
  if (newUser.success) {
    console.log(newUser.data);
    res.send(
      `Success!  New printer ID: ${newUser.data.id}.  Printer ID has been added to config.`
    );
  } else {
    console.error(newUser.error);
  }
});

app.post("/img", (req, res, next) => {
  res.send(fs.readFileSync(__dirname + "/../assets/ZPL_tests/output.bmp"));
});

app.get("/printers", (req, res, next) => {
  res.send(JSON.stringify(printer.getPrinters()));
});

app.post("/buildZPL", (req, res, next) => {
  const data = JSON.parse(req.body.data);
  const jobData = data.jobData;
  const itemData = data.itemData;
  res.send(JSON.stringify(labelConstructor.build(jobData, itemData)));
});

app.post("/testPrint", (req, res, next) => {
  const printerName = req.body.name;
  const data = req.body.data;

  /* test data
    printer.sendPrint("ZDesigner ZD500-203dpi ZPL", `
    ^XA
    ^FO200,50^A0R,200,150^FDDUMPTRUCK
    ^FS
    ^XZ`, null);
    */

  printer.sendPrint(printerName, data).then(
    (data) => {
      res.send(data);
    },
    (err) => {
      res.send(err);
    }
  );
});

app.use("/", (req, res, next) => {
  fs.readFile(
    process.cwd() + "/assets/frontend/index.html",
    "utf8",
    function (err, data) {
      if (err) {
        res.send("<!DOCTYPE html><html>Error 500: File not found!</html>");
        return;
      }
      res.send(data);
    }
  );
});

module.exports = app;
