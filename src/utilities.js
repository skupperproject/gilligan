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
import * as d3path from "d3-path";
//import { sankey } from "d3-sankey";
import { sankeyCircular as sankey } from "@plotly/d3-sankey-circular";
const SankeyAttributes = [
  "value",
  "depth",
  "height",
  "layer",
  "x0",
  "x1",
  "y0",
  "y1",
  "sankeyHeight",
];
export const VIEW_DURATION = 500;
export const EXPAND_DURATION = 500;
export const ServiceWidth = 130;
export const ServiceHeight = 40;
export const ServiceGap = 5;
export const ServiceStart = 50;
export const ClusterPadding = 20;
export const SiteRadius = 100;

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

export const Icap = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;

export const pretty = (v, format = ",") => {
  var formatComma = d3.format(format);
  if (!isNaN(parseFloat(v)) && isFinite(v)) return formatComma(v);
  return v;
};

export const strDate = (date) => {
  return `${(date.getHours() + "").padStart(2, "0")}:${(
    date.getMinutes() + ""
  ).padStart(2, "0")}:${(date.getSeconds() + "").padStart(2, "0")}`;
};

export const copy = (obj) => {
  if (obj) return JSON.parse(JSON.stringify(obj));
};

export const getUrlParts = (fullUrl) => {
  fullUrl = fullUrl || window.location;
  const url = document.createElement("a");
  url.setAttribute("href", fullUrl);
  return url;
};

export const getSizes = (component) => {
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
  nodes.forEach((n) => (nodesHeight += n.getHeight()));
  const gaps = nodes.length + 1;
  let gapHeight = (height - nodesHeight) / gaps;
  gapHeight = Math.max(minGap, gapHeight);
  let curY = gapHeight;
  nodes.forEach((n) => {
    n[yAttr] = curY;
    curY += n.getHeight() + gapHeight;
  });
  return curY;
};

