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
import { ServiceGap, ServiceStart } from "./topology/graph";
import * as d3path from "d3-path";
const SankeyAttributes = [
  "value",
  "depth",
  "height",
  "layer",
  "x0",
  "x1",
  "y0",
  "y1",
  "sankeyHeight"
];

export class QDRLogger {
  constructor(log, source) {
    this.log = function(msg) {
      log.log(
        " % c % s % s % s",
        "color: yellow; background - color: black;",
        "QDR-",
        source,
        msg
      );
    };
    this.debug = this.log;
    this.error = this.log;
    this.info = this.log;
    this.warn = this.log;
  }
}

export const QDRTemplatePath = "html/";
export const QDR_SETTINGS_KEY = "QDRSettings";
export const QDR_LAST_LOCATION = "QDRLastLocation";
export const QDR_INTERVAL = "QDRInterval";

export const safePlural = (count, str) => {
  if (count === 1) return str;
  var es = ["x", "ch", "ss", "sh"];
  for (var i = 0; i < es.length; ++i) {
    if (str.endsWith(es[i])) return str + "es";
  }
  if (str.endsWith("y")) return str.substr(0, str.length - 2) + "ies";
  if (str.endsWith("s")) return str;
  return str + "s";
};

export const Icap = s => `${s[0].toUpperCase()}${s.slice(1)}`;

export const pretty = (v, format = ",") => {
  var formatComma = d3.format(format);
  if (!isNaN(parseFloat(v)) && isFinite(v)) return formatComma(v);
  return v;
};

export const strDate = date => {
  return `${(date.getHours() + "").padStart(2, "0")}:${(
    date.getMinutes() + ""
  ).padStart(2, "0")}:${(date.getSeconds() + "").padStart(2, "0")}`;
};

export const copy = obj => {
  if (obj) return JSON.parse(JSON.stringify(obj));
};

export const getUrlParts = fullUrl => {
  fullUrl = fullUrl || window.location;
  const url = document.createElement("a");
  url.setAttribute("href", fullUrl);
  return url;
};

export const getSizes = component => {
  const gap = 5;
  let legendWidth = 4;
  let topoWidth = component.offsetWidth;
  if (topoWidth < 768) legendWidth = 0;
  let width = topoWidth - gap - legendWidth;
  let height = component.offsetHeight;
  if (width < 10 || height < 10) {
    console.log(`page width and height are abnormal w: ${width} h: ${height}`);
    return [0, 0];
  }
  return [width, height];
};

// vertically space nodes over the given height
export const adjustY = ({ nodes, height, yAttr }) => {
  let nodesHeight = 0;
  const minGap = 10;
  nodes.forEach(n => (nodesHeight += n.getHeight()));
  const gaps = nodes.length + 1;
  let gapHeight = (height - nodesHeight) / gaps;
  gapHeight = Math.max(minGap, gapHeight);
  let curY = gapHeight;
  nodes.forEach(n => {
    n[yAttr] = curY;
    curY += n.getHeight() + gapHeight;
  });
  return curY;
};

export const adjustPositions = ({ nodes, links, width, height, crossTest }) => {
  nodes.forEach(n => {
    n.sourceNodes = [];
    n.targetNodes = [];
  });

  // for all the nodes, construct 2 lists: souce nodes, and target nodes
  links.forEach(l => {
    if (isNaN(l.source)) {
      l.source.targetNodes.push(l.target);
      l.target.sourceNodes.push(l.source);
    } else {
      nodes[l.source].targetNodes.push(nodes[l.target]);
      nodes[l.target].sourceNodes.push(nodes[l.source]);
    }
  });

  // find node(s) with fewest number of sources
  const minSources = Math.min(...nodes.map(n => n.sourceNodes.length));
  const leftMost = nodes.filter(n => n.sourceNodes.length === minSources);

  // put leftMost in 1st column
  leftMost.forEach(n => (n.col = 0));

  // put called nodes in column to the right of the caller
  let colNodes = leftMost;
  while (colNodes.length > 0) {
    let foundNodes = [];
    colNodes.forEach(p => {
      nodes.forEach(n => {
        if (p.targetNodes.includes(n) && n.col === undefined) {
          n.col = p.col + 1;
          foundNodes.push(n);
        }
      });
    });
    colNodes = foundNodes;
  }

  let maxcol = 0;
  nodes.forEach(n => {
    maxcol = Math.max(maxcol, n.col);
  });

  let colCount = 0;
  nodes.forEach(n => {
    colCount = Math.max(colCount, n.col);
  });
  colCount += 1;

  const minGap = 10;
  let vheight = height;
  let vwidth = width;

  const colWidths = [];
  for (let col = 0; col < colCount; col++) {
    colNodes = nodes.filter(n => n.col === col);
    let nodesHeight = 0;
    colNodes.forEach(n => (nodesHeight += n.getHeight()));
    const gaps = colNodes.length + 1;
    let gapHeight = (height - nodesHeight) / gaps;
    if (gapHeight < minGap) {
      gapHeight = minGap;
      vheight = Math.max(vheight, nodesHeight + gapHeight * gaps);
      // keep aspect ratio the same
      vwidth = (width * vheight) / height;
    }
    let curY = gapHeight;
    colWidths[col] = 0;
    colNodes.forEach(n => {
      colWidths[col] = Math.max(colWidths[col], n.getWidth());
      n.y = curY;
      curY += n.getHeight() + gapHeight;
    });
  }

  // avoid parent links crossing directly over a service
  if (crossTest) {
    nodes.forEach(n => {
      const targets = n.targetNodes;
      n.sourceNodes.forEach(s => {
        if (s.targetNodes.some(v => targets.includes(v) && v.col > n.col)) {
          n.y += n.getHeight();
        }
      });
    });
  }

  let nodesWidth = 0;
  colWidths.forEach(c => {
    nodesWidth += c;
  });
  let hGap = (vwidth - nodesWidth) / (colCount + 1);
  if (hGap < minGap) {
    hGap = minGap;
    vwidth = Math.max(vwidth, nodesWidth + hGap * (colCount + 1));
    vheight = (height * vwidth) / width;
  }
  let curX = hGap;
  for (let col = 0; col < colCount; col++) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.col === col) {
        n.x = curX;
      }
    }
    curX += colWidths[col] + hGap;
  }

  return { width: vwidth, height: vheight };
};

// get list of all subnodes
// mark duplicate subnodes
export const getSubNodes = nodes => {
  const subNodes = [];
  nodes.nodes.forEach(node => {
    node.subNodes.forEach((subNode, i) => {
      const original = subNodes.find(s => s.address === subNode.address);
      subNode.extra = original ? true : false;
      subNode.original = original;
      subNodes.push(subNode);
    });
  });
  return subNodes;
};

export const saveSankey = (nodes, key) => {
  nodes.forEach(n => {
    n[key] = {};
    SankeyAttributes.forEach(a => {
      n[key][a] = n[a];
    });
  });
};
export const restoreSankey = (nodes, key) => {
  nodes.forEach(n => {
    if (n[key]) {
      SankeyAttributes.forEach(a => {
        n[a] = n[key][a];
      });
    } else {
      console.log(`did not find ${key} in node ${n.name}`);
    }
  });
};

export const siteColors = {};
export const serviceColors = {};
const colorGen = d3.scale.category20();
for (let i = 0; i < 20; i++) {
  colorGen(i);
}

export const siteColor = name => {
  if (!(name in siteColors)) {
    siteColors[name] = colorGen(Object.keys(siteColors).length * 2);
  }
  return siteColors[name];
};

export const serviceColor = name => {
  if (!(name in serviceColors)) {
    serviceColors[name] = colorGen(19 - Object.keys(serviceColors).length * 2);
  }
  return serviceColors[name];
};

export const lighten = (percent, color) => {
  const c = d3.rgb(color);
  const rgb = `rbg(${c.r},${c.g},${c.b})`;
  return RGB_Linear_Shade(percent, rgb);
};

/* see https://github.com/PimpTrizkit/PJs/wiki/12.-Shade,-Blend-and-Convert-a-Web-Color-(pSBC.js) */
export const RGB_Linear_Shade = (p, c) => {
  var i = parseInt,
    r = Math.round,
    [a, b, cs, d] = c.split(","),
    P = p < 0,
    t = P ? 0 : 255 * p,
    P1 = P ? 1 + p : 1 - p;
  return (
    "rgb" +
    (d ? "a(" : "(") +
    r(i(a[3] === "a" ? a.slice(5) : a.slice(4)) * P1 + t) +
    "," +
    r(i(b) * P1 + t) +
    "," +
    r(i(cs) * P1 + t) +
    (d ? "," + d : ")")
  );
};

const parsePath = d => {
  const cmdRegEx = /([MLQTCSAZVH])([^MLQTCSAZVH]*)/gi;
  const commands = d.match(cmdRegEx);
  commands.forEach((command, i) => {
    commands[i] = command.trim();
  });
  return commands;
};

export const fixPath = l => {
  let d = l.path;
  if (l.circular) {
    const commands = parsePath(d);
    if (commands.length === 10) {
      const l3 = commands[9].substr(1).split(/[\s,]+/);
      const y3 = parseFloat(l3[1]);

      const l1 = commands[5].substr(1).split(/[\s,]+/);
      const x1 = parseFloat(l1[0]);
      const y1 = parseFloat(l1[1]);

      const maxr = Math.min(x1, (y1 - y3) / 2);
      commands[6] = ["A", maxr, maxr, 0, 0, 1, x1 - maxr, y1 - maxr].join(" ");
      commands[8] = ["A", maxr, maxr, 0, 0, 1, x1, y3].join(" ");
      commands[7] = ["L", x1 - maxr, y3 + maxr].join(" ");
      d = commands.join(" ");
      l.path = d;
    }
  }
  return d;
};

export const genPath = (link, key, mask) => {
  if (mask) {
    let x0, x1, y;
    if (mask === "source") {
      const x = accessor(link.source, "x1", key);
      y = accessor(link.source, "y0", key);
      x0 = x - (link.width ? link.width : 0) / 8;
      x1 = x - 1;
    } else {
      const x = accessor(link.target, "x0", key);
      y = accessor(link.target, "y0", key);
      x0 = x + (link.width ? link.width : 0) / 8;
      x1 = x + 1;
    }
    return `M ${x0},${y} L ${x1},${y}`;
  } else
    return !link.circular ? bezier(link, key, mask) : circular(link, key, mask);
};

const accessor = (obj, attr, key) => (key ? obj[key][attr] : obj[attr]);

const bezier = (link, key) => {
  const x0 = accessor(link.source, "x1", key); // right side of source
  const y0 = link.source.expanded
    ? link.y0
    : accessor(link.source, "y0", key) + link.source.getHeight() / 2;
  const x1 = accessor(link.target, "x0", key); // left side of target
  const y1 = link.target.expanded
    ? link.y1
    : accessor(link.target, "y0", key) + link.target.getHeight() / 2;
  const path = d3path.path();
  path.bezierCurveTo((x0 + x1) / 2, y0, (x0 + x1) / 2, y1, x1, y1);
  return `M${x0} ${y0} ${path.toString()}`;
};
const circular = (link, key) => {
  const r = link.width ? Math.max(link.width, 30) : 30;
  const gap = 8;
  const sourceX = accessor(link.source, "x1", key);
  const sourceY =
    accessor(link.source, "y0", key) + link.source.getHeight() / 2;
  const targetX = accessor(link.target, "x0", key);
  const targetY =
    accessor(link.target, "y0", key) + link.target.getHeight() / 2;
  const bottomY = Math.max(sourceY + r + gap + r, targetY + r + gap + r);

  let path = d3path.path();
  path.moveTo(sourceX, sourceY);
  path.lineTo(sourceX + gap, sourceY);
  path.arcTo(sourceX + gap + r, sourceY, sourceX + gap + r, sourceY + r, r);
  path.lineTo(sourceX + gap + r, bottomY - r);
  path.arcTo(sourceX + gap + r, bottomY, sourceX + gap, bottomY, r);
  path.lineTo(targetX - gap, bottomY);
  path.arcTo(targetX - gap - r, bottomY, targetX - gap - r, bottomY - r, r);
  path.lineTo(targetX - gap - r, targetY + r);
  path.arcTo(targetX - r - gap, targetY, targetX - gap, targetY, r);
  path.lineTo(targetX, targetY);
  return path.toString();
};

export const expandSite = (site, key) => {
  if (site.subNodes && site.subNodes.length > 0) {
    let curY = ServiceStart;
    site.subNodes.forEach(n => {
      n.expandedY = curY;
      n.y0 = n[key].y0 = n.parentNode.y0 + n.expandedY;
      n.y1 = n[key].y1 = n.y0 + n.sankeyHeight;
      curY += n.sankeyHeight + ServiceGap;
      n.x0 = n[key].x0 = n.parentNode.x0 + n.orgx;
      n.x1 = n[key].x1 = n.x0 + n.getWidth();
    });
  }
};

