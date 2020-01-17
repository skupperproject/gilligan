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

import { clusterColor, darkerColor } from "./clusterColors";
import { reality, adjustPositions } from "./topoUtils";
import { utils } from "../amqp/utilities";
import { Node } from "./nodes";
import { Link } from "./links";

const ServiceWidth = 130;
const ServiceHeight = 40;
const ServiceGap = 5;
const ServiceStart = 80;
const ServiceBottomGap = 15;
const BoxWidth = ServiceWidth + ServiceGap * 2;
const BoxHeight = 180;

class Graph {
  initNodesAndLinks = (nodes, links, width, height, typeName) => {
    nodes.reset();
    links.reset();
    this.initNodes(nodes, width, height);
    const vsize = this.initLinks(nodes, links, width, height);
    nodes.savePositions();
    return { nodeCount: nodes.nodes.length, size: vsize };
  };

  clusterHeight = n => {
    return Math.max(
      BoxHeight,
      ServiceStart +
        n.properties.subNodes.length * (ServiceHeight + ServiceGap) +
        ServiceBottomGap
    );
  };
  initNodes = (nodes, width, height) => {
    const clusters = reality.clusters;
    clusters.forEach((cluster, clusterIndex) => {
      const id = utils.idFromName(cluster.location, "_topo");
      const name = cluster.location;

      const clusterNode = nodes.addUsing(
        id,
        name,
        "_topo",
        nodes.length,
        undefined,
        undefined,
        name,
        undefined,
        true,
        { subNodes: [], cluster },
        this.clusterHeight
      );
      clusterNode.dataType = "cluster";
      reality.serviceTypes.forEach(st => {
        if (st.cluster === clusterIndex) {
          const subNode = new Node(
            st.name,
            st.name,
            "normal",
            {},
            clusterNode.name,
            20,
            ServiceStart +
              clusterNode.properties.subNodes.length *
                (ServiceHeight + ServiceGap),
            clusterNode.properties.subNodes.length,
            0,
            true,
            clusterNode.name,
            () => ServiceHeight
          );
          subNode.orgx = subNode.x;
          subNode.orgy = subNode.y;
          subNode.index = clusterNode.properties.subNodes.length;
          subNode.gap = 0;
          clusterNode.properties.subNodes.push(subNode);
          subNode.parentNode = clusterNode;
        }
      });
    });
  };

  // create a link between services
  initLinks = (nodes, links, width, height) => {
    // links between clusters
    const clusterLinks = [];
    reality.serviceInstances.forEach(si => {
      const sourceCluster = reality.serviceTypes[si.source].cluster;
      const targetCluster = reality.serviceTypes[si.target].cluster;
      if (sourceCluster !== targetCluster) {
        if (
          !clusterLinks.some(
            cl =>
              (cl.source === sourceCluster && cl.target === targetCluster) ||
              (cl.target === sourceCluster && cl.source === targetCluster)
          )
        ) {
          clusterLinks.push(
            new Link(
              sourceCluster,
              targetCluster,
              "both",
              "cluster",
              `Link-${sourceCluster}-${targetCluster}`
            )
          );
        }
      }
    });
    const vsize = adjustPositions({
      nodes,
      links: { links: clusterLinks },
      width,
      height,
      BoxWidth,
      BoxHeight,
      topGap: BoxHeight / 2
    });

    const subNodes = [];
    const subLinks = [];
    reality.serviceInstances.forEach(si => {
      let source, target;
      let sourceIndex = -1;
      let targetIndex = -1;
      nodes.nodes.forEach(n =>
        n.properties.subNodes.forEach(sn => {
          if (sn.name === reality.serviceTypes[si.source].name) {
            source = sn;
            sourceIndex = subNodes.findIndex(n => n.name === source.name);
            if (sourceIndex === -1) {
              sourceIndex = subNodes.length;
              subNodes.push(source);
            }
          }
          if (sn.name === reality.serviceTypes[si.target].name) {
            target = sn;
            targetIndex = subNodes.findIndex(n => n.name === target.name);
            if (targetIndex === -1) {
              targetIndex = subNodes.length;
              subNodes.push(target);
            }
          }
        })
      );
      subLinks.push({ source: sourceIndex, target: targetIndex });
      links.addLink({
        source,
        target,
        dir: "out",
        cls: "link",
        uid: `${source.key}-${target.key}`
      });
      links.links[links.links.length - 1].stats = si.stats;
    });
    return adjustPositions({
      nodes: { nodes: subNodes },
      links: { links: subLinks },
      width: vsize.width,
      height: vsize.height,
      BoxWidth: ServiceWidth,
      BoxHeight: ServiceHeight,
      topGap: ServiceHeight
    });
  };

