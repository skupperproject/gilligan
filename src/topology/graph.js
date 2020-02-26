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
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import {
  adjustPositions,
  adjustY,
  saveSankey,
  siteColor,
  serviceColor,
  RGB_Linear_Shade
} from "../utilities";
import { Node } from "./nodes";

const ServiceWidth = 130;
const ServiceHeight = 40;
export const ServiceGap = 5;
export const ServiceStart = 50;
const ServiceBottomGap = 15;
const ClusterPadding = 20;
const BoxWidth = ClusterPadding + ServiceWidth + ClusterPadding;

export class Graph {
  constructor(service, drawPath) {
    this.VAN = service.adapter.data;
    this.adapter = service.adapter;
    this.drawPath = drawPath;
    this.sankeyLinkHorizontal = sankeyLinkHorizontal();
  }

  initSiteLinks = (nodes, links, width, height) => {
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
  };

  // get the links between sites for the site traffic view
  initSiteTrafficLinks = (nodes, siteTrafficLinks, width, height) => {
    nodes.nodes.forEach(fromSite => {
      nodes.nodes.forEach(toSite => {
        const value = this.adapter.siteToSite(fromSite, toSite);
        if (value !== null) {
          const linkIndex = siteTrafficLinks.getLink(
            fromSite,
            toSite,
            "out",
            "site2site",
            `SiteLink-${fromSite.site_id}-${toSite.site_id}`
          );
          const link = siteTrafficLinks.links[Math.abs(linkIndex)];
          if (linkIndex < 0) {
            link.left = true;
          }
          link.value = value;
          link.sankeyLinkHorizontal = this.sankeyLinkHorizontal;
        }
      });
    });

    const graph = {
      nodes: nodes.nodes,
      links: siteTrafficLinks.links
    };
    // create layout info for a sankey graph
    this.initSankey(graph, width, height, BoxWidth, ClusterPadding);
    saveSankey(nodes.nodes, "sitetraffic");
  };

  initNodesAndLinks = (nodes, links, width, height) => {
    nodes.reset();
    links.reset();
    this.initNodes(nodes, width, height);
    const vsize = this.initLinks(nodes, links, width, height);
    nodes.savePositions();
    return { nodeCount: nodes.nodes.length, size: vsize };
  };

  initNodes = (nodes, width, height) => {
    const clusters = this.VAN.sites;
    clusters.forEach((cluster, clusterIndex) => {
      const name = cluster.site_name;

      const clusterNode = nodes.addUsing({
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
      clusterNode.subNodes = [];

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
        clusterNode.subNodes.push(subNode);
      });
    });
  };

  // create links
  initLinks = (nodes, links, width, height) => {
    this.initSiteTrafficLinks(nodes, links, width, height);
    // get the starting x,y for the clusters when using the namespace view
    let vsize = adjustPositions({
      nodes: nodes.nodes,
      links: links.links,
      width,
      height,
      crossTest: false
    });

    links.reset();
    const subNodes = [];
    // get the links between services for the application view
    nodes.nodes.forEach(node => {
      node.subNodes.forEach((subNode, i) => {
        const original = subNodes.find(s => s.address === subNode.address);
        subNode.extra = original ? true : false;
        subNode.original = original;
        subNodes.push(subNode);
      });
    });

    const nonExtra = subNodes.filter(n => !n.extra);
    nonExtra.forEach((subNode, source) => {
      subNode.targetServices.forEach(targetService => {
        const target = nonExtra.findIndex(
          sn => sn.address === targetService.address
        );
        links.getLink(
          source,
          target,
          "out",
          "link",
          `Link-${source}-${target}`
        );
        const link = links.links[links.links.length - 1];
        link.request = this.adapter.linkRequest(
          subNode.address,
          nonExtra[target]
        );
        link.value = link.request.requests;
        link.sankeyLinkHorizontal = this.sankeyLinkHorizontal;
      });
    });

    // get the starting x,y for the subnodes when using the application view
    vsize = adjustPositions({
      nodes: nonExtra,
      links: links.links,
      width: vsize.width,
      height: vsize.height,
      crossTest: true
    });
    const graph = {
      nodes: nonExtra,
      links: links.links
    };
    // get the links between services for use with the traffic view
    this.initSankey(graph, width, height, ServiceWidth, ClusterPadding);
    return vsize;
  };

  initSankey = (graph, width, height, nodeWidth, nodePadding) => {
    if (graph.links.length > 0) {
      const { nodes, links } = sankey()
        .nodeWidth(nodeWidth)
        .nodePadding(nodePadding * 2)
        .extent([[1, 1], [width - nodePadding * 2, height - nodePadding * 2]])(
        graph
      );
      return { snodes: nodes, slinks: links };
    } else {
      return { snodes: graph.nodes, slinks: graph.links };
    }
  };

  createGraph = (g, links, shadow) => {
    // add new rects and set their attr/class/behavior

    this.createRects(g, shadow);

    if (!shadow) {
      const serviceTypes = g
        .selectAll("g.service-type")
        .data(d => d.subNodes || [], d => `${d.parentNode.uuid}-${d.address}`);

      this.appendServices(serviceTypes, links);
    }
    return g;
  };

  createRects = (g, shadow) => {
    const rects = g
      .append("svg:g")
      .attr("class", `${shadow ? "shadow" : "cluster"}-rects`)
      .attr("opacity", shadow ? 0 : 1);

    rects
      .append("svg:rect")
      .attr("class", "network")
      .attr("width", d => d.getWidth())
      .attr("height", d => this.clusterHeight(d))
      .attr("fill", d => {
        const color = d3.rgb(d.color);
        const rgb = `rbg(${color.r},${color.g},${color.b})`;
        return RGB_Linear_Shade(0.9, rgb);
      })
      .attr("opacity", 1);

    rects
      .append("svg:rect")
      .attr("class", "cluster-header")
      .attr("width", d => d.getWidth())
      .attr("height", 30)
      .attr("fill", d => d3.rgb(d.color).darker(3));

    rects
      .append("svg:text")
      .attr("class", "cluster-name")
      .attr("x", d => d.getWidth() / 2)
      .attr("y", d => (d.ypos = 15))
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

    const versions = versionsG
      .selectAll("g.service-version")
      .data(d => d.versions, d => (d ? d.version : "v0"));

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

  clusterHeight = n => {
    let subHeights = 0;
    if (n.subNodes) {
      n.subNodes.forEach(s => {
        subHeights += ServiceGap + s.getHeight();
      });
    }
    return ServiceStart + subHeights + ServiceBottomGap;
  };

  clusterWidth = n => {
    let clusterWidth = BoxWidth;
    if (n.subNodes) {
      n.subNodes.forEach(s => {
        clusterWidth = Math.max(
          clusterWidth,
          s.getWidth() + ClusterPadding * 2
        );
      });
    }
    return clusterWidth;
  };

  serviceHeight = (n, expanded) => {
    if (expanded === undefined) {
      expanded = n.expanded;
    }
    if (expanded) {
      return n.expandedHeight
        ? n.expandedHeight
        : Math.max(ServiceHeight, n.versions.length * 20);
    }
    return ServiceHeight;
  };

  serviceWidth = (node, expanded) => {
    if (expanded === undefined) {
      expanded = node.expanded;
    }
    if (expanded) {
      return ServiceWidth + 60;
    }
    let width = Math.max(ServiceWidth, Math.min(node.name.length, 15) * 8);
    if (node.subNodes) {
      node.subNodes.forEach(n => {
        width = Math.max(width, ServiceGap * 2 + n.getWidth());
      });
    }
    return width;
  };
}
