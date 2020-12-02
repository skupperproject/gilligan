class RESTService {
  constructor() {
    this.url = `${window.location.protocol}//${window.location.host}`;
    //console.log(`default REST url is ${this.url}`);
  }

  getData = (alt) =>
    new Promise((resolve, reject) => {
      if (process.env.NODE_ENV === "test") {
        const data = require("../public/data/DATA.json");
        resolve(data);
      } else {
        // try from the window url
        this.fetchFrom(`${this.url}/DATA`)
          .then(resolve)
          .catch((error) => {
            //console.log("failed to get from window url");
            // This is used to get the data when the console
            // is served by yarn start
            if (!alt) {
              alt = `/data/DATA.json`;
            }
            this.fetchFrom(alt)
              .then(resolve)
              .catch((error) => {
                reject(error);
              });
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
