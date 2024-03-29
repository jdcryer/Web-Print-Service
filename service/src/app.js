const { profile } = require("console");
const express = require("express"); //Used for routing http requests
const fs = require("fs");
const printer = new (require("./printer").default)();
const api = require("./api");
const app = express();
const USER_PATH =
  process.platform === "darwin"
    ? `/Users/${process.env.USER}/Library/Application Support/Web Print Service/service/user-profile.json`
    : process.cwd() + "/user-profile.json";

const UNINSTALLER_PATH =
  process.platform === "darwin"
    ? `/Users/${process.env.USER}/Library/Application Support/Web Print Service/service/user-profile.txt`
    : false;

function writeUninstallLoginFile(username, password, baseUrl) {
  if (!UNINSTALLER_PATH) return;
  fs.writeFileSync(UNINSTALLER_PATH, `${username}\n${password}\n${baseUrl}`);
}

let apiInstance = new api({
  printerConnector: printer,
  printerIds: printer
    .getConfig()
    .filter((x) => x.id !== undefined)
    .map((x) => x.id), // needs to get this from printer-config.json
});

//Attempting to load user-profile.json
{
  let [fileExists, badFile] = [false, false];
  try {
    fs.statSync(USER_PATH);
    fileExists = true;
    const file = JSON.parse(fs.readFileSync(USER_PATH));

    badFile = true;

    if (file == undefined || !file.username || !file.password || !file.baseUrl)
      throw "bad user-profile file";

    badFile = false;
    apiInstance.updateDetails({
      user: file.username,
      pass: file.password,
      baseUrl: file.baseUrl,
    });

    fs.writeFile(
      USER_PATH,
      JSON.stringify({
        username: file.username,
        password: file.password,
        baseUrl: file.baseUrl,
      }),
      (err) => {
        if (err) throw err;
      }
    );

    writeUninstallLoginFile(file.username, file.password, file.baseUrl);

    apiInstance.startPrintJobListener();
    console.log("Found login data");
  } catch (err) {
    console.log(err);
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
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT");
  next();
});

app.post("/postLogin", (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;
  const baseUrl = req.body.baseUrl;

  const oldUser = apiInstance.user;
  const oldPass = apiInstance.pass;
  const oldBase = apiInstance.baseUrl;

  apiInstance.updateDetails({
    user: username,
    pass: password,
    baseUrl: baseUrl,
  });

  apiInstance
    .getUserIdAsync()
    .then((data) => {
      if (data.error) {
        res.send({ success: false, error: data.error.message });
        apiInstance.updateDetails({
          user: oldUser,
          pass: oldPass,
          baseUrl: oldBase,
        });
        return;
      }

      fs.writeFile(
        USER_PATH,
        JSON.stringify({
          username: username,
          password: password,
          baseUrl: baseUrl,
        }),
        (err) => {
          if (err) {
            apiInstance.updateDetails({
              user: oldUser,
              pass: oldPass,
              baseUrl: oldBase,
            });
            res.send({ success: false, message: err.message });
            throw err;
          }
          badFile = false;
        }
      );
      writeUninstallLoginFile(username, password, baseUrl);

      apiInstance.startPrintJobListener();

      res.send({ success: true });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/checkLogin", (req, res, next) => {
  apiInstance
    .getUserIdAsync()
    .then((data) => {
      if (data.error) {
        res.send({ success: false, error: data.error.message });
        return;
      }
      res.send({ success: true, data: data.data });
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/newPrinter", async (req, res, next) => {
  const newUser = await apiInstance.postNewPrinterAsync(
    req.body.userId,
    req.body.printerName,
    req.body.displayName,
    req.body.type,
    true
  );
  if (newUser.success) {
    res.send(newUser);
    let ids = printer
      .getConfig()
      .filter((x) => x.id !== undefined)
      .map((x) => x.id);

    apiInstance.updateDetails({
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
      let ids = printer
        .getConfig()
        .filter((x) => x.id !== undefined)
        .map((x) => x.id);

      apiInstance.updateDetails({
        printerIds: ids,
      });
      res.send(data);
    })
    .catch((err) => {
      console.error(err);
    });
});

app.get("/printers", (req, res, next) => {
  res.send(printer.getConfig());
});

app.put("/editPrinter", async (req, res, next) => {
  const editPrinter = await apiInstance.editPrinterAsync(
    req.body.printerId,
    req.body.printerName,
    req.body.displayName,
    req.body.type,
    true
  );
  if (editPrinter.success) {
    res.send(editPrinter);
  } else {
    console.error(editPrinter.error);
  }
});

app.get("/uninstall", async (req, res, next) => {
  const ids = printer
    .getConfig()
    .filter((x) => x.id !== undefined)
    .map((x) => x.id);

  const removePrinters = await apiInstance.deletePrinterAsync(ids.join(","));
  res.send(removePrinters);
});

app.post("/sendTestPrint", (req, res, next) => {
  const printerName = req.body.printerName;
  const data = req.body.data;
  console.log(printerName);
  printer.sendPrint(printerName, data, null);
  res.send("success");
});

app.post("/ping", (req, res, next) => {
  res.send(`Pong (Time: ${Date.now()}) - Version: 1.1.10`);
});

module.exports = app;
