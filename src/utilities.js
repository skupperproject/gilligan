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
const SankeyAttributes = [
  "value",
  "depth",
  "height",
  "layer",
  "x0",
  "x1",
  "y0",
  "y1"
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
    if (l.source.name) {
      l.source.targetNodes.push(l.target);
      l.target.sourceNodes.push(l.source);
    } else {
      nodes[l.source].targetNodes.push(nodes[l.target]);
      nodes[l.target].sourceNodes.push(nodes[l.source]);
    }
  });

  // find node(s) with fewest number of sources
  let minSources = Number.MAX_SAFE_INTEGER;
  let minTargets = Number.MAX_SAFE_INTEGER;
  nodes.forEach(n => {
    minSources = Math.min(minSources, n.sourceNodes.length);
    minTargets = Math.min(minTargets, n.targetNodes.length);
  });
  const leftMost = nodes.filter(n => n.sourceNodes.length === minSources);
  const rightMost = nodes.filter(n => n.targetNodes.length === minTargets);

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

  // put rightMost nodes in their own column
  if (nodes.some(n => n.col === maxcol && n.targetNodes.length > 0)) {
    // we have nodes that have a target and are in the rightmost column.
    // put the rightmost nodes in a new column
    nodes.forEach(n => {
      if (rightMost.includes(n)) {
        n.col = maxcol + 1;
      }
    });
  }

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
  name = name.replace(/-*/gm, "");
  if (!(name in siteColors)) {
    siteColors[name] = colorGen(Object.keys(siteColors).length * 2);
  }
  return siteColors[name];
};

export const serviceColor = name => {
  name = name.replace(/-*/gm, "");
  if (!(name in serviceColors)) {
    serviceColors[name] = colorGen(19 - Object.keys(serviceColors).length * 2);
  }
  return serviceColors[name];
};

/* see https://github.com/PimpTrizkit/PJs/wiki/12.-Shade,-Blend-and-Convert-a-Web-Color-(pSBC.js) */
export const RGB_Linear_Shade = (p, c) => {
  var i = parseInt,
    r = Math.round,
    [a, b, c, d] = c.split(","),
    P = p < 0,
    t = P ? 0 : 255 * p,
    P = P ? 1 + p : 1 - p;
  return (
    "rgb" +
    (d ? "a(" : "(") +
    r(i(a[3] === "a" ? a.slice(5) : a.slice(4)) * P + t) +
    "," +
    r(i(b) * P + t) +
    "," +
    r(i(c) * P + t) +
    (d ? "," + d : ")")
  );
};
