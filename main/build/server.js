//User credentials
const fs = require("fs");


/*
try {
  fs.statSync(USER_PATH);

  
} catch (error) {
  console.log(
    "No user credentials, please enter your username and password in user-profile.json"
  );
  fs.writeFileSync(USER_PATH, JSON.stringify({ username: "", password: "" }));
}
*/
/*
  let username, password;
  let [fileExists, badFile] = [false, true];
  while (true) {
    try {
      [fileExists, badFile] = [false, true];
      fs.statSync(USER_PATH);
      fileExists = true;
      const file = JSON.parse(fs.readFileSync(USER_PATH));

      if (file == undefined || !file.username || !file.password)
        throw "bad user-profile file";

      process.env.USER = file.username;
      process.env.PASS = file.password;
      process.env.PRINTER_IDS = "8E4D1AF27B204347876720FF42943112";
      badFile = false;
      break;
    } catch (err) {
      if (!fileExists) {
        fs.writeFileSync(
          USER_PATH,
          JSON.stringify({ username: "", password: "" })
        );
      }
      console.log(
        "No user credentials, please enter your username and password in user-profile.json in i-level-print-service/i-level-print-service/"
      );
      await new Promise((resolve, reject) => {
        setTimeout(resolve, 1000);
      });
      continue;
    }
  }
  */

  //Application
  const http = require("http");
  const app = require("./app");

  let server = http.createServer(app);

  server.listen(3001);
  console.log("listening on port 3001");

//
