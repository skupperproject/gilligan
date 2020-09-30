/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

import * as d3 from "d3";
import { utils } from "../../../utilities";
import { genPath } from "../../../paths";

import { Site } from "./site";
import { Service } from "./service";
import { Nodes } from "../nodes";
import { Links } from "../links";
const DEPLOYMENT_POSITION = "dp";
const DEPLOYMENT_OPTIONS = "dpopts";
const DEPLOYMENT_TABLE_OPTIONS = "dpopts";
const ZOOM_SCALE = "dscale";
const ZOOM_TRANSLATE = "dtrans";
const DEFAULT_OPTIONS = {
  radio: false,
  traffic: false,
  showMetric: false,
  isExpanded: 0,
  showExternal: false,
  http: "bytes_out",
  tcp: "bytes_out",
};
const DEFAULT_TABLE_OPTIONS = {
  page: 1,
  sortBy: "",
  filterBy: "",
  perPage: 10,
};

export class Deployment extends Service {
  constructor(data) {
    super(data);
    this.Site = new Site(data);
    this.fields = [
      { title: "Name (site)", field: "deployment" },
      { title: "Protocol", field: "protocol" },
      { title: "Site", field: "site_name" },
    ];
  }

  initNodesAndLinks = (viewer) => {
    this.initNodes(this.Site.siteNodes, this.serviceNodes, viewer);
    let vsize = { width: viewer.width, height: viewer.height };
    vsize = this.initServiceLinks(
      this.Site.siteNodes,
      this.serviceNodes,
      this.serviceLinks,
      vsize,
      viewer
    );
    this.setSitePositions(viewer.sankey);
    this.setServicePositions(viewer.sankey);
    return { nodeCount: this.nodes().nodes.length, size: vsize };
  };

  updateNodesAndLinks = (viewer, debug) => {
    const newSiteNodes = new Nodes();
    const newServiceNodes = new Nodes();
    const newServiceLinks = new Links();
    this.initNodes(newSiteNodes, newServiceNodes, viewer);
    const vsize = { width: viewer.width, height: viewer.height };
    this.initServiceLinks(
      newSiteNodes,
      newServiceNodes,
      newServiceLinks,
      vsize,
      viewer
    );
    utils.reconcileArrays(this.Site.siteNodes.nodes, newSiteNodes.nodes);
    utils.reconcileArrays(this.serviceNodes.nodes, newServiceNodes.nodes);
    utils.reconcileLinks(this.serviceLinks.links, newServiceLinks.links);
    this.setSitePositions(viewer.sankey);
    this.setServicePositions(viewer.sankey);
    viewer.restart();
  };

  createSelections = (svg) => {
    this.Site.sitesSelection = this.Site.createSitesSelection(svg);
    super.createSelections(svg);
  };

  setupSelections = (viewer) => {
    this.Site.sitesSelection = this.Site.setupSitesSelection(viewer);
    super.setupSelections(viewer);
  };

  initNodes = (siteNodes, serviceNodes, viewer) => {
    this.Site.initNodes(siteNodes);
    super.initNodes(serviceNodes, true, viewer.state.options.showExternal);
    this.setParentNodes(siteNodes, serviceNodes, viewer);
    this.adjustSites(siteNodes, serviceNodes, viewer);
  };

  setParentNodes = (siteNodes, serviceNodes, viewer) => {
    serviceNodes.nodes.forEach((service) => {
      if (service.cluster) {
        const siteNode = siteNodes.nodes.find(
          (s) => s.site_id === service.cluster.site_id
        );
        if (siteNode) {
          service.parentNode = siteNode;
        }
      } else {
        service.parentNode = {
          sankey: { x: 0, y: 0 },
          x: 0,
          y: 0,
          site_id: "",
          site_name: "",
          getWidth: () => viewer.width,
          getHeight: () => viewer.height,
        };
      }
    });
  };