export const adjustPositions = ({
  nodes,
  links,
  width,
  height,
  xyKey = "",
  align = "",
  sort = false,
}) => {
  const set = (n, attr, value) =>
    xyKey !== "" ? (n[xyKey][attr] = value) : (n[attr] = value);
  const get = (n, attr) => (xyKey !== "" ? n[xyKey][attr] : n[attr]);

  const sourcesTargets = () => {
    nodes.forEach((n) => {
      if (xyKey !== "" && n[xyKey] === undefined) {
        n[xyKey] = { x: 0, y: 0 };
      }
      n.sourceNodes = [];
      n.targetNodes = [];
    });

    // for all the nodes, construct 2 lists: souce nodes, and target nodes
    links.forEach((l) => {
      if (isNaN(l.source)) {
        l.source.targetNodes.push(l.target);
        l.target.sourceNodes.push(l.source);
      } else {
        nodes[l.source].targetNodes.push(nodes[l.target]);
        nodes[l.target].sourceNodes.push(nodes[l.source]);
      }
    });
  };
  sourcesTargets();

  // handle loops
  const loops = []; // list of list of links involved in loops
  const linkBetween = (source, target) =>
    links.find((l) => l.source === source && l.target === target);

  const loopCheck = (originalSource, currentTarget, linkChain) => {
    for (let t = 0; t < currentTarget.targetNodes.length; t++) {
      const between = linkBetween(currentTarget, currentTarget.targetNodes[t]);
      const newChain = [...linkChain, between];
      if (currentTarget.targetNodes[t] === originalSource) {
        loops.push(newChain);
      } else {
        loopCheck(originalSource, currentTarget.targetNodes[t], newChain);
      }
    }
  };
  links.forEach((l) => {
    if (!loops.some((loop) => loop.includes(l))) {
      const linkChain = [l];
      loopCheck(l.source, l.target, linkChain);
    }
  });
  // eliminate the weakest links
  loops.forEach((loop) => {
    const minVal = Math.min(...loop.map((link) => link.value));
    loop.find((l) => l.value === minVal).weakest = true;
  });
  links = [...links.filter((l) => !l.weakest)];
  sourcesTargets();

  // find node(s) with fewest number of sources
  const minSources = Math.min(...nodes.map((n) => n.sourceNodes.length));
  const leftMost = nodes.filter((n) => n.sourceNodes.length === minSources);

  // put leftMost in 1st column
  leftMost.forEach((n) => (n.col = 0));

  // special case: all the nodes are in the 1st column
  // and they are not connected to each other.
  // spread the nodes into separate columns
  if (!align === "vertical") {
    if (leftMost.length === nodes.length && links.length === 0) {
      leftMost.forEach((n, i) => (n.col = i));
    }
  }

  // put called nodes in column to the right of the caller
  let colNodes = leftMost;
  while (colNodes.length > 0) {
    let foundNodes = [];
    colNodes.forEach((p) => {
      nodes.forEach((n) => {
        if (p.targetNodes.includes(n)) {
          if (align === "left" || n.col === undefined) {
            n.col = p.col + 1;
            foundNodes.push(n);
          }
        }
      });
    });
    colNodes = foundNodes;
  }
  // in case we have stranded nodes, i.e. nodes that are not descendants
  // of any of the nodes in the leftmost column
  const stranded = nodes.filter((n) => n.col === undefined);
  if (stranded.length > 0) {
    const vsize = adjustPositions({
      nodes: stranded,
      links,
      width,
      height,
      xyKey,
      align,
      sort,
    });
    width = vsize.width;
    height = vsize.height;
  }

  const colCount = Math.max(...nodes.map((n) => n.col)) + 1;

  if (align === "right") {
    // put nodes with source but no target in right column
    const rightMost = nodes.filter(
      (n) => n.sourceNodes.length > 0 && n.targetNodes.length === 0
    );
    rightMost.forEach((n) => (n.col = colCount - 1));
  }

  const minGap = 10;
  let vheight = height;
  let vwidth = width;

  const sum = (a, sourceTarget) =>
    a[sourceTarget]
      .map((n) => get(n, "y") - (a.col - n.col))
      .reduce((total, y) => total + y, 0);
  const avg = (a, sourceTarget) =>
    a[sourceTarget].length > 0
      ? sum(a, sourceTarget) / a[sourceTarget].length
      : height / 2;

  const sortByHeights = (nodes, sourceTarget) => {
    nodes.sort((a, b) => {
      let aavg = avg(a, sourceTarget);
      let bavg = avg(b, sourceTarget);
      if (aavg < bavg) return -1;
      if (aavg > bavg) return 1;
      return 0;
    });
  };

  const colWidths = [];
  for (let col = 0; col < colCount; col++) {
    // only nodes in this column
    colNodes = nodes.filter((n) => n.col === col);
    let nodesHeight = 0;
    colNodes.forEach((n) => (nodesHeight += n.getHeight()));
    const gaps = colNodes.length + 1;
    let gapHeight = (height - nodesHeight) / gaps;
    if (gapHeight < minGap) {
      gapHeight = minGap;
      vheight = Math.max(vheight, nodesHeight + gapHeight * gaps);
      // keep aspect ratio the same
      vwidth = (width * vheight) / height;
    }
    // sort by average caller y
    sortByHeights(colNodes, "sourceNodes");

    let curY = gapHeight;
    colWidths[col] = 0;
    colNodes.forEach((n) => {
      colWidths[col] = Math.max(colWidths[col], n.getWidth());
      set(n, "y", curY);
      curY += n.getHeight() + gapHeight;
    });
  }

  // go backwards and set the parent node heights to be the
  // average of the child node heights (if possible)
  if (sort) {
    for (let col = colCount - 2; col >= 0; col--) {
      let bottomY = minGap;
      colNodes = nodes.filter((n) => n.col === col);
      sortByHeights(colNodes, "targetNodes");
      colNodes.forEach((n) => {
        const avgTargets = Math.max(avg(n, "targetNodes"), bottomY + minGap);
        set(n, "y", avgTargets);
        bottomY = avgTargets + n.getHeight() + minGap;
      });
      if (bottomY > vheight) {
        vheight = bottomY;
        vwidth = (width * vheight) / height;
      }
    }
  }

  let nodesWidth = 0;
  colWidths.forEach((c) => {
    nodesWidth += c;
  });
  let hGap = (vwidth - nodesWidth) / (colCount + 1);
  if (hGap < minGap * 4) {
    hGap = minGap * 4;
    vwidth = Math.max(vwidth, nodesWidth + hGap * (colCount + 1));
    vheight = (height * vwidth) / width;
  }
  let curX = hGap;
  for (let col = 0; col < colCount; col++) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.col === col) {
        set(n, "x", curX);
      }
    }
    curX += colWidths[col] + hGap;
  }

  return { width: vwidth, height: vheight };
};

