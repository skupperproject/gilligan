export default class Modifier {
  update = (data) => {
    if (!this.originalData) {
      this.originalData = JSON.parse(JSON.stringify(data));
      return;
    }
    data.services.forEach((service) => {
      if (!service.derived && service.protocol === "http") {
        service.requests_handled.forEach((request) => {
          for (let site in request.by_originating_site) {
            const siteRequest = request.by_originating_site[site];
            const newRequests = Math.round(Math.random() * 100);
            const newBytes = Math.round(newRequests * Math.random() * 50) + 50;
            this.modifyOriginatingSiteRequest(
              siteRequest,
              service,
              request,
              site,
              newRequests,
              newBytes
            );
            let unallocatedRequests = newRequests;
            let unallocatedBytes = newBytes;
            while (unallocatedRequests > 0 && unallocatedBytes > 0) {
              for (let server in request.by_server) {
                const serverRequest = request.by_server[server];
                let shareRequests = Math.round(
                  unallocatedRequests * Math.random()
                );
                let shareBytes = Math.round(unallocatedBytes * Math.random());
                unallocatedRequests -= shareRequests;
                unallocatedBytes -= shareBytes;
                this.modifyServerRequest(
                  serverRequest,
                  service,
                  request,
                  server,
                  shareRequests,
                  shareBytes
                );
              }
            }
          }
        });
        service.requests_received.forEach((request) => {
          for (let client in request.by_client) {
            const clientRequest = request.by_client[client];
            const newRequests = Math.round(Math.random() * 100);
            const newBytes = Math.round(newRequests * Math.random() * 50) + 50;
            this.modifyClientRequest(
              clientRequest,
              service,
              request,
              client,
              newRequests,
              newBytes
            );
            let unallocatedRequests = newRequests;
            let unallocatedBytes = newBytes;
            while (unallocatedRequests > 0 && unallocatedBytes > 0) {
              for (let handling_site in clientRequest.by_handling_site) {
                const handlingSiteRequest =
                  clientRequest.by_handling_site[handling_site];
                let shareRequests = Math.round(
                  unallocatedRequests * Math.random()
                );
                let shareBytes = Math.round(unallocatedBytes * Math.random());
                unallocatedRequests -= shareRequests;
                unallocatedBytes -= shareBytes;
                this.modifyHandlingSiteRequest(
                  handlingSiteRequest,
                  service,
                  request,
                  client,
                  handling_site,
                  shareRequests,
                  shareBytes
                );
              }
            }
          }
        });
      }
    });
  };
  modifyHandlingSiteRequest = (
    handlingSiteRequest,
    service,
    request,
    client,
    handling_site,
    shareRequests,
    shareBytes
  ) => {
    const oService = this.findService(service);
    const oRequest = this.findRequest(oService, request, "requests_received");
    const oClientRequest = oRequest.by_client[client];
    const oHandlingSiteRequest = oClientRequest.by_handling_site[handling_site];
    oHandlingSiteRequest.requests += shareRequests;
    oHandlingSiteRequest.bytes_out += shareBytes;
    handlingSiteRequest.requests = oHandlingSiteRequest.requests;
    handlingSiteRequest.bytes_out = oHandlingSiteRequest.bytes_out;
  };
  modifyClientRequest = (
    clientRequest,
    service,
    request,
    client,
    newRequests,
    newBytes
  ) => {
    const oService = this.findService(service);
    const oRequest = this.findRequest(oService, request, "requests_received");
    const oClient = oRequest.by_client[client];
    oClient.requests += newRequests;
    oClient.bytes_out += newBytes;
    clientRequest.requests = oClient.requests;
    clientRequest.bytes_out = oClient.bytes_out;
  };
  modifyServerRequest = (
    serverRequest,
    service,
    request,
    server,
    shareRequests,
    shareBytes
  ) => {
    const oService = this.findService(service);
    const oRequest = this.findRequest(oService, request, "requests_handled");
    const oServer = oRequest.by_server[server];
    oServer.requests += shareRequests;
    oServer.bytes_out += shareBytes;
    serverRequest.requests = oServer.requests;
    serverRequest.bytes_out = oServer.bytes_out;
  };
  modifyOriginatingSiteRequest = (
    siteRequest,
    service,
    request,
    site,
    newRequests,
    newBytes
  ) => {
    const oService = this.findService(service);
    const oRequest = this.findRequest(oService, request, "requests_handled");
    const oSite = oRequest.by_originating_site[site];
    oSite.requests += newRequests;
    oSite.bytes_out += newBytes;
    siteRequest.requests = oSite.requests;
    siteRequest.bytes_out = oSite.bytes_out;
  };
  findService = (service) =>
    this.originalData.services.find((s) => s.address === service.address);
  findRequest = (service, request, key) =>
    service[key].find((r) => r.site_id === request.site_id);
}