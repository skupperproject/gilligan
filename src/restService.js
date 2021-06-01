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

  getSiteInfo = () =>
    new Promise((resolve, reject) => {
      if (process.env.NODE_ENV === "test") {
        const data = require("../public/data/SITE.json");
        resolve(data);
      } else {
        this.fetchFrom(`${this.url}/SITE`)
          .then(resolve)
          .catch((error) => {
            this.fetchFrom("/data/SITE.json")
              .then((results) => {
                resolve(results);
              })
              .catch((error) => {
                reject(error);
              });
          });
      }
    });

  uploadToken = (data) =>
    new Promise((resolve, reject) => {
      fetch(`${this.url}/LINK`, {
        method: "POST",
        body: data,
      })
        .then((response) => {
          if (!response.ok) {
            // make the promise be rejected if we didn't get a 2xx response
            reject(`not implemented yet`);
          } else {
            resolve(response);
          }
        })
        .catch((error) => {
          // connection down or refused
          reject(error);
        });
    });

  unlinkSite = (data) => this.postSiteInfoMethod(data, "UNLINK");

  deleteToken = (data) => this.postSiteInfoMethod(data, "DELETE_TOKEN");

  updateToken = (data) => this.postSiteInfoMethod(data, "UPDATE_TOKEN");

  renameSite = (data) => this.postSiteInfoMethod(data, "RENAME_SITE");

  regenCA = () => this.postSiteInfoMethod("", "REGEN_CA");

  // POST the data using method
  postSiteInfoMethod = (data, method) => {
    return new Promise((resolve, reject) => {
      fetch(`${this.url}/${method}`, {
        method: "POST",
        body: JSON.stringify(data),
      })
        .then((response) => {
          if (!response.ok) {
            const e =
              response.status === 404
                ? new Error(`/${method} not implemented`)
                : new Error(
                    `/${method} ${response.statusText} (${response.status})`
                  );
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
  getSkupperTokenURL = () => `/GENERATE_TOKEN`;

  // called when the token is copied to the clipboard
  getTokenData = () =>
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
        this.fetchFrom(`${this.url}${this.getSkupperTokenURL()}`)
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
