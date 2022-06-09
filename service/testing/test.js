const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const expect = chai.expect;
const label = require("../build/modules/label_constructor");
const printer = new (require("../build/modules/printer").default)();
const fs = require("fs");

chai.use(chaiAsPromised);

function getTestImage(url, data = "") {
  return new Promise((resolve, reject) => {
    var options = {
      encoding: null,
      formData: { file: data },
      // omit this line to get PNG images back
      headers: { Accept: "image/png" },
      // adjust print density (8dpmm), label width (4 inches), label height (6 inches), and label index (0) as necessary
      url: url,
    };

    request.post(options, function (err, resp, body) {
      if (err) {
        reject(err);
      }
      resolve({ link: url, data: body });
    });
  });
}

describe("Module testing", () => {
  it("Label constructor", () => {
    testDataJob = fs.readFileSync(__dirname + "/job.json", "utf-8");
    testDataItem = fs.readFileSync(__dirname + "/items.json", "utf-8");
    return expect(
      new Promise((resolve, reject) => {
        label.build(
          JSON.parse(testDataJob),
          JSON.parse(testDataItem).printItem[0],
          203,
          "pixel"
        ).then((data) => {
          fs.writeFileSync("output.txt", data);
          resolve(data);
        }).catch((err) => {
          throw err;
        });
      })
    ).to.eventually.not.equal(undefined);
  });
  it("Printer", () => {
    expect(printer.getConfig()).to.not.equal(undefined);
  });
});
//.should.eventually.equal(testDataRes);
