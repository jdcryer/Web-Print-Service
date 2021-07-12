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
function filterInput(s) {
  return encodeURIComponent(s).replace(/['()_*]/g, function (character) {
    return "%" + character.charCodeAt().toString(16);
  });
}

//Field Barcode Image is all thats needed

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

function buildBarcode(input, prop) {
  const top = prop.top;
  const left = prop.left;
  const width = prop.width;
  const height = prop.height;

  return `
        ^FO${left},${top}^BY${1},,^BE,${height},Y,N^FD${input}^FS\n`;
}

function buildImage(input, prop, images) {
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

//Find the property type and build it for a given input
function buildProp(input, prop, images) {
  switch (prop.transformType) {
    case "barcode":
      return buildBarcode(input, prop);
    case "field":
      return buildField(input, prop);
    case "image":
      return buildImage(input, prop, images);
    default:
      throw "Property not recognised";
  }
}


function buildJob(items, page, props, images) {
  const recur = (items, page, props, images) => {
    const [item, ...tail] = items;
    return item === undefined
      ? "\n^XZ"
      : buildProp(
        item[1],
          props[Object.keys(props).find((x) => x == item[0])],
          images
        ) + recur(tail, page, props, images);
  };

  return (
    `^XA
  ^PW${page.width}
  ^LH${page.leftMargin},${page.topMargin}
  ^PQ${items.qty}
  ^CI28
  ` +
    recur(
      Object.entries(items).filter(([name, _]) => name !== "qty"),
      page,
      props,
      images
    )
  );
}

//dep. dont use
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

function cacheImages(items) {
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

//Takes json build data
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

//-------testing code-------
/*
      fs.writeFileSync(
        __dirname + "/../../assets/ZPL_tests/output.txt",
        output
      );


testDataJob = fs.readFileSync(
  __dirname + "/../../assets/ZPL_tests/test_job.json",
  "utf-8"
);
testDataItem = fs.readFileSync(
  __dirname + "/../../assets/ZPL_tests/test_items.json",
  "utf-8"
);

build(JSON.parse(testDataJob), JSON.parse(testDataItem).printItem[0]).then(
  (res) => {
    getTestImage(
      "http://api.labelary.com/v1/printers/8dpmm/labels/2x2/0/",
      res
    ).then((data) => {
      var filename = __dirname + "/../../assets/ZPL_tests/output.png";
      fs.writeFile(filename, data.data, function (err) {
        if (err) {
          console.log(err);
        }
      });
    });
  }
);
*/

module.exports.build = build;
