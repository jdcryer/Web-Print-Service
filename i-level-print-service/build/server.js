const http = require("http")
const app = require("./app")

let server = http.createServer(app);

server.listen(3000);

const api = require("./api/api");
//console.log("listening on port 3000");
