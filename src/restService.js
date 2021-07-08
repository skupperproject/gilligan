class RESTService {
  constructor() {
    this.url = `${window.location.protocol}//${window.location.host}`;
    //console.log(`default REST url is ${this.url}`);
  }

  getData = () =>
    new Promise((resolve, reject) => {
      if (process.env.NODE_ENV === "test") {
        const data = require("../public/data/testing.json");
        resolve(data);
      } else if (process.env.NODE_ENV === "development") {
        // This is used to get the data when the console
        // is served by yarn start or npm start
        this.fetchFrom("/data/DATA.json")
          .then(resolve)
          .catch((error) => {
            reject(error);
          });
      } else {
        // try from the window url
        this.fetchFrom(`${this.url}/DATA`)
          .then(resolve)
          .catch((error) => {
            reject(error);
          });
      }
    });

  getSiteInfo = (VAN) =>
    new Promise((resolve, reject) => {
      let url = `${this.url}/`;
      if (process.env.NODE_ENV === "development") {
        url = "/data/";
      } else if (process.env.NODE_ENV === "test") {
        url = "../public/data/";
      }
      let promises = [
        this.fetchFrom(`${url}tokens.json`),
        this.fetchFrom(`${url}links.json`),
        this.fetchFrom(`${url}deployments.json`),
      ];
      Promise.allSettled(promises).then((allResults) => {
        const results = {};
        results.tokens =
          allResults[0].status === "fulfilled" ? allResults[0].value : [];
        results.links =
          allResults[1].status === "fulfilled" ? allResults[1].value : [];
        results.deployments =
          allResults[2].status === "fulfilled"
            ? allResults[2].value
            : undefined;
        results["site_name"] = VAN.sites[0].site_name;
        results["site_id"] = VAN.sites[0].site_id;
        results["Site type"] = VAN.sites[0]["Site type"];
        results["namespace"] = VAN.sites[0].namespace;
        resolve(results);
      });
    });

  // create a link
  uploadToken = (data) => this.postSiteInfoMethod(data, "POST", "links");

  // delete a link
  unlinkSite = (data) =>
    this.postSiteInfoMethod(data, "DELETE", "links", data.Name);

  // create a token
  getTokenData = () => this.postSiteInfoMethod({}, "POST", "tokens");

  // delete a token
  deleteToken = (data) =>
    this.postSiteInfoMethod(data, "DELETE", "tokens", data.Name);

  // update a token
  updateToken = (data) =>
    this.postSiteInfoMethod(data, "UPDATE", "tokens", data.Name);

  // create a deployment
  exposeService = (data) =>
    this.postSiteInfoMethod(data, "POST", "deployments");

  // delete a deployment
  unexposeService = (data) =>
    this.postSiteInfoMethod(data, "DELETE", "deployments", data.Name);

  // update a site's name
  renameSite = (data) =>
    this.postSiteInfoMethod(data, "UPDATE", "sites", data.site_id);

  // revoke site's certificate authority
  regenCA = () => this.postSiteInfoMethod({}, "DELETE", "certificateAuthority");

  // POST the data using method
  postSiteInfoMethod = (data, method, type, name) => {
    return new Promise((resolve, reject) => {
      let url = `${this.url}/${type}`;
      if (name) {
        url = `${url}/${name}`;
      }
      fetch(url, {
        method,
        body: JSON.stringify(data),
      })
        .then((response) => {
          if (!response.ok) {
            console.log(
              `${method} to ${type} for ${name} with data ${JSON.stringify(
                data,
                null,
                2
              )} returned with a status of ${response.status}`
            );
            const e =
              response.status === 404
                ? new Error(`${method}::${type} not implemented`)
                : new Error(
                    `${method} ${type} ${response.statusText} (${response.status})`
                  );
            console.log("rejecting with error");
            console.log(e);
            reject(e);
          } else {
            resolve(response);
          }
        })
        .catch((error) => {
          // server error
          const e = new Error(`Failed with error ${error.status}`);
          reject(e);
        });
    });
  };

  // needed when the token is saved directly to a file
  getSkupperTokenURL = () => `/tokens`;

  // called when the user requests that a token be copied to the clipboard
  _getTokenData = () =>
    new Promise((resolve, reject) => {
      if (process.env.NODE_ENV === "test") {
        // This is used when testing the console from 'npm run test'
        const data = require("../public/data/TOKEN.json");
        resolve(data);
      } else if (process.env.NODE_ENV === "development") {
        // This is used to get the data when the console
        // is served by yarn start or npm start
        this.fetchFrom("/data/TOKEN.json")
          .then(resolve)
          .catch((error) => {
            reject(error);
          });
      } else {
        this.postSiteInfoMethod({}, "POST", "tokens")
          .then((response) => {
            if (!response.ok) {
              const e = new Error(
                `/${this.getSkupperTokenURL()} ${response.statusText} (${
                  response.status
                })`
              );
              reject(e);
            } else {
              resolve(response);
            }
          })
          .catch((error) => {
            reject(error);
          });
      }
    });

  fetchFrom = (url) =>
    new Promise((resolve, reject) => {
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          resolve(data);
        })
        .catch((error) => {
          reject(error);
        });
    });
}

export default RESTService;
