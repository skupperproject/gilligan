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
import { reality, getPosition, adjustPositions } from "./topoUtils";
import { utils } from "../amqp/utilities";
import { Node } from "./nodes";

const BoxWidth = 180;
const BoxHeight = 180;
const ServiceWidth = 150;
const ServiceHeight = 40;

class Graph {
  initNodesAndLinks = (nodes, links, width, height, typeName) => {
    nodes.reset();
    links.reset();
    this.initNodes(nodes, width, height);
    this.initLinks(nodes, links, width, height);
    console.log(nodes);
    console.log(links);
    nodes.savePositions();
    return nodes.nodes.length;
  };

  initNodes = (nodes, width, height) => {
    const clusters = reality.clusters;
    let yInit = 0;
    clusters.forEach((cluster, clusterIndex) => {
      const id = utils.idFromName(cluster.location, "_topo");
      const name = cluster.location;
      let { position, newyInit, found } = getPosition(
        name,
        width,
        height,
        localStorage,
        nodes.length,
        clusters.length,
        yInit,
        false
      );
      if (!found) {
        position = { x: width / 2, y: height / 2, fixed: true };
      }

      yInit = newyInit;
      const clusterNode = nodes.addUsing(
        id,
        name,
        "_topo",
        nodes.length,
        position.x,
        position.y,
        name,
        undefined,
        true,
        { subNodes: [], cluster }
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
            90 + clusterNode.properties.subNodes.length * 45,
            clusterNode.properties.subNodes.length,
            0,
            true,
            clusterNode.name
          );
          subNode.orgx = subNode.x;
          subNode.orgy = subNode.y;
          subNode.x = undefined;
          subNode.y = undefined;
          clusterNode.properties.subNodes.push(subNode);
          subNode.parentNode = clusterNode;
          console.log(
            `creating node with key ${subNode.key} x ${subNode.x} y ${subNode.y}`
          );
        }
      });
    });
  };

  // create a link between services
  initLinks = (nodes, links, width, height) => {
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

    adjustPositions({
      nodes: { nodes: subNodes },
      links: { links: subLinks },
      width,
      height,
      BoxWidth: ServiceWidth,
      BoxHeight: ServiceHeight
    });
  };

  createGraph = (g, nodes, links) => {
    // add new rects and set their attr/class/behavior
    const rects = g
      .append("svg:g")
      .attr("class", "cluster-rects")
      .attr("opacity", 1);

    rects
      .append("svg:rect")
      .attr("class", "network")
      .attr("width", BoxWidth)
      .attr("height", (d, i) => {
        return Math.max(BoxHeight, 90 + d.properties.subNodes.length * 45);
      })
      .attr("style", d => `fill: ${clusterColor(d.index)}`);

    rects
      .append("svg:rect")
      .attr("class", "cluster-header")
      .attr("width", BoxWidth)
      .attr("height", 30)
      .attr("style", d => `fill: ${darkerColor(d.index)}`);

    rects
      .append("svg:text")
      .attr("class", "cluster-name")
      .attr("x", d => {
        d.sxpos = BoxWidth - 40;
        return BoxWidth / 2;
      })
      .attr("y", d => (d.ypos = 15))
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .text(d => d.properties.cluster.location);

    rects
      .append("svg:text")
      .attr("class", "location")
      .attr("x", BoxWidth / 2)
      .attr("y", 50)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .attr(
        "style",
        d => `fill: ${darkerColor(d.index)}; stroke: ${darkerColor(d.index)}`
      )
      .text(d => d.properties.cluster.name);

    let serviceTypes = g
      .selectAll("g.service-type")
      .data(
        d => d.properties.subNodes || [],
        d => `${d.parentNode.uuid}-${d.id}`
      );

    this.appendServices(serviceTypes, links);
    return g;
  };

  appendServices = (serviceTypes, links, parent) => {
    serviceTypes.exit().remove();
    const serviceTypesEnter = serviceTypes
      .enter()
      .append("svg:g")
      .attr("class", "service-type")
      .attr("transform", (d, i) => {
        const xoff = parent ? d.parentNode.x : 0;
        const yoff = parent ? d.parentNode.y : 0;
        const I = parent ? d.id : i;
        return `translate(${20 + xoff}, ${yoff + 90 + I * 45})`;
      });

    serviceTypesEnter
      .append("svg:rect")
      .attr("class", "service-type")
      .attr("rx", 10)
      .attr("ry", 10)
      .attr("width", 130)
      .attr("height", 40);

    serviceTypesEnter
      .append("svg:text")
      .attr("class", "service-type")
      .attr("x", 65)
      .attr("y", 20)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .text(d => d.name);

    // draw circle on right if this serviceType
    // is a source of a link
    serviceTypesEnter
      .filter(d => {
        return links.some(l => l.source.name === d.name);
      })
      .append("svg:circle")
      .attr("class", "end-point source")
      .attr("r", 6)
      .attr("cx", 130)
      .attr("cy", 20);

    // draw circle on left if this serviceType
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
