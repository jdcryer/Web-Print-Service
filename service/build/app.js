const express = require("express"); //Used for routing http requests
const fs = require("fs");
const printer = require("./modules/printer");
const api = require("./modules/api");
const app = express();
const USER_PATH = __dirname + "/../user-profile.json";
//require("dotenv").config();

const ids = printer
  .getPrinters()
  .filter((x) => x.id !== undefined)
  .map((x) => x.id);
console.log(ids);
let apiInstance = new api({
  user: undefined,
  pass: undefined,
  printerIds: ids, // needs to get this from printer-config.json
});

//Attempting to load user-profile.json
{
  let [fileExists, badFile] = [false, false];
  try {
    fs.statSync(USER_PATH);
    fileExists = true;
    const file = JSON.parse(fs.readFileSync(USER_PATH));

    badFile = true;

    if (file == undefined || !file.username || !file.password)
      throw "bad user-profile file";

    process.env.USER = file.username;
    process.env.PASS = file.password;

    badFile = false;
    apiInstance.updateDetails(file.username, file.password);

    fs.writeFile(
      USER_PATH,
      JSON.stringify({ username: file.username, password: file.password }),
      (err) => {
        if (err) throw err;
      }
    );
    apiInstance.startPrintJobListener();
    console.log("Found login data");
  } catch (err) {
    console.log(`File Exists: ${fileExists}, Bad file: ${badFile}.`);
    console.log("Waiting for login to start...");
  }
}

app.use(express.json());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.post("/setLogin", (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  process.env.USER = username;
  process.env.PASS = password;

  badFile = false;
  apiInstance.updateDetails(username, password);
  fs.writeFile(
    USER_PATH,
    JSON.stringify({ username: username, password: password }),
    (err) => {
      if (err) throw err;
    }
  );
  apiInstance.startPrintJobListener();
  res.send({ success: true });
});

app.post("/checkLogin", (req, res, next) => {
  apiInstance
    .getJobCountAsync()
    .then((data) => {
      if (data.error) {
        res.send({ success: false, error: data.error.message });
        return;
      }
      res.send({ success: true });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/newPrinter", async (req, res, next) => {
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

app.delete("/deletePrinter", (req, res, next) => {
  apiInstance
    .deletePrinterAsync(req.body.printerId)
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/printers", (req, res, next) => {
  res.send(printer.getPrinters());
});

app.post("/editPrinter", (req, res, next) => {
  const printerName = req.body.printerName;
  const data = req.body.data;
  printer.editPrinter(printerName, data);
  res.send({ success: true });
});

module.exports = app;
