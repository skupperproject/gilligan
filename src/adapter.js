import { utils } from "./utilities";
var INSTANCE = 0;
export const SHOW_EXTERNAL = true;

class Adapter {
  constructor(data) {
    this.data = data;
    this.sortSites();
    this.sortServices();
    /*
    console.log("new data");
    try {
      console.log(JSON.stringify(data, null, 2));
    } catch (e) {
      console.log(data);
    }
    */
    //console.log("original data");
    //console.log(JSON.parse(JSON.stringify(data)));
    this.instance = ++INSTANCE;
    this.decorateSiteNames();
    this.fixTargets();
    this.fixBinaryAddresses();
    this.fixConnections();
    this.removeEmptyServices();
    this.addSendersServices();
    this.addServicesToClusters();
    this.addServersToSites();
    this.addSourcesTargets();
    this.createDeployments();
    if (this.instance === 1) {
      if (process.env.NODE_ENV !== "test") {
        console.log("finished parsing data");
        console.log(this.data);
      }
    }
    data.getDeploymentLinks = () => this.getDeploymentLinks(SHOW_EXTERNAL);
    this.siteInfo = { name: this.data.sites[0].site_name };
  }

  // if multiple sites have the same name,
  // append (#) to the site names
  decorateSiteNames = () => {
    this.data.sites.forEach((site, i) => {
      const sameNames = this.data.sites.filter(
        (s) => s.site_name === site.site_name && !s.nameDecorated
      );
      if (sameNames.length > 1) {
        sameNames.forEach((s, i) => {
          s.nameDecorated = true;
          s.site_name = `${s.site_name} (${i + 1})`;
        });
      }
    });
  };

  // TODO: why do some services have non-ascii characters?
  fixBinaryAddresses = () => {
    this.data.services = this.data.services.filter(
      (service) => !utils.hasUnicode(service.address)
    );
  };

  // sometimes a tcp service will not have a connections_in/egress
  // rather than test for that in all the code here, we just set
  // any missing lists to []
  fixConnections = () => {
    this.data.services.forEach((service) => {
      if (service.protocol === "tcp") {
        if (!service.connections_egress) {
          service.connections_egress = [];
        }
        if (!service.connections_ingress) {
          service.connections_ingress = [];
        }
      }
    });
  };

  sortSites = () => {
    this.data.sites.sort((a, b) =>
      a.site_name < b.site_name ? -1 : a.site_name > b.site_name ? 1 : 0
    );
  };
  sortServices = () =>
    this.data.services.sort((a, b) =>
      a.address < b.address ? -1 : a.address > b.address ? 1 : 0
    );

  addTarget = (targets, name, site_id) => {
    if (!targets.some((t) => t.name === name && t.site_id === site_id)) {
      targets.push({ name, site_id });
    }
  };
  fixTargets = () => {
    this.data.services.forEach((service) => {
      if (!service.targets) {
        service.targets = [];
      }
      if (service.requests_handled) {
        service.requests_handled.forEach((request) => {
          for (const server in request.by_server) {
            this.addTarget(service.targets, server, request.site_id);
            this.addTarget(service.targets, service.address, request.site_id);
          }
        });
      } else if (service.connections_egress) {
        // tcp service without targets
        if (service.connections_egress.length > 0) {
          service.connections_egress.forEach((egress) => {
            for (let connection_id in egress.connections) {
              const connection = egress.connections[connection_id];
              this.addTarget(
                service.targets,
                connection.server,
                egress.site_id
              );
            }
            this.addTarget(service.targets, service.address, egress.site_id);
          });
        } else {
          /*
          // put this tcp service in an "unknown" site
          if (!this.data.sites.some((site) => site.site_name === "unknown")) {
            this.data.sites.push({
              site_name: "unknown",
              site_id: "unknownID",
              connected: [],
              namespace: "",
              url: "",
              edge: false,
            });
          }
          this.addTarget(service.targets, service.address, "unknownID");
          */
        }
      }
      if (service.targets[0]) {
        this.addTarget(
          service.targets,
          service.address,
          service.targets[0].site_id
        );
      }
    });
  };

  removeEmptyServices = () => {
    this.data.emptyHttpServices = [];
    for (let i = this.data.services.length - 1; i >= 0; i--) {
      const service = this.data.services[i];
      if (service.requests_received && service.requests_received.length === 0) {
        this.data.emptyHttpServices.push({ ...service });
        this.data.services.splice(i, 1);
      }
    }
  };

