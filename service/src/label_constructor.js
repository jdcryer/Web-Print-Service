const jimp = require("jimp");
const axios = require("axios");
const JsBarcode = require("jsbarcode");
const { DOMImplementation, XMLSerializer } = require("@xmldom/xmldom");
const xmlSerializer = new XMLSerializer();

const PIXEL_PER_MM = 140 / 50;
const INCH_PER_MM = 1 / 25.4;
const FONT_POINT_SIZE_INCH = 1 / 72;
/*Data format

printer
printType
defaultFont
  font
  style
  size
page
  format
  width
  height
  leftMargin
  rightMargin
  topMargin
  bottomMargin
properties
  style
      lable
      rotation
      left
      top
      font
      fontStyle
      fontSize


Commands of note

FB - Field block, this will print text in a defined way
IL - Image Load, dont know about how to send images yet, figure out later
PQ - Print quantity

Command types
A - Fonts <-- Important
B - Barcodes <-- Important
C - Control commands
D - Downloading data <-- Important
E - Erase downloaded graphics
F - Displaying and manipulating text <-- Important
G - Drawing things more advanced than text and barcodes
H - Gets diagnostic information on the printer
I - Images <-- Important
J - these commands configure the printer
K - Setting printer constants (name, password, etc.)
L - Label definitions
M - (Kinda random stuff starting with M) Media settings, Printer Mode, Maintenance 
N - Network
P - Random system stuff starting with a P
S - Random stuff starting with S (set, start, select, etc)
T - Random stuff starting with T
W - Prints information about the printer
X - To do with starting/stopping label printing and information between prints
Z - Only one command, ZZ puts the printer to sleep:)



*/

//Getting all special characters and converting them to hex UTF8
//(not as simple as just escaping the chars)
//Why is converting UTF8 to hex so dam confusing

//Taken from: https://github.com/mathiasbynens/mothereff.in
/**
 * @description Converts string to hex with escaped characters
 * @param {string} s
 * @returns {string} escaped string
 */

function getBarcodeWidth(b) {
  let regex = new RegExp(`svg width="(.+?)"`);
  return parseFloat(regex.exec(b)[1]);
}

function convertUnits(val) {
  return val / 0.75; // Converts points (1/72 inches) to px
}
function getRot(rot) {
  switch (rot.toString()) {
    case "0":
      return "0";
    case "1":
      return "90";
    case "2":
      return "180";
    case "3":
      return "270";
    default:
      throw `Invalid rotation "${rot}"`;
  }
}

/**
 *
 * @param {string} input
 * @param {{name: {options}}} prop
 * @returns {string} ZPL code for a text object
 */
function buildField(input, prop, dpi, units) {
  if (
    prop.left === undefined ||
    prop.top === undefined ||
    prop.fontSize === undefined
  ) {
    console.log(prop);
    throw "Job data is missing required attributes in Text field";
  }

  const font = prop.font !== undefined ? prop.font : "Arial";
  const fontSize = convertUnits(prop.fontSize);
  const rotation = prop.rotation !== undefined ? getRot(prop.rotation) : "";

  const left = convertUnits(prop.left);
  const top = convertUnits(prop.top);

  // Font style represent bold, italic and underlined
  // When converted to a 3 bit binary, the least significant bit represents bold
  // The middle bit is italics and then the most significant bit represents underlined
  const fontStyle = prop.fontStyle;
  const isUnderlined = fontStyle >= 4;
  const isItalic = fontStyle % 4 >= 2;
  const isBold = fontStyle % 2;

  return `
  <text dominant-baseline="hanging" x="${left}" y="${top}" font-size="${fontSize}" font-family="${font}" transform="rotate(${rotation})" 
  ${isUnderlined ? `text-decoration="underline"` : ""} ${
    isBold ? `font-weight="bold"` : `font-weight="normal"`
  } ${isItalic ? `font-style="italic"` : `font-style="normal"`}
  >${prop.label !== undefined ? prop.label + " " + input : input}</text>
  `;
}

/**
 *
 * @param {String} input
 * @param {{name: {options}}} prop
 * @param {Number} dpi
 * @param {String} units inch, mm, pixel, font
 * @returns {string} ZPL code for barcode
 */
function buildBarcode(input, prop, dpi, units) {
  if (
    !(
      prop.left !== undefined &&
      prop.top !== undefined &&
      prop.height !== undefined &&
      prop.width !== undefined
    )
  ) {
    throw "Job data is missing required attributes in Barcode";
  }

  const left = convertUnits(prop.left);
  const top = convertUnits(prop.top);
  const height = prop.height;
  const width = convertUnits(prop.width);
  const rotation = prop.rotation !== undefined ? getRot(prop.rotation) : "";

  const document = new DOMImplementation().createDocument(
    "http://www.w3.org/1999/xhtml",
    "html",
    null
  );
  const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  JsBarcode(svgNode, input.value, {
    xmlDocument: document,
    format: "CODE128",
    height: height,
  });

  const res = xmlSerializer.serializeToString(svgNode);

  let barcodeWidth = getBarcodeWidth(res);
  let widthScale = width / barcodeWidth;
  return `<g transform="translate(${left}, ${top}) scale(${widthScale}) rotate(${rotation})">
          ${res}
        </g>`;
}

