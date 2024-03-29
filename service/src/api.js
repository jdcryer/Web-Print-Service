const axios = require("axios");
const { build } = require("./label_constructor");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const SVGtoPDF = require("svg-to-pdfkit");

class Api {
  constructor({ user, pass, baseUrl, printerConnector, printerIds }) {
    this.user = user;
    this.pass = pass;
    this.baseUrl = baseUrl;
    this.printerConn = printerConnector;
    this.printerIds = printerIds;
    this.running = false;
    this.failures = 0;
    this.pdfSpoolSize = 100;
    this.cookie = "test";
  }

  updateDetails({ user, pass, baseUrl, printerIds }) {
    this.user = user ?? this.user;
    this.pass = pass ?? this.pass;
    this.baseUrl = baseUrl ?? this.baseUrl;
    this.printerIds = printerIds ?? this.printerIds;
    this.failures = 0;
    this.cookie = "test";
  }

  togglePolling() {
    this.running = !this.running;
    this.failures = 0;
  }

  buildPrinterIdQuery = () => ({
    querywitharray: {
      field: "fk_printer",
      values: this.printerIds,
    },
  });

  getUserIdUrl = () =>
    `https://${this.user}:${this.pass}@${this.baseUrl}/print/currentUser`;

  getJobCountUrl = () =>
    `https://${this.user}:${this.pass}@${this.baseUrl}/print/printjob/query/count`;

  getJobUrl = (page = 1) =>
    `https://${this.user}:${this.pass}@${this.baseUrl}/print/printjob/query?fields=id,page,properties,format,createdDate,fk_printer&page=${page}`;

  deleteJobUrl = (jobId) =>
    `https://${this.user}:${this.pass}@${this.baseUrl}/print/printjob/${jobId}`;

  deletePrinterUrl = (printerId) =>
    `https://${this.user}:${this.pass}@${this.baseUrl}/print/printer/${printerId}`;

  getItemsUrl = (jobId, page = 1) =>
    `https://${this.user}:${this.pass}@${this.baseUrl}/print/printitem?fk_printjob=${jobId}&fields=detail&page=${page}`;

  postNewPrinterUrl = () =>
    `https://${this.user}:${this.pass}@${this.baseUrl}/print/printer`;

  setCookie(headers) {
    let cookie;
    let cookies = headers["set-cookie"][0].split(";");

    for (var i = 0; i < cookies.length; i++) {
      cookie = cookies[i].split("=");
      if (cookie[0].startsWith("4DSID")) {
        this.cookie = cookies[i];
        return;
      }
    }
    this.cookie = "4DSID=test";
    return;
  }
  get = async (url) => {
    let res = await axios.get(url, { headers: { Cookie: this.cookie } });
    this.setCookie(res.headers);
    return res;
  };

  post = async (url, obj) => {
    let res = await axios.post(url, obj, { headers: { Cookie: this.cookie } });
    this.setCookie(res.headers);
    return res;
  };

  put = async (url, obj) => {
    let res = await axios.put(url, obj, { headers: { Cookie: this.cookie } });
    this.setCookie(res.headers);
    return res;
  };

  del = async (url) => {
    let res = await axios.delete(url, { headers: { Cookie: this.cookie } });
    this.setCookie(res.headers);
    return res;
  };

  async getUserIdAsync() {
    try {
      const res = await this.get(this.getUserIdUrl());
      if (res.data.id === undefined) throw "Failed to connect.";
      return { success: true, data: res.data.id };
    } catch (error) {
      return { success: false, error: error };
    }
  }

  async getJobCountAsync() {
    try {
      const res = await this.post(
        this.getJobCountUrl(),
        this.buildPrinterIdQuery()
      );
      if (res.data.count === undefined) throw "Failed to connect";
      return { success: true, data: res.data.count };
    } catch (error) {
      return { success: false, error: error };
    }
  }

  async postNewPrinterAsync(userId, printerName, displayName, type, isPublic) {
    try {
      const res = await this.post(this.postNewPrinterUrl(), {
        fk_user: userId,
        name: displayName,
        type: type,
        public: isPublic,
      });
      this.printerConn.addPrinter(printerName, res.data.id, displayName);
      return { success: true, data: res.data };
    } catch (error) {
      return { success: false, error: error };
    }
  }

  async editPrinterAsync(printerId, printerName, displayName, type, isPublic) {
    try {
      const res = await this.put(this.postNewPrinterUrl(), {
        id: printerId,
        name: displayName,
        type: type,
        public: isPublic,
      });
      this.printerConn.editPrinter(printerName, {
        displayName: displayName,
        acceptedTypes: [type],
      });
      return { success: true, data: res.data };
    } catch (error) {
      return { success: false, error: error };
    }
  }

  async deleteJobAsync(jobId) {
    try {
      const res = await this.del(this.deleteJobUrl(jobId));
      if (res.statusText === "OK") return { success: true };
      return { success: false };
    } catch (error) {
      return { success: false, error: error };
    }
  }