  mouseoverCircle = (d, viewer) => {
    // highlight the circle
    this.Site.mouseoverCircle(d, viewer);
    // highlight the services
    this.serviceNodes.nodes.forEach((n) => {
      n.selected = n.parentNode.site_id === d.site_id;
    });
    viewer.restart();
  };
  mouseoutCircle = (d, viewer) => {
    this.Site.mouseoutCircle(d, viewer);
    this.unSelectAll();
    viewer.blurAll(false, d);
    viewer.restart();
  };
  // move the sites and move the services inside their respective site
  adjustSites = (siteNodes, serviceNodes, viewer) => {
    // size the sites based on the services deployed in them
    siteNodes.nodes.forEach((site) => {
      const links = [];
      // services deployed in this site
      const subServices = serviceNodes.nodes.filter(
        (sn) => sn.parentNode.site_id === site.site_id
      );
      // get links between services within each site
      subServices.forEach((fromService, s) => {
        subServices.forEach((toService, t) => {
          const { stat } = this.data.adapter.fromTo(
            fromService.address,
            site.site_id,
            toService.address,
            site.site_id,
            viewer.state.options[toService.protocol]
          );
          if (stat !== undefined) {
            links.push({
              source: fromService,
              target: toService,
              value: stat,
            });
          }
        });
      });
      // set the site radius to hold all the site's services (non-expanded)
      const siteSize = utils.adjustPositions({
        nodes: subServices,
        links,
        width: site.r * 2,
        height: site.r * 2,
        align: "left",
      });
      site.r = Math.max(site.r, Math.max(siteSize.width, siteSize.height) / 2);
      site.normalR = site.r;
      site.subServiceLinks = links;
    });

    const interSiteLinks = this.Site.interSiteLinks(siteNodes);
    // set the site x,y
    utils.adjustPositions({
      nodes: siteNodes.nodes,
      links: interSiteLinks.links,
      width: viewer.width,
      height: viewer.height - 50,
    });

    // position services
    siteNodes.nodes.forEach((cluster) => {
      const subServices = serviceNodes.nodes.filter(
        (sn) => sn.parentNode.site_id === cluster.site_id
      );
      // position subServices in sites
      // using the site size as the width and height
      utils.adjustPositions({
        nodes: subServices,
        links: cluster.subServiceLinks,
        width: cluster.r * 2,
        height: cluster.r * 2,
        xyKey: "siteOffset",
        align: "vertical",
      });
    });
    const orphans = serviceNodes.nodes.filter((n) => !n.siteOffset);
    utils.adjustPositions({
      nodes: orphans,
      links: [],
      width: utils.ServiceWidth,
      height: utils.ServiceHeight,
      xyKey: "siteOffset",
    });
  };

  initServiceLinks = (siteNodes, serviceNodes, links, vsize, viewer) => {
    //const options = viewer.state.options;
    const stat = viewer.statForProtocol();
    const subNodes = serviceNodes.nodes;
    const sites = siteNodes;
    this.data.adapter
      .getDeploymentLinks(viewer.state.options.showExternal)
      .forEach((deploymentLink) => {
        const source = subNodes.find(
          (n) =>
            n.address === deploymentLink.source.service.address &&
            n.cluster.site_id === deploymentLink.source.site.site_id
        );
        const target = subNodes.find(
          (n) =>
            n.address === deploymentLink.target.service.address &&
            n.cluster.site_id === deploymentLink.target.site.site_id
        );
        const linkIndex = links.addLink({
          source,
          target,
          dir: "out",
          cls: "node2node",
          uid: `Link-${source.uuid}-${target.uuid}`,
        });
        const link = links.links[linkIndex];
        link.request = deploymentLink.request;
        link.value = link.request[stat] || 0;
        link.getColor = () => utils.linkColor(link, links.links);
      });
    // get the sankey height of each node based on link.value
    utils.initSankey({
      nodes: subNodes,
      links: links.links,
      width: vsize.width,
      height: vsize.height - 50,
      nodeWidth: utils.ServiceWidth,
      nodePadding: utils.ServiceGap,
      top: 10,
      left: 20,
      bottom: 40,
    });
    // save the height and expand the subnodes
    subNodes.forEach((n) => {
      if (n.y0 === undefined) {
        n.y0 = n.y;
        n.y1 = n.y + utils.ServiceHeight;
      }
      n.sankeyHeight = n.y1 - n.y0;
      n.expanded = true;
    });

    // set the sankeyR of the sites to accommodate expanded services
    sites.nodes.forEach((site) => {
      site.expanded = true;

      const subServices = subNodes.filter(
        (n) => n.parentNode.site_id === site.site_id
      );
      const siteSize = utils.adjustPositions({
        nodes: subServices,
        links: site.subServiceLinks,
        width: site.r * 2,
        height: site.r * 2,
        xyKey: "sankeySiteOffset",
      });
      site.sankeyR = Math.max(
        site.r,
        Math.max(siteSize.width, siteSize.height) / 2,
        50
      );
    });
    // now each site has a site.sankeyR that is big enough
    // to encompass all its expanded deployments
    // adjust the positions of the sites using the new site.sankey.r
    const interSiteLinks = this.Site.interSiteLinks(siteNodes);
    // sites and services are currently .expanded = true
    const expandedSize = utils.adjustPositions({
      nodes: sites.nodes,
      links: interSiteLinks.links,
      width: vsize.width,
      height: vsize.height - 50,
    });

    sites.nodes.forEach((site) => {
      site.expanded = false;
      site.y += 20;
    });

    const orphans = subNodes.filter((n) => !n.sankeySiteOffset);
    utils.adjustPositions({
      nodes: orphans,
      links: [],
      width: utils.ServiceWidth,
      height: utils.ServiceHeight, //viewer.height,
      xyKey: "sankeySiteOffset",
    });
    // restore the saved positions
    subNodes.forEach((n) => {
      const pos = utils.getSaved(
        `${DEPLOYMENT_POSITION}-${n.cluster.site_id}-${n.name}`
      );
      if (pos) {
        n.sankeySiteOffset = {
          x: pos.sox,
          y: pos.soy,
        };
        n.siteOffset = {
          x: pos.ox,
          y: pos.oy,
        };
      }
    });
    sites.nodes.forEach((s) => {
      const pos = utils.getSaved(`${DEPLOYMENT_POSITION}-${s.site_id}`);
      if (pos && pos.cx) {
        s.cx = pos.cx;
        s.cy = pos.cy;
      } else {
        s.cx = s.x + s.r;
        s.cy = s.y + s.r;
      }
    });
    subNodes.forEach((n) => {
      n.expanded = false;
    });
    return expandedSize;
  };