  findClientInTargets = (client) => {
    for (let i = 0; i < this.data.services.length; i++) {
      const service = this.data.services[i];
      const target = service.targets.find((t) => t.name === client);
      if (target) {
        return { service, target };
      }
    }
    return {};
  };

  // used to add a derived service in the case where there are clients
  // that don't receive messages / have no connections_egress
  newService = ({ address, protocol = "http", client, site_id }) => {
    const service = {
      derived: !this.data.emptyHttpServices.some((s) => s.address === address),
      isExternal: address === "undefined" || this.isIP(address),
      address,
      protocol,
      targets: [{ name: client, site_id }],
    };
    if (protocol === "http") {
      service.requests_received = [];
      service.requests_handled = [];
    } else {
      service.connections_ingress = [];
      service.connections_egress = [];
    }
    return service;
  };

  addTargetToService = (service, name, site_id) => {
    if (!service.targets) {
      service.targets = [];
    }
    if (!service.targets.some((t) => t.name === name)) {
      service.targets.push({ name, site_id });
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
      if (service.requests_received) {
        service.requests_received.forEach((request) => {
          for (const clientKey in request.by_client) {
            const clientName = this.serviceNameFromClientId(clientKey);
            const found = this.data.services.find(
              (s) => s.address === clientName
            );
            if (!found) {
              // this is a new service. add it
              const newService = this.newService({
                address: clientName,
                client: clientKey,
                site_id: request.site_id,
              });
              this.data.services.unshift(newService);
              this.addTargetToService(
                newService,
                utils.shortName(clientName),
                request.site_id
              );
            } else if (found.derived) {
              this.addTargetToService(
                found,
                utils.shortName(clientKey),
                request.site_id
              );
            }
          }
        });
      } else if (service.connections_ingress) {
        service.connections_ingress.forEach((ingress) => {
          for (let connectionID in ingress.connections) {
            const client = ingress.connections[connectionID].client;
            // look for client in a target section
            const targetInfo = this.findClientInTargets(
              utils.shortName(client)
            );
            if (!targetInfo.target) {
              const newService = this.newService({
                address: client,
                protocol: "tcp",
                client,
                site_id: ingress.site_id,
              });
              this.data.services.unshift(newService);
              this.addTargetToService(
                newService,
                utils.shortName(client),
                ingress.site_id
              );
            }
          }
        });
      }
    });
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

  // create links between [site:serivce]
  createDeployments = () => {
    this.data.deployments = [];
    this.data.deploymentLinks = [];
    this.data.services.forEach((service) => {
      const sites = this.getServiceSites(service);
      sites.forEach((site) => {
        this.data.deployments.push({
          service,
          site,
          key: `${service.address} (${site.site_id})`,
        });
      });
    });
    this.data.deployments.forEach((fromDeployment) => {
      this.data.deployments.forEach((toDeployment) => {
        const request = this.fromTo2(
          fromDeployment.service,
          fromDeployment.site.site_id,
          toDeployment.service,
          toDeployment.site.site_id
        );
        if (Object.keys(request).length > 0) {
          this.data.deploymentLinks.push({
            source: fromDeployment,
            target: toDeployment,
            request: request,
            key: `${fromDeployment.key}-${toDeployment.key}`,
          });
        }
      });
    });
  };

  getDeploymentLinks = (showExternal = SHOW_EXTERNAL) => {
    if (!showExternal) {
      return this.data.deploymentLinks.filter(
        (link) =>
          !link.source.service.isExternal && !link.target.service.isExternal
      );
    }
    return this.data.deploymentLinks;
  };

