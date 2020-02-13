class Adapter {
  constructor(data) {
    this.data = data;
    this.addSendersServices();
    this.addServicesToClusters();
    this.addServersToSites();
    this.addSourcesTargets();
    this.addVersions();
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
        console.log(
          `got version for service ${service.address} for site ${site.site_id} length ${versions.length}`
        );
        versions.forEach(v => console.log(v.version));
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

  // find the request record between target service and sourceAddress
  linkRequest = (sourceAddress, target) => {
    for (let r = 0; r < target.requests_received.length; r++) {
      const request = target.requests_received[r];
      const keys = Object.keys(request.by_client);
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        const address = this.serviceNameFromId(key);
        if (address === sourceAddress) {
          return request.by_client[key];
        }
      }
    }
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

  matrix = (service, stat) => {
    if (service.requests_sent) {
      return this.matrixSender(service, stat);
    } else {
      return this.matrixReceiver(service, stat);
    }
  };
  matrixReceiver = (service, stat) => {
    //[{ingress: 'xxx', egress: 'xxx', address: 'xxx', messages: ###}...]
    if (!stat) stat = "requests";
    const matrix = [];
    const toAddress = service.address;
    service.requests_received.forEach(request => {
      Object.keys(request.by_client).forEach(client => {
        const fromAddress = this.serviceNameFromId(client);
        const req = request.by_client[client];
        const row = {
          ingress: fromAddress,
          egress: toAddress,
          address: request.site_id,
          messages: req[stat]
        };
        const record = matrix.find(
          m => m.ingress === fromAddress && m.egress === toAddress
        );
        if (record) {
          this.aggregateAttributes(row, record);
        } else {
          matrix.push(row);
        }
      });
    });
    return matrix;
  };

  matrixSender = (service, stat) => {
    //[{ingress: 'xxx', egress: 'xxx', address: 'xxx', messages: ###}...]
    if (!stat) stat = "requests";
    const matrix = [];
    const fromAddress = service.address;
    service.requests_sent.forEach(request => {
      Object.keys(request.by_receiver).forEach(client => {
        const toAddress = client;
        const req = request.by_receiver[client];
        const row = {
          ingress: fromAddress,
          egress: toAddress,
          address: request.site_id,
          messages: req[stat]
        };
        const record = matrix.find(
          m => m.ingress === fromAddress && m.egress === toAddress
        );
        if (record) {
          this.aggregateAttributes(row, record);
        } else {
          matrix.push(row);
        }
      });
    });
    return matrix;
  };

  serviceNames = () => this.data.services.map(s => s.address);
}

export default Adapter;
