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

/* global Set */
import { utils } from "../amqp/utilities.js";

// highlight the paths between the selected node and the hovered node
function findNextHopNode(from, d, nodeInfo, selected_node, nodes) {
  // d is the node that the mouse is over
  // from is the selected_node ....
  if (!from) return null;

  if (from === d) return selected_node;

  let sInfo = nodeInfo[from.key];

  // find the hovered name in the selected name's .router.node results
  if (!sInfo["router.node"]) return null;
  let aAr = sInfo["router.node"].attributeNames;
  let vAr = sInfo["router.node"].results;
  for (let hIdx = 0; hIdx < vAr.length; ++hIdx) {
    let addrT = utils.valFor(aAr, vAr[hIdx], "id");
    if (d.name && addrT === d.name) {
      let next = utils.valFor(aAr, vAr[hIdx], "nextHop");
      return next === null ? nodes.nodeFor(addrT) : nodes.nodeFor(next);
    }
  }
  return null;
}
export function nextHop(
  thisNode,
  d,
  nodes,
  links,
  nodeInfo,
  selected_node,
  cb
) {
  if (thisNode && thisNode !== d) {
    let target = findNextHopNode(thisNode, d, nodeInfo, selected_node, nodes);
    if (target) {
      let hnode = nodes.nodeFor(thisNode.name);
      let hlLink = links.linkFor(hnode, target);
      if (hlLink) {
        if (cb) {
          cb(hlLink, hnode, target);
        }
      } else target = null;
    }
    nextHop(target, d, nodes, links, nodeInfo, selected_node, cb);
  }
}

