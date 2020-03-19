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

/* The Graph class:
 - initializes nodes and links for the various views
 - creates the svg sub components that represent the nodes
 - contains some utility functions that operate on nodes
*/
import * as d3 from "d3";
import { sankeyCircular as sankey } from "d3-sankey-circular";
import {
  adjustPositions,
  adjustY,
  copy,
  getSubNodes,
  saveSankey,
  restoreSankey,
  siteColor,
  serviceColor,
  lighten,
  genPath
} from "../utilities";
import { Node } from "./nodes";
import { Links } from "./links";

const ServiceWidth = 130;
export const ServiceHeight = 40;
export const ServiceGap = 5;
export const ServiceStart = 50;
const ClusterPadding = 20;
const SiteRadius = 100;

export class Graph {
  constructor(service, drawPath) {
    this.VAN = service.adapter.data;
    this.adapter = service.adapter;
    this.drawPath = drawPath;
  }

  // force right to left links to be circular
  circularize = links => {
    let circularLinkID = 0;
    links.forEach(l => {
      if (l.source.x1 > l.target.x0) {
        l.circular = true;
        l.circularLinkID = circularLinkID++;
        l.circularLinkType = "bottom";
        l.source.partOfCycle = true;
        l.target.partOfCycle = true;
        l.source.circularLinkType = "bottom";
        l.target.curcularLinkType = "bottom";
      } else {
        if (l.circular) {
          l.circular = false;
          delete l.circularLinkID;
          delete l.circularLinkType;
        }
      }
    });
  };
  updateNonExtra = (allNodes, links) => {
    const nodes = getSubNodes(allNodes).filter(n => !n.extra);
    nodes.forEach(n => {
      n.x0 = n.x;
      n.x1 = n.x0 + n.getWidth();
      n.y0 = n.y;
      n.y1 = n.y0 + n.getHeight();
    });
    this.circularize(links);
    links.forEach(l => {
      l.path = genPath(l, "service");
    });
    saveSankey(nodes, "service");
  };

  updateSankey = ({ allNodes, links, excludeExtra }) => {
    let nodes = allNodes.nodes;
    if (excludeExtra) {
      nodes = nodes.filter(n => !n.extra);
    }
    this.circularize(links);
    // use the sankeyHeight when updating sankey path
    nodes.forEach(n => {
      n.y1 = n.y0 + n.sankeyHeight;
    });
    sankey().update({ nodes, links });
    // restore the node height
    nodes.forEach(n => {
      n.y1 = n.y0 + n.getHeight();
    });
    links.forEach(l => {
      l.sankeyPath = l.path;
      l.path = genPath(l);
    });
  };

  expandSubNodes = ({ allNodes, nonExtra = false, expand }) => {
    let nodes = allNodes.nodes;
    if (nonExtra) {
      nodes = nodes.filter(n => !n.extra);
    }
    nodes.forEach(n => {
      n.expanded = expand;
    });
  };

  initNodesAndLinks = (graphData, width, height, view) => {
    this.initNodes(graphData, width, height);
    const vsize = this.initLinks(graphData, width, height, view);
    return { nodeCount: graphData.siteNodes.nodes.length, size: vsize };
  };

