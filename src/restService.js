class RESTService {
  constructor() {
    this.url = `${window.location.protocol}//${window.location.host}`;
    //this.url =
    //  "https://skupper-default.grs1-153f1de160110098c1928a6c05e19444-0000.eu-gb.containers.appdomain.cloud";
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
      let suffix = ".json";

      if (process.env.NODE_ENV === "development") {
        url = "/data/";
      } else if (process.env.NODE_ENV === "test") {
        url = "../public/data/";
      } else {
        suffix = "";
      }
      let promises = [
        this.fetchFrom(`${url}tokens${suffix}`),
        this.fetchFrom(`${url}links${suffix}`),
        //this.fetchFrom(`${url}deployments${suffix}`),
      ];
      Promise.allSettled(promises).then((allResults) => {
        const results = {};
        results.tokens =
          allResults[0].status === "fulfilled" ? allResults[0].value : [];
        results.links =
          allResults[1].status === "fulfilled" ? allResults[1].value : [];
        /*
        results.deployments =
          allResults[2].status === "fulfilled"
            ? allResults[2].value
            : undefined;
            */
        results.deployments = undefined;
        results["site_name"] = VAN.sites[0].site_name;
        results["site_id"] = VAN.sites[0].site_id;
        results["Site type"] = VAN.sites[0]["Site type"];
        results["namespace"] = VAN.sites[0].namespace;
        resolve(results);
      });
    });

  // create a link
  uploadToken = (data) => {
    const obj = JSON.parse(data);
    return this.postSiteInfoMethod(obj, "POST", "links");
  };

  // delete a link
  unlinkSite = (data) =>
    this.postSiteInfoMethod(data, "DELETE", "links", data.Name);

  // create a token
  // called when the user requests that a token be copied to the clipboard
  getTokenData = () => {
    return new Promise((resolve, reject) => {
      this.postSiteInfoMethod({}, "POST", "tokens")
        .then(
          (results) => results.text(),
          (e) => {
            console.log(`got ${e.message} from POST to /tokens`);
            this.fetchFrom(`/data/token.json`).then(
              (token) => {
                resolve(token);
              },
              (error) => {
                reject(e);
              }
            );
          }
        )
        .then((text) => {
          resolve(text);
        });
    });
  };

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
            const forname = name ? ` for ${name}` : "";
            console.log(
              `${method} to ${type}${forname} with data ${JSON.stringify(
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

/*
{
    "kind": "Secret",
    "apiVersion": "v1",
    "metadata": {
        "name": "7UYhFPYBWU1dRcYuIbRDCSkL",
        "creationTimestamp": null,
        "labels": {
            "skupper.io/type": "token-claim"
        },
        "annotations": {
            "skupper.io/generated-by": "2d20d07c-cfca-4c37-8aea-823b7e56b8f8",
            "skupper.io/url": "https://claims-default.grs1-153f1de160110098c1928a6c05e19444-0000.eu-gb.containers.appdomain.cloud:443/37560812-e3e8-11eb-a8f2-fe772f9330c2"
        }
    },
    "data": {
        "ca.crt": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUREakNDQWZhZ0F3SUJBZ0lSQU1KYk12RFpsVWdXOFp1N00rQTdOd2t3RFFZSktvWklodmNOQVFFTEJRQXcKR2pFWU1CWUdBMVVFQXhNUGMydDFjSEJsY2kxemFYUmxMV05oTUI0WERUSXhNRGN4TXpBNU5ETXlNRm9YRFRJMgpNRGN4TWpBNU5ETXlNRm93R2pFWU1CWUdBMVVFQXhNUGMydDFjSEJsY2kxemFYUmxMV05oTUlJQklqQU5CZ2txCmhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBdHlUcHB2dFIyYjI4Z3Q4M0kveHd5ZnoyNnFjMlhzS0oKVzJCVnpaZGRHYVU1TURPOWt2Mks0UUNWNnVZajN2enhaTHVTejE5eWhKOFJSOEEzMXRwb2NTcVRpb05wa3psVwozOFhOd0V1R21PT1RacUpBejdnZS9CQXpRTEhnU0dzNGh0V1NWcFF6MXE5eU9mM3VVTnRJNEp3aDlzNktzUm9YClQra05KZ3FTZ3RQNUpham5DWGlwcWx1ckhHUFRoRFYydWVldlVkbEZWSnZRZ1d5ZGxRaHB3elFzVE1YTVhHaHQKVVJzaGNESXdlMlc4dGNDWnFRSjlNYUkwUXhlSmRObTR3MEErYzBBTElWbDQ4S2JPSnFpUmJzcGZkVnNBWXk2NwpFckJabHZCekNyZnZXQTIralBvNmlUVVFZY3ErT1FmUldBd1NsbWV2eDJ6RHVvcCs0N2NpVndJREFRQUJvMDh3ClRUQU9CZ05WSFE4QkFmOEVCQU1DQXFRd0hRWURWUjBsQkJZd0ZBWUlLd1lCQlFVSEF3RUdDQ3NHQVFVRkJ3TUMKTUE4R0ExVWRFd0VCL3dRRk1BTUJBZjh3Q3dZRFZSMFJCQVF3QW9JQU1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQgpBUUIwU1lyZ3B3SFExL0FaVzk3a3RLQitiaERCVTU4WWMwb1YvQ0E1L0FpOFpqS1o3eHpQdnA2TWVvWGhSWCsrCmtSdnZ1RTY5MEIvTU9UdXM4bnBwRUw4UUhpUERuTXZNMlloMHFxUTNOTUR0WG85NzAxWklGTkhBSFoxM293bU4KMEQ5N0llOThScTJrdFRjV05yOURpR2xXMTNKc2QrLzRja0VybFBOTnMyNldpSjMvZjh2cU5VVVlLbTl2eEJzUgptOXc2M1lwanFUZFBsQnJlNlFvYWNKK3RwWXlObmdxU3Z0ZVV2S0M2dUZxVmtzTmN1dmsyNzRaMys5SVY3WVI1ClFsdWxuenlMZTBGZXI4ZVBkaU1BOEl1WDRqSGI1cHora2p2Q29hbFNkRHV6VXYxdjZYWTFnRWx3QWtpbHBMalgKSzZEREQ5bHdGdklkQkdOUTJldEhRa1R4Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
        "password": "TDIxRWREOXZpMG1ja2dnVzltUjY2bmVlcE9qSkREU2hDMDlKSWJvNE11SVFoZXRUd3BZdlRIWEdSazdscVpkaHJNaEZBTW1TVEJJblp4enNQdzFidkt1SGZ6cTVQUVZQWVVUbzJ1Y0JEQVRIREllOFdySTRFYjBRV1dSenUzNHo="
    }
}
*/