let linkRateHistory = {};
export function connectionPopupHTML(d, nodeInfo) {
  if (!d) {
    linkRateHistory = {};
    return;
  }
  // return all of onode's connections that connecto to right
  let getConnsArray = function(onode, key, right) {
    if (right.normals) {
      // if we want connections between a router and a client[s]
      let connIds = new Set();
      let connIndex = onode.connection.attributeNames.indexOf("identity");
      for (let n = 0; n < right.normals.length; n++) {
        let normal = right.normals[n];
        if (normal.key === key) {
          connIds.add(normal.connectionId);
        } else if (normal.alsoConnectsTo) {
          normal.alsoConnectsTo.forEach(function(ac2) {
            if (ac2.key === key) connIds.add(ac2.connectionId);
          });
        }
      }
      return onode.connection.results
        .filter(function(result) {
          return connIds.has(result[connIndex]);
        })
        .map(function(c) {
          return utils.flatten(onode.connection.attributeNames, c);
        });
    } else {
      // we want the connection between two routers
      let container = utils.nameFromId(right.key);
      let containerIndex = onode.connection.attributeNames.indexOf("container");
      let roleIndex = onode.connection.attributeNames.indexOf("role");
      return onode.connection.results
        .filter(function(conn) {
          return (
            conn[containerIndex] === container &&
            conn[roleIndex] === "inter-router"
          );
        })
        .map(function(c) {
          return utils.flatten(onode.connection.attributeNames, c);
        });
    }
  };
  // construct HTML to be used in a popup when the mouse is moved over a link.
  // The HTML is sanitized elsewhere before it is displayed
  let linksHTML = function(onode, conns) {
    const max_links = 10;
    const fields = [
      "deliveryCount",
      "undeliveredCount",
      "unsettledCount",
      "rejectedCount",
      "releasedCount",
      "modifiedCount"
    ];
    // local function to determine if a link's connectionId is in any of the connections
    let isLinkFor = function(connectionId, conns) {
      for (let c = 0; c < conns.length; c++) {
        if (conns[c].identity === connectionId) return true;
      }
      return false;
    };
    let fnJoin = function(ar, sepfn) {
      let out = "";
      out = ar[0];
      for (let i = 1; i < ar.length; i++) {
        let sep = sepfn(ar[i], i === ar.length - 1);
        out += sep[0] + sep[1];
      }
      return out;
    };
    // if the data for the line is from a client (small circle), we may have multiple connections
    // loop through all links for this router and accumulate those belonging to the connection(s)
    let nodeLinks = onode["router.link"];
    if (!nodeLinks) return "";
    let links = [];
    let hasAddress = false;
    for (let n = 0; n < nodeLinks.results.length; n++) {
      let link = utils.flatten(nodeLinks.attributeNames, nodeLinks.results[n]);
      let allZero = true;
      if (link.linkType !== "router-control") {
        if (isLinkFor(link.connectionId, conns)) {
          if (link.owningAddr) hasAddress = true;
          if (link.name) {
            let rates = utils.rates(
              link,
              fields,
              linkRateHistory,
              link.name,
              1
            );
            // replace the raw value with the rate
            for (let i = 0; i < fields.length; i++) {
              if (rates[fields[i]] > 0) allZero = false;
              link[fields[i]] = rates[fields[i]];
            }
          }
          if (!allZero) links.push(link);
        }
      }
    }
    // we may need to limit the number of links displayed, so sort descending by the sum of the field values
    let sum = function(a) {
      let s = 0;
      for (let i = 0; i < fields.length; i++) {
        s += a[fields[i]];
      }
      return s;
    };
    links.sort(function(a, b) {
      let asum = sum(a);
      let bsum = sum(b);
      return asum < bsum ? 1 : asum > bsum ? -1 : 0;
    });

    let HTMLHeading = "<h5>Rates (per second) for links</h5>";
    let HTML = '<table class="popupTable">';
    // copy of fields since we may be prepending an address
    let th = fields.slice();
    let td = fields;
    th.unshift("dir");
    td.unshift("linkDir");
    th.push("priority");
    td.push("priority");
    // add an address field if any of the links had an owningAddress
    if (hasAddress) {
      th.unshift("address");
      td.unshift("owningAddr");
    }

    let rate_th = function(th) {
      let rth = th.map(function(t) {
        if (t.endsWith("Count")) t = t.replace("Count", "Rate");
        return utils.humanify(t);
      });
      return rth;
    };
    HTML +=
      '<tr class="header"><td>' + rate_th(th).join("</td><td>") + "</td></tr>";
    // add rows to the table for each link
    for (let l = 0; l < links.length; l++) {
      if (l >= max_links) {
        HTMLHeading = `<h5>Rates (per second) for top ${max_links} links</h5>`;
        break;
      }
      let link = links[l];
      let vals = td.map(function(f) {
        if (f === "owningAddr") {
          let identity = utils.identity_clean(link.owningAddr);
          return utils.addr_text(identity);
        }
        return link[f];
      });
      let joinedVals = fnJoin(vals, function(v1, last) {
        return [
          `</td><td${isNaN(+v1) ? "" : ' align="right"'}>`,
          last ? v1 : utils.pretty(v1 || "0", ",.2f")
        ];
      });
      HTML += `<tr><td> ${joinedVals} </td></tr>`;
    }
    return links.length > 0 ? `${HTMLHeading}${HTML}</table>` : "";
  };

  let left, right;
  if (d.left) {
    left = d.source;
    right = d.target;
  } else {
    left = d.target;
    right = d.source;
  }
  if (left.normals) {
    // swap left and right
    [left, right] = [right, left];
  }
  // left is a router. right is either a router or a client[s]
  let onode = nodeInfo[left.key];
  // find all the connections for left that go to right
  let conns = getConnsArray(onode, left.key, right);

  let HTML = "";
  HTML += "<h5>Connection" + (conns.length > 1 ? "s" : "") + "</h5>";
  HTML +=
    '<table class="popupTable"><tr class="header"><td>Security</td><td>Authentication</td><td>Tenant</td><td>Host</td>';

  for (let c = 0; c < Math.min(conns.length, 10); c++) {
    HTML += "<tr><td>" + utils.connSecurity(conns[c]) + "</td>";
    HTML += "<td>" + utils.connAuth(conns[c]) + "</td>";
    HTML += "<td>" + (utils.connTenant(conns[c]) || "--") + "</td>";
    HTML += "<td>" + conns[c].host + "</td>";
    HTML += "</tr>";
  }
  HTML += "</table>";
  HTML += linksHTML(onode, conns);
  return HTML;
}

export function getSizes(topologyRef, log) {
  const gap = 5;
  let legendWidth = 4;
  let topoWidth = topologyRef.offsetWidth;
  if (topoWidth < 768) legendWidth = 0;
  let width = topoWidth - gap - legendWidth;
  let height = topologyRef.offsetHeight;
  if (width < 10 || height < 10) {
    log.log(`page width and height are abnormal w: ${width} h: ${height}`);
    return [0, 0];
  }
  return [width, height];
}

