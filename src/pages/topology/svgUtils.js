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
    .text((d) => d.name);

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
  let sten = ["end"];
  let states = ["", "selected", "highlighted", "unknown"];
  let radii = Nodes.discrete();
  let defs = [];
  for (let isten = 0; isten < sten.length; isten++) {
    for (let istate = 0; istate < states.length; istate++) {
      for (let iradii = 0; iradii < radii.length; iradii++) {
        defs.push({
          sten: sten[isten],
          state: states[istate],
          r: radii[iradii],
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
    .attr("refX", (d) => Nodes.refX(d.sten, d.r))
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

  addGlowFilter(svg);
  addMarkers(svg);
}

const addGlowFilter = (svg) => {
  const filter = svg
    .append("svg:defs")
    .append("svg:filter")
    .attr("id", "glow")
    .attr("filterUnits", "userSpaceOnUse")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");

  filter
    .append("feGaussianBlur")
    .attr("in", "SourceGraphic")
    .attr("stdDeviation", "5")
    .attr("result", "blur5");
  filter
    .append("feGaussianBlur")
    .attr("in", "SourceGraphic")
    .attr("stdDeviation", "10")
    .attr("result", "blur10");
  filter
    .append("feGaussianBlur")
    .attr("in", "SourceGraphic")
    .attr("stdDeviation", "20")
    .attr("result", "blur20");
  filter
    .append("feGaussianBlur")
    .attr("in", "SourceGraphic")
    .attr("stdDeviation", "30")
    .attr("result", "blur30");
  filter
    .append("feGaussianBlur")
    .attr("in", "SourceGraphic")
    .attr("stdDeviation", "50")
    .attr("result", "blur50");

  const merge = filter.append("feMerge").attr("result", "blur-merged");
  merge.append("feMergeNode").attr("in", "blur10");
  merge.append("feMergeNode").attr("in", "blur20");
  merge.append("feMergeNode").attr("in", "blur30");
  merge.append("feMergeNode").attr("in", "blur50");

  filter
    .append("feColorMatrix")
    .attr("result", "green-blur")
    .attr("in", "blur-merged")
    .attr("type", "matrix")
    .attr(
      "value",
      `${"1 0 0 0 0"} ${"0 0.06 0 0 0"} ${"0 0 0.44 0 0"} ${"0 0 0 1 0"}`
    );
  const feMerge = filter.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "green-blur");
  feMerge.append("feMergeNode").attr("in", "blur5");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");
  /*
  <filter id="red-glow" filterUnits="userSpaceOnUse"
  x="-50%" y="-50%" width="200%" height="200%">
<!-- blur the text at different levels-->
<feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur5"/>
<feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur10"/>
<feGaussianBlur in="SourceGraphic" stdDeviation="20" result="blur20"/>
<feGaussianBlur in="SourceGraphic" stdDeviation="30" result="blur30"/>
<feGaussianBlur in="SourceGraphic" stdDeviation="50" result="blur50"/>
<!-- merge all the blurs except for the first one -->
<feMerge result="blur-merged">
<feMergeNode in="blur10"/>
<feMergeNode in="blur20"/>
<feMergeNode in="blur30"/>
<feMergeNode in="blur50"/>
</feMerge>
<!-- recolour the merged blurs red-->
<feColorMatrix result="red-blur" in="blur-merged" type="matrix"
           values="1 0 0 0 0
                   0 0.06 0 0 0
                   0 0 0.44 0 0
                   0 0 0 1 0" />
<feMerge>
<feMergeNode in="red-blur"/>       <!-- largest blurs coloured red -->
<feMergeNode in="blur5"/>          <!-- smallest blur left white -->
<feMergeNode in="SourceGraphic"/>  <!-- original white text -->
</feMerge>
</filter>
*/
};

export const addMarkers = (svg) => {
  svg
    .select("defs.marker-defs")
    .append("marker")
    .attr("id", "site-end")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 8)
    .attr("markerWidth", 14)
    .attr("markerHeight", 14)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", `M 0 -5 L 10 0 L 0 5 z`);

  svg
    .select("defs.marker-defs")
    .append("marker")
    .attr("id", "http-end")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 8)
    .attr("markerWidth", 14)
    .attr("markerHeight", 14)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", `M 0 -5 L 10 0 L 0 5 z`);

  svg
    .select("defs.marker-defs")
    .append("marker")
    .attr("id", "tcp-end")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 10)
    .attr("markerWidth", 14)
    .attr("markerHeight", 14)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", "M 0 -5 L 10 0 L 0 5 L 5 0 z");
};

// draw line between centers of source and target rectangles
// find the point on the source rect (sx,sy) that the line intersects
// find the point on the target rect (tx,ty) that the line intersects
export const midPoints = (source, target) => {
  return {
    sx: source.x0 + source.getWidth() / 2,
    sy: source.y0 + 20,
    tx: target.x0 + target.getWidth() / 2,
    ty: target.y0 + 20,
  };
};

export function scaledMouse(node, event) {
  const rect = node.getBoundingClientRect();
  return [
    event.clientX - rect.left - node.clientLeft,
    event.clientY - rect.top - node.clientTop,
  ];
}

export const addGradient = (enterpath) => {
  const gradient = enterpath
    .append("linearGradient")
    .attr("id", (d) => d.uid)
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", (d) => d.source.x1)
    .attr("x2", (d) => d.target.x0);

  gradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", (d) => d.source.color);

  gradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", (d) => d.target.color);
};