  // don't allow dragging deployment rect outside of parent site circle
  constrainDeployment = (d, sankey) => {
    const bbox = {
      left: d.parentNode.x,
      right: d.parentNode.x + d.parentNode.getWidth(),
      top: d.parentNode.y,
      bottom: d.parentNode.y + d.parentNode.getHeight(),
    };

    if (!d.isExternal) {
      if (d.px > bbox.right) {
        d.x = bbox.right;
      }
      if (d.px < bbox.left - d.getWidth()) {
        d.x = bbox.left - d.getWidth();
      }
      if (d.py > bbox.bottom) {
        d.y = bbox.bottom;
      }
      if (d.py < bbox.top - d.getHeight()) {
        d.y = bbox.top - d.getHeight();
      }
    }
    // update the offsets within the site
    const key = sankey ? "sankeySiteOffset" : "siteOffset";
    d[key].x = d.x - d.parentNode.x;
    d[key].y = d.y - d.parentNode.y;
  };

  clearChosen = () => {
    this.Site.siteNodes.nodes.forEach((n) => (n.chosen = false));
    this.serviceNodes.nodes.forEach((n) => (n.chosen = false));
  };

  saveAllPositions = () => {
    this.Site.siteNodes.nodes.forEach((site) => {
      this.savePosition(site);
    });
    this.serviceNodes.nodes.forEach((n) => {
      this.savePosition(n);
    });
  };

  savePosition = (d) => {
    let save;
    let key;
    if (d.nodeType === "service") {
      save = {
        sox: d.sankeySiteOffset.x,
        soy: d.sankeySiteOffset.y,
        ox: d.siteOffset.x,
        oy: d.siteOffset.y,
      };
      key = `${DEPLOYMENT_POSITION}-${d.cluster.site_id}-${d.name}`;
    } else {
      save = { cx: d.x + d.r, cy: d.y + d.r };
      key = `${DEPLOYMENT_POSITION}-${d.site_id}`;
    }
    utils.setSaved(key, save);
  };