  // create a node per site
  // create a serviceNode per service
  initNodes = (graphData, width, height) => {
    const { siteNodes, serviceNodes } = graphData;
    const clusters = this.VAN.sites;
    clusters.forEach((cluster, clusterIndex) => {
      const name = cluster.site_name;

      const clusterNode = siteNodes.addUsing({
        name,
        nodeType: "cluster",
        x: undefined,
        y: undefined,
        fixed: true,
        heightFn: this.clusterHeight,
        widthFn: this.clusterWidth
      });
      clusterNode.mergeWith(cluster);
      clusterNode.color = siteColor(name);
      clusterNode.y0 = clusterNode.y;
      clusterNode.x0 = clusterNode.x;
      clusterNode.y1 = clusterNode.y0 + SiteRadius * 2;
      clusterNode.x1 = clusterNode.x0 + SiteRadius * 2;

      cluster.services.forEach((service, i) => {
        const subNode = new Node({
          name: service.address,
          nodeType: "service",
          x: 20,
          y: ServiceStart + i * (ServiceHeight + ServiceGap),
          fixed: true,
          heightFn: this.serviceHeight,
          widthFn: this.serviceWidth
        });
        subNode.mergeWith(service);
        subNode.versions.forEach(version => {
          version.getWidth = () => version.version.length * 8;
          version.getHeight = () => 15;
        });
        subNode.expandedHeight = adjustY({
          nodes: subNode.versions,
          height: subNode.getHeight(true),
          yAttr: "y"
        });
        // save the x,y for the subnodes for the namespace view
        subNode.orgx = subNode.x;
        subNode.orgy = subNode.y;
        subNode.gap = 0;
        subNode.parentNode = clusterNode;
        subNode.lightColor = d3.rgb(serviceColor(subNode.name)).brighter(0.6);
        subNode.color = serviceColor(subNode.name);
        const original = serviceNodes.nodeFor(subNode.name);
        if (original) {
          subNode.extra = true;
          subNode.original = original;
        }
        serviceNodes.add(subNode);
      });
    });
    // get site sizes
    siteNodes.nodes.forEach(site => {
      const links = [];
      const subServices = serviceNodes.nodes.filter(
        sn => sn.parentNode.site_id === site.site_id
      );
      // get links between services within each site
      subServices.forEach((fromService, s) => {
        subServices.forEach((toService, t) => {
          const { stat } = this.adapter.fromTo(
            fromService.address,
            site.site_id,
            toService.address,
            site.site_id
          );
          if (stat) {
            links.push({
              source: s,
              target: t,
              value: stat
            });
          }
        });
      });
      // put subServices into columns based on links
      adjustPositions({
        nodes: subServices,
        links,
        width,
        height
      });
      // adjust site size
      const maxColumn = Math.max(...subServices.map(ss => ss.col));
      const r =
        ((maxColumn + 1) * ServiceWidth + (maxColumn * ServiceWidth) / 2 + 40) /
        2;
      site.r = r;
      site.subServiceLinks = links;
    });
    // get site positions
    const interSiteLinks = new Links();
    siteNodes.nodes.forEach(fromSite => {
      siteNodes.nodes.forEach(toSite => {
        if (fromSite.site_id !== toSite.site_id) {
          const value = this.adapter.siteToSite(fromSite, toSite);
          if (value) {
            interSiteLinks.getLink(fromSite, toSite, "dir", "cls", "uid");
          }
        }
      });
    });
    adjustPositions({
      nodes: siteNodes.nodes,
      links: interSiteLinks.links,
      width,
      height
    });
    // clusters now have x,y
    siteNodes.nodes.forEach(cluster => {
      const subServices = serviceNodes.nodes.filter(
        sn => sn.parentNode.site_id === cluster.site_id
      );
      // position subServices in sites
      adjustPositions({
        nodes: subServices,
        links: cluster.subServiceLinks,
        width: cluster.r * 2 + 20,
        height: cluster.r * 2
      });
      subServices.forEach(ss => {
        ss.siteOffsetX = ss.x;
        ss.siteOffsetY = ss.y;
        ss.x0 = ss.x = cluster.x + ss.siteOffsetX;
        ss.x1 = ss.x0 + ss.getWidth();
        ss.y0 = ss.y = cluster.y + ss.siteOffsetY;
        ss.y1 = ss.y0 + ss.getHeight();
        ss.sankeyHeight = ss.y1 - ss.y0;
      });
      saveSankey(subServices, "deployment");
    });
  };

  // restore subNode positions for the view (key)
  sankeyRestore = (nodes, key) => {
    const subNodes = getSubNodes(nodes);
    restoreSankey(subNodes, key);
  };

  // create links
  initLinks = (graphData, width, height, view) => {
    const { siteNodes, serviceNodes } = graphData;
    if (view === "site" || view === "sitesankey") {
      this.initSiteTrafficLinks(
        siteNodes,
        graphData.siteTrafficLinks,
        width,
        height
      );
    }
    if (view === "site" || view === "deployment" || view === "sitesankey") {
      this.initRouterLinks(siteNodes, graphData.siteLinks, width, height);
    }
    if (view === "deployment") {
      this.initDeploymentLinks(
        serviceNodes,
        graphData.deploymentLinks,
        width,
        height
      );
    }
    if (view === "service" || view === "servicesankey") {
      this.initServiceLinks(graphData, width, height);
    }
    return { width, height };
  };

  initSiteTrafficLinks = (nodes, links, width, height) => {
    const siteMatrix = this.adapter.siteMatrix();
    siteMatrix.forEach(record => {
      const found = links.links.find(
        l =>
          l.source.site_name === record.ingress &&
          l.target.site_name === record.egress
      );
      if (found) {
        found.value += record.messages;
        this.adapter.aggregateAttributes(record.request, found.request);
      } else {
        const linkIndex = links.addLink({
          source: nodes.nodes.find(n => n.site_name === record.ingress),
          target: nodes.nodes.find(n => n.site_name === record.egress),
          dir: "in",
          cls: "siteTraffic",
          uid: `SiteLink-${record.ingress}-${record.egress}`
        });
        const link = links.links[linkIndex];
        link.value = record.messages;
        link.request = copy(record.request);
      }
    });
    const graph = {
      nodes: nodes.nodes,
      links: links.links
    };
    this.initSankey({
      graph,
      width,
      height,
      nodeWidth: ServiceWidth,
      nodePadding: ClusterPadding,
      left: 50,
      top: 20,
      right: 50,
      bottom: 10
    });
    saveSankey(nodes.nodes, "sitesankey");
  };

