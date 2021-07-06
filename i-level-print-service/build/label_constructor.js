const fs = require("fs");

/*Data format

printer
printType
defaultFont:
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

function buildStyle(input, prop) {
    const top = prop.top;
    const left = prop.left;
    const font = 0;
    const fontSX = prop.fontSize;
    const fontSY = prop.fontSize;
    return `
        ^FO${top},${left}^CF${font},${fontSX},${fontSY}^FD${input}^FS\n`;
}

function buidlBarcode(input, prop) {
    const top = prop.top;
    const left = prop.left;
    const width = prop.width;
    const height = prop.height
    
    return `
        ^FO${top},${left}^BY${2},,^BC,${height},Y,N,N,N^FD${input}^FS\n`;
}

function buildProp(name, input, prop) {
    var output = null;
    switch (name) {
        case "style":
            output = buildStyle(input, prop);
            break;
        case "barcode":
            output = buidlBarcode(input, prop);
            break;
        default:
            throw "Property not recongnised";
    }
    return output
}

function buildJob(data, page, props) {
    //label setup
    let output =
        `^XA
        ^PW${page.width}
        ^LH${page.leftMargin},${page.topMargin}
        ^PQ${data.qty}
        `;

    //----------------
    Object.keys(data)
        .filter(x => x != "qty")
        .forEach(pName => {
            output += buildProp(
                pName,
                data[pName],
                props[Object.keys(props).find(x => x == pName)]
            );
        });
    output += "\n^XZ";
    return output
}

//Takes json build data
function build(data) {
    let output = "";
    const dFont = data.format.defaultFont;
    const page = data.format.page;
    const prop = data.format.properties;

    output = "";

    data.data.forEach(job => {
        output += buildJob(job, page, prop) + "\n\n";
    });

    console.log(output);
    return output

}

testData = fs.readFileSync(__dirname + "./../assets/ZPL_test.json", "utf-8");

build(JSON.parse(testData));

module.exports.build = build