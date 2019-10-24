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
import { reality, getPosition, adjustPositions } from "../topoUtils";
import { utils } from "../../amqp/utilities";
const BoxWidth = 180;
const BoxHeight = 80;

class Network {
  initNodes = (nodes, width, height) => {
    nodes.reset();
    const clusters = reality.clusters;
    let yInit = 0;
    let animate = true;
    clusters.forEach(cluster => {
      const id = utils.idFromName(cluster.location, "_topo");
      const name = cluster.location;
      let { position, newyInit, newanimate, found } = getPosition(
        name,
        width,
        height,
        localStorage,
        nodes.length,
        clusters.length,
        yInit,
        animate
      );
      if (!found) {
        position = { x: undefined, y: undefined, fixed: true };
      }
      yInit = newyInit;
      animate = newanimate;
      nodes.addUsing(
        id,
        name,
        "_topo",
        nodes.length,
        position.x,
        position.y,
        name,
        undefined,
        position.fixed,
        { cluster }
      ).dataType = "network";
    });
  };

  // create a link between clusters where a service instance exists between the clusters
  initLinks = (nodes, links, width, height) => {
    links.reset();
    reality.serviceInstances.forEach(si => {
      const sourceCluster = reality.serviceTypes[si.source].cluster;
      const targetCluster = reality.serviceTypes[si.target].cluster;
      if (sourceCluster !== targetCluster) {
        links.getLink(
          sourceCluster,
          targetCluster,
          "",
          "network",
          `${nodes.get(sourceCluster).uid()}-${nodes.get(targetCluster).uid()}`
        );
      }
    });
    adjustPositions({ nodes, links, width, height, BoxWidth, BoxHeight });
  };

  createGraph = g => {
    // add new rects and set their attr/class/behavior
    g.append("svg:rect")
      .attr("class", "network")
      .attr("width", BoxWidth)
      .attr("height", BoxHeight)
      .attr("style", d => `fill: ${clusterColor(d.index)}`);

    g.append("svg:rect")
      .attr("class", "cluster-header")
      .attr("width", BoxWidth)
      .attr("height", 30)
      .attr("style", d => `fill: ${darkerColor(d.index)}`);

    g.append("svg:text")
      .attr("class", "cluster-name")
      .attr("x", d => (d.xpos = BoxWidth / 2))
      .attr("y", d => (d.ypos = 15))
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .text(d => d.properties.cluster.location);

    g.append("svg:text")
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

    return g;
  };
}

export default Network;
