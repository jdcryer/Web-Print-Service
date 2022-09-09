//Application
const http = require("http");
const app = require("./app");

let server = http.createServer(app);

server.listen(3002);
console.log("Listening on port 3002");
