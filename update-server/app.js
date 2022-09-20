"use strict";
const fs = require("fs");
const express = require("express");
const path = require("path");
const app = express();

app.use(require("morgan")("dev"));

app.use("/out", express.static(path.join(__dirname, "out"))); // Serves releases folder

app.get("/updates/releases/:os/:v/:file", (req, res) => {
  const p = path.join(
    __dirname,
    "releases",
    req.params.os,
    req.params.v,
    req.params.file
  );
  // Note: should use a stream here, instead of fs.readFile
  fs.readFile(p, function (err, data) {
    if (err) {
      res.send("Oops! Couldn't find that file.");
    } else {
      // set the content type based on the file
      res.contentType(req.params.file);
      console.log(res.contentType(req.params.file));
      res.send(data);
    }
    res.end();
  });
});

app.get("/updates/latest", (req, res) => {
  console.log(req.query);
  const latest = getLatestRelease();
  const clientVersion = req.query.v;

  if (clientVersion === latest) {
    res.status(204).end();
  } else {
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
  }
});

let getLatestRelease = () => {
  const dir = `${__dirname}/releases/darwin`;
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
  return "http://localhost:3002";
};

app.listen(3002, () => {
  console.log(`Express server listening on port 3002`);
});
