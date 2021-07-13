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
import { sankeyCircular as sankey } from "@plotly/d3-sankey-circular";
import { viewsMap as VIEWS } from "./pages/topology/views/views";
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
const colorGen = d3.scale.category20();
for (let i = 0; i < 20; i++) {
  colorGen(i);
}
const fillColor = (v) => {
  if (v < 0.333) return "#888888";
  if (v < 0.666) return "#00FF00";
  return "#0000FF";
};

export class QDRLogger {
  constructor(log, source) {
    this.log = function (msg) {
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
const zeroIfyLinks = (links) => {
  links.forEach((l) => {
    if (l.value === 0) {
      l.value = 0.01;
      l.wasZero = true;
    }
  });
};
const unZeroIfyLinks = (links) => {
  links.forEach((l) => {
    if (l.wasZero) {
      delete l.wasZero;
      l.value = 0;
      // set the height to 1
      //l.source.y1 = l.source.y0 + 1;
      //l.target.y1 = l.target.y0 + 1;
      //l.y0 = l.source.y0 + l.source.getHeight() / 2;
      //l.y1 = l.target.y0 + l.target.getHeight() / 2;
      l.width = 1;
    }
  });
};
/* see https://github.com/PimpTrizkit/PJs/wiki/12.-Shade,-Blend-and-Convert-a-Web-Color-(pSBC.js) */
const RGB_Linear_Shade = (p, c) => {
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

// https://stackoverflow.com/questions/3177836/how-to-format-time-since-xxx-e-g-4-minutes-ago-similar-to-stack-exchange-site
// Epochs
const epochs = [
  ["year", 31536000],
  ["month", 2592000],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];
const componentToHex = (c) => c.toString(16).padStart(2, "0");

const utils = {
  VIEW_DURATION: 500,
  ServiceWidth: 180,
  ServiceHeight: 40,
  ServiceGap: 5,
  ServiceStart: 50,
  ClusterPadding: 20,
  SiteRadius: 100,
  siteColors: {},
  serviceColors: {},

  safePlural: (count, str) => {
    if (count === 1) return str;
    var es = ["x", "ch", "ss", "sh"];
    for (var i = 0; i < es.length; ++i) {
      if (str.endsWith(es[i])) return str + "es";
    }
    if (str.endsWith("y")) return str.substr(0, str.length - 2) + "ies";
    if (str.endsWith("s")) return str;
    return str + "s";
  },
  Icap: (s) => s && `${s[0].toUpperCase()}${s.slice(1)}`,
  pretty: (v, format = ",") => {
    var formatComma = d3.format(format);
    if (!isNaN(parseFloat(v)) && isFinite(v)) return formatComma(v);
    return v;
  },
  strDate: (date) => {
    return `${(date.getHours() + "").padStart(2, "0")}:${(
      date.getMinutes() + ""
    ).padStart(2, "0")}:${(date.getSeconds() + "").padStart(2, "0")}`;
  },

  copy: (obj) => {
    if (obj) return JSON.parse(JSON.stringify(obj));
  },

  getUrlParts: (fullUrl) => {
    fullUrl = fullUrl || window.location;
    const url = document.createElement("a");
    url.setAttribute("href", fullUrl);
    return url;
  },

  getSizes: (component, defaultValue = [300, 300]) => {
    const gap = 5;
    let legendWidth = 4;
    let width = defaultValue[0];
    let height = defaultValue[1];
    if (component && component.offsetWidth) {
      let topoWidth = component.offsetWidth;
      if (topoWidth < 768) legendWidth = 0;
      width = topoWidth - gap - legendWidth;
      height = component.offsetHeight;
    }
    return [width, height];
  },

  // vertically space nodes over the given height
  adjustY: ({ nodes, height, yAttr }) => {
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
  },

  adjustPositions: ({
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
        const between = linkBetween(
          currentTarget,
          currentTarget.targetNodes[t]
        );
        // avoid sub loops that don't involve the originalSource
        if (!linkChain.includes(between)) {
          // add the link to the chain
          const newChain = [...linkChain, between];
          // if we are back at the originalSource node
          if (currentTarget.targetNodes[t] === originalSource) {
            // we have a loop
            loops.push(newChain);
          } else {
            // see if the current link loops back to the originalSource node
            loopCheck(originalSource, currentTarget.targetNodes[t], newChain);
          }
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
    if (!(align === "vertical")) {
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
          if (p.targetNodes.includes(n) && n !== p) {
            if (
              (align === "left" && n.moved === undefined) ||
              n.col === undefined
            ) {
              n.col = p.col + 1;
              n.moved = true; // prevent infinite loop when nodes call each other
              foundNodes.push(n);
            }
          }
        });
      });
      colNodes = foundNodes;
    }
    nodes.forEach((n) => {
      if (n.moved) delete n.moved;
    });
    // in case we have stranded nodes, i.e. nodes that are not descendants
    // of any of the nodes in the leftmost column
    const stranded = nodes.filter((n) => n.col === undefined);
    if (stranded.length > 0) {
      const vsize = utils.adjustPositions({
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
  },

  // get list of all subnodes
  // mark duplicate subnodes
  getSubNodes: (nodes) => {
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
  },

  saveSankey: (nodes, key) => {
    nodes.forEach((n) => {
      n[key] = {};
      SankeyAttributes.forEach((a) => {
        n[key][a] = n[a];
      });
    });
  },

  restoreSankey: (nodes, key) => {
    nodes.forEach((n) => {
      if (n[key]) {
        SankeyAttributes.forEach((a) => {
          n[a] = n[key][a];
        });
      } else {
        console.log(`did not find ${key} in node ${n.name}`);
      }
    });
  },

  removeSiteColor: (site_id) => {
    if (utils.siteColors[site_id]) {
      delete utils.siteColors[site_id];
    }
  },

  // there are 20 colors available from colorGen().
  // site colors are the even colors. service colors are the odd colors
  siteColor: (name, site_id, colorsObj) => {
    if (site_id === "unknownID") return "#FFFFFF";
    const siteColors = colorsObj ? colorsObj : utils.siteColors;
    if (!(site_id in siteColors)) {
      siteColors[site_id] = {
        name: name,
        color: colorGen(Object.keys(siteColors).length * 2),
      };
    }
    return siteColors[site_id].color;
  },

  removeServiceColor: (name) => {
    if (utils.serviceColors[name]) {
      delete utils.serviceColors[name];
    }
  },
  serviceColor: (name, colorsObj) => {
    const serviceColors = colorsObj ? colorsObj : utils.serviceColors;
    if (!(name in serviceColors)) {
      let found = false;
      let i = 19;
      while (!found) {
        let color = colorGen(i);
        if (
          !Object.keys(serviceColors).some(
            (service) => serviceColors[service] === color
          )
        ) {
          found = true;
          serviceColors[name] = color;
        } else {
          i -= 2;
          if (i < 0) {
            if (i === -2) {
              // there are more than 20 services. just reuse some colors
              found = true;
              serviceColors[name] = colorGen(Object.keys(serviceColors).length);
            }
            // there are more than 10 services.
            // start to use site colors
            i = 20;
          }
        }
      }
    }
    return serviceColors[name];
  },

  //hello-world-frontend-759cdcf7f9-phcjq
  shortName: (name) => {
    const parts = name.split("-");
    if (parts.length > 2) {
      const len = parts.length;
      if (
        parts[len - 1].length === 5 &&
        (parts[len - 2].length === 10 || parts[len - 2].length === 9)
      ) {
        parts.splice(len - 2, 2);
        return parts.join("-");
      }
    }
    return name;
  },

  lighten: (percent, color) => {
    const c = d3.rgb(color);
    const rgb = `rbg(${c.r},${c.g},${c.b})`;
    return RGB_Linear_Shade(percent, rgb);
  },

  // set or clear the stats text for each path.view in the selection
  setLinkStat: (selection, show, stat) => {
    // set or clear the stat text
    selection.selectAll("textPath.stats").text((d) => {
      if (show && stat && d.request && d.request[stat] !== undefined) {
        const val = d.request[stat];
        return utils.formatStat(stat, val);
      } else {
        return "";
      }
    });
  },

  formatStat: (stat, val) => {
    const statFormats = {
      requests: { one: " req", moreK: " reqs", lessK: " reqs", dir: "" },
      bytes_in: { one: " byte", moreK: "B", lessK: " bytes", dir: "in" },
      bytes_out: { one: " byte", moreK: "B", lessK: " bytes", dir: "" },
      latency_max: { one: " ms", moreK: " ms", lessK: " ms", dir: "" },
    };
    if (statFormats[stat]) {
      const format = statFormats[stat];
      const formatted = utils.formatBytes(val);
      const suffix = val < 1024 ? format.lessK : format.moreK;
      return `${formatted}${val === 1 ? format.one : suffix} ${format.dir}`;
    } else {
      return "";
    }
  },

  statId: (link, id) => {
    if (id.startsWith("#")) {
      id = id.substr(1);
    }
    const parts = [id, "statPath"];
    if (link.source.parentNode) {
      parts.push(link.source.parentNode.site_id);
    }
    parts.push(link.source.name);
    if (link.target.parentNode) {
      parts.push(link.target.parentNode.site_id);
    }
    parts.push(link.target.name);
    return parts.join("-");
  },

  positionPopup: ({
    containerSelector,
    popupSelector,
    constrainX = true,
    constrainY = true,
    padding = 0,
    eventX = 0,
    eventY = 0,
  }) => {
    // after the content has rendered, position it
    let container = d3.select(containerSelector);
    if (container.size() > 0) {
      container = container.node();
      const selWidth = container.offsetWidth;
      const selHeight = container.offsetHeight;
      const selTop = container.offsetTop;
      const selLeft = container.offsetLeft;
      // get mouse position relative to container
      let mouse;
      try {
        mouse = d3.mouse(container);
      } catch (error) {
        const containerRect = container.getBoundingClientRect();
        mouse = [eventX - containerRect.left, eventY - containerRect.top];
      }
      // get width of popover now that it has rendered
      const popover = d3.select(popupSelector);
      if (popover.size() > 0) {
        const width = popover.node().offsetWidth;
        const height = popover.node().offsetHeight;
        // desired left position
        let left = mouse[0] + 10;
        let top = selTop + mouse[1] + 10;
        // if popover is too wide to use the desired left
        if (constrainX && left + width + padding > selWidth) {
          left = selWidth - width - padding;
        }
        if (constrainX && left < selLeft) {
          left = selLeft;
        }
        if (constrainY && top + height + padding > selHeight) {
          top = selHeight - height - padding;
        }
        popover.style("left", `${left}px`).style("top", `${top}px`);
      }
    }
  },

  linkColor: (link, links) => {
    const vals = links.map((l) => l.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (max > min) {
      return fillColor((link.value - min) / (max - min));
    } else {
      return fillColor(0.5);
    }
  },

  initSankey: ({
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
      zeroIfyLinks(links);
      try {
        sankey()
          .nodeWidth(nodeWidth)
          .nodePadding(nodePadding)
          .iterations(10)
          .extent([
            [left, top],
            [width - right - left, height - bottom - top],
          ])({ nodes: linkNodes, links });
      } catch (e) {
        console.log("error in initSankey");
        console.log(e);
      }
      unZeroIfyLinks(links);
    }
  },

  circularize: (links) => {
    let circularLinkID = 0;
    links.forEach((l) => {
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
  },

  updateSankey: ({ nodes, links }) => {
    nodes.forEach((n) => {
      n.x0 = n.x;
      n.y0 = n.y;
      n.x1 = n.x0 + n.getWidth();
      n.y1 = n.y0 + n.sankeyHeight;
    });
    utils.circularize(links);
    // use the sankeyHeight when updating sankey path
    const linkNodes = nodes.filter((n) =>
      links.some((l) => l.source === n || l.target === n)
    );
    zeroIfyLinks(links);
    try {
      sankey().update({ nodes: linkNodes, links });
    } catch (e) {
      console.log(`error in sankey.update`);
      console.log(e);
    }
    unZeroIfyLinks(links);
  },

  // call callback when transition ends for all items in selection
  endall: (transition, callback) => {
    if (typeof callback !== "function")
      throw new Error("Wrong callback in endall");
    if (transition.size() === 0) {
      callback();
    }
    var n = 0;
    transition
      .each(function () {
        ++n;
      })
      .each("end", function () {
        if (!--n) callback.apply(this, arguments);
      });
  },

  getSaved: (key, defaultValue) => {
    let savedStr = localStorage.getItem(key);
    if (savedStr === "undefined") savedStr = undefined;
    return savedStr
      ? JSON.parse(savedStr)
      : defaultValue !== undefined
      ? JSON.parse(JSON.stringify(defaultValue))
      : defaultValue;
  },

  setSaved: (key, value) => {
    if (value !== undefined) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  // Loop through the sources/targets in the links array and
  // find a node that matches the given uuid.
  findNodeInLinks: (links, uuid) => {
    let node;
    links.some((l) => {
      if (l.source.uuid === uuid) node = l.source;
      else if (l.target.uuid === uuid) node = l.target;
      // exit loop if found
      return node;
    });
    return node;
  },

  reconcileArrays: (existing, newArray) => {
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
  },

  // Links are 'special' in that each link contians a reference
  // to the two nodes that it is linking.
  // So we need to fix the new links' source and target
  reconcileLinks: (existingLinks, newLinks) => {
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
    // fix targets
    newLinks.forEach((n) => {
      // if new link.
      // New links have a source or target that refers to a new node.
      // We need to have the links refer to nodes in the existing nodes.
      if (!existingLinks.some((e) => e.uuid === n.uuid)) {
        const source = utils.findNodeInLinks(existingLinks, n.source.uuid);
        const target = utils.findNodeInLinks(existingLinks, n.target.uuid);
        if (source) {
          n.source = source;
        }
        if (target) {
          n.target = target;
        }
      }
    });
    utils.reconcileArrays(existingLinks, newLinks);
  },

  // based on https://stackoverflow.com/questions/15900485
  formatBytes: (bytes, decimals = 2) => {
    if (bytes === 0 || bytes < 3e-10) return "0";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["", "K", "M", "G", "T", "P", "E", "Z", "Y"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  },

  // Get duration
  getDuration: (timeAgoInSeconds) => {
    for (let [name, seconds] of epochs) {
      const interval = Math.floor(timeAgoInSeconds / seconds);

      if (interval >= 1) {
        return {
          interval: interval,
          epoch: name,
        };
      }
    }
    return { interval: 0, epoch: "second" };
  },

  convertDate: (strMSec, tense) => {
    let date;
    if (typeof strMSec === "string") {
      date = new Date(parseInt(strMSec, 10));
    } else {
      date = strMSec;
    }
    if (tense === "past") {
      return utils.timeAgo(date);
    } else if (tense === "future") {
      return utils.timeTill(date);
    } else {
      return date.toDateString();
    }
  },
  timeTill: (date) => {
    const timeTillInSeconds = Math.floor((date - new Date()) / 1000);
    if (timeTillInSeconds < 0) {
      return null; // indicate that the supplied date is past
    }
    const { interval, epoch } = utils.getDuration(timeTillInSeconds);
    const suffix = interval === 1 ? "" : "s";

    return `${interval} ${epoch}${suffix} from now`;
  },
  // Calculate
  timeAgo: (date) => {
    const timeAgoInSeconds = Math.floor((new Date() - date) / 1000);
    const { interval, epoch } = utils.getDuration(timeAgoInSeconds);
    const suffix = interval === 1 ? "" : "s";
    const prefix = epoch === "year" ? "Over " : "";

    return `${prefix}${interval} ${epoch}${suffix} ago`;
  },

  humanize: (str) => {
    str = str.replace("_", " ");
    return utils.Icap(str);
  },

  idle: (elapsed, callback) => {
    let timer;
    const inactive = () => {
      callback();
      active();
    };
    const active = () => {
      clearTimeout(timer);
      timer = setTimeout(inactive, elapsed);
    };
    const unload = () => {
      clearTimeout(timer);
      document.removeEventListener("mousemove", active);
    };
    document.addEventListener("mousemove", active, true);
    active();
    return unload;
  },

  parseLocation: () => {
    const parsedUrl = new URL(window.location.href);
    const hash = parsedUrl.hash;
    const q = hash.split("?");
    let view = q[0].substr(1);
    if (view[0] === "/") view = view.substr(1);
    let search = q[1];
    parsedUrl.view = view;
    parsedUrl.search = search;
    if (search) {
      parsedUrl.connectPath = `${view}?${search}`;
    } else {
      parsedUrl.connectPath = view;
    }
    return parsedUrl;
  },

  hashToOptions: (hash) => {
    const hashParams = new URLSearchParams(hash);
    const options = {};
    for (let param of hashParams) {
      const key = param[0];
      const value =
        param[1] === "true" || param[1] === "false"
          ? param[1] === "true"
          : param[1];
      options[key] = value;
    }
    return options;
  },

  overrideOptions: (view, options) => {
    const viewClass = VIEWS[view];
    if (viewClass) viewClass.saveOverrideOptions(options);
  },

  getOptions: (key, defaultOptions) => {
    const saved = utils.getSaved(key, defaultOptions);
    if (saved.stat && !saved.http) {
      saved.http = saved.stat.http;
      saved.tcp = saved.stat.tcp;
      delete saved.stat;
    }
    //if (saved.color !== undefined) delete saved.color;
    return saved;
  },

  removeDefaults: (options, defaultOptions) => {
    const newOptions = {};
    for (const key in options) {
      if (options[key] !== defaultOptions[key]) {
        newOptions[key] = options[key];
      }
    }
    return newOptions;
  },

  setOptions: (key, options, defaultOptions) => {
    utils.setSaved(key, options);
    return defaultOptions
      ? utils.removeDefaults(options, defaultOptions)
      : options;
  },

  viewFromHash: (hash) => {
    let view = "";
    let options = {};
    if (!hash) {
      hash = window.location.hash;
    }
    options = utils.hashToOptions(hash.substr(1));
    view = options.view;
    return { view, options };
  },

  optionsFromHistory: (hash) => {
    let options = {};
    const parts = hash.split("?");
    if (parts.length > 1) {
      options = utils.hashToOptions(parts[1]);
    }
    return options;
  },

  sameOptions: (options1, options2) => {
    const aKeys = Object.keys(options1);
    const bKeys = Object.keys(options2);

    if (aKeys.length !== bKeys.length) return false;
    let different = aKeys.some((key) => {
      return options1[key] !== options2[key];
    });
    return !different;
  },

  isEmpty: (o) => !o || Object.keys(o).length === 0,

  rgbToHex: (rgb) =>
    `#${componentToHex(rgb.r)}${componentToHex(rgb.g)}${componentToHex(rgb.b)}`,

  statName: (stat) => {
    if (stat === "bytes_in") stat = "bytes";
    if (stat === "bytes_out") stat = "bytes";
    if (stat) return stat.replace(/_/gi, " ");
    return "";
  },

  // add the source values to the target values for each attribute in the source.
  aggregateAttributes: (source, target, combine) => {
    if (!combine)
      combine = (a, b, attr) => {
        if (attr === "start_time") return Math.min(a, b);
        if (attr === "last_in" || attr === "last_out" || attr === "latency_max")
          return Math.max(a, b);
        return a + b;
      };
    for (const attribute in source) {
      if (target[attribute] === undefined) {
        target[attribute] = source[attribute];
      } else {
        if (typeof source[attribute] === "object") {
          utils.aggregateAttributes(source[attribute], target[attribute]);
        } else if (!isNaN(source[attribute])) {
          target[attribute] = combine(
            source[attribute],
            target[attribute],
            attribute
          );
        }
      }
    }
  },

  // keep a history of a given obj
  // store the objs in storage[key]
  keepHistory: ({ obj, storage, key, history = 60 }) => {
    let list = storage[key];
    if (!list) {
      list = storage[key] = [];
    }
    // expire old entries
    while (list.length > history) {
      list.shift();
    }
    list.push({
      date: new Date(),
      val: Object.assign({}, obj),
    });
  },

  // return the {date:, val:} from the histories array since 'ago' seconds ago
  getHistory: ({ histories, stat, ago, skipUndefined = false }) => {
    const values = [];
    const now = new Date();
    const then = new Date(now - ago * 1000);
    histories.forEach((history) => {
      if (history.date >= then) {
        let val = history.val[stat];
        if (val === undefined && !skipUndefined) {
          val = 0;
        }
        if (val !== undefined) {
          values.push({ date: history.date, val });
        }
      }
    });
    return values;
  },

  // for each sample in targetSamples, find the corresponding entry in the
  // given sample and add the vals
  combineSamples: (targetSamples, samples) => {
    targetSamples.forEach((oldSample, i) => {
      if (oldSample && samples[i]) {
        oldSample.val += samples[i].val;
      }
    });
  },

  // calculate the average rate of change per second for a list of fields on the given obj
  rates: ({ fields, storage, key, history = 2 }) => {
    let list = storage[key];
    if (!list) {
      list = storage[key] = [];
    }
    history = Math.max(history, 2);
    let rates = {};
    for (let i = 0; i < fields.length; i++) {
      let cumulative = 0;
      let field = fields[i];
      for (let j = list.length - 1; j > history - 2; j--) {
        let elapsed = list[j].date - list[j - 1].date;
        if (list[j].val[field] !== undefined) {
          let diff = list[j + 1].val[field] - list[j].val[field];
          if (elapsed > 100) cumulative += diff / (elapsed / 1000);
        }
      }
      rates[field] = list.length > 1 ? cumulative / (list.length - 1) : 0;
    }
    return rates;
  },

  // used to create a few hex characters in file names
  randomHex: (numCharacters) =>
    [...Array(numCharacters)]
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join(""),
};

export { utils };