  setupDrag(drag) {
    this.Site.setupDrag(drag);
    this.servicesSelection.call(drag);
  }
  setSitePositions = (sankey) => {
    this.Site.siteNodes.nodes.forEach((d) => {
      d.r = sankey ? d.sankeyR : d.normalR;
      d.x = d.cx - d.r;
      d.y = d.cy - d.r;
    });
  };
  setServicePositions = (sankey) => {
    this.serviceNodes.nodes.forEach((d) => {
      const key = sankey ? "sankeySiteOffset" : "siteOffset";
      d.x = d.parentNode.x + d[key].x;
      d.y = d.parentNode.y + d[key].y;
    });
  };
  dragStart = (d, sankey) => {
    this.setSitePositions(sankey);
    this.setServicePositions(sankey);
  };

  drag = (d, sankey) => {
    if (d.nodeType === "service") {
      this.constrainDeployment(d, sankey);
      this.setServicePositions(sankey);
    } else {
      // we are dragging a site
      d.x = d.px;
      d.y = d.py;
      d.cx = d.x + d.r;
      d.cy = d.y + d.r;
      // set the services.x,y
      this.setServicePositions(sankey);
    }
  };
  dragEnd = (d, sankey) => {
    this.setServicePositions(sankey);
    this.saveAllPositions(sankey);
  };

  // called whenever we need to draw the sites/services
  drawViewNodes = (sankey) => {
    this.Site.sitesSelection.attr("transform", (d) => {
      return `translate(${d.x},${d.y})`;
    });
    this.servicesSelection.attr("transform", (d) => {
      return `translate(${d.x},${d.y})`;
    });
  };

  // draw all the paths between nodes
  drawViewPaths = (sankey) => {
    utils.updateSankey({
      nodes: this.serviceNodes.nodes,
      links: this.serviceLinks.links,
    });
    // for the non-sankey mode, path.service is hidden
    this.linksSelection
      .selectAll("path.service")
      .style("display", sankey ? null : "none")
      .attr("d", (d) => genPath({ link: d, sankey: true }));

    this.linksSelection.selectAll("path.servicesankeyDir").attr("d", (d) => {
      return genPath({ link: d, width: d.width });
    });

    this.linksSelection
      .selectAll("path.hittarget")
      .attr("stroke-width", (d) => (sankey ? Math.max(d.width, 6) : 6))
      .attr("d", (d) => genPath({ link: d }));

    d3.select("defs.statPaths")
      .selectAll("path")
      .attr("d", (d) =>
        genPath({
          link: d,
          reverse: d.circular,
          offsetY: 4,
        })
      );
  };

  collapseNodes = () => {
    super.collapseNodes();
    this.Site.collapseNodes();
  };
  expandNodes = () => {
    super.expandNodes();
    this.Site.expandNodes();
  };

  transition = (sankey, initial, color, viewer) => {
    this.setSitePositions(sankey);
    this.setServicePositions(sankey);
    viewer.setLinkStat();

    utils.updateSankey({
      nodes: this.serviceNodes.nodes,
      links: this.serviceLinks.links,
    });

    const duration = initial ? 0 : utils.VIEW_DURATION;
    if (sankey) {
      this.toSankey(duration);
      return this.toServiceSankey(duration);
    } else {
      this.toColor(duration, color);
      return this.toServiceColor(duration, color);
    }
  };

  toColor = (duration) => {
    d3.select("g.clusters")
      .transition()
      .duration(duration)
      .attr("opacity", 1);

    // transition the containers to their proper position
    d3.selectAll(".cluster")
      .transition()
      .duration(duration)
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .each("end", function() {
        d3.select(this)
          .style("display", "block")
          .attr("opacity", 1)
          .select(".cluster-rects")
          .attr("opacity", 1)
          .style("display", "block");
      });

    d3.select("g.clusters")
      .selectAll("circle.network")
      .transition()
      .duration(duration)
      .attr("r", (d) => d.r)
      .attr("cx", (d) => d.r)
      .attr("cy", (d) => d.r);

    d3.select("g.clusters")
      .selectAll("text.cluster-name")
      .transition()
      .duration(duration)
      .attr("y", -10)
      .attr("x", (d) => d.getWidth() / 2);
  };

  toSankey = (duration) => {
    d3.select("g.clusters")
      .selectAll("circle.network")
      .transition()
      .duration(duration)
      .attr("r", (d) => d.r)
      .attr("cx", (d) => d.r)
      .attr("cy", (d) => d.r);

    d3.select("g.clusters")
      .selectAll("g.cluster")
      .transition()
      .duration(duration)
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    d3.select("g.clusters")
      .selectAll("text.cluster-name")
      .transition()
      .duration(duration)
      .attr("y", -10)
      .attr("x", (d) => d.getWidth(true) / 2);
  };

