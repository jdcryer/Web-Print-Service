const fs = require("fs");
const request = require("request");

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
        ^FO${left},${top}^CF${font},${fontSX},${fontSY}^FD${input}^FS\n`;
}

function buidlBarcode(input, prop) {
    const top = prop.top;
    const left = prop.left;
    const width = prop.width;
    const height = prop.height
    
    return `
        ^FO${left},${top}^BY${1},,^BE,${height},Y,N^FD${input}^FS\n`;
}

function buildProp(name, input, prop) {
    var output = null;
    switch (name) {
        case "Barcode":
            output = buidlBarcode(input, prop);
            break;
        default:
            output = buildStyle(input, prop);
            break;
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
function build(jobData, itemData) {
    let output = "";
    const dFont = jobData.format.defaultFont;
    const page = jobData.page;
    const prop = jobData.properties;

    output = buildJob(itemData.detail, page, prop);
    
    return output

}

function getImage(data){
    var options = {
        encoding: null,
        formData: { file: data },
        // omit this line to get PNG images back
        headers: { 'Accept': 'image/png' },
        // adjust print density (8dpmm), label width (4 inches), label height (6 inches), and label index (0) as necessary
        url: 'http://api.labelary.com/v1/printers/8dpmm/labels/1x1/0/'
    };
    
    request.post(options, function(err, resp, body) {
        if (err) {
            return console.log(err);
        }
        var filename = __dirname + '/../../assets/ZPL_tests/output.png'; // change file name for PNG images
        fs.writeFile(filename, body, function(err) {
            if (err) {
                console.log(err);
            }
        });
    });
}

testDataJob = fs.readFileSync(__dirname + "/../../assets/ZPL_tests/test_job.json", "utf-8");
testDataItem = fs.readFileSync(__dirname + "/../../assets/ZPL_tests/test_items.json", "utf-8");

const res = build(JSON.parse(testDataJob), JSON.parse(testDataItem).printItem[2]);
getImage(res);


module.exports.build = build