/*
 * Copyright 2020 Red Hat Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Nodes } from "./nodes.js";

export function updateState(circle) {
  circle
    //.selectAll("circle")
    .classed("highlighted", function(d) {
      return d.highlighted;
    })
    .classed("selected", function(d) {
      return d.selected;
    })
    .classed("fixed", function(d) {
      return d.fixed ? d.fixed & 1 : false;
    })
    .classed("multiple", function(d) {
      return d.normals && d.normals.length > 1;
    });
}

export function appendCloud(g) {
  g.append("svg:path")
    .attr("class", "cloud")
    .attr(
      "d",
      "M 25,60 a 20,20 1 0,0 0,40 h 50 a 20,20 1 0,0 0,-40 a 10,10 1 0,0 -15,-10 a 15,15 1 0,0 -35,10 z"
    );
  g.append("svg:text")
    .attr("class", "cloud")
    .attr("x", 50)
    .attr("y", 80)
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "middle")
    .text(d => d.name);

  return g;
}

// content inside the circle
export function appendContent(g) {
  // show node IDs
  /*
  g.append("svg:text")
    .attr("x", d => Nodes.textOffset(d.nodeType))
    .attr("y", function(d) {
      let y = 7;
      if (utils.isArtemis(d)) y = 8;
      else if (utils.isQpid(d)) y = 9;
      else if (d.nodeType === "inter-router") y = 4;
      else if (d.nodeType === "route-container") y = 5;
      else if (d.nodeType === "edge" || d.nodeType === "_edge") y = 4;
      return y;
    })
    .attr("class", "id")
    .classed("console", function(d) {
      return utils.isConsole(d);
    })
    .classed("normal", function(d) {
      return d.nodeType === "normal";
    })
    .classed("on-demand", function(d) {
      return d.nodeType === "on-demand";
    })
    .classed("edge", function(d) {
      return d.nodeType === "edge";
    })
    .classed("edge", function(d) {
      return d.nodeType === "_edge";
    })
    .classed("artemis", function(d) {
      return utils.isArtemis(d);
    })
    .classed("qpid-cpp", function(d) {
      return utils.isQpid(d);
    })
    .text(function(d) {
      if (utils.isConsole(d)) {
        return "\uf108"; // icon-desktop for a console
      } else if (utils.isArtemis(d)) {
        return "\ue900"; // custom font character
      } else if (utils.isQpid(d)) {
        return "\ue901"; // custom font character
      } else if (d.nodeType === "route-container") {
        return d.properties.product
          ? d.properties.product[0].toUpperCase()
          : "S";
      } else if (d.nodeType === "normal") {
        return "\uf109"; // icon-laptop for clients
      } else if (d.nodeType === "edge" || d.nodeType === "_edge") {
        return "Edge";
      }
      return d.name.length > 7
        ? d.name.substr(0, 3) + "..." + d.name.substr(d.name.length - 3, 3)
        : d.name;
    });
    */
}

export function appendTitle(g) {
  /*
  g.append("svg:title").text(function(d) {
    return d.title();
  });
  */
}

// Generate a marker for each combination of:
//  start|end, ''|selected highlighted, and each possible node radius
export function addDefs(svg) {
  let sten = ["start", "end"];
  let states = ["", "selected", "highlighted", "unknown"];
  let radii = Nodes.discrete();
  let defs = [];
  for (let isten = 0; isten < sten.length; isten++) {
    for (let istate = 0; istate < states.length; istate++) {
      for (let iradii = 0; iradii < radii.length; iradii++) {
        defs.push({
          sten: sten[isten],
          state: states[istate],
          r: radii[iradii]
        });
      }
    }
  }
  svg
    .append("svg:defs")
    .attr("class", "marker-defs")
    .selectAll("marker")
    .data(defs)
    .enter()
    .append("svg:marker")
    .attr("id", function(d) {
      return [d.sten, d.state, d.r].join("-");
    })
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", d => Nodes.refX(d.sten, d.r))
    .attr("markerWidth", 14)
    .attr("markerHeight", 14)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", function(d) {
      return d.sten === "end"
        ? "M 0 -5 L 10 0 L 0 5 z"
        : "M 10 -5 L 0 0 L 10 5 z";
    });
  svg
    .select("defs.marker-defs")
    .append("marker")
    .attr("id", "site-end")
    .attr("viewBox", "0 -10 20 20")
    .attr("refX", 0)
    .attr("markerWidth", 20)
    .attr("markerHeight", 20)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", `M 0 -10 L 10 0 L 0 10 z`);
  svg
    .select("defs.marker-defs")
    .append("marker")
    .attr("id", "site-start")
    .attr("viewBox", "0 -10 20 20")
    .attr("refX", 0)
    .attr("markerWidth", 20)
    .attr("markerHeight", 20)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", `M 10 -10 L 10 10 L 0 0 z`);

  addStyles(
    sten,
    {
      selected: "#33F",
      highlighted: "#6F6",
      unknown: "#888"
    },
    radii
  );
}