  fromTo2 = (from, fromSite, to, toSite) => {
    let req = {};
    if (to.targets.some((t) => t.site_id === toSite)) {
      if (to.requests_received) {
        for (let r = 0; r < to.requests_received.length; r++) {
          const request = to.requests_received[r];
          if (request.site_id === fromSite) {
            for (const client in request.by_client) {
              const clientService = this.data.services.find((s) =>
                s.targets.some(
                  (t) => t.name === client && t.site_id === fromSite
                )
              );
              if (from === clientService) {
                utils.aggregateAttributes(
                  request.by_client[client].by_handling_site[toSite],
                  req
                );
              }
            }
          }
        }
      } else if (to.connections_egress) {
        for (let e = 0; e < to.connections_egress.length; e++) {
          const egress = to.connections_egress[e];
          if (egress.site_id === toSite) {
            for (const connectionID in egress.connections) {
              if (to.connections_ingress) {
                for (let i = 0; i < to.connections_ingress.length; i++) {
                  const ingress = to.connections_ingress[i];
                  if (ingress.site_id === fromSite) {
                    const connection = ingress.connections[connectionID];
                    if (connection) {
                      const client = connection.client;
                      const clientService = this.data.services.find((s) =>
                        s.targets.some(
                          (t) => t.name === client && t.site_id === fromSite
                        )
                      );
                      if (from === clientService) {
                        utils.aggregateAttributes(connection, req);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return req;
  };

  findCallingServices = (service) => {
    let serviceAddresses = [];
    if (service.requests_received) {
      serviceAddresses = this.servicesFromRequests(service.requests_received);
    } else if (service.connections_egress) {
      service.connections_egress.forEach((egress) => {
        for (let connectionID in egress.connections) {
          if (service.connections_ingress) {
            service.connections_ingress.forEach((ingress) => {
              const ingressConnection = ingress.connections[connectionID];
              if (ingressConnection) {
                const client = ingressConnection.client;
                const sourceService = this.serviceNameFromClientId(client);
                if (sourceService) {
                  serviceAddresses.push(sourceService);
                }
              }
            });
          }
        }
      });
    }
    return [...new Set(serviceAddresses)];
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
      const sourcesAddresses = this.findCallingServices(service);
      // add a referece to the sources and targets
      sourcesAddresses.forEach((sourceAddress) => {
        const source = this.data.services.find(
          (s) => s.address === sourceAddress
        );
        if (source) {
          service.sourceServices.push(source);
          if (!source.targetServices) {
            source.targetServices = [];
          }
          source.targetServices.push(service);
        }
      });
    });
  };

  // return a list of service names in a requests list
  servicesFromRequests = (requests) => {
    let serviceList = [];
    if (requests) {
      requests.forEach((request) => {
        const names = Object.keys(request.by_client).map((key) =>
          this.serviceNameFromClientId(key)
        );
        serviceList.push(...names);
      });
    }
    return serviceList;
  };

  // return a request record for traffic between source and target services
  linkRequest = (sourceAddress, target, target_site, source_site) => {
    let req = {};
    if (target.requests_received) {
      target.requests_received.forEach((request) => {
        for (const client_id in request.by_client) {
          if (this.serviceNameFromClientId(client_id) === sourceAddress) {
            utils.aggregateAttributes(request.by_client[client_id], req);
          }
        }
      });
    } else {
      target.connections_egress.forEach((egress) => {
        if (!target_site || target_site === egress.site_id) {
          for (let connectionID in egress.connections) {
            for (let i = 0; i < target.connections_ingress.length; i++) {
              const ingress = target.connections_ingress[i];
              if (!source_site || ingress.site_id === source_site) {
                const ingressConnection = ingress.connections[connectionID];
                if (ingressConnection) {
                  const client = ingressConnection.client;
                  const sourceService = this.serviceNameFromClientId(client);
                  if (sourceService) {
                    if (sourceService === sourceAddress) {
                      const match = egress.connections[connectionID];
                      if (req.start_time) {
                        req.bytes_out += match.bytes_out;
                        req.bytes_in += match.bytes_in;
                      } else {
                        req = JSON.parse(
                          JSON.stringify(egress.connections[connectionID])
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    }
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

  findService = (address) =>
    this.data.services.find((s) => s.address === address);
  findSite = (site_id) => this.data.sites.find((s) => s.site_id === site_id);
  findInTargets = (service) =>
    service.targets.find((t) => t.name === service.address);

  // get a list of sites the given service is resident in
  getServiceSites = (service) => {
    const sites = [];
    // for tcp services
    if (service.protocol === "tcp") {
      if (service.connections_egress && service.connections_egress.length > 0) {
        service.connections_egress.forEach((connection) => {
          sites.push(this.findSite(connection.site_id));
        });
      } else {
        const target = this.findInTargets(service);
        if (target) {
          sites.push(this.findSite(target.site_id));
        }
      }
    } else {
      // for http services
      if (service.requests_handled) {
        if (service.requests_handled.length === 0) {
          // service that only sends requests
          const target = this.findInTargets(service);
          if (target) {
            sites.push(this.findSite(target.site_id));
          }
        }
        service.requests_handled.forEach((request) => {
          sites.push(this.findSite(request.site_id));
        });
      } else {
        const target = this.findInTargets(service);
        if (target) {
          sites.push(this.findSite(target.site_id));
        }
      }
    }
    return sites;
  };
  siteNameFromId = (site_id) => {
    const site = this.data.sites.find((site) => site.site_id === site_id);
    if (site) {
      return site.site_name;
    }
    return `${site_id} doesn't exist`;
  };

  // gather raw data for all services that are involved with the given service
  matrix = (involvingService, stat) => {
    if (!stat) stat = "bytes_out";
    const matrix = [];
    const deploymentLinks = this.getDeploymentLinks();
    deploymentLinks.forEach((link) => {
      if (
        link.source.service.address === involvingService.address ||
        link.target.service.address === involvingService.address
      ) {
        const row = {
          ingress: link.source.service.address,
          egress: link.target.service.address,
          address: involvingService.address,
          info: {
            source: {
              site_name: link.source.site.site_name,
              site_id: link.source.site.site_id,
              address: link.source.service.address,
            },
            target: {
              site_name: link.target.site.site_name,
              site_id: link.target.site.site_id,
              address: link.target.service.address,
            },
          },
          messages: link.request[stat] !== undefined ? link.request[stat] : 0,
        };
        const found = matrix.find(
          (r) =>
            r.ingress === link.source.service.address &&
            r.egress === link.target.service.address
        );
        if (found) {
          utils.aggregateAttributes(row, found);
        } else {
          matrix.push(row);
        }
      }
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
    const deploymentLinks = this.getDeploymentLinks();
    deploymentLinks.forEach((link) => {
      if (link.source.site.site_id !== link.target.site.site_id) {
        matrix.push({
          ingress: link.source.site.site_name,
          egress: link.target.site.site_name,
          address: link.source.service.address,
          messages: link.request[stat],
          request: link.request,
          info: {
            source: {
              site_name: link.source.site.site_name,
              site_id: link.source.site.site_id,
              address: link.source.service.address,
            },
            target: {
              site_name: link.target.site.site_name,
              site_id: link.target.site.site_id,
              address: link.target.service.address,
            },
          },
        });
      }
    });
    return matrix;
  };

  allServiceMatrix = (stat) => {
    const matrix = [];
    if (!stat) stat = "bytes_out";
    const deploymentLinks = this.getDeploymentLinks();
    deploymentLinks.forEach((link) => {
      matrix.push({
        ingress: link.source.service.address,
        egress: link.target.service.address,
        address: link.target.service.address,
        messages: link.request[stat] || 0,
        info: {
          source: {
            site_name: link.source.site.site_name,
            site_id: link.source.site.site_id,
          },
          target: {
            site_name: link.target.site.site_name,
            site_id: link.target.site.site_id,
          },
        },
      });
    });
    return matrix;
  };

  // get the cumulative stat for traffic between sites
  siteToSite = (from, to, stat) => {
    if (!stat) stat = "bytes_out";
    let value = null;
    this.data.deploymentLinks.forEach((deploymentLink) => {
      if (
        deploymentLink.source.site.site_id === from.site_id &&
        deploymentLink.target.site.site_id === to.site_id
      ) {
        if (!value) value = 0;
        value += deploymentLink.request[stat];
      }
    });
    return value;
  };

  fromTo = (from_name, from_site_id, to_name, to_site_id, stat) => {
    if (!stat) stat = "bytes_out";
    const toService = this.data.services.find((s) => s.address === to_name);
    if (toService) {
      if (toService.requests_received) {
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
                return {
                  stat: stat !== "none" ? from_request[stat] : 0,
                  request: from_request,
                };
              }
            }
          }
        }
      } else if (toService.connections_egress) {
        // tcp service
        for (let e = 0; e < toService.connections_egress.length; e++) {
          const egress = toService.connections_egress[e];
          if (egress.site_id === to_site_id) {
            for (let connectionID in egress.connections) {
              for (let i = 0; i < toService.connections_ingress.length; i++) {
                const ingress = toService.connections_ingress[i];
                if (ingress.site_id === from_site_id) {
                  if (Object.keys(ingress.connections).includes(connectionID)) {
                    const request = egress.connections[connectionID];
                    const clientID = ingress.connections[connectionID].client;
                    // find the service that has clientID as a server
                    const fromService = this.serviceFromServer(
                      clientID,
                      from_site_id
                    );
                    if (fromService && fromService.address === from_name) {
                      return {
                        stat: stat !== "none" ? request[stat] : 0,
                        request,
                      };
                    }
                  }
                }
              }
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
  requestSums = (service, key) => {
    const sums = [];
    if (service[key]) {
      service[key].forEach((request) => {
        sums.push({
          site_name: this.siteNameFromId(request.site_id),
          sum: this.requestSum(request),
        });
      });
    }
    return sums;
  };
}
export default Adapter;
