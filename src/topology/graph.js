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

import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { clusterColor, darkerColor } from "./clusterColors";
import { adjustPositions, adjustY } from "../qdrGlobals";
import { Node } from "./nodes";

const ServiceWidth = 130;
const ServiceHeight = 40;
export const ServiceGap = 5;
export const ServiceStart = 80;
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

  initSiteLinks = (nodes, links) => {
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
        //subNode.versions = this.adapter.getVersions(subNode, cluster.site_id);
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
        clusterNode.subNodes.push(subNode);
      });
    });
  };

  // create links
  initLinks = (nodes, links, width, height) => {
    // links between clusters
    this.VAN.sites.forEach((site, i) => {
      const source = i;
      site.connected.forEach(targetSite => {
        const target = this.VAN.sites.findIndex(s => s.site_id === targetSite);
        links.getLink(
          source,
          target,
          "both",
          "cluster",
          `Link-${source}-${target}`
        );
      });
    });
    // get the starting x,y for the clusters when using the namespace view
    let vsize = adjustPositions({
      nodes: nodes.nodes,
      links: links.links,
      width,
      height
    });

    links.reset();
    const subNodes = [];
    // get the links between services for the application view
    nodes.nodes.forEach(node => {
      node.subNodes.forEach((subNode, i) => {
        subNode.index = i;
        subNodes.push(subNode);
      });
    });

    subNodes.forEach((subNode, source) => {
      subNode.targetServices.forEach(targetService => {
        const target = subNodes.findIndex(
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
          subNodes[target]
        );
        link.value = link.request.bytes_out;
        link.sankeyLinkHorizontal = this.sankeyLinkHorizontal;
      });
    });

    // get the starting x,y for the subnodes when using the application view
    vsize = adjustPositions({
      nodes: subNodes,
      links: links.links,
      width: vsize.width,
      height: vsize.height
    });

    const graph = {
      nodes: subNodes,
      links: links.links
    };
    // get the links between services for use with the traffic view
    this.initSankey(graph, width, height);
    this.mergeLinks(subNodes, links.links);
    return vsize;
  };

  initSankey = (graph, width, height) => {
    if (graph.links.length > 0) {
      const { nodes, links } = sankey()
        .nodeWidth(ServiceWidth)
        .nodePadding(ServiceGap)
        .extent([[1, 1], [width - 1, height - 5]])(graph);
      return { snodes: nodes, slinks: links };
    } else {
      return { snodes: graph.nodes, slinks: graph.links };
    }
  };

  mergeLinks = (subNodes, subLinks) => {
    subNodes.forEach(sn => {
      const sourceLinks = [];
      sn.sourceLinks.forEach(sl => {
        const sourceLink = subLinks.find(
          subL =>
            subL.source.address === sl.source.address &&
            subL.target.address === sl.target.address
        );
        sourceLinks.push(sourceLink);
      });
      sn.sourceLinks = sourceLinks;
      const targetLinks = [];
      sn.targetLinks.forEach(sl => {
        const targetLink = subLinks.find(
          subL =>
            subL.source.address === sl.source.address &&
            subL.target.address === sl.target.address
        );
        targetLinks.push(targetLink);
      });
      sn.targetLinks = targetLinks;
    });
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
      .attr("style", d => `fill: ${clusterColor(d.index)}`);

    rects
      .append("svg:rect")
      .attr("class", "cluster-header")
      .attr("width", d => d.getWidth())
      .attr("height", 30)
      .attr("style", d => `fill: ${darkerColor(d.index)}`);

    rects
      .append("svg:text")
      .attr("class", "cluster-name")
      .attr("x", d => d.getWidth() / 2)
      .attr("y", d => (d.ypos = 15))
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .text(d => d.name);
    /*
    rects
      .append("svg:text")
      .attr("class", "location")
      .attr("x", d => d.getWidth() / 2)
      .attr("y", 50)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .attr(
        "style",
        d => `fill: ${darkerColor(d.index)}; stroke: ${darkerColor(d.index)}`
      )
      .text(d => d.site_id);
      */
  };

  appendServices = (serviceTypes, links) => {
    serviceTypes.exit().remove();
    const serviceTypesEnter = serviceTypes
      .enter()
      .append("svg:g")
      .attr("class", "service-type")
      .classed(
        "extra",
        d => d.sourceNodes.length === 0 && d.targetNodes.length === 0
      )
      .attr("transform", d => {
        return `translate(${d.orgx},${d.orgy})`;
      });

    serviceTypesEnter
      .append("svg:rect")
      .attr("class", "service-type")
      .attr("rx", 10)
      .attr("ry", 10)
      .attr("width", d => Math.max(ServiceWidth, d.getWidth()))
      .attr("height", d => d.getHeight());

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
