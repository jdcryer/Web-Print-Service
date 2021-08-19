const express = require("express"); //Used for routing http requests
const fs = require("fs");
const printer = require("./modules/printer");
const labelConstructor = require("./modules/label_constructor");
const api = require("./modules/api");
const app = express();
//require("dotenv").config();

const ids = printer
  .getPrinters()
  .filter((x) => x.id !== undefined)
  .map((x) => x.id);
console.log(ids);
let apiInstance = new api({
  user: process.env.USER,
  pass: process.env.PASS,
  printerIds: ids, // needs to get this from printer-config.json
});

apiInstance.startPrintJobListener();

app.use(express.json());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

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
    let ids = printer
      .getPrinters()
      .filter((x) => x.id !== undefined)
      .map((x) => x.id);
    console.log(ids);

    apiInstance.updateDetails({
      user: process.env.USER,
      pass: process.env.PASS,
      printerIds: ids,
    });
  } else {
    console.error(newUser.error);
  }
});

app.get("/printers", (req, res, next) => {
  res.send(printer.getPrinters());
});

module.exports = app;
