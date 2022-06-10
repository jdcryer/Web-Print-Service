const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const printer = require("@thiagoelg/node-printer");

const {
  OutputOption,
  EncodingMode,
  SymbologyType,
  createStream,
  createFile,
  OutputType,
} = require("symbology");

test();
function test() {
  const canvas = createCanvas(100, 50, "pdf"); // see "PDF Support" section

  const barcode = genBarcode("123456789012");

  const ctx = canvas.getContext("2d");

  // Write "Awesome!"
  ctx.font = "30px Impact";
  ctx.rotate(0.1);
  ctx.fillText("Awesome!", 0, 50);

  // Draw line under text
  var text = ctx.measureText("Awesome!");
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.lineTo(50, 102);
  ctx.lineTo(50 + text.width, 102);
  ctx.stroke();
  canvas.toBuffer(); // returns a buffer containing a PDF-encoded canvas
  // With optional metadata:
  const buffer = canvas.toBuffer("application/pdf", {
    title: "my picture",
    keywords: "node.js demo cairo",
    creationDate: new Date(),
  });
  //const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync("./image.pdf", buffer);
}

/*
function genBarcode(barcode) {
  const canvas = new Canvas();
  JsBarcode(canvas, barcode, {
    format: "EAN13",
    font: "OCRB",
    fontSize: 18,
    textMargin: 0,
  });

  return canvas;
}
*/

async function genBarcode(barcode) {
  try {
    const { data } = await createStream(
      {
        symbology: SymbologyType.CODE128,
        encoding: EncodingMode.DATA_MODE,
        backgroundColor: "00000000",
        foregroundColor: "00FF00FF",
      },
      "1234567890",
      OutputType.EPS
    );
    console.log(data);

    console.log("File successfully created.");
  } catch (err) {
    console.error("Error: ", err);
  }
}