// get list of all subnodes
// mark duplicate subnodes
export const getSubNodes = (nodes) => {
  const subNodes = [];
  nodes.nodes.forEach((node) => {
    node.subNodes.forEach((subNode, i) => {
      const original = subNodes.find((s) => s.address === subNode.address);
      subNode.extra = original ? true : false;
      subNode.original = original;
      subNodes.push(subNode);
    });
  });
  return subNodes;
};

export const saveSankey = (nodes, key) => {
  nodes.forEach((n) => {
    n[key] = {};
    SankeyAttributes.forEach((a) => {
      n[key][a] = n[a];
    });
  });
};
export const restoreSankey = (nodes, key) => {
  nodes.forEach((n) => {
    if (n[key]) {
      SankeyAttributes.forEach((a) => {
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

export const removeSiteColor = (site_id) => {
  if (siteColors[site_id]) {
    delete siteColors[site_id];
  }
};

export const siteColor = (name, site_id) => {
  if (site_id === "unknownID") return "#FFFFFF";
  if (!(site_id in siteColors)) {
    siteColors[site_id] = {
      name: name,
      color: colorGen(Object.keys(siteColors).length * 2),
    };
  }
  return siteColors[site_id].color;
};

export const removeServiceColor = (name) => {
  if (serviceColors[name]) {
    delete serviceColors[name];
  }
};
export const serviceColor = (name) => {
  if (!(name in serviceColors)) {
    serviceColors[name] = colorGen(19 - Object.keys(serviceColors).length * 2);
  }
  return serviceColors[name];
};

//hello-world-frontend-759cdcf7f9-phcjq
export const shortName = (name) => {
  const parts = name.split("-");
  if (parts.length > 2) {
    const len = parts.length;
    if (parts[len - 1].length === 5 && parts[len - 2].length === 10) {
      parts.splice(len - 2, 2);
      return parts.join("-");
    }
  }
  return name;
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

// calculate a point "away" distance from given pt, that is perpendicular
// to the line going from pt with given slope
const ptAway = (pt, away, slope) => {
  const m = -1 / slope;
  const y = (away * m) / Math.sqrt(1 + m * m) + pt.y;
  const x = away / Math.sqrt(1 + m * m) + pt.x;
  return { x, y };
};

const distance = (pt1, pt2) => {
  let xdiff = pt2.x - pt1.x;
  let ydiff = pt2.y - pt1.y;
  return Math.sqrt(xdiff * xdiff + ydiff * ydiff);
};

export const genPath = ({
  link,
  key,
  mask,
  sankey,
  width,
  reverse,
  offsetY,
  selection,
  site,
}) => {
  if (!width) width = link.width;
  if (!offsetY) offsetY = 0;
  if (mask) return genMask(link, key, mask, width, selection);
  if (link.circular)
    return circular(link, key, sankey, width, reverse, offsetY, site);
  return bezierPath(link, key, sankey, width, reverse, offsetY);
};

const get = (obj, attr, key) => (key ? obj[key][attr] : obj[attr]);

// construct an arrow on the surface of the target circle
// oriented along the path connecting the source and target circles
const genMask = (link, key, mask, width, selection, site) => {
  let away = 5; // 1/2 the arrows base width
  let r = link.target.getWidth() / 2; // target circle radius
  let tc = {
    // center of target circle
    x: link.target.x + r,
    y: link.target.y + r,
  };
  // create the path on which we will be placing the arrow
  d3.select(selection).attr("d", (d) => genPath({ link, site }));
  const len = selection.getTotalLength(); // length of the path
  let intersect = len - r; // 1st guess at where the point of the arrow should be on the path
  let p1 = selection.getPointAtLength(intersect); // x,y position at that distance
  let dist = distance(p1, tc); // distance between p1 and the target's center
  // when we first start, the locations may be extreme
  // after the circles are in their final position, this while loop is skipped
  let iterations = 0;
  while (Math.abs(dist - r) > 1 && iterations < 100) {
    intersect += dist > r ? 1 : -1;
    p1 = selection.getPointAtLength(intersect);
    dist = distance(p1, tc);
    ++iterations;
  }
  // p1 is now on the circle, p1 is the point of the arrow
  const p2 = selection.getPointAtLength(intersect - 10); // the base of the arrow
  if (p2.x === p1.x) {
    ++p2.x;
  }
  const slope = (p2.y - p1.y) / (p2.x - p1.x);
  const pt1 = ptAway(p2, -away, slope); // the corners
  const pt2 = ptAway(p2, away, slope);

  return `M ${p1.x} ${p1.y} L ${pt2.x} ${pt2.y} L ${pt1.x} ${pt1.y} z`;
};

// create a bezier path between link.source and link.target
const bezierPath = (link, key, sankey, width, reverse, offsetY) => {
  let x0 = get(link.source, "x1", key); // right side of source
  if (link.source.expanded && link.source.nodeType === "cluster") {
    x0 -= link.source.getWidth() / 2;
  }
  const y0 = link.source.expanded
    ? link.y0 - offsetY
    : get(link.source, "y0", key) + link.source.getHeight() / 2 - offsetY;
  let x1 = get(link.target, "x0", key); // left side of target
  if (link.source.expanded && link.target.nodeType === "cluster") {
    x1 += link.target.getWidth() / 2;
  }
  const y1 = link.target.expanded
    ? link.y1 - offsetY
    : get(link.target, "y0", key) + link.target.getHeight() / 2 - offsetY;
  const mid = (x0 + x1) / 2;
  const path = d3path.path();
  if (sankey) {
    const halfWidth = width / 2;
    path.moveTo(x0, y0 - halfWidth);
    path.bezierCurveTo(
      mid,
      y0 - halfWidth,
      mid,
      y1 - halfWidth,
      x1,
      y1 - halfWidth
    );
    path.lineTo(x1, y1 + halfWidth);
    path.bezierCurveTo(
      mid,
      y1 + halfWidth,
      mid,
      y0 + halfWidth,
      x0,
      y0 + halfWidth
    );
    path.closePath();
  } else {
    if (reverse) {
      path.moveTo(x1, y1);
      path.bezierCurveTo(mid, y1, mid, y0, x0, y0);
    } else {
      path.moveTo(x0, y0);
      path.bezierCurveTo(mid, y0, mid, y1, x1, y1);
    }
  }
  return path.toString();
};

// create a complex path exiting source on the right
// and curving around to enter the target on the left
const circular = (link, key, sankey, width, reverse, offsetY, site) => {
  const minR = 10;
  const maxR = 80;
  const gapSource = site ? link.source.r : 8;
  const gapTarget = site ? link.target.r : 8;
  const gapBottom = Math.max(
    link.source.getHeight() / 2,
    link.target.getHeight() / 2
  );
  const r = width ? Math.max(Math.min(maxR, width), minR) : minR;
  let sourceX = get(link.source, "x1", key); // right side of source
  if (link.source.expanded && link.source.nodeType === "cluster") {
    sourceX -= link.source.getWidth() / 2;
  }
  let targetX = get(link.target, "x0", key); // left side of target
  if (link.target.expanded && link.target.nodeType === "cluster") {
    targetX += link.target.getWidth() / 2;
  }
  const sourceY = link.source.expanded
    ? link.y0
    : get(link.source, "y0", key) + link.source.getHeight() / 2;
  const targetY = link.target.expanded
    ? link.y1
    : get(link.target, "y0", key) + link.target.getHeight() / 2;
  const bottomY = Math.max(
    sourceY + r + gapBottom + r,
    targetY + r + gapBottom + r
  );
  const offset = sankey ? width / 2 : 0;
  let sy = sourceY - offset - offsetY;
  let ty = targetY - offset - offsetY;
  let by = bottomY + offset - offsetY;
  let sr = r + offset;

  let path = d3path.path();

  if (!reverse) {
    path.moveTo(sourceX, sy);
    path.lineTo(sourceX + gapSource, sy);
    path.arcTo(
      sourceX + gapSource + sr,
      sy,
      sourceX + gapSource + sr,
      sy + sr,
      sr
    );
    path.lineTo(sourceX + gapSource + sr, by - sr);
    path.arcTo(sourceX + gapSource + sr, by, sourceX + gapSource, by, sr);
    path.lineTo(targetX - gapTarget, by);
    path.arcTo(
      targetX - gapTarget - sr,
      by,
      targetX - gapTarget - sr,
      by - sr,
      sr
    );
    path.lineTo(targetX - gapTarget - sr, ty + sr);
    path.arcTo(targetX - gapTarget - sr, ty, targetX - gapTarget, ty, sr);
    path.lineTo(targetX, ty);
  }
  if (sankey || reverse) {
    if (!reverse) {
      sy = sourceY + offset;
      ty = targetY + offset;
      by = bottomY - offset;
      sr = Math.max(r - offset, minR);
      path.lineTo(targetX, ty);
    } else {
      path.moveTo(targetX, ty);
    }
    path.lineTo(targetX - gapTarget, ty);
    path.arcTo(
      targetX - gapTarget - sr,
      ty,
      targetX - gapTarget - sr,
      ty + sr,
      sr
    );
    path.lineTo(targetX - gapTarget - sr, by - sr);
    path.arcTo(targetX - gapTarget - sr, by, targetX - gapTarget, by, sr);
    path.lineTo(sourceX + gapSource, by);
    path.arcTo(
      sourceX + gapSource + sr,
      by,
      sourceX + gapSource + sr,
      by - sr,
      sr
    );
    path.lineTo(sourceX + gapSource + sr, sy + sr);
    path.arcTo(sourceX + gapSource + sr, sy, sourceX + gapSource, sy, sr);
    path.lineTo(sourceX, sy);
    if (!reverse) path.closePath();
  }
  return path.toString();
};

// set or clear the stats text for each path.view in the selection
export const setLinkStat = (selection, view, stat, shown) => {
  const linkOptions = {
    requests: { one: "req", more: "reqs" },
    bytes_in: "in",
    bytes_out: "out",
    latency_max: "ms latency (max)",
  };

  // set or clear the stat text
  selection.selectAll("textPath.stats").text((d) => {
    if (stat && shown) {
      const val = d.request[stat];
      let text = linkOptions[stat];
      if (typeof text === "object") {
        text = val === 1 ? text.one : text.more;
      }
      return `${formatBytes(val)} ${text}`;
    } else {
      return "";
    }
  });
};

export const statId = (link) => {
  const parts = ["statPath"];
  if (link.source.parentNode) {
    parts.push(link.source.parentNode.site_id);
  }
  parts.push(link.source.name);
  if (link.target.parentNode) {
    parts.push(link.target.parentNode.site_id);
  }
  parts.push(link.target.name);
  return parts.join("-");
};

export const positionPopup = ({
  containerSelector,
  popupSelector,
  constrainX = true,
  constrainY = true,
  padding = 0,
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
  const vals = links.map((l) => l.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (max > min) {
    return fillColor((link.value - min) / (max - min));
  } else {
    return fillColor(0.5);
  }
};

const fillColor = (v) => {
  if (v < 0.333) return "#888888";
  if (v < 0.666) return "#00FF00";
  return "#0000FF";
};

// return the path between 2 circles
// the path is the shortest line segment joining the circles
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
// This is used to draw the router connection lines between sites
const circleIntercept = (x1, y1, r, x2, y2) => {
  const pt = {};
  const dist = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  pt.x = (r * (x2 - x1)) / dist + x1;
  pt.y = (r * (y2 - y1)) / dist + y1;
  return pt;
};

export const initSankey = ({
  nodes,
  links,
  width,
  height,
  nodeWidth,
  nodePadding,
  left = 0,
  top = 0,
  right = 0,
  bottom = 0,
}) => {
  if (links.length > 0) {
    const linkNodes = nodes.filter((n) =>
      links.some((l) => l.source === n || l.target === n)
    );
    //const nonCircular = links.filter((l) => l.source.name !== l.target.name);
    try {
      sankey()
        .nodeWidth(nodeWidth)
        .nodePadding(nodePadding)
        .iterations(3)
        .extent([
          [left, top],
          [width - right - left, height - bottom - top],
        ])({ nodes: linkNodes, links });
    } catch (e) {
      console.log("error in initSankey");
      console.log(e);
    }
  }
};

export const circularize = (links) => {
  let circularLinkID = 0;
  links.forEach((l) => {
    //if (l.source.name === "one" && l.target.name === "one") debugger;
    const sx =
      l.source.nodeType === "cluster"
        ? l.source.x1 - l.source.getWidth() / 2
        : l.source.x1;
    const tx =
      l.source.nodeType === "cluster"
        ? l.target.x0 + l.target.getWidth() / 2
        : l.target.x0;
    if (sx >= tx || l.source === l.target) {
      l.circular = true;
      l.circularLinkID = circularLinkID++;
      const circularLinkType = l.source.y0 > l.target.y0 ? "top" : "bottom";

      l.circularLinkType = circularLinkType;
      l.source.partOfCycle = true;
      l.target.partOfCycle = true;
      l.source.circularLinkType = circularLinkType;
      l.target.circularLinkType = circularLinkType;
    } else {
      if (l.circular) {
        l.circular = false;
        delete l.circularLinkID;
        delete l.circularLinkType;
      }
    }
  });
};

export const updateSankey = ({ nodes, links }) => {
  nodes.forEach((n) => {
    n.x0 = n.x;
    n.y0 = n.y;
    n.x1 = n.x0 + n.getWidth();
    n.y1 = n.y0 + n.sankeyHeight;
  });
  circularize(links);
  // use the sankeyHeight when updating sankey path
  const linkNodes = nodes.filter((n) =>
    links.some((l) => l.source === n || l.target === n)
  );
  try {
    sankey().update({ nodes: linkNodes, links });
  } catch (e) {
    console.log(`error in sankey.update`);
    console.log(e);
  }
};

// call callback when transition ends for all items in selection
export const endall = (transition, callback) => {
  if (typeof callback !== "function")
    throw new Error("Wrong callback in endall");
  if (transition.size() === 0) {
    callback();
  }
  var n = 0;
  transition
    .each(function() {
      ++n;
    })
    .each("end", function() {
      if (!--n) callback.apply(this, arguments);
    });
};

export const getSaved = (key, defaultValue) => {
  let savedStr = localStorage.getItem(key);
  if (savedStr === "undefined") savedStr = undefined;
  return savedStr ? JSON.parse(savedStr) : defaultValue;
};

export const setSaved = (key, value) => {
  if (value !== undefined) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export function reconcileArrays(existing, newArray) {
  const attrs = [
    "value",
    "width",
    "request",
    "sankeyHeight",
    "r",
    "sankeyR",
    "normalR",
  ];
  // remove from existing, any elements that are not in newArray
  for (let i = existing.length - 1; i >= 0; --i) {
    if (!newArray.some((n) => n.uuid === existing[i].uuid)) {
      existing.splice(i, 1);
    }
  }
  // add to existing, any elements that are only in newArray
  newArray.forEach((n) => {
    const old = existing.find((e) => e.uuid === n.uuid);
    if (!old) {
      existing.push(n);
    } else {
      // update existing attributes
      attrs.forEach((attr) => {
        if (n[attr] !== undefined) {
          old[attr] = n[attr];
        }
      });
    }
  });
}

// Links are 'special' in that each link contians a reference
// to the two nodes that it is linking.
// So we need to fix the new links' source and target
export function reconcileLinks(existingLinks, newLinks) {
  // find links that are mirror images
  newLinks.forEach((n) => {
    existingLinks.forEach((e) => {
      if (
        e.source.uuid === n.target.uuid &&
        e.target.uuid === n.source.uuid &&
        e.left === n.right &&
        e.right === n.left
      ) {
        e.left = n.left;
        e.right = n.right;
        e.uid = n.uid;
        e.uuid = n.uuid;
        const tmp = e.source;
        e.source = e.target;
        e.target = tmp;
      }
    });
  });
  reconcileArrays(existingLinks, newLinks);
}

// https://stackoverflow.com/questions/15900485
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
