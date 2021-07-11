const { get } = require("axios");

class Api {
  constructor({ user, pass, printerId }) {
    this.user = user;
    this.pass = pass;
    this.printerId = printerId;
    this.running = true;
    this.failures = 0;
  }

  updateDetails({ user, pass, printerId }) {
    this.user = user ?? this.user;
    this.pass = pass ?? this.pass;
    this.printerId = printerId ?? this.printerId;
    this.failures = 0;
  }

  togglePolling() {
    this.running = !this.running;
    this.failures = 0;
  }
  buildJobCountUrl = () =>
    `https://${this.user}:${this.pass}@dev.ilevelconnect.co.uk/print/printjob/count?fk_printer=${this.printerId}`;

  buildJobUrl = (page = 1) =>
    `https://${this.user}:${this.pass}@dev.ilevelconnect.co.uk/print/printjob?fk_printer=${this.printerId}&fields=id,page,properties,format,createdDate&page=${page}`;

  buildItemsUrl = (jobId, page = 1) =>
    `https://${this.user}:${this.pass}@dev.ilevelconnect.co.uk/print/printitem?fk_printjob=${jobId}&fields=detail&page=${page}`;

  async getJobCountAsync() {
    try {
      const res = await get(this.buildJobCountUrl());
      return { success: true, data: res.data.count };
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
        let res = await get(this.buildJobUrl(page));
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
        let res = await get(this.buildItemsUrl(jobId, page));
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
          })
          .catch((error) => console.error(error)),
      10000
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
