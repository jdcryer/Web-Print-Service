const express = require('express');//Used for routing http requests
const fs = require("fs")

const app = express();
const bodyparse = require("body-parser");

app.use(express.json());
//app.use(express.static("public"));

app.use("/", function (req, res, next) {
    fs.readFile(process.cwd() + "/assets/frontend/index.html", "utf8", function (err, data) {
        if (err) {
            res.send("<!DOCTYPE html><html>Error 500: File not found!</html>");
            return;
        }
        res.send(data);
    });
});


module.exports = app