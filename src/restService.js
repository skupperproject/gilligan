class RESTService {
  constructor() {
    this.url = `${window.location.protocol}//${window.location.host}`;
    this.latest = [];
  }

  getVAN = () =>
    new Promise(resolve => {
      fetch("/data/skupper.json")
        .then(res => res.json())
        .then(VAN => {
          console.log(VAN);
          resolve(VAN);
        })
        .catch(error => {
          console.log("/data/skupper.json not found.");
        });
    });

  /*
  getVAN = () =>
    new Promise((resolve, reject) => {
      this.latest = [];
      const strategy = { "200": "resolve", "404": "resolve", "500": "reject" };
      poll(`${this.url}/get`, strategy).then(
        res => {
          this.latest = res;
          resolve(res);
        },
        e => {
          reject(e);
        }
      );
    });

    createTopic = data =>
    new Promise((resolve, reject) => {
      // console.log(` *** creating ${data.name} ***`);
      fetch(`${this.url}/topics`, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify(data)
      })
        .then(response => {
          if (response.status === 500) {
            reject(Error("unable to create topic"));
          } else {
            const strategy = {
              "200": "resolve",
              "404": "wait",
              "500": "reject"
            };
            poll(`${this.url}/topics/${data.name}`, strategy).then(
              res => {
                resolve(res);
              },
              e => {
                reject(e);
              }
            );
          }
        })
        .catch(e => {
          console.log("create topic failed with error");
          console.log(e);
          reject(e);
        });
    });

  deleteTopic = name =>
    new Promise((resolve, reject) => {
      // console.log(` *** deleting ${name} ***`);
      fetch(`${this.url}/topics/${name}`, {
        method: "DELETE"
      }).then(() => {
        const strategy = { "200": "wait", "404": "resolve", "500": "reject" };
        poll(`${this.url}/topics/${name}`, strategy).then(
          res => {
            resolve(res);
          },
          e => {
            reject(e);
          }
        );
      });
    });

  isUniqueValidName(name) {
    const found = this.latest.some(item => item.name === name);
    return !found;
  }

  deleteTopicList(names) {
    return new Promise((resolve, reject) => {
      Promise.all(names.map(name => this.deleteTopic(name))).then(
        () => {
          resolve();
        },
        firstError => {
          reject(firstError);
        }
      );
    });
  }

  getTopicDetails(name) {
    return new Promise((resolve, reject) => {
      fetch(`${this.url}/topics/${name} `)
        .then(response => {
          if (response.status < 200 || response.status > 299) {
            reject(Error(response.statusText));
            return {};
          }
          return response.json();
        })
        .then(myJson => {
          resolve(myJson);
        })
        // network error?
        .catch(error => reject(error));
    });
  }
  */
}

// poll for a condition
const poll = (url, strategy, timeout, interval) => {
  const endTime = Number(new Date()) + (timeout || 10000);
  interval = interval || 1000;
  const s200 = strategy["200"];
  const s404 = strategy["404"];
  const s500 = strategy["500"];
  let lastStatus = 0;
  // console.log('-------------------');
  // console.log(`polling for ${url}`);

  const checkCondition = (resolve, reject) => {
    // If the condition is met, we're done!
    fetch(url)
      .then(res => {
        lastStatus = res.status;
        const ret = {};
        // decide whether to resolve, reject, or wait
        if (res.status >= 200 && res.status <= 299) {
          // console.log(`received ${res.status} will ${s200}`);
          ret[s200] = res.json();
          return ret;
        } else if (res.status === 404) {
          // console.log(`received 404 will ${s404}`);
          ret[s404] = [];
          return ret;
        }
        // console.log(`received ${res.status} will ${s500}`);
        ret[s500] = res.status;
        return ret;
      })
      .then(json => {
        if (json.resolve) {
          resolve(json.resolve);
        } else if (json.reject) {
          reject(json.reject);
        }
        // If the condition isn't met but the timeout hasn't elapsed, go again
        else if (Number(new Date()) < endTime) {
          setTimeout(checkCondition, interval, resolve, reject);
        }
        // Didn't match and too much time, reject!
        else {
          const msg = { message: "timeout", status: lastStatus };
          console.log(msg);
          reject(new Error(JSON.stringify(msg)));
        }
      })
      .catch(e => {
        console.log(`poll caught error ${e}`);
        reject(e);
      });
  };
  return new Promise(checkCondition);
};

export default RESTService;