  // get records for the table view
  doFetch = (page, perPage) => {
    return new Promise((resolve) => {
      const data = this.serviceNodes.nodes.map((n) => ({
        cardData: n,
        deployment: `${n.shortName} (${n.cluster.site_name})`,
        protocol: n.protocol.toUpperCase(),
        site_name: n.cluster.site_name,
      }));
      resolve({ data, page, perPage });
    });
  };

  // get requests for charts
  allRequests = (VAN, direction, stat, showExternal = true) => {
    const requests = {};
    VAN.getDeploymentLinks(showExternal).forEach((deploymentLink) => {
      const which = direction === "in" ? "source" : "target";
      const address = deploymentLink[which].service.address;
      const site = deploymentLink[which].site.site_name;
      if (!requests.hasOwnProperty(address)) requests[address] = {};
      utils.aggregateAttributes(
        {
          key: address,
          service: address,
          shortName: `${utils.shortName(address)} (${site})`,
          baseName: utils.shortName(address),
          requests: deploymentLink.request[stat] || 0,
          color: utils.serviceColors[address],
          all: true,
        },
        requests[address]
      );
    });
    return requests;
  };

  specificRequests = ({
    VAN,
    direction,
    stat,
    address,
    site_info,
    showExternal = true,
  }) => {
    if (address === undefined) {
      return this.Site.specificRequests({
        VAN,
        direction,
        stat,
        site_info,
        showExternal,
      });
    }
    const requests = {};
    const adddressSite = `${address} (${site_info})`;

    stat = "bytes_out";
    VAN.getDeploymentLinks(showExternal).forEach((deploymentLink) => {
      const test = direction === "in" ? "target" : "source";
      const other = direction === "out" ? "target" : "source";
      const testAddress = `${deploymentLink[test].service.address} (${deploymentLink[test].site.site_name})`;
      const otherShortBaseAdddress = utils.shortName(
        deploymentLink[other].service.address
      );
      const otherSite = deploymentLink[other].site.site_name;
      const otherBaseAddress = `${deploymentLink[other].service.address} (${otherSite})`;
      const otherShortSiteAddress = `${otherShortBaseAdddress} (${otherSite})`;

      const otherAddress =
        direction === "out"
          ? `${deploymentLink.target.service.address} (${deploymentLink.target.site.site_name})`
          : `${deploymentLink.source.service.address} (${deploymentLink.source.site.site_name})`;
      if (testAddress === adddressSite) {
        if (deploymentLink.request[stat] !== undefined) {
          if (!requests.hasOwnProperty(otherAddress)) {
            requests[otherAddress] = {
              fromAddress: otherBaseAddress,
              shortName: otherShortSiteAddress,
              baseName: otherShortBaseAdddress,
              site: otherSite,
              requests: deploymentLink.request[stat],
              color: utils.serviceColors[deploymentLink[other].service.address],
              key: `${deploymentLink[other].site.site_name}:${deploymentLink[other].service.address}`,
            };
          } else {
            requests[otherAddress].requests += deploymentLink.request[stat];
          }
        }
      }
    });
    return requests;
  };

  allTimeSeries = ({
    VAN,
    direction,
    stat,
    duration = "min",
    showExternal = true,
  }) => {
    const requests = {};
    VAN.getDeploymentLinks(showExternal).forEach((deploymentLink) => {
      const which = direction === "in" ? "source" : "target";
      const address = deploymentLink[which].service.address;
      const site = deploymentLink[which].site.site_name;
      const samples = utils.getHistory({
        histories: deploymentLink.history,
        stat,
        ago: duration === "min" ? 60 + 1 : 60 * 60 + 1,
        skipUndefined: true,
      });
      if (samples.length > 0) {
        if (!requests.hasOwnProperty(address)) {
          requests[address] = {
            key: `${address} (${site})`,
            service: address,
            shortName: `${utils.shortName(address)} (${site})`,
            samples,
            color: utils.serviceColors[address],
            all: true,
          };
        } else {
          utils.combineSamples(requests[address].samples, samples);
        }
      }
    });
    return requests;
  };

