const fs = require("fs");
const request = require("request");
const jimp = require("jimp");

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
function filterInput(s) {
  return encodeURIComponent(s).replace(/['()_*]/g, function (character) {
    return "%" + character.charCodeAt().toString(16);
  });
}

/**
 * 
 * @param {string} input 
 * @param {{name: {options}}} prop 
 * @returns {string} ZPL code for a text object
 */
function buildField(input, prop) {
  const font = "0";
  const fontSX = prop.fontSize;
  const fontSY = prop.fontSize;

  const left = prop.left;
  const top = Math.floor(prop.top + fontSY / 2);
  return `
        ^FO${left},${top}^CF${font},${fontSX},${fontSY}^FH%^FD${filterInput(
    input
  )}^FS\n`;
}

/**
 * 
 * @param {string} input 
 * @param {{name: {options}}} prop 
 * @returns {string} ZPL code for barcode
 */
function buildBarcode(input, prop) {
  const top = prop.top;
  const left = prop.left;
  const width = prop.width;
  const height = prop.height;

  return `
        ^FO${left},${top}^BY${1},,^BE,${height},Y,N^FD${input}^FS\n`;
}

/**
 * 
 * @param {{options}} prop 
 * @param {{link: string, data: jimp}} img 
 * @returns {string} ZPL code for image
 */
function buildImage(prop, img) {
  img
    .resize(
      //Is not constant, made an exception for effieciency
      parseInt(prop.width),
      parseInt(prop.height) * 4,
      jimp.RESIZE_NEAREST_NEIGHBOR
    )
    .greyscale();
  const top = prop.top;
  const left = prop.left;
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

  return `
        ^FO${left},${top}^GFA,${Math.ceil((width * height) / 2)},${Math.ceil(
    (width * height) / 2
  )},${Math.ceil(width / 2)},${data}`;
}

/**
 * @deprecated New functional version available
 */
function buildImageOld(input, prop, images) {
  let img = images.find((x) => x.link == input).data;
  //Image will be stretched when on the screen resize it to the given size
  //Then multiply by 4
  img.resize(
    parseInt(prop.width),
    parseInt(prop.height) * 4,
    jimp.RESIZE_NEAREST_NEIGHBOR
  );
  const top = prop.top;
  const left = prop.left;
  const width = img.bitmap.width;
  const height = img.bitmap.height;
  const rgbaData = img.bitmap.data;
  let data = "";

  const getBWPixel = (index) => {
    if (index > rgbaData.length) {
      index = rgbaData.length - 1;
    }
    return (rgbaData[index] + rgbaData[index + 1] + rgbaData[index + 2]) / 3;
  };

  for (let i = 0; i < rgbaData.length; i += 4) {
    if (width % 2 != 0 && (i / 4 + 1) % width == 0) {
      data += Math.floor((15 * getBWPixel(i - 4)) / 255).toString(16);
    }
    data += Math.floor((15 * getBWPixel(i)) / 255).toString(16);
  }

  //data = data.replace("00", ",");

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
 * @returns {string} ZPL code for an object
 */
function buildProp(input, prop, images) {
  switch (prop.transformType) {
    case "barcode":
      return buildBarcode(input, prop);
    case "field":
      return buildField(input, prop);
    case "image":
      return buildImage(prop, images.find((x) => x.link == input).data.clone());
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
 * @returns {string} Combined ZPL code to build the job
 */
function buildJob(items, page, props, images) {
  //this function will be mapped across items
  const f = (item) => {
    const [name, input] = item;
    if (name == "qty") return "";
    return buildProp(
      input,
      props[Object.keys(props).find((x) => x === name)],
      images
    );
  };

  return (
    `^XA
  ^PW${page.width}
  ^LH${page.leftMargin},${page.topMargin}
  ^PQ${items.qty}
  ^CI28
  ` +
    Object.entries(items) //Convert items to an array of key value pairs
      .map(f)
      .reduce((acc, x) => acc + x, "") + //Reduce all the different objects to a string
    `
        ^XZ`
  );
}

/**
 * @deprecated New functional version available
 */
function buildJobOld(items, page, props, images) {
  //label setup
  let output = `^XA
        ^PW${page.width}
        ^LH${page.leftMargin},${page.topMargin}
        ^PQ${items.qty}
        ^CI28
        `;
  //----------------

  //For each input for the label find its property and build it
  Object.keys(items)
    .filter((x) => x != "qty")
    .forEach((pName) => {
      output += buildProp(
        pName,
        items[pName],
        props[Object.keys(props).find((x) => x == pName)],
        images
      );
    });
  return output + "\n^XZ";
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
    const [name, input] = item;
    if (name == "Image") {
      return new Promise((resolve, reject) => {
        jimp
          .read(input) //Use Jimp to read the image
          .then((data) => {
            resolve({ link: input, data: data });
          })
          .catch((err) => {
            reject(err);
          });
      });
    }
    return null;
  };
  return Object.entries(items)
    .map(f)
    .filter((x, index) => x !== null); //Remove any nulls from non-images
}

/**
 * @deprecated New functional version available
 */
function cacheImagesOld(items) {
  let promises = [];
  Object.keys(items).forEach((x) => {
    if (x == "Image") {
      promises.push(
        new Promise((resolve, reject) => {
          jimp
            .read(items[x])
            .then((data) => {
              resolve({ link: items[x], data: data });
            })
            .catch((err) => {
              reject(err);
            });
        })
      );
    }
  });

  return promises;
}

/**
 * @description Builds a single label format given the label inputs and the job format
 * @param {any} [jobData] 
 * @param {any} [itemData]
 */
function build(jobData, itemData) {
  return new Promise((resolve, reject) => {
    Promise.all(cacheImages(itemData.detail))
      .then((images) => {
        resolve(
          buildJob(
            itemData.detail,
            jobData.page,
            jobData.properties,
            images,
            jobData.format.defaultFont
          )
        );
      })
      .catch((err) => {
        reject(err);
      });
  });
}



module.exports.build = build;
