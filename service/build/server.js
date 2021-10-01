//User credentials
const fs = require("fs");

//Application
const http = require("http");
const app = require("./app");

let server = http.createServer(app);

server.listen(3001);
console.log("listening on port 3001");

//