/**
 *
 * @param {{options}} prop
 * @param {{link: string, data: jimp}} img
 * @param {Number} dpi
 * @param {String} units inch, mm, pixel, font
 * @returns {string} ZPL code for image
 */
function buildImage(prop, img, dpi, units) {
  if (
    prop.left === undefined ||
    prop.top === undefined ||
    prop.height == undefined
  ) {
    throw "Job data is missing required attributes in Image";
  }

  const left = prop.left;
  const top = prop.top;
  const rotation = getRot(prop.rotation);
  const imgRes = { x: img.bitmap.width, y: img.bitmap.height };
  const imgDim = {
    x: prop.width ? convertUnits(prop.width) : undefined,
    y: convertUnits(prop.height),
  };

  // If only height exists then mantain aspect ration and scale with height
  if (imgDim.x && imgDim.y) {
    img.resize(imgDim.x, imgDim.y, jimp.RESIZE_NEAREST_NEIGHBOR);
  } else {
    const ratio = imgDim.y / imgRes.y;
    img.resize(imgRes.x * ratio, imgDim.y, jimp.RESIZE_NEAREST_NEIGHBOR);
  }

  img.greyscale();
  return new Promise((resolve, reject) => {
    img
      .getBase64Async(jimp.AUTO)
      .then((data) => {
        resolve(
          `<image transform="translate(${left}, ${top}) rotate(${rotation})" href="data:image/png;charset=utf-8;base64,${data}" alt="Embedded image" />`
        );
      })
      .catch((err) => {
        console.log("Error getting base64 of image", err.toString());
        reject(err);
      });
  });
}

/**
 *
 * @param {string} input
 * @param {{options}} prop
 * @param {[{link: string, data: jimp}]} images
 * @param {Number} dpi
 * @param {String} units inch, mm, pixel, font
 * @returns {string} ZPL code for an object
 */
function buildProp(input, prop, images, dpi, units) {
  switch (prop.transformType) {
    case "barcode":
      return buildBarcode(input, prop, dpi, units);
    case "field":
      return buildField(input, prop, dpi, units);
    case "image":
      return buildImage(
        prop,
        images.find((x) => x.link == input).data.clone(),
        dpi,
        units
      );
    default:
      throw "Property not recognised";
  }
}

/**
 *
 * @param {any} items
 * @param { {options} } page
 * @param {{obj: {options}}} props
 * @param {[{link: string, data: jimp}]} images
 * @param {Number} dpi
 * @param {String} units inch, mm, pixel, font
 * @returns {string} Combined ZPL code to build the job
 */
function buildJob(items, page, props, images, defaultFont, dpi, units) {
  //this function will be mapped across items
  const f = (item) => {
    const [name, input] = item;
    if (name == "qty") return "";
    return buildProp(
      input,
      props[Object.keys(props).find((x) => x === name)],
      images,
      dpi,
      units
    );
  };

  // Array of texts and promises
  const proms = Object.entries(items) //Convert items to an array of key value pairs
    .map(f);
  // Wait on all promises to resolve
  return new Promise((resolve, reject) => {
    Promise.all(proms)
      .then((texts) => {
        resolve(
          `<svg width="${convertUnits(page.width)}" height="${convertUnits(
            page.height
          )}" >
          <g transform="translate(${convertUnits(
            page.leftMargin
          )},${convertUnits(page.topMargin)})">
          ` +
            texts.reduce((acc, x) => acc + x, "") + //Reduce all the different objects to a string
            `
            </g>
            </svg>`
        );
      })
      .catch(reject);
  });
}

// Doesn't work due to process env changes
// function addAuthToURL(url) {
//   const [user, pass] = [process.env.USER, process.env.pass];

//   if (url.includes("https")) {
//     const splitUrl = url.split("https://");
//     return "https://" + `${user}:${pass}@` + splitUrl[1];
//   } else {
//     throw "Url must be https";
//   }
// }

/**
 *
 * @param {any} items The detial part of the item object
 * @returns {[Promise<{link: string, data: jimp}>]} array of promises which contain the image data in the format of {link: data, data: data}
 */
function cacheImages(items) {
  //f will be mapped acrossed items
  const f = (item) => {
    //Get the name and input of each item
    let output = [];
    const [_, value] = item;
    if (value.transformType == "image") {
      return new Promise((resolve, reject) => {
        axios
          .get(value.imageUrl, { responseType: "arraybuffer" })
          .then((imageBuffer) => {
            jimp
              .read(imageBuffer.data)
              .then((data) => {
                resolve({ link: value.imageUrl, data: data });
              })
              .catch(reject);
          })
          .catch(reject);
      });
    }
    return null;
  };
  return Object.entries(items)
    .map(f)
    .filter((x) => x !== null); //Remove any nulls from non-images
}

/**
 * @description Builds a single label format given the label inputs and the job format
 * @param {any} [jobData]
 * @param {any} [itemData]
 * @param {Number} dpi
 * @param {String} units inch, mm, pixel, font
 */
function build(jobData, itemData, dpi, units) {
  return new Promise((resolve, reject) => {
    Promise.all(cacheImages(jobData.properties))
      .then((images) => {
        buildJob(
          itemData.detail,
          jobData.page,
          jobData.properties,
          images,
          jobData.format.defaultFont,
          dpi,
          units
        )
          .then(resolve)
          .catch(reject);
      })
      .catch(reject);
  });
}

module.exports.build = build;