  initRouterLinks = (nodes, links, width, height) => {
    this.VAN.sites.forEach((site, i) => {
      const source = nodes.nodes.find(n => n.site_id === site.site_id);
      site.connected.forEach(targetSite => {
        const target = nodes.nodes.find(s => s.site_id === targetSite);
        links.getLink(
          source,
          target,
          "both",
          "cluster",
          `Link-${source.name}-${target.name}`
        );
      });
    });
    adjustPositions({
      nodes: nodes.nodes,
      links: links.links,
      width,
      height
    });
    nodes.nodes.forEach(n => {
      n.x0 = n.x;
      n.x1 = n.x0 + n.getWidth();
      n.y0 = n.y;
      n.y1 = n.y0 + SiteRadius * 2;
      n.cx = n.x + SiteRadius;
      n.cy = n.y + SiteRadius;
    });
    saveSankey(nodes.nodes, "site");
    saveSankey(nodes.nodes, "deployment");
  };

  initDeploymentLinks = (nodes, links, width, height) => {
    const subNodes = nodes.nodes;
    subNodes.forEach(fromNode => {
      subNodes.forEach(toNode => {
        const { stat, request } = this.adapter.fromTo(
          fromNode.name,
          fromNode.parentNode.site_id,
          toNode.name,
          toNode.parentNode.site_id
        );
        if (stat) {
          const linkIndex = links.addLink({
            source: fromNode,
            target: toNode,
            dir: "in",
            cls: "node2node",
            uid: `Link-${fromNode.parentNode.site_id}-${fromNode.uid()}-${
              toNode.parentNode.site_id
            }-${toNode.uid()}`
          });
          const link = links.links[linkIndex];
          link.request = request;
          link.value = stat;
        }
      });
    });
    this.initSankey({
      graph: { nodes: subNodes, links: links.links },
      width,
      height,
      nodeWidth: ServiceWidth,
      nodePadding: ServiceGap
    });
    // save sankeyHeight
    subNodes.forEach(n => {
      n.sankeyHeight = n.y1 - n.y0;
    });
    saveSankey(subNodes, "deployment");
    //this.circularize(links.links);
  };

  initServiceLinks = (graphData, width, height) => {
    const { serviceNodes } = graphData;
    // initialize the service to service links for the service view
    const links = graphData.serviceLinks;
    links.reset();
    // get the links between services for the service view
    const nonExtra = serviceNodes.nodes.filter(n => !n.extra);
    nonExtra.forEach((subNode, source) => {
      subNode.targetServices.forEach(targetService => {
        const target = nonExtra.findIndex(
          sn => sn.address === targetService.address
        );
        const linkIndex = links.getLink(
          source,
          target,
          "out",
          "link",
          `Link-${source}-${target}`
        );
        const link = links.links[Math.abs(linkIndex)];
        link.request = this.adapter.linkRequest(
          subNode.address,
          nonExtra[target]
        );

        link.value = link.request.requests;
      });
    });

    const graph = {
      nodes: nonExtra,
      links: links.links
    };

    // get the service positions and heights for use with the servicesankey view
    this.initSankey({
      graph,
      width: width,
      height: height,
      nodeWidth: ServiceWidth,
      nodePadding: ClusterPadding,
      left: 50,
      top: 20,
      right: 50,
      bottom: 10
    });

    nonExtra.forEach(n => {
      n.sankeyHeight = Math.max(n.y1 - n.y0, ServiceHeight);
      // top doesn't work. manually adjust top of nodes
      n.y0 += 20;
      n.y1 += 20;
      n.x = n.x0;
      n.y = n.y0;
    });
    links.links.forEach(l => {
      // manually adjust top for links
      l.y0 += 20;
      l.y1 += 20;
    });
    // regen the link.paths
    sankey().update(graph);
    // override height for non-sankey view
    nonExtra.forEach(n => {
      n.y1 = n.y0 + n.getHeight();
    });
    // save the sankey info in a key named "service"
    saveSankey(nonExtra, "service");
    saveSankey(nonExtra, "servicesankey");
    // generate our own paths
    links.links.forEach(link => {
      link.sankeyPath = link.path;
      link.path = genPath(link, "service");
    });

    return { width, height };
  };

  initSankey = ({
    graph,
    width,
    height,
    nodeWidth,
    nodePadding,
    left = 0,
    top = 0,
    right = 0,
    bottom = 0
  }) => {
    if (graph.links.length > 0) {
      const { nodes, links } = sankey()
        .nodeWidth(nodeWidth)
        .nodePadding(nodePadding)
        .iterations(3)
        .extent([
          [left, top],
          [width - right - left, height - bottom - top]
        ])(graph);
      return { snodes: nodes, slinks: links };
    } else {
      return { snodes: graph.nodes, slinks: graph.links };
    }
  };