  createRects = (g, shadow) => {
    const rects = g
      .append("svg:g")
      .attr("class", `${shadow ? "shadow" : "cluster"}-rects`)
      .attr("opacity", shadow ? 0 : 1);

    rects
      .append("svg:rect")
      .attr("class", "network")
      .attr("width", d => d.width(BoxWidth))
      .attr("height", d => this.clusterHeight(d))
      .attr("style", d => `fill: ${clusterColor(d.index)}`);

    rects
      .append("svg:rect")
      .attr("class", "cluster-header")
      .attr("width", d => d.width(BoxWidth))
      .attr("height", 30)
      .attr("style", d => `fill: ${darkerColor(d.index)}`);

    rects
      .append("svg:text")
      .attr("class", "cluster-name")
      .attr("x", d => d.width(BoxWidth) / 2)
      .attr("y", d => (d.ypos = 15))
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .text(d => d.properties.cluster.location);

    rects
      .append("svg:text")
      .attr("class", "location")
      .attr("x", d => d.width(BoxWidth) / 2)
      .attr("y", 50)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .attr(
        "style",
        d => `fill: ${darkerColor(d.index)}; stroke: ${darkerColor(d.index)}`
      )
      .text(d => d.properties.cluster.name);
  };

  createGraph = (g, links, shadow) => {
    // add new rects and set their attr/class/behavior

    this.createRects(g, shadow);

    if (!shadow) {
      let serviceTypes = g
        .selectAll("g.service-type")
        .data(
          d => d.properties.subNodes || [],
          d => `${d.parentNode.uuid}-${d.id}`
        );

      this.appendServices(serviceTypes, links);
    }
    return g;
  };

  appendServices = (serviceTypes, links) => {
    serviceTypes.exit().remove();
    const serviceTypesEnter = serviceTypes
      .enter()
      .append("svg:g")
      .attr("class", "service-type")
      .attr("transform", (d, i) => {
        return `translate(20, ${ServiceStart +
          i * (ServiceHeight + ServiceGap)})`;
      });

    serviceTypesEnter
      .append("svg:rect")
      .attr("class", "service-type")
      .attr("rx", 10)
      .attr("ry", 10)
      .attr("width", d => Math.max(ServiceWidth, d.width()))
      .attr("height", ServiceHeight);

    serviceTypesEnter
      .append("svg:text")
      .attr("class", "service-type")
      .attr("x", d => Math.max(ServiceWidth, d.width()) / 2)
      .attr("y", 20)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .text(d =>
        d.name.length > 15
          ? d.name.substr(0, 8) + "..." + d.name.substr(d.name.length - 5)
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
      .attr("cx", d => Math.max(ServiceWidth, d.width()))
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

    const extra = serviceTypesEnter
      .append("g")
      .attr("class", "extra-info")
      .attr("opacity", 0)
      .attr("transform", "translate(30, 40)");

    extra
      .append("text")
      .attr("x", 0)
      .attr("y", 5)
      .text("Extra info");
    extra
      .append("text")
      .attr("x", 0)
      .attr("y", 20)
      .text("Extraer info");
  };
}

export default Graph;