  async deletePrinterAsync(printerId) {
    try {
      const res = await this.del(this.deletePrinterUrl(printerId));
      if (res.statusText === "OK") {
        this.printerConn.removePrinter(printerId);

        return { success: true };
      }
      return { success: false, error: res.Error };
    } catch (error) {
      return { success: false, error: error };
    }
  }

  async getJobsAsync() {
    let jobs = [];
    let page = 1;
    let numOnPage = 0;
    try {
      do {
        let res = await this.post(
          this.getJobUrl(page),
          this.buildPrinterIdQuery()
        );
        numOnPage = res.data.response.recordsSent;
        if (numOnPage > 0) jobs = jobs.concat(res.data.response.printJob);
        page++;
      } while (numOnPage > 0);
      return { success: true, data: jobs };
    } catch (error) {
      return { success: false, error: error };
    }
  }

  async getItemsForJobAsync(jobId) {
    let itemData = [];
    let page = 1;
    let numOnPage = 0;
    try {
      do {
        let res = await this.get(this.getItemsUrl(jobId, page));
        numOnPage = res.data.response.recordsSent;
        if (numOnPage > 0)
          itemData = itemData.concat(res.data.response.printItem);
        page++;
      } while (numOnPage > 0);
      return { success: true, data: itemData };
    } catch (error) {
      return { success: false, error: error };
    }
  }

  // Width and height in inches
  #newPdfDoc(width, height) {
    return new PDFDocument({
      size: [width * 72, height * 72], // TODO: needs to be in points (1/72 inches)
      bufferPages: true,
      autoFirstPage: false,
    });
  }

  startPrintJobListener() {
    if (this.running) return;
    this.running = true;
    this.pollLoop(
      () =>
        this.getJobCountAsync()
          .then(async (res) => {
            if (!res.success) {
              this.failures++;
              if (this.failures > 10) {
                console.error(res.error.message);
                this.failures = 0;
              }
              return;
            }

            if (res.data === 0) return;

            const jobs = await this.getJobsAsync();
            if (!jobs.success) return;

            let jobArray = [];
            for (let i = 0; i < jobs.data.length; i++) {
              const items = await this.getItemsForJobAsync(jobs.data[i].id);
              if (!items.success) return;

              jobArray.push({ job: jobs.data[i], items: items.data });
            }

            console.log(jobArray);

            for (let i = 0; i < jobArray.length; i++) {
              let svgList = []; // create object list of { promise, quantity }
              // Convert from points (1/72 of an inch) to inches
              const labelWidth = jobArray[i].job.page.width / 72;
              const labelHeight = jobArray[i].job.page.height / 72;

              for (let j = 0; j < jobArray[i].items.length; j++) {
                svgList.push(
                  build(jobArray[i].job, jobArray[i].items[j], 72, "pixel")
                );
              }

              // replaces svgList with list of { SVG, quantity }
              svgList = (await Promise.all(svgList)).map((x, j) => ({
                svg: x,
                qty: jobArray[i].items[j].detail.qty,
              }));

              fs.writeFile("output.svg", svgList[0].svg, (err) => {});

              let numLabels = svgList
                .map((x) => x.qty)
                .reduce((p, c) => p + c, 0);

              let doc = this.#newPdfDoc(labelWidth, labelHeight);
              let stream = fs.createWriteStream("output.pdf");
              doc.pipe(stream);
              let currentSvg = 0;
              let jobSuccess = true;
              let currentLabel = 0;

              while (currentLabel < numLabels) {
                if (svgList[currentSvg].qty === 0) currentSvg++;

                doc.addPage();
                doc.switchToPage(currentLabel % this.pdfSpoolSize);
                SVGtoPDF(doc, svgList[currentSvg].svg, 0, 0);
                svgList[currentSvg].qty--;
                currentLabel++;

                if (
                  currentLabel % this.pdfSpoolSize === 0 ||
                  currentLabel === numLabels
                ) {
                  doc.end();
                  await new Promise((r) => stream.on("finish", r));
                  try {
                    await this.printerConn.sendPrint(
                      this.printerConn.getPrinterById(
                        jobArray[i].job.fk_printer
                      ).name,
                      null,
                      ""
                    );
                    if (currentLabel !== numLabels) {
                      doc = this.#newPdfDoc(labelWidth, labelHeight);
                      stream = fs.createWriteStream("output.pdf");
                      doc.pipe(stream);
                    }
                  } catch (err) {
                    console.log(
                      `Failed job ${jobArray[i].job.id}.
                      Error: ${err}`
                    );
                    jobSuccess = false;
                    break;
                  }
                }
              }
              doc.end();

              if (jobSuccess) await this.deleteJobAsync(jobArray[i].job.id);
            }
          })
          .catch((error) => console.error("error: ", error)),
      3000
    );
  }

  pollLoop(promise, interval) {
    const execute = () =>
      this.running ? promise().finally(waitAndExecute) : waitAndExecute();
    const waitAndExecute = () => setTimeout(execute, interval);
    execute();
  }
}

module.exports = Api;