  createGraph = (g, links) => {
    // add new rects and set their attr/class/behavior

    this.createSites(g);
    return g;
  };

  createSites = g => {
    const rects = g
      .append("svg:g")
      .attr("class", "cluster-rects")
      .attr("opacity", 1);

    rects
      .append("svg:circle")
      .attr("class", "network")
      .attr("r", d => d.r)
      .attr("cx", d => d.r)
      .attr("cy", d => d.r)
      .attr("fill", d => lighten(0.9, d.color))
      .attr("stroke", d => d.color)
      .attr("opacity", 1);

    rects
      .append("svg:text")
      .attr("class", "cluster-name")
      .attr("x", d => d.getWidth() / 2)
      .attr("y", d => d.getHeight() / 2)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .text(d => d.name);
  };

  appendServices = (serviceTypes, links) => {
    serviceTypes.exit().remove();
    const serviceTypesEnter = serviceTypes
      .enter()
      .append("svg:g")
      .attr("class", "service-type")
      .classed("extra", d => d.extra)
      .attr("transform", d => {
        return `translate(${d.orgx},${d.orgy})`;
      });

    serviceTypesEnter
      .append("svg:rect")
      .attr("class", "service-type")
      .attr("rx", 10)
      .attr("ry", 10)
      .attr("width", d => Math.max(ServiceWidth, d.getWidth()))
      .attr("height", d => d.getHeight())
      .attr("fill", "#FFFFFF");

    serviceTypesEnter
      .append("svg:text")
      .attr("class", "service-type")
      .attr("x", d => Math.max(ServiceWidth, d.getWidth()) / 2)
      .attr("y", d => d.getHeight() / 2)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .text(d =>
        d.name.length > 15
          ? d.name.substr(0, 7) + "..." + d.name.substr(d.name.length - 4)
          : d.name
      );

    // draw circle on right if this serviceType
    // is a source of a link
    serviceTypesEnter
      .filter(d => {
        return links.some(l => l.source.name === d.name);
      })
      .append("svg:circle")
      .attr("class", "end-point source")
      .attr("r", 6)
      .attr("cx", d => Math.max(ServiceWidth, d.getWidth()))
      .attr("cy", 20);

    // draw diamond on left if this serviceType
    // is a target of a link
    serviceTypesEnter
      .filter(d => {
        return links.some(l => l.target.name === d.name);
      })
      .append("svg:rect")
      .attr("class", "end-point source")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 10)
      .attr("height", 10)
      .attr("transform", "translate(0,13) rotate(45)");

    const versionsG = serviceTypesEnter
      .append("svg:g")
      .attr("class", "service-versions")
      .attr("transform", d => `translate(${d.getWidth(true) - 40},0)`)
      .style("display", "none");

    const versions = versionsG.selectAll("g.service-version").data(
      d => d.versions,
      d => (d ? d.version : "v0")
    );

    versions.exit().remove();
    const versionsEnter = versions
      .enter()
      .append("svg:g")
      .attr("class", "service-version");

    versionsEnter
      .append("svg:text")
      .attr("class", "service-version")
      .attr("x", d => 0)
      .attr("y", d => d.y)
      .attr("dominant-baseline", "hanging")
      .attr("text-anchor", "left")
      .text(d => d.version);
    versionsEnter
      .append("svg:circle")
      .attr("class", "end-point version")
      .attr("r", 6)
      .attr("cx", d => 40)
      .attr("cy", d => d.y + 10);
  };

  clusterHeight = n => n.r * 2;
  clusterWidth = n => n.r * 2;

  serviceHeight = (n, expanded) => {
    if (expanded === undefined) {
      expanded = n.expanded;
    }
    if (expanded) {
      return n.sankeyHeight
        ? n.sankeyHeight
        : Math.max(ServiceHeight, n.versions.length * 20);
    }
    return ServiceHeight;
  };

  serviceWidth = (node, expanded) => {
    if (expanded === undefined) {
      expanded = node.expanded;
    }
    //if (expanded) {
    //  return ServiceWidth + 60;
    //}
    let width = Math.max(ServiceWidth, Math.min(node.name.length, 15) * 8);
    if (node.subNodes) {
      node.subNodes.forEach(n => {
        width = Math.max(width, ServiceGap * 2 + n.getWidth());
      });
    }
    return width;
  };
}

/*
M 704.6 346 
L709.6 346 
A29.3 29.3 0 0 1 738.9 375.3 
L738.9 445.1 
A29.3 29.3 0 0 1 709.6 474.4 
L63.2 474.4 
A69.9 69.9 0 0 1 -6.6 404.6 
L-6.6 438.1 
A69.9 67.9 0 0 1 63.2 370.3 
L68.2 370.3
*/