// draw line between centers of source and target rectangles
// find the point on the source rect (sx,sy) that the line intersects
// find the point on the target rect (tx,ty) that the line intersects
export const midPoints = (source, target) => {
  return {
    sx: source.x + source.getWidth() / 2,
    sy: source.y + 20,
    tx: target.x + target.getWidth() / 2,
    ty: target.y + 20
  };
  /*
  // get center of source and target rects
  const sxc = source.x + source.getWidth() / 2;
  const syc = source.y + source.getHeight() / 2;
  const txc = target.x + target.getWidth() / 2;
  const tyc = target.y + target.getHeight() / 2;

  const x = txc - sxc; // length of triangle base
  const y = syc - tyc; // length of triangle side

  const sx = sxc - source.x; // source similar triangle base
  const sy = (y / x) * sx; // source similar triangle side

  const tx = txc - target.x; // target similar triangle base
  const ty = (y / x) * tx; // target similar triangle side

  console.log(`${source.name} - ${target.name}`);
  console.log(`source center (${sxc},${syc}) target center (${txc},${tyc}) `);
  console.log(`x ${x} y ${y}`);
  console.log(`sx ${sx} sy ${sy}  tx ${tx} ty ${ty}`);
  console.log(
    `source intersect (${sxc + sx},${syc - sy}) target intersect (${txc -
      tx},${tyc + ty})`
  );
  return { sx: sxc + sx, sy: syc - sy, tx: txc - tx, ty: tyc + ty };
  */
};

export function addGradient(svg) {
  // gradient for sender/receiver client
  let grad = svg
    .append("svg:defs")
    .append("linearGradient")
    .attr("id", "half-circle")
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "100%")
    .attr("y2", "0%");
  grad
    .append("stop")
    .attr("offset", "50%")
    .style("stop-color", "#C0F0C0");
  grad
    .append("stop")
    .attr("offset", "50%")
    .style("stop-color", "#F0F000");
}

function addStyles(stend, stateColor, radii) {
  // the <style>
  let element = document.querySelector("style");
  // Reference to the stylesheet
  let sheet = element.sheet;

  let states = Object.keys(stateColor);
  // create styles for each combo of 'stend-state-radii'
  for (let istend = 0; istend < stend.length; istend++) {
    for (let istate = 0; istate < states.length; istate++) {
      let selectors = [];
      for (let iradii = 0; iradii < radii.length; iradii++) {
        selectors.push(`#${stend[istend]}-${states[istate]}-${radii[iradii]}`);
      }
      let color = stateColor[states[istate]];
      let sels = `${selectors.join(",")} {fill: ${color}; stroke: ${color};}`;
      sheet.insertRule(sels, 0);
    }
  }
}

export function scaledMouse(node, event) {
  const rect = node.getBoundingClientRect();
  return [
    event.clientX - rect.left - node.clientLeft,
    event.clientY - rect.top - node.clientTop
  ];
}

/*
export function getData(type, service) {
  let nodeInfo = {};

  if (type === "network") {
    //nodeInfo = service.management.topology.nodeInfo();
    clusters.forEach((cluster, clusterIndex) => {
      const results = [];
      const targetCluster =
        clusterIndex === clusters.length - 1 ? 0 : clusterIndex + 1;
      results.push([
        `connection-${clusterIndex}`,
        clusters[targetCluster].location,
        "inter-router",
        "host",
        "user",
        false,
        `clusterId-${clusterIndex}`,
        "both",
        {}
      ]);
      const clusterNamespaces = namespaces
        .filter(ns => ns.cluster === clusterIndex)
        .map(fns => fns.name);
      cluster.namespaces = clusterNamespaces;
      nodeInfo[utils.idFromName(cluster.location, "_topo")] = {
        router: {
          attributeNames: ["metaData"],
          results: [[cluster]]
        },
        connection: {
          attributeNames: ConnectionAttributeNames,
          results: results
        }
      };
    });
  } else if (type === "application") {
    const application = applications[0];
    serviceTypes.forEach((st, stIndex) => {
      const results = [];
      application.connections.forEach(conn => {
        if (serviceConnections[conn.serviceInstance].serviceType === stIndex) {
          conn.addresses.forEach(address => {
            results.push([
              st.addresses[address],
              "",
              "normal",
              "host",
              "user",
              false,
              `addr${stIndex}-${address}`,
              "both",
              {}
            ]);
          });
        }
      });
      nodeInfo[utils.idFromName(st.name, "_topo")] = {
        router: {
          attributeNames: ["metaData"],
          results: [[{}]]
        },
        connection: {
          attributeNames: ConnectionAttributeNames,
          results: results
        }
      };
    });
  }
  return nodeInfo;
}
*/
