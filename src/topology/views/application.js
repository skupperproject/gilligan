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

const BoxWidth = 150;
const BoxHeight = 40;
class Application {
  initNodes = (nodes, width, height) => {
    nodes.reset();
    const serviceTypes = reality.serviceTypes;
    let yInit = 0;
    let animate = true;
    serviceTypes.forEach(st => {
      const id = utils.idFromName(st.name, "_topo");
      const name = st.name;
      let { position, newyInit, newanimate, found } = getPosition(
        name,
        width,
        height,
        localStorage,
        nodes.length,
        serviceTypes.length,
        yInit,
        animate
      );
      // if we didn't find a saved position
      if (!found) {
        position = { x: undefined, y: undefined, fixed: true };
      }
      yInit = newyInit;
      animate = newanimate;
      nodes.addUsing(
        id,
        name,
        "normal",
        nodes.length,
        position.x,
        position.y,
        name,
        undefined,
        position.fixed,
        { st }
      ).dataType = "application";
    });
  };

  // create a link between service types
  initLinks = (nodes, links, width, height) => {
    links.reset();
    reality.serviceInstances.forEach(si => {
      nodes.nodes[si.source].links.push("s");
      nodes.nodes[si.target].links.push("t");
      links.getLink(
        si.source,
        si.target,
        "out",
        "",
        `${nodes.get(si.source).uid()}-${nodes.get(si.target).uid()}`
      );
      links.links[links.links.length - 1].address = si.address;
    });
    adjustPositions({ nodes, links, width, height, BoxWidth, BoxHeight });
  };

  createGraph = g => {
    g.append("svg:rect")
      .attr("class", d => `application ${d.nodeType}`)
      .attr("width", 150)
      .attr("height", 40)
      .attr("rx", 3)
      .attr("ry", 3)
      .attr(
        "style",
        d => `fill: ${clusterColor(d.index)}; stroke: ${darkerColor(d.index)}`
      );

    g.append("svg:text")
      .attr("class", "application")
      .attr("x", 75)
      .attr("y", 20)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .text(d => d.name);

    const circles = g
      .selectAll("circle.end-point")
      .data(d => d.links.map(sourceOrTarget => ({ d, st: sourceOrTarget })));
    circles.exit().remove();
    circles
      .enter()
      .append("svg:circle")
      .attr("class", "end-point")
      .attr("r", 5)
      .attr("cx", d => {
        if (d.st === "s") {
          d.d.sxpos = d.d.xpos = BoxWidth - 15;
        } else {
          d.d.txpos = d.d.xpos = 15;
        }
        return d.d.xpos;
      })
      .attr("cy", d => (d.d.ypos = 20));

    return g;
  };
}

export default Application;