export const setLinkStat = (selection, view, stat, shown) => {
  const linkOptions = {
    requests: { one: "req", more: "reqs" },
    bytes_in: "bytes in",
    bytes_out: "bytes out",
    latency_max: "ms latency (max)"
  };

  selection.selectAll(`path.${view}`).each(function(d) {
    const len = this.getTotalLength();
    const mid = this.getPointAtLength(len / 2);
    d.mid = mid;
    const p1 = this.getPointAtLength(len / 2 - len * 0.01);
    const p2 = this.getPointAtLength(len / 2 + len * 0.01);
    const away = 10;
    // vertical line. slope would be infinite
    if (Math.abs(p2.x - p1.x) < 0.05) {
      d.pt = { x: mid.x, y: mid.y + away };
    } else {
      const slope = (p2.y - p1.y) / (p2.x - p1.x);
      if (Math.abs(slope) < 0.05) {
        d.pt = { x: mid.x, y: mid.y + away };
      } else {
        const m = -1 / slope;
        const y = (away * m) / Math.sqrt(1 + m * m) + mid.y;
        const x = away / Math.sqrt(1 + m * m) + mid.x;
        d.pt = { x, y };
      }
    }
  });

  selection
    .selectAll("text.stats")
    .attr("x", d => d.pt.x)
    .attr("y", d => d.pt.y)
    .attr("dominant-baseline", "middle")
    .text(d => {
      if (stat && shown) {
        const val = d.request[stat];
        let text = linkOptions[stat];
        if (typeof text === "object") {
          text = val === 1 ? text.one : text.more;
        }
        return `${val} ${text}`;
      } else {
        return "";
      }
    });
};

export const positionPopup = ({
  containerSelector,
  popupSelector,
  constrainX = true,
  constrainY = true,
  padding = 0
}) => {
  // after the content has rendered, position it
  let selection = d3.select(containerSelector);
  if (selection.size() > 0) {
    selection = selection.node();
    const selWidth = selection.offsetWidth;
    const selHeight = selection.offsetHeight;
    // get mouse position relative to chord container
    const mouse = d3.mouse(selection);
    // get width of popover now that it has rendered
    const popover = d3.select(popupSelector);
    if (popover.size() > 0) {
      const width = popover.node().offsetWidth;
      const height = popover.node().offsetHeight;
      // desired left position
      let left = mouse[0] + 10;
      let top = mouse[1] + 10;
      // if popover is too wide to use the desired left
      if (constrainX && left + width + padding > selWidth) {
        left = selWidth - width;
      }
      if (constrainY && top + height + padding > selHeight) {
        top = selHeight - height;
      }
      popover.style("left", `${left}px`).style("top", `${top}px`);
    }
  }
};

export const linkColor = (link, links) => {
  const vals = links.map(l => l.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (max > min) {
    return fillColor((link.value - min) / (max - min));
  } else {
    return fillColor(0.5);
  }
};

const fillColor = v => {
  let color = d3.scale
    .linear()
    .domain([0, 0.5, 1])
    .interpolate(d3.interpolateHcl)
    .range([d3.rgb("#888888"), d3.rgb("#00FF00"), d3.rgb("#FF0000")]);

  return color(v);
};

// return the path between 2 circles
// path is the line segment formed from the intersection of the circles
// and a line drawn between the 2 circle's centers
export const pathBetween = (source, target) => {
  const x1 = source.x + source.r; // center of source circle
  const y1 = source.y + source.r;
  const x2 = target.x + target.r; // center of target circle
  const y2 = target.y + target.r;
  const pt1 = circleIntercept(x1, y1, source.r, x2, y2);
  const pt2 = circleIntercept(x2, y2, target.r, x1, y1);
  let path = d3path.path();
  path.moveTo(pt1.x, pt1.y);
  path.lineTo(pt2.x, pt2.y);
  return path.toString();
};

// intersection of circle at x1,y1 with radius r and line
// between x1,y1 and y2,y2
const circleIntercept = (x1, y1, r, x2, y2) => {
  const pt = {};
  const dist = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  pt.x = (r * (x2 - x1)) / dist + x1;
  pt.y = (r * (y2 - y1)) / dist + y1;
  return pt;
};
