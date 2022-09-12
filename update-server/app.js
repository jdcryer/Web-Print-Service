const fs = require("fs");
const express = require("express");
const nodePath = require("path");
const nodeUrl = require("url");
require("dotenv").config();

const app = express();

app.use(require("morgan")("dev"));

app.use("/releases/", express.static(nodePath.join(__dirname, "releases")));

app.get("/latest/releases", (req, res) => {
  const clientOs = req.query.os;

  if (!clientOs) {
    res.json({
      url: "",
      error:
        "Operating system is a required parameter, add ?os=*your OS* to the request",
    });
    return;
  }

  const latest = getLatestRelease(clientOs);
  const clientVersion = req.query.v;

  if (false && clientVersion === latest) {
    res.status(204).end();
  } else {
    const installUrl = new nodeUrl.URL(getBaseUrl());
    installUrl.pathname = nodePath.join(
      "releases",
      clientOs,
      latest,
      `${process.env.APP_NAME}.zip`
    );

    res.json({
      url: installUrl,
      name: "My Release Name",
      notes: "Theses are some release notes innit",
      pub_date: "2013-09-18T12:29:53+01:00",
    });
  }
});

let getLatestRelease = (os) => {
  const dir = `${__dirname}/releases/${os}`;

  const versionsDesc = fs
    .readdirSync(dir)
    .filter((file) => {
      const filePath = nodePath.join(dir, file);
      return fs.statSync(filePath).isDirectory();
    })
    .reverse();

  return versionsDesc[0];
};

app.use("/releases", (req, res) => {
  const clientOs = req.query.os;
  const clientVersion = req.query.v;

  if (!clientOs) {
    res.json({
      url: "",
      error: "Operating system and version number are required parameters",
    });
    return;
  }
  const pathToFile = nodePath.resolve(
    __dirname,
    "releases",
    clientOs,
    clientVersion,
    `${process.env.APP_NAME}.zip`
  );
  console.log(pathToFile);
  if (!fs.existsSync(pathToFile)) {
    res.json({
      url: "",
      error: "This version does not exist",
    });
    return;
  }

  const installUrl = new nodeUrl.URL(getBaseUrl());
  installUrl.pathname = nodePath.join(
    "releases",
    clientOs,
    clientVersion,
    `${process.env.APP_NAME}.zip`
  );

  res.json({
    url: installUrl,
    name: "My Release Name",
    notes: "Theses are some release notes innit",
    pub_date: "2013-09-18T12:29:53+01:00",
  });
});

let getBaseUrl = () => {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:5500/";
  } else {
    return process.env.BASE_URL;
  }
};

module.exports = app;
