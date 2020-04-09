class Adapter {
  constructor(data) {
    this.data = data;
    this.fixTargets();
    this.normalizeServices();
    this.removeEmptyServices();
    this.addSendersServices();
    this.addServicesToClusters();
    //this.adoptOrphanServices();
    this.addServersToSites();
    this.addSourcesTargets();
    console.log(this.data);
  }

  fixTargets = () => {
    this.data.services.forEach((service) => {
      if (!service.targets) {
        service.targets = [];
      }
      if (service.targets.length === 0) {
        if (service.requests_handled) {
          service.requests_handled.forEach((request) => {
            for (const server in request.by_server) {
              service.targets.push({
                name: server,
                site_id: request.site_id,
              });
            }
          });
        }
      }
    });
  };
  normalizeServices = () => {
    this.data.services.forEach((service) => {
      if (service.protocol === "tcp") {
        this.normalize(service);
      }
    });
  };
  normalize = (tcpService) => {
    tcpService.requests_received = [];
    tcpService.requests_handled = [];
    tcpService.connections_ingress.forEach((connection) => {
      const request = {};
      request.by_client = {};
      request.site_id = connection.site_id;
      const handling_site = {};
      for (let connection_id in connection.connections) {
        const connection_request = connection.connections[connection_id];
        if (!request.by_client[connection_request.client]) {
          request.by_client[connection_request.client] = {
            bytes_in: connection_request.bytes_in,
            bytes_out: connection_request.bytes_out,
            start_time: connection_request.start_time,
            last_in: connection_request.last_in,
            last_out: connection_request.last_out,
          };
        } else {
          request.by_client[connection_request.client].bytes_in +=
            connection_request.bytes_in;
          request.by_client[connection_request.client].bytes_out +=
            connection_request.bytes_out;
        }
        tcpService.connections_egress.forEach((connection_egress) => {
          if (connection_egress.connections[connection_id]) {
            if (!handling_site[connection_egress.site_id]) {
              handling_site[connection_egress.site_id] = {};
              handling_site[connection_egress.site_id].bytes_in =
                connection_egress.connections[connection_id].bytes_in;
              handling_site[connection_egress.site_id].bytes_out =
                connection_egress.connections[connection_id].bytes_out;
              handling_site[connection_egress.site_id].start_time =
                connection_egress.connections[connection_id].start_time;
              handling_site[connection_egress.site_id].last_in =
                connection_egress.connections[connection_id].last_in;
              handling_site[connection_egress.site_id].last_out =
                connection_egress.connections[connection_id].last_out;
            } else {
              handling_site[connection_egress.site_id].bytes_in +=
                connection_egress.connections[connection_id].bytes_in;
              handling_site[connection_egress.site_id].bytes_out +=
                connection_egress.connections[connection_id].bytes_out;
            }
          }
        });
        request.by_client[
          connection_request.client
        ].by_handling_site = handling_site;
      }
      tcpService.requests_received.push(request);
    });
  };

  removeEmptyServices = () => {
    this.data.emptyHttpServices = [];
    for (let i = this.data.services.length - 1; i >= 0; i--) {
      const service = this.data.services[i];
      if (service.requests_received.length === 0) {
        this.data.emptyHttpServices.push(JSON.parse(JSON.stringify(service)));
        this.data.services.splice(i, 1);
      }
    }
  };

  // add a service for each client that sends requests but
  // isn't in the service list.
  // The data structure only contains services that recieve requests.
  // This will add a service entry for clients that only send requests.
  // Note: if the client address is an ip address, it is not contained
  // in a site.
  addSendersServices = () => {
    this.data.services.forEach((service) => {
      service.requests_received.forEach((request) => {
        for (const clientKey in request.by_client) {
          const clientName = this.serviceNameFromClientId(clientKey);
          const found = this.data.services.find(
            (s) => s.address === clientName
          );
          if (!found) {
            // this is a new service. add it
            this.data.services.unshift({
              derived: true,
              address: clientName,
              protocol: service.protocol,
              requests_received: [],
              requests_handled: [],
              targets: [{ name: clientKey, site_id: request.site_id }],
            });
          } else if (found.derived) {
            if (!found.targets.some((t) => t.name === clientKey)) {
              found.targets.push({
                name: clientKey,
                site_id: request.site_id,
              });
            }
          }
        }
      });
    });
  };

  // add the source values to the target values for each attribute in the source.
  // This is actually a general purpose function and may be better stored elsewhere.
  aggregateAttributes = (source, target) => {
    for (const attribute in source) {
      if (target[attribute] === undefined) {
        target[attribute] = source[attribute];
      } else {
        if (typeof source[attribute] === "object") {
          this.aggregateAttributes(source[attribute], target[attribute]);
        } else if (!isNaN(source[attribute])) {
          target[attribute] += source[attribute];
        }
      }
    }
  };

  // add a list of resident services to each cluster
  addServicesToClusters = () => {
    this.data.sites.forEach((site) => {
      site.services = this.data.services.filter((service) =>
        service.targets.some((target) => target.site_id === site.site_id)
      );
    });
  };

  addServersToSites = () => {
    this.data.sites.forEach((site) => {
      site.servers = [];
      this.data.services.forEach((service) => {
        service.targets.forEach((target) => {
          if (target.site_id === site.site_id) {
            site.servers.push(target.name);
          }
        });
      });
    });
  };

  // add source and target list for each service
  addSourcesTargets = () => {
    this.data.services.forEach((service) => {
      if (!service.sourceServices) {
        service.sourceServices = [];
      }
      if (!service.targetServices) {
        service.targetServices = [];
      }
      // find all services that call this service
      const sourcesAddresses = this.servicesFromRequests(
        service.requests_received
      );
      // add a referece to the sources and targets
      sourcesAddresses.forEach((sourceAddress) => {
        const source = this.data.services.find(
          (s) => s.address === sourceAddress
        );
        service.sourceServices.push(source);
        if (!source.targetServices) {
          source.targetServices = [];
        }
        source.targetServices.push(service);
      });
    });
  };

  adoptOrphanServices = () => {
    this.data.services.forEach((service) => {
      const hasParent = this.data.sites.some((site) =>
        site.services.includes(service)
      );
      if (!hasParent) {
        service.targets = [
          { name: service.address, site_id: `${service.address}ID` },
        ];
        this.data.sites.push({
          site_name: service.address,
          site_id: `${service.address}ID`,
          connected: [],
          namespace: "none",
          url: "none",
          edge: false,
          services: [service],
          servers: [service.address],
          derived: true,
        });
      }
    });
    this.addServicesToClusters();
  };

  // return a list of service names in a requests list
  servicesFromRequests = (requests) => {
    let serviceList = [];
    requests.forEach((request) => {
      const names = Object.keys(request.by_client).map((key) =>
        this.serviceNameFromClientId(key)
      );
      serviceList.push(...names);
    });
    return serviceList;
  };

  // return a request record for traffic between source and target services
  linkRequest = (sourceAddress, target) => {
    let req = {};
    if (!target) debugger;
    target.requests_received.forEach((request) => {
      for (const client_id in request.by_client) {
        if (this.serviceNameFromClientId(client_id) === sourceAddress) {
          this.aggregateAttributes(request.by_client[client_id], req);
        }
      }
    });
    if (req.start_time) {
      const o = req.bytes_out;
      req.bytes_out = req.bytes_in;
      req.bytes_in = o;
    }
    return req;
  };

  // get list of attributes in requests.
  // Rather than hard-code which attributes are in a request,
  // we can get them out of one of the requests
  requestAttributes = () => {
    for (let s = 0; s < this.data.services.length; s++) {
      const service = this.data.services[s];
      for (let r = 0; r < service.requests_received.length; r++) {
        const request = service.requests_received[r];
        const keys = Object.keys(request.by_client);
        if (keys.length > 0) {
          return Object.keys(request.by_client[keys[0]]).filter(
            (k) => !["details", "by_handling_site"].includes(k)
          );
        }
      }
    }
  };

  serviceNameFromClientId = (server_key) => {
    let serviceName = server_key;
    this.data.services.some((service) => {
      return service.targets.some((target) => {
        if (target.name === server_key) {
          serviceName = service.address;
          return true;
        }
        return false;
      });
    });
    return serviceName;
  };

  shortName = (name) => {
    const parts = name.split("-");
    return parts.length > 2 ? parts[0] : name;
  };

  // is the address a valid ip address?
  // used to differentiate between external (ip address) clients and
  // clients that are resident in a site
  isIP = (address) =>
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      address
    );

  serviceFromServer = (server, site_id) =>
    this.data.services.find((service) =>
      service.targets.some((t) => t.name === server && t.site_id === site_id)
    );

  siteNameFromId = (site_id) =>
    this.data.sites.find((site) => site.site_id === site_id).site_name;

  // gather raw data for all services that are involved with the given service
  matrix = (involvingService, stat) => {
    if (!stat) stat = "bytes_out";
    const matrix = [];
    this.data.services.forEach((service) => {
      service.requests_received.forEach((request) => {
        Object.keys(request.by_client).forEach((client) => {
          const clientAddress = this.serviceNameFromClientId(client);
          const req = request.by_client[client];
          if (
            clientAddress === involvingService.address ||
            service.address === involvingService.address
          ) {
            const row = {
              ingress: clientAddress,
              egress: service.address,
              address: request.site_id,
              messages: req[stat],
            };
            const found = matrix.find(
              (r) => r.ingress === clientAddress && r.egress === service.address
            );
            if (found) {
              this.aggregateAttributes(row, found);
            } else {
              matrix.push(row);
            }
          }
        });
      });
    });
    return matrix;
  };

  // get a matrix for sites involved with the given site
  siteMatrixForSite = (site, stat) => {
    if (!stat) stat = "bytes_out";
    const matrix = this.siteMatrix(stat);
    for (let i = matrix.length - 1; i >= 0; --i) {
      if (
        matrix[i].ingress !== site.site_name &&
        matrix[i].egress !== site.site_name
      ) {
        matrix.splice(i, 1);
      }
    }
    return matrix;
  };

  // gather matrix records between sites
  siteMatrix = (stat) => {
    const matrix = [];
    if (!stat) stat = "bytes_out";
    this.data.services.forEach((service) => {
      service.requests_received.forEach((request) => {
        const from_site_id = request.site_id;
        for (const client_id in request.by_client) {
          const from_client_request = request.by_client[client_id];
          for (const to_site_id in from_client_request.by_handling_site) {
            matrix.push({
              ingress: this.siteNameFromId(from_site_id),
              egress: this.siteNameFromId(to_site_id),
              address: service.address,
              messages: from_client_request.by_handling_site[to_site_id][stat],
              request: from_client_request.by_handling_site[to_site_id],
            });
          }
        }
      });
    });
    return matrix;
  };

  allServiceMatrix = (stat) => {
    const matrix = [];
    if (!stat) stat = "bytes_out";
    this.data.services.forEach((service) => {
      service.requests_received.forEach((request) => {
        for (const from_client in request.by_client) {
          const from_client_req = request.by_client[from_client];
          for (const to_site_id in from_client_req.by_handling_site) {
            matrix.push({
              ingress: this.serviceNameFromClientId(from_client),
              egress: service.address,
              address: this.siteNameFromId(to_site_id),
              messages: from_client_req.by_handling_site[to_site_id][stat],
            });
          }
        }
      });
    });
    return matrix;
  };

  // get the cumulative stat for traffic between sites
  siteToSite = (from, to, stat) => {
    if (!stat) stat = "bytes_out";
    let value = null;
    this.data.services.forEach((service) => {
      service.requests_received.forEach((request) => {
        if (request.site_id === from.site_id) {
          for (let client_id in request.by_client) {
            const client_request = request.by_client[client_id];
            for (let handling_site_id in client_request.by_handling_site) {
              if (handling_site_id === to.site_id) {
                const handling_request =
                  client_request.by_handling_site[handling_site_id];
                if (!value) value = 0;
                value += handling_request[stat];
              }
            }
          }
        }
      });
    });
    return value;
  };

  fromTo = (from_name, from_site_id, to_name, to_site_id, stat) => {
    if (!stat) stat = "bytes_out";
    const toService = this.data.services.find((s) => s.address === to_name);
    if (toService) {
      const request = toService.requests_received.find(
        (r) => r.site_id === from_site_id
      );
      if (request) {
        for (let clientKey in request.by_client) {
          const address = this.serviceNameFromClientId(clientKey);
          if (from_name === address) {
            const client_request = request.by_client[clientKey];
            const from_request = client_request.by_handling_site[to_site_id];
            if (from_request) {
              return { stat: from_request[stat], request: from_request };
            }
          }
        }
      }
    }
    return { stat: undefined, request: undefined };
  };

  serviceNames = () => this.data.services.map((s) => s.address);
  requestSum = (req) => {
    let sum = 0;
    for (let server in req.by_server) {
      sum += req.by_server[server].requests;
    }
    return sum;
  };
}

/*
"connections_ingress": [
        {
          "site_id": "public1ID",
          "connections": {
            "10.129.2.5:48236@public1ID": {
              "id": "10.129.2.5:48236@public1ID",
              "start_time": 1583964005238,
              "bytes_in": 42,
              "bytes_out": 18,
              "client": "frontend-5d68fd5b7d-r7njx",
              "last_in": 1583964005291,
              "last_out": 1583964005290
            }
          }
        }
      ],

"requests_received": [
        {
          "site_id": "public2ID",
          "by_client": {
            "reviews-v3-6b6458969c-c4hp7": {
              "bytes_out": 1,
              "bytes_in": 0,
              "bytes_out": 48,
              "details": {
                "GET:200": 1
              },
              "latency_max": 33,
              "by_handling_site": {
                "public1ID": {
                  "bytes_out": 1,
                  "bytes_in": 0,
                  "bytes_out": 48,
                  "details": {
                    "GET:200": 1
                  },
                  "latency_max": 33
                }
              }
            }
          }
        }
      ],      
*/
export default Adapter;