const serviceTypes = [
  {
    name: "Product Page",
    protocol: "HTTP",
    cluster: 0,
    namespace: 0
  },
  {
    name: "Info",
    protocol: "HTTP",
    cluster: 1,
    namespace: 0
  },
  {
    name: "Reviews",
    protocol: "HTTP",
    cluster: 1,
    namespace: 0
  },
  {
    name: "Ratings",
    protocol: "HTTP",
    cluster: 1,
    namespace: 0
  },
  {
    name: "Database",
    protocol: "TCP",
    cluster: 2,
    namespace: 0
  },
  {
    name: "TaxPrep",
    protocol: "TCP",
    cluster: 3,
    namespace: 0
  },
  {
    name: "Calc",
    protocol: "TCP",
    cluster: 4,
    namespace: 0
  },
  {
    name: "Multiply",
    protocol: "TCP",
    cluster: 5,
    namespace: 0
  },
  {
    name: "Divide",
    protocol: "TCP",
    cluster: 6,
    namespace: 0
  },
  {
    name: "Add",
    protocol: "TCP",
    cluster: 7,
    namespace: 0
  },
  {
    name: "Subtract",
    protocol: "TCP",
    cluster: 7,
    namespace: 0
  },
  {
    name: "Tax Advice",
    protocol: "TCP",
    cluster: 0,
    namespace: 0
  },
  {
    name: "State Tax Rules",
    protocol: "TCP",
    cluster: 2,
    namespace: 0
  },
  {
    name: "This is the Homework Helper Service",
    protocol: "HTTP",
    cluster: 0,
    namespace: 0
  }
];
const clusters = [
  {
    name: "Web Server",
    location: "Westford",
    zone: "US-East",
    provider: "OpenStack",
    namespaces: ["web-site"]
  },
  {
    name: "App Server",
    location: "Galway",
    zone: "EU-West",
    provider: "Azure",
    namespaces: ["backend"]
  },
  {
    name: "DB Server",
    location: "Redding",
    zone: "US-West",
    provider: "AWS",
    namespaces: ["mongo"]
  },
  {
    name: "Extra 1",
    location: "Canton",
    zone: "US-Midwest",
    provider: "Ministack",
    namespaces: ["myproject"]
  },
  {
    name: "Extra 2",
    location: "Knox",
    zone: "US-Midwest",
    provider: "Ministack",
    namespaces: ["myproject"]
  },
  {
    name: "Extra 3",
    location: "Plymouth",
    zone: "US-Midwest",
    provider: "Ministack",
    namespaces: ["myproject"]
  },
  {
    name: "Extra 4",
    location: "Ann Arbor",
    zone: "US-Midwest",
    provider: "Ministack",
    namespaces: ["myproject"]
  },
  {
    name: "Extra 5",
    location: "Manchester",
    zone: "US-Midwest",
    provider: "Ministack",
    namespaces: ["myproject"]
  }
];

const serviceInstances = [
  {
    source: 0,
    target: 1,
    address: "ProductToInfo",
    stats: {
      throughput: 123,
      protocol: "TCP",
      latency: "10ms",
      utilization: 0.5,
      security: "TLS"
    },
    description: "Connects ProductPage to Info"
  },
  {
    source: 0,
    target: 2,
    address: "ProductToReviews",
    stats: {
      throughput: 234,
      protocol: "TCP",
      latency: "11ms",
      utilization: 0.5,
      security: "TLS"
    },
    description: "Connects ProductPage to Reviews"
  },
  {
    source: 2,
    target: 3,
    address: "ReviewsToRatings",
    stats: {
      throughput: 345,
      protocol: "TCP",
      latency: "12ms",
      utilization: 0.5,
      security: "TLS"
    },
    description: "Connects Reviews to Ratings"
  },
  {
    source: 3,
    target: 4,
    address: "RatingsToDatabase",
    stats: {
      throughput: 456,
      protocol: "HTTP",
      latency: "13ms",
      utilization: 0.5,
      security: "None"
    },
    description: "Connects Ratings to DB"
  },
  {
    source: 2,
    target: 4,
    address: "ReviewsToDatabase",
    stats: {
      throughput: 567,
      protocol: "HTTP",
      latency: "14ms",
      utilization: 0.5,
      security: "None"
    },
    description: "Connects Reviews to DB"
  },
  {
    source: 1,
    target: 4,
    address: "InfoToDatabase",
    stats: {
      throughput: 678,
      protocol: "HTTP",
      latency: "15ms",
      utilization: 0.5,
      security: "None"
    },
    description: "Connects Info to DB"
  },
  {
    source: 11,
    target: 5,
    address: "Advice2Prep",
    stats: {
      throughput: 678,
      protocol: "HTTP",
      latency: "15ms",
      utilization: 0.5,
      security: "None"
    },
    description: "Connects Advice to Prep"
  },
  {
    source: 5,
    target: 6,
    address: "Tax2Calc",
    stats: {
      throughput: 678,
      protocol: "HTTP",
      latency: "15ms",
      utilization: 0.5,
      security: "None"
    },
    description: "Connects Tax to Calc"
  },
  {
    source: 6,
    target: 7,
    address: "Calc2Multiply",
    stats: {
      throughput: 678,
      protocol: "HTTP",
      latency: "15ms",
      utilization: 0.5,
      security: "None"
    },
    description: "Connects Calc to Mult"
  },
  {
    source: 6,
    target: 8,
    address: "Calc2Divide",
    stats: {
      throughput: 678,
      protocol: "HTTP",
      latency: "15ms",
      utilization: 0.5,
      security: "None"
    },
    description: "Connects Calc to Divide"
  },
  {
    source: 6,
    target: 9,
    address: "Calc2Add",
    stats: {
      throughput: 678,
      protocol: "HTTP",
      latency: "15ms",
      utilization: 0.5,
      security: "None"
    },
    description: "Connects Calc to Add"
  },
  {
    source: 6,
    target: 10,
    address: "Calc2Sub",
    stats: {
      throughput: 678,
      protocol: "HTTP",
      latency: "15ms",
      utilization: 0.5,
      security: "None"
    },
    description: "Connects Calc to Sub"
  },
  {
    source: 5,
    target: 12,
    address: "Calc2Rules",
    stats: {
      throughput: 678,
      protocol: "HTTP",
      latency: "15ms",
      utilization: 0.5,
      security: "None"
    },
    description: "Connects Calc to State rules"
  },
  {
    source: 13,
    target: 6,
    address: "HomeWork2Calc",
    stats: {
      throughput: 678,
      protocol: "HTTP",
      latency: "15ms",
      utilization: 0.5,
      security: "None"
    },
    description: "Connects Homework to Calc"
  }
];

