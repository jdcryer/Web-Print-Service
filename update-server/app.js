"use strict";
const fs = require("fs");
const express = require("express");
const path = require("path");
const app = express();

const PORT = 3002;

function respondWithFile(dirPath, file, res) {
  const fullPath = path.join(dirPath, file);
  console.log(fullPath);
  // Note: should use a stream here, instead of fs.readFile
  fs.readFile(fullPath, function (err, data) {
    if (err) {
      res.send("Oops! Couldn't find that file.");
      res.status(400);
    } else {
      // set the content type based on the file
      res.contentType(file);
      res.send(data);
    }
    res.end();
  });
}

app.use(require("morgan")("dev"));

app.use("/out", express.static(path.join(__dirname, "out"))); // Serves releases folder

app.get("/updates/:os/:v/latest", (req, res) => {
  console.log(req.query);
  const os = req.params.os;
  const clientVersion = req.params.v;
  console.log(`Client version ${clientVersion}, os: ${os}`);

  const latest = getLatestRelease(os);

  if (clientVersion === latest) {
    res.status(204).end();
  } else {
    switch (os) {
      case "darwin":
        res.status(200).json({
          url: `${getBaseUrl()}/updates/releases/darwin/${latest}/Web Print Service.zip`,
          name: `Web Print Service`,
          notes: `Release notes`,
          pub_date: `2022-09-15T17:47:48+0000`,
          version: "1.1.1",
        });
        console.log(
          `${getBaseUrl()}/updates/releases/darwin/${latest}/Web Print Service.zip`
        );
        break;

      case "win32":
        respondWithFile(
          path.join(__dirname, "releases", "win32", latest),
          "WebPrintService.zip",
          res
        );
        break;

      default:
        console.log("Invalid OS given.");
        res.status(400).json({
          message: `Invalid OS given, "${os}" is not a supported OS`,
        });
    }
  }
});

app.get("/updates/:os/:v/:file", (req, res) => {
  const os = req.params.os;
  const version = req.params.v;
  const fileName = req.params.file;

  const p = path.join(__dirname, "releases", os, version);
  respondWithFile(p, fileName, res);
  console.log(`Getting file ${p}`);
});

let getLatestRelease = (os) => {
  const dir = `${__dirname}/releases/${os}`;
  const versionsDesc = fs
    .readdirSync(dir)
    .filter((file) => {
      const filePath = path.join(dir, file);
      return fs.statSync(filePath).isDirectory();
    })
    .reverse();
  console.log(versionsDesc);

  return versionsDesc[0];
};

let getBaseUrl = () => {
  return `http://localhost:${PORT}`;
};

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});
