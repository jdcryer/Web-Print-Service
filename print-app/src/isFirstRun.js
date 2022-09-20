function isFirstRun() {
  const fs = require("fs");
  const nodePath = require("path");
  const filePath = nodePath.join(__dirname, "RUN");
  try {
    fs.statSync(filePath);
    return false;
  } catch (err) {
    fs.writeFileSync(filePath, " ");
    return true;
  }
}

module.exports = isFirstRun;
