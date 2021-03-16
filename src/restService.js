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
        console.log("getSiteInfo test");
        const data = require("../public/data/SITE.json");
        resolve(data);
      } else {
        this.fetchFrom(`${this.url}/SITE`)
          .then(resolve)
          .catch((error) => {
            console.log(`getSiteInfo error from ${this.url}/SITE: ${error}`);
            this.fetchFrom("/data/SITE.json")
              .then((results) => {
                console.log(
                  `getSiteInfo results ${JSON.stringify(results, null, 2)}`
                );
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
      fetch(`${this.url}/USETOKEN`, {
        method: "POST",
        body: data,
      })
        .then((response) => {
          console.log(
            `uploadToken response is ${JSON.stringify(response, null, 2)}`
          );
          resolve(response);
        })
        .catch((error) => {
          console.log(`uploadToken error is ${JSON.stringify(error, null, 2)}`);
          reject(error);
        });
    });

  getSkupperTokenURL = () => `/GETTOKEN`;

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
