const axios = require("axios");
const { build } = require("./label_constructor");
const { sendPrint } = require("./printer");

class Api {
  constructor({ user, pass, printerIds }) {
    this.user = user;
    this.pass = pass;
    this.printerIds = printerIds;
    this.running = true;
    this.failures = 0;
  }

  updateDetails({ user, pass, printerIds }) {
    this.user = user ?? this.user;
    this.pass = pass ?? this.pass;
    this.printerIds = printerIds ?? this.printerIds;
    this.failures = 0;
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

  buildJobCountUrl = () =>
    `https://${this.user}:${this.pass}@dev.ilevelconnect.co.uk/print/printjob/query/count`;

  buildJobUrl = (page = 1) =>
    `https://${this.user}:${this.pass}@dev.ilevelconnect.co.uk/print/printjob/query?fields=id,page,properties,format,createdDate&page=${page}`;

  deleteJobUrl = (jobId) =>
    `https://${this.user}:${this.pass}@dev.ilevelconnect.co.uk/print/printjob/${jobId}`;

  buildItemsUrl = (jobId, page = 1) =>
    `https://${this.user}:${this.pass}@dev.ilevelconnect.co.uk/print/printitem?fk_printjob=${jobId}&fields=detail&page=${page}`;

  async getJobCountAsync() {
    try {
      const res = await axios.post(
        this.buildJobCountUrl(),
        this.buildPrinterIdQuery()
      );
      return { success: true, data: res.data.count };
    } catch (error) {
      return { success: false, error: error };
    }
  }

  async deleteJobAsync(jobId) {
    try {
      const res = await axios.delete(this.deleteJobUrl(jobId));
      if (res.Response === "OK") return { success: true };
      return { success: false };
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
        let res = await axios.post(
          this.buildJobUrl(page),
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
        let res = await axios.get(this.buildItemsUrl(jobId, page));
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

  startPrintJobListener() {
    this.pollLoop(
      () =>
        this.getJobCountAsync()
          .then(async (res) => {
            if (!res.success) {
              this.failures++;
              if (this.failures > 10) {
                console.error(res.error);
                this.failures = 0;
              }
              return;
            }
            console.log("Number of jobs: " + res.data);

            if (res.data === 0) return;

            const jobs = await this.getJobsAsync();
            if (!jobs.success) return;

            let jobArray = [];
            for (let i = 0; i < jobs.data.length; i++) {
              const items = await this.getItemsForJobAsync(jobs.data[i].id);
              if (!items.success) return;

              jobArray.push({ job: jobs.data[i], items: items.data });
            }
            console.log(jobArray); // DO SOMETHING WITH JOBS HERE
            for (let i = 0; i < jobArray.length; i++) {
              for (let j = 0; j < jobArray[i].items.length; j++) {
                const zpl = await build(
                  jobArray[i].job,
                  jobArray[i].items[j],
                  203,
                  "pixel"
                );

                try {
                  const printSuccess = await sendPrint(
                    "ZDesigner GX420d (1)",
                    zpl,
                    ""
                  );
                  const z = await this.deleteJobAsync(jobArray[i].job.id);
                } catch (err) {
                  console.log(
                    `Failed to delete print job ${jobArray[i].job.id}.`
                  );
                }
              }
            }

            // Maybe we should add jobs to a parent array outside of API?
            // That would mean that a separate listener pulls jobs off of the parent array as they appear, and print them.
            // Would be a better way to handle multiple printers? So printing from one printer doesn't hold back printing from another.
            // Probably best to discuss this properly before final build.
          })
          .catch((error) => console.error(error)),
      1000
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
