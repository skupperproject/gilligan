class RESTService {
  constructor() {
    this.url = `${window.location.protocol}//${window.location.host}`;
    console.log(`default REST url is ${this.url}`);
  }

  getData = () =>
    new Promise((resolve, reject) => {
      // try from the window url
      this.fetchFrom(`${this.url}/DATA`)
        .then(resolve)
        .catch(error => {
          console.log("failed to get from window url");
          console.log(error);
          // TODO: remove this for production
          // this was only used to get the data when the console
          // was served by yarn start
          this.fetchFrom("/data/sample2.json")
            .then(resolve)
            .catch(error => {
              console.log(error);
              reject(error);
            });
        });
    });

  fetchFrom = url =>
    new Promise((resolve, reject) => {
      fetch(url)
        .then(res => res.json())
        .then(data => {
          resolve(data);
        })
        .catch(error => {
          reject(error);
        });
    });
}

export default RESTService;