  specificTimeSeries = ({
    VAN,
    direction,
    stat,
    duration = "min",
    address,
    site_name,
    showExternal = true,
  }) => {
    if (site_name === undefined) {
      return this.Site.specificTimeSeries({
        VAN,
        direction,
        stat,
        duration,
        address,
      });
    }
    const requests = {};
    const adddressSite = `${address} (${site_name})`;

    if (direction === "in" && stat === "bytes_out") {
      stat = "bytes_in";
    } else if (direction === "out" && stat === "bytes_in") {
      stat = "bytes_out";
    }
    const from = direction === "in" ? "source" : "target";
    const to = direction === "in" ? "target" : "source";

    VAN.getDeploymentLinks(showExternal).forEach((deploymentLink) => {
      const fromAddress = `${deploymentLink[from].service.address} (${deploymentLink[from].site.site_name})`;
      const toAddress = `${deploymentLink[to].service.address} (${deploymentLink[to].site.site_name})`;
      if (fromAddress === adddressSite) {
        const samples = utils.getHistory({
          histories: deploymentLink.history,
          stat,
          ago: duration === "min" ? 60 + 1 : 60 * 60 + 1,
          skipUndefined: true,
        });
        if (samples.length > 0) {
          if (!requests.hasOwnProperty(toAddress)) {
            requests[toAddress] = {
              fromAddress,
              shortName: `${utils.shortName(
                deploymentLink[to].service.address
              )} (${deploymentLink[to].site.site_name})`,
              site: deploymentLink[to].site.site_name,
              samples,
              color: utils.serviceColors[deploymentLink[to].service.address],
              key: `${deploymentLink[to].service.address} (${deploymentLink[to].site.site_name})`,
            };
          } else {
            utils.combineSamples(requests[toAddress].samples, samples);
          }
        }
      }
    });
    return requests;
  };

  // handle mouse over a chord. highlight the path
  chordOver(chord, over, viewer) {
    if (!chord.info) return;
    d3.select("#SVG_ID")
      .selectAll("path.service")
      .each(function(p) {
        if (
          chord.info.source.site_name === p.source.parentNode.site_name &&
          chord.info.target.site_name === p.target.parentNode.site_name &&
          chord.info.source.address === p.source.address &&
          chord.info.target.address === p.target.address
        ) {
          p.selected = over;
          viewer.blurAll(over, p);
          viewer.restart();
        }
      });
  }

  setClass = (address, cls, viewer) => {
    super.setClass(address, cls, viewer);
    d3.selectAll("g.cluster-rects").each(function(d) {
      const match = d.site_name.includes(address) && address.length > 0;
      d3.select(this).classed(cls, match);
      d[cls] = match;
    });
    viewer.restart();
  };

  // handle mouse over an arc. highlight the service
  arcOver(arc, over, viewer) {
    if (arc.legend) {
      this.Site.arcOver(arc, over, viewer);
    } else {
      d3.selectAll("rect.service-type").each(function(d) {
        let match = `${d.address} (${d.parentNode.site_name})`;
        if (arc.all) {
          match = d.address;
        }
        if (arc.key === match) {
          d.selected = over;
          viewer.blurAll(over, d);
          viewer.opaqueServiceType(d);
          viewer.restart();
        }
      });
    }
  }
  getSavedZoom = (defaultScale) => {
    const savedScale = utils.getSaved(ZOOM_SCALE, defaultScale);
    const savedTranslate = utils.getSaved(ZOOM_TRANSLATE, [0, 0]);
    return { savedScale, savedTranslate };
  };
  saveZoom = (zoom) => {
    utils.setSaved(ZOOM_SCALE, zoom.scale());
    utils.setSaved(ZOOM_TRANSLATE, zoom.translate());
  };

  static saveOverrideOptions = (options) =>
    options.mode === "graph"
      ? utils.setOptions(DEPLOYMENT_OPTIONS, options, DEFAULT_OPTIONS)
      : utils.setOptions(
          DEPLOYMENT_TABLE_OPTIONS,
          options,
          DEFAULT_TABLE_OPTIONS
        );
  getGraphOptions = () => utils.getOptions(DEPLOYMENT_OPTIONS, DEFAULT_OPTIONS);
  saveGraphOptions = (options) => utils.setOptions(DEPLOYMENT_OPTIONS, options);
}