export const reality = {
  clusters,
  serviceTypes,
  serviceInstances
};

export const getPosition = (
  name,
  width,
  height,
  localStorage,
  index,
  length,
  yInit,
  animate
) => {
  let found = true;
  let position = localStorage[name]
    ? JSON.parse(localStorage[name])
    : undefined;
  if (!position) {
    found = false;
    animate = true;
    position = {
      x: Math.round(width / 4 + (width / 2 / length) * index),
      y: Math.round(
        height / 2 + (Math.sin(index / (Math.PI * 2.0)) * height) / 4
      ),
      fixed: false
    };
  }
  if (position.y > height) {
    position.y = 200 - yInit;
    yInit *= -1;
  }
  return { position, newyInit: yInit, newanimate: animate, found };
};

export const adjustPositions = ({
  nodes,
  links,
  width,
  height,
  BoxWidth,
  BoxHeight
}) => {
  console.log("----------------");
  console.log(nodes.nodes);
  console.log(links.links);

  nodes.nodes.forEach(n => {
    n.sources = [];
    n.targets = [];
  });

  // for all the nodes, construct 2 lists: souce nodes, and target nodes
  links.links.forEach(l => {
    nodes.nodes[l.source].targets.push(nodes.nodes[l.target]);
    nodes.nodes[l.target].sources.push(nodes.nodes[l.source]);
  });

  // find node(s) with fewest number of sources
  let minSources = Number.MAX_SAFE_INTEGER;
  nodes.nodes.forEach(
    n => (minSources = Math.min(minSources, n.sources.length))
  );
  const parents = nodes.nodes.filter(n => n.sources.length === minSources);

  // put parents in 1st column
  parents.forEach(n => (n.col = 0));

  let colNodes = parents;
  while (colNodes.length > 0) {
    let foundNodes = [];
    console.log("-- looping through new parent list");
    console.log(colNodes.map(n => n.name));
    colNodes.forEach(p => {
      nodes.nodes.forEach(n => {
        console.log(`checking if ${n.name} is a target of ${p.name}`);
        if (p.targets.includes(n)) {
          console.log(
            `   yes. ${p.name}.targets includes ${n.name}  so ${
              n.name
            }.col = ${p.col + 1}`
          );
          n.col = p.col + 1;
          foundNodes.push(n);
          console.log(`pushing nextCol node of ${n.name}`);
        } else {
          console.log(`   not a target`);
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
      n.sources.forEach(p => {
        if (p.sources.length === 0) {
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
    colNodes.forEach(n => (nodesHeight += n.height()));
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
      curY += n.height() + gapHeight;
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
    nodes.nodes.forEach(n => {
      if (n.col === col) {
        n.x = curX;
      }
    });
    curX += colWidths[col] + hGap;
  }
  /*
  console.log(`adjust positions cols ${cols}`);

  let leftX = width / (cols + 1) - BoxWidth / 2;
  if (leftX < minGap) {
    // make virtual width big enough to contain all nodes
    vwidth = minGap + (BoxWidth + minGap) * cols;
    // keep aspect ratio the same
    vheight = (height * vwidth) / width;
  }
  console.log(`vwidth ${vwidth} vheight ${vheight}`);
  nodes.nodes.forEach((n, i) => {
    n.x = ((n.col + 1) * vwidth) / (cols + 1) - BoxWidth / 2;
    console.log(`${i}: n.x ${n.x} n.y ${n.y}`);
  });
  */
  return { width: vwidth, height: vheight };
};
