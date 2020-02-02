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

export var QDRFolder = (function() {
  function Folder(title) {
    this.title = title;
    this.children = [];
    this.folder = true;
  }
  return Folder;
})();
export var QDRLeaf = (function() {
  function Leaf(title) {
    this.title = title;
  }
  return Leaf;
})();

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

export const adjustPositions = ({ nodes, links, width, height, BoxWidth }) => {
  nodes.nodes.forEach(n => {
    n.sourceNodes = [];
    n.targetNodes = [];
  });

  // for all the nodes, construct 2 lists: souce nodes, and target nodes
  links.links.forEach(l => {
    nodes.nodes[l.source].targetNodes.push(nodes.nodes[l.target]);
    nodes.nodes[l.target].sourceNodes.push(nodes.nodes[l.source]);
  });

  // find node(s) with fewest number of sources
  let minSources = Number.MAX_SAFE_INTEGER;
  nodes.nodes.forEach(
    n => (minSources = Math.min(minSources, n.sourceNodes.length))
  );
  const parents = nodes.nodes.filter(n => n.sourceNodes.length === minSources);

  // put parents in 1st column
  parents.forEach(n => (n.col = 0));

  let colNodes = parents;
  while (colNodes.length > 0) {
    let foundNodes = [];
    colNodes.forEach(p => {
      nodes.nodes.forEach(n => {
        if (p.targetNodes.includes(n)) {
          n.col = p.col + 1;
          foundNodes.push(n);
        }
      });
    });
    colNodes = foundNodes;
  }

  // adjust parents' cols
  nodes.nodes
    .slice()
    .reverse()
    .forEach(n => {
      n.sourceNodes.forEach(p => {
        if (p.sourceNodes.length === 0) {
          p.col = n.col - 1;
        }
      });
    });

  let cols = 0;
  nodes.nodes.forEach(n => {
    cols = Math.max(cols, n.col);
  });
  cols += 1; // cols are 0 based, so number of cols is last col number + 1

  const minGap = 10;
  let vheight = height;
  let vwidth = width;

  const colWidths = [];
  for (let col = 0; col < cols; col++) {
    colNodes = nodes.nodes.filter(n => n.col === col);
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
      colWidths[col] = Math.max(colWidths[col], n.width(BoxWidth));
      n.y = curY;
      curY += n.getHeight() + gapHeight;
    });
  }

  let nodesWidth = 0;
  colWidths.forEach(c => {
    nodesWidth += c;
  });
  let hGap = (vwidth - nodesWidth) / (cols + 1);
  if (hGap < minGap) {
    hGap = minGap;
    vwidth = Math.max(vwidth, nodesWidth + hGap * (cols + 1));
    vheight = (height * vwidth) / width;
  }
  let curX = hGap;
  for (let col = 0; col < cols; col++) {
    for (let i = 0; i < nodes.nodes.length; i++) {
      const n = nodes.nodes[i];
      if (n.col === col) {
        n.x = curX;
      }
    }
    curX += colWidths[col] + hGap;
  }
  return { width: vwidth, height: vheight };
};
