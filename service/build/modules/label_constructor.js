const jimp = require("jimp");
const axios = require("axios");
const symbology = require("symbology");

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
function filterInput(s) {
  return encodeURIComponent(s).replace(/['()_*]/g, function (character) {
    return "%" + character.charCodeAt().toString(16);
  });
}

function convertUnits(val) {
  return val / 0.72; // Converts points (1/72 inches) to mm (144/200 = 0.72)
}
function convertUnitsOld(val, dpi = 203, from = "pixel") {
  switch (from.toLowerCase()) {
    case "pixel":
      return (dpi * val) / (PIXEL_PER_MM * 25.4);
    case "mm":
      return (dpi * val) / INCH_PER_MM;
    case "inch":
      return dpi * val;
    case "dots":
      return val;
    case "font":
      throw "Font units are deprecated";
      return val * FONT_POINT_SIZE_INCH * dpi;
    default:
      throw `Unit ${from} is not supported`;
  }
}

function getRot(rot) {
  switch (rot.toString()) {
    case "0":
      return "N";
    case "1":
      return "R";
    case "2":
      return "I";
    case "3":
      return "B";
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

  return `
  <text dominant-baseline="hanging" x="${left}" y="${top}" font-size="${fontSize}" font-family="${font}">${
    prop.label !== undefined ? prop.label + " " + input : input
  }</text>
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

  // Return promise that will create a createStream from symbology
  return new Promise((resolve, reject) => {
    symbology
      .createStream(
        {
          symbology: input.type, // Hopefully sending the correct ZINT enum codes, equivalent to symbology.SymbologyType.EANX
          encoding: symbology.EncodingMode.DATA_MODE,
          height: height,
        },
        input.value,
        symbology.OutputType.SVG
      )
      .then((res) => {
        let barcodeWidth = getBarcodeWidth(res.data);
        let widthScale = width / barcodeWidth;
        resolve(`<g transform="translate(${left}, ${top}) scale(${widthScale})">
          ${res.data}
        </g>`);
      })
      .catch(reject);
  });
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
  if (!(prop.left !== undefined && prop.top !== undefined)) {
    throw "Job data is missing required attributes in Image";
  }

  if (prop.width && prop.height) {
    img.resize(
      //Is not constant, made an exception for efficiency
      prop.width,
      prop.height * 4,
      jimp.RESIZE_NEAREST_NEIGHBOR
    );
  }

  img.greyscale();
  const left = prop.left;
  const top = prop.top;
  const width = img.bitmap.width;
  const height = img.bitmap.height;
  const rgbaData = [...img.bitmap.data];

  const f = (pixel, i) => {
    //Convert each greyscale value to hex
    const out = Math.round((15 * pixel) / 255).toString(16);
    if (width % 2 !== 0 && (i + 1) % width === 0) {
      //Pad odd sized images
      return "00";
    }
    return out; //Scale from 0-255 to 0-15 then convert to hex
  };

  //Take every 4th value as the sequence goes rgbargbargb...
  //Since is greyscaled we only need either r, g or b
  const data = rgbaData
    .filter((_, index) => index % 4 == 0)
    .map(f)
    .reduce((acc, x) => acc + x, "");

  return ``;
  return `
        ^FO${left},${top}^GFA,${Math.ceil((width * height) / 2)},${Math.ceil(
    (width * height) / 2
  )},${Math.ceil(width / 2)},${data}`;
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
        // TODO: set total size of label to be connected to job definition
        resolve(
          `<svg height="1in" width="2in">
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

function addAuthToURL(url) {
  const [user, pass] = [process.env.USER, process.env.pass];

  if (url.includes("https")) {
    const splitUrl = url.split("https://");
    return "https://" + `${user}:${pass}@` + splitUrl[1];
  } else {
    throw "Url must be https";
  }
}

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
