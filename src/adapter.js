class Adapter {
  constructor(data) {
    this.data = data;
    this.addSendersServices();
    this.addServicesToClusters();
    this.addServersToSites();
    this.addSourcesTargets();
    this.addVersions();
    this.addSiteConnected();
    console.log(this.data);
  }

  // add a service for each client that sends requests but
  // isn't in the service list.
  // The data structure only contains services that recieve requests.
  // This will add a service entry for clients that only send requests.
  // Note: if the client address is an ip address, it is not contained
  // in a site.
  addSendersServices = () => {
    this.data.services.forEach(service => {
      service.requests_received.forEach(request => {
        for (const clientKey in request.by_client) {
          const clientName = this.serviceNameFromId(clientKey);
          if (!this.data.services.some(s => s.address === clientName)) {
            // this is a new service. add it
            this.data.services.unshift({
              address: clientName,
              protocol: service.protocol,
              requests_received: [],
              requests_handled: [],
              requests_sent: [],
              targets: [{ name: clientKey, site_id: request.site_id }]
            });
            const newService = this.data.services[0];
            this.addRequestSent(
              newService,
              clientKey,
              request,
              service.address
            );
          } else {
            // the service was already added.
            // add a new requests_sent section
            const sender = this.data.services.find(
              s => s.address === clientName && s.requests_sent
            );
            if (sender) {
              // this service was already added, update its requests_sent
              this.addRequestSent(sender, clientKey, request, service.address);
              // and targets
              if (!sender.targets.some(t => t.name === clientKey))
                sender.targets.push({
                  name: clientKey,
                  site_id: request.site_id
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

  // add the given request to a requests_sent section for a service
  addRequestSent = (newService, clientKey, request, address) => {
    const { site_id } = request;
    let existingRequest = newService.requests_sent.find(
      r => r.site_id === site_id
    );
    if (!existingRequest) {
      existingRequest = { site_id, by_receiver: {} };
      newService.requests_sent.push(existingRequest);
    }
    // add values to existing request
    const newRequest = request.by_client[clientKey];
    this.aggregateAttributes(newRequest, existingRequest);
    existingRequest.by_receiver[address] = newRequest;
  };

  // add a list of resident services to each cluster
  addServicesToClusters = () => {
    this.data.sites.forEach(site => {
      site.services = this.data.services.filter(service =>
        service.targets.some(target => target.site_id === site.site_id)
      );
    });
  };

  addServersToSites = () => {
    this.data.sites.forEach(site => {
      site.servers = [];
      this.data.services.forEach(service => {
        service.targets.forEach(target => {
          if (target.site_id === site.site_id) {
            site.servers.push(target.name);
          }
        });
      });
    });
  };

  // add source and target list for each service
  addSourcesTargets = () => {
    this.data.services.forEach(service => {
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
      sourcesAddresses.forEach(sourceAddress => {
        const source = this.data.services.find(
          s => s.address === sourceAddress
        );
        service.sourceServices.push(source);
        if (!source.targetServices) {
          source.targetServices = [];
        }
        source.targetServices.push(service);
      });
    });
  };

  // add a list of version info to each service
  addVersions = () => {
    this.data.sites.forEach(site => {
      site.services.forEach(service => {
        const versions = this.getVersions(service, site.site_id);
        service.versions = versions;
      });
    });
  };

  // return a list of service names in a requests list
  servicesFromRequests = requests => {
    let serviceList = [];
    requests.forEach(request => {
      const names = Object.keys(request.by_client).map(key =>
        this.serviceNameFromId(key)
      );
      serviceList.push(...names);
    });
    return serviceList;
  };

  // return a request record for traffic between source and target services
  linkRequest = (sourceAddress, target) => {
    const matrix = this.allServiceMatrix();
    const found = matrix.find(
      r => r.ingress === sourceAddress && r.egress === target.address
    );
    if (found) return found.request;
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
            k => k !== "details"
          );
        }
      }
    }
  };

  // assuming a key will look like name-v##-xxx-xxx
  // and that the name could contain dashes
  serviceNameFromId = server_key => {
    const parts = server_key.split("-");
    return parts.slice(0, Math.max(parts.length - 3), 1).join("-");
  };

  versionFromId = server_key => {
    const parts = server_key.split("-");
    return parts[1];
  };

  // is the address a valid ip address?
  // used to differentiate between external (ip address) clients and
  // clients that are resident in a site
  isIP = address =>
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      address
    );

  getVersions = (service, site_id) => {
    const versions = service.requests_sent
      ? this.getProducerVersions(service, site_id)
      : this.getHandlerVersions(service, site_id);
    return versions.sort((a, b) =>
      a.version < b.version ? -1 : a.version > b.version ? 1 : 0
    );
  };

  getHandlerVersions = (handlerService, site_id) => {
    const versions = [];
    handlerService.requests_handled.forEach(request => {
      if (request.site_id === site_id) {
        Object.keys(request.by_server).forEach(key => {
          versions.push({
            version: this.versionFromId(key),
            request: request.by_server[key],
            handlerService
          });
        });
      }
    });
    return versions;
  };

  getProducerVersions = (producerService, site_id) => {
    const versions = [];
    this.data.services.forEach(service => {
      service.requests_received.forEach(request => {
        if (request.site_id === site_id) {
          Object.keys(request.by_client).forEach(key => {
            if (this.serviceNameFromId(key) === producerService.address) {
              versions.push({
                version: this.versionFromId(key),
                request: request.by_client[key],
                service: producerService
              });
            }
          });
        }
      });
    });
    return versions;
  };

  serviceFromServer = (server, site_id) =>
    this.data.services.find(service =>
      service.targets.some(t => t.name === server && t.site_id === site_id)
    );

  siteNameFromId = site_id =>
    this.data.sites.find(site => site.site_id === site_id).site_name;

  // gather raw data for all services that are involved with the given service
  matrix = (involvingService, stat) => {
    if (!stat) stat = "requests";
    const matrix = [];
    this.data.services.forEach(service => {
      service.requests_received.forEach(request => {
        Object.keys(request.by_client).forEach(client => {
          const clientAddress = this.serviceNameFromId(client);
          const req = request.by_client[client];
          if (
            clientAddress === involvingService.address ||
            service.address === involvingService.address
          ) {
            const row = {
              ingress: clientAddress,
              egress: service.address,
              address: request.site_id,
              messages: req[stat]
            };
            const found = matrix.find(
              r => r.ingress === clientAddress && r.egress === service.address
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
    if (!stat) stat = "requests";
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

  siteMatrixForService = (service, stat) => {
    if (!stat) stat = "requests";
    const matrix = this.siteMatrix(stat);
    for (let i = matrix.length - 1; i >= 0; --i) {
      if (matrix[i].address !== service.address) {
        matrix.splice(i, 1);
      }
    }
    return matrix;
  };

  // gather matrix records between sites
  siteMatrix = stat => {
    const matrix = [];
    if (!stat) stat = "requests";
    this.data.services.forEach(service => {
      service.requests_handled.forEach(request => {
        Object.keys(request.by_originating_site).forEach(from_site_id => {
          const req = request.by_originating_site[from_site_id];
          matrix.push({
            ingress: this.siteNameFromId(from_site_id),
            egress: this.siteNameFromId(request.site_id),
            address: service.address,
            messages: req[stat]
          });
        });
      });
    });
    return matrix;
  };

  allServiceMatrix = stat => {
    const matrix = [];
    if (!stat) stat = "requests";
    this.data.services.forEach(service => {
      service.requests_received.forEach(request => {
        const clients = Object.keys(request.by_client);
        clients.forEach(client_id => {
          const ingress = this.serviceNameFromId(client_id);
          const req = JSON.parse(JSON.stringify(request.by_client[client_id]));
          const row = {
            ingress,
            egress: service.address,
            address: "",
            messages: req[stat],
            request: req
          };
          const found = matrix.find(
            r => r.ingress === ingress && r.egress === service.address
          );
          if (found) {
            found.messages += req[stat];
            this.aggregateAttributes(req, found.request);
          } else {
            matrix.push(row);
          }
        });
      });
    });
    return matrix;
  };

  // get the cumulative stat for traffic between sites
  siteToSite = (from, to, stat) => {
    if (!stat) stat = "requests";
    let value = null;
    this.data.services.forEach(service => {
      service.requests_handled.some(request => {
        if (request.site_id === to.site_id) {
          const originatingSiteIds = Object.keys(request.by_originating_site);
          originatingSiteIds.some(originatingSiteId => {
            if (originatingSiteId === from.site_id) {
              if (!value) value = 0;
              value += request.by_originating_site[originatingSiteId][stat];
              return true;
            }
            return false;
          });
          return true;
        }
        return false;
      });
    });
    return value;
  };

  addSiteConnected = () => {
    const matrix = this.siteMatrix();
    this.data.sites.forEach(from => {
      from.connectedSites = [];
      this.data.sites.forEach(to => {
        if (from !== to) {
          matrix.forEach(record => {
            if (
              (record.ingress === from.site_name &&
                record.egress === to.site_name) ||
              (record.ingress === to.site_name &&
                record.egress === from.site_name)
            ) {
              if (
                record.messages > 0 &&
                !from.connectedSites.includes(to.site_id)
              )
                from.connectedSites.push(to.site_id);
            }
          });
        }
      });
    });
  };

  // breakdown of which sites handle/originate requests for a given service
  bySite = (service, handled, stat) => {
    if (!stat) stat = "requests";
    const key = handled ? "requests_handled" : "requests_received";
    const by = {};
    service[key].forEach(request => {
      if (request.requests > 0) {
        const site = request.site_id;
        if (!by[site]) by[site] = 0;
        by[site] += request[stat];
      }
    });
    return by;
  };

  serviceNames = () => this.data.services.map(s => s.address);
}

export default Adapter;
