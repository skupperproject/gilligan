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
import { utils } from "../amqp/utilities.js";
import { getPosition } from "./topoUtils";
import TooltipTable from "../tooltipTable";

var React = require("react");

export class Node {
  constructor(
    id,
    name,
    nodeType,
    properties,
    routerId,
    x,
    y,
    nodeIndex,
    resultIndex,
    fixed,
    connectionContainer
  ) {
    this.key = id; // the router uri for this node (or group of clients) like: amqp:/_topo/0/<router id>/$management
    this.name = name; // the router id portion of the key
    this.nodeType = nodeType; // router.role
    this.properties = properties;
    this.routerId = routerId; // the router uri of the router we are connected to (for groups)
    this.x = x;
    this.y = y;
    this.id = nodeIndex;
    this.resultIndex = resultIndex;
    this.fixed = fixed ? true : false;
    this.cls = "";
    this.container = connectionContainer;
    this.isConsole = utils.isConsole(this);
    this.isArtemis = utils.isArtemis(this);
    this.score = 0;
    this.targets = [];
    this.sources = [];
    this.links = [];
    this.expanded = false;
  }
  title(hide) {
    let x = "";
    if (this.normals && this.normals.length > 1 && !hide)
      x = " x " + this.normals.length;
    if (this.isConsole) return "Dispatch console" + x;
    else if (this.isArtemis) return "Broker - Artemis" + x;
    else if (this.properties.product === "qpid-cpp")
      return "Broker - qpid-cpp" + x;
    else if (this.nodeType === "edge") return "Edge Router";
    else if (this.cdir === "in") return "Sender" + x;
    else if (this.cdir === "out") return "Receiver" + x;
    else if (this.cdir === "both") return "Sender/Receiver" + x;
    else if (this.nodeType === "normal") return "client" + x;
    else if (this.nodeType === "on-demand") return "broker";
    else if (this.properties.product) {
      return this.properties.product;
    } else {
      return "";
    }
  }
  toolTip(topology, verbose) {
    return new Promise(resolve => {
      if (this.nodeType === "normal" || this.nodeType === "edge") {
        resolve(this.clientTooltip());
      } else
        this.routerTooltip(topology, verbose).then(toolTip => {
          resolve(toolTip);
        });
    });
  }

  clientTooltip() {
    const rows = [];
    rows.push(["Service", this.name]);
    return <TooltipTable rows={rows} />;
  }

  routerTooltip(topology, verbose) {
    return new Promise(resolve => {
      const rows = [];
      if (this.dataType === "network") {
        rows.push(["Provider", this.properties.cluster.provider]);
        rows.push(["Zone", this.properties.cluster.zone]);
        if (this.properties.cluster.namespaces.length > 1) {
          rows.push([
            "Namespaces",
            <ul>
              {this.properties.cluster.namespaces.map(ns => (
                <li>{ns}</li>
              ))}
            </ul>
          ]);
        } else {
          rows.push(["Namespace", this.properties.cluster.namespaces[0]]);
        }
      }
      resolve(<TooltipTable className="skipper-table network" rows={rows} />);
    });
  }
  radius() {
    return nodeProperties[this.nodeType].radius;
  }
  uid() {
    if (!this.uuid) this.uuid = `${this.container}`;
    return this.normals ? `${this.uuid}-${this.normals.length}` : this.uuid;
  }
  setFixed(fixed) {
    if (!fixed & 1) this.lat = this.lon = null;
    this.fixed = fixed & 1 ? true : false;
  }
  isFixed() {
    return this.fixed & 1 ? true : false;
  }
  X(app) {
    return app ? this.x : this.orgx;
  }
  Y(app) {
    return app ? this.y : this.orgy;
  }
}
const nodeProperties = {
  // router types
  "inter-router": {
    radius: 28,
    refX: {
      end: 12,
      start: -19
    },
    linkDistance: [150, 70],
    charge: [-1800, -900]
  },
  edge: {
    radius: 20,
    refX: {
      end: 24,
      start: -12
    },
    linkDistance: [110, 55],
    charge: [-1350, -900]
  },
  // generated nodes from connections. key is from connection.role
  normal: {
    radius: 15,
    refX: {
      end: 10,
      start: -7
    },
    linkDistance: [250, 250],
    charge: [-1900, -1900]
  },
  cloud: {
    charge: [-1900, -900],
    linkDistance: [150, 70]
  }
};
// aliases
nodeProperties._topo = nodeProperties["inter-router"];
nodeProperties._edge = nodeProperties["edge"];
nodeProperties["on-demand"] = nodeProperties["normal"];
nodeProperties["route-container"] = nodeProperties["normal"];

export class Nodes {
  constructor() {
    this.nodes = [];
  }
  static radius(type) {
    if (nodeProperties[type].radius) return nodeProperties[type].radius;
    return 15;
  }
  static textOffset(type) {
    let r = Nodes.radius(type);
    let ret = type === "inter-router" || type === "_topo" ? r + 30 : 0;
    return ret;
  }
  static maxRadius() {
    let max = 0;
    for (let key in nodeProperties) {
      max = Math.max(max, nodeProperties[key].radius);
    }
    return max;
  }
  static refX(end, r) {
    for (let key in nodeProperties) {
      if (nodeProperties[key].radius === parseInt(r))
        return nodeProperties[key].refX[end];
    }
    return 0;
  }
  // return all possible values of node radii
  static discrete() {
    let values = {};
    for (let key in nodeProperties) {
      values[nodeProperties[key].radius] = true;
    }
    return Object.keys(values);
  }
  // vary the following force graph attributes based on nodeCount
  static forceScale(nodeCount, minmax) {
    let count = Math.max(Math.min(nodeCount, 80), 6);
    let x = d3.scale
      .linear()
      .domain([6, 80])
      .range(minmax);
    return x(count);
  }
  reset() {
    this.nodes.length = 0;
  }

  linkDistance(d, nodeCount) {
    if (d.target.nodeType === undefined) debugger;
    let range = nodeProperties[d.target.nodeType].linkDistance;
    return Nodes.forceScale(nodeCount, range);
  }
  charge(d, nodeCount) {
    let charge = nodeProperties[d.nodeType].charge;
    return Nodes.forceScale(nodeCount, charge);
  }
  gravity(d, nodeCount) {
    return Nodes.forceScale(nodeCount, [0.0001, 0.1]);
  }
  setFixed(d, fixed) {
    let n = this.find(d.container, d.properties, d.name);
    if (n) {
      n.fixed = fixed;
    }
    d.setFixed(fixed);
  }
  getLength() {
    return this.nodes.length;
  }
  get(index) {
    if (index < this.getLength()) {
      return this.nodes[index];
    }
    console.log(
      `Attempted to get node[${index}] but there were only ${this.getLength()} nodes`
    );
    return undefined;
  }
  nodeFor(name) {
    for (let i = 0; i < this.nodes.length; ++i) {
      if (this.nodes[i].name === name) return this.nodes[i];
    }
    return null;
  }
  nodeExists(connectionContainer) {
    return this.nodes.findIndex(function(node) {
      return node.container === connectionContainer;
    });
  }
  normalExists(connectionContainer) {
    let normalInfo = {};
    const exists = i =>
      this.nodes[i].normals.some((normal, j) => {
        if (normal.container === connectionContainer && i !== j) {
          normalInfo = {
            nodesIndex: i,
            normalsIndex: j
          };
          return true;
        }
        return false;
      });

    for (let i = 0; i < this.nodes.length; ++i) {
      if (this.nodes[i].normals) {
        if (exists(i)) break;
      }
    }
    return normalInfo;
  }
  savePositions(nodes) {
    if (!nodes) nodes = this.nodes;
    if (Object.prototype.toString.call(nodes) !== "[object Array]") {
      nodes = [nodes];
    }
    this.nodes.forEach(function(d) {
      localStorage[d.name] = JSON.stringify({
        x: Math.round(d.x),
        y: Math.round(d.y),
        fixed: d.fixed
      });
    });
  }
  // Convert node's x,y coordinates to longitude, lattitude
  saveLonLat(backgroundMap, nodes) {
    if (!backgroundMap || !backgroundMap.initialized) return;
    // didn't pass nodes, use all nodes
    if (!nodes) nodes = this.nodes;
    // passed a single node, wrap it in an array
    if (Object.prototype.toString.call(nodes) !== "[object Array]") {
      nodes = [nodes];
    }
    for (let i = 0; i < nodes.length; i++) {
      let n = nodes[i];
      if (n.fixed) {
        let lonlat = backgroundMap.getLonLat(n.x, n.y);
        if (lonlat) {
          n.lon = lonlat[0];
          n.lat = lonlat[1];
        }
      } else {
        n.lon = n.lat = null;
      }
    }
  }
  // convert all nodes' longitude,lattitude to x,y coordinates
  setXY(backgroundMap) {
    if (!backgroundMap) return;
    for (let i = 0; i < this.nodes.length; i++) {
      let n = this.nodes[i];
      if (n.lon && n.lat) {
        let xy = backgroundMap.getXY(n.lon, n.lat);
        if (xy) {
          n.x = n.px = xy[0];
          n.y = n.py = xy[1];
        }
      }
    }
  }

  find(connectionContainer, properties, name) {
    properties = properties || {};
    for (let i = 0; i < this.nodes.length; ++i) {
      if (
        this.nodes[i].name === name ||
        this.nodes[i].container === connectionContainer
      ) {
        return this.nodes[i];
      }
    }
    return undefined;
  }
  mergeServiceTypes(ar1, ar2) {
    if (ar2.serviceTypes) {
      ar2.serviceTypes.forEach(pst => {
        const existed = ar1.find(st => st.name === pst.name);
        if (!existed) {
          ar1.push(pst);
        }
      });
    }
  }
  getOrCreateNode(
    id,
    name,
    nodeType,
    nodeIndex,
    x,
    y,
    connectionContainer,
    resultIndex,
    fixed,
    properties
  ) {
    properties = properties || {};
    let gotNode = this.find(connectionContainer, properties, name);
    if (gotNode) {
      this.mergeServiceTypes(
        properties.serviceTypes,
        gotNode.properties.serviceTypes
      );
      this.mergeServiceTypes(
        properties.targetServiceTypes,
        gotNode.properties.targetServiceTypes
      );
      return gotNode;
    }
    let routerId = utils.nameFromId(id);
    return new Node(
      id,
      name,
      nodeType,
      properties,
      routerId,
      x,
      y,
      nodeIndex,
      resultIndex,
      fixed,
      connectionContainer
    );
  }
  add(obj) {
    this.nodes.push(obj);
    return obj;
  }
  addUsing(
    id,
    name,
    nodeType,
    nodeIndex,
    x,
    y,
    connectContainer,
    resultIndex,
    fixed,
    properties
  ) {
    let obj = this.getOrCreateNode(
      id,
      name,
      nodeType,
      nodeIndex,
      x,
      y,
      connectContainer,
      resultIndex,
      fixed,
      properties
    );
    return this.add(obj);
  }
  clearHighlighted() {
    for (let i = 0; i < this.nodes.length; ++i) {
      this.nodes[i].highlighted = false;
    }
  }

  addClusters = (clusters, width, height, yInit, animate, type, extra) => {
    clusters.forEach(cluster => {
      const id = utils.idFromName(cluster.location, "_topo");
      const name = cluster.location;
      const metaData = { cluster, extra: JSON.parse(JSON.stringify(extra)) };
      let { position, newyInit, newanimate } = getPosition(
        name,
        width,
        height,
        localStorage,
        this.nodes.length,
        clusters.length,
        yInit,
        animate
      );
      yInit = newyInit;
      animate = newanimate;
      this.addUsing(
        id,
        name,
        "_topo",
        this.nodes.length,
        position.x,
        position.y,
        name,
        undefined,
        position.fixed,
        metaData
      ).dataType = type;
    });
  };
  initialize(reality, width, height, localStorage, type, extra) {
    let yInit = 50;
    let animate = false;
    // for "network", nodes are the clusters
    if (type === "network" || type === "reality") {
      const clusters = reality.clusters;
      this.addClusters(clusters, width, height, yInit, animate, type, extra);

      if (type === "reality") {
        reality.applications.forEach(application => {
          const id = utils.idFromName(application.name, "_topo");
          this.addUsing(
            id,
            application.name,
            "cloud",
            this.nodes.length,
            0,
            0,
            application.name,
            undefined,
            false,
            { application }
          ).dataType = type;
        });
      }
    }
    // for "application", nodes are service types
    if (type === "application") {
      const serviceTypes = {};
      extra.connections.forEach(connection => {
        const serviceTypeName = connection.serviceInstance.serviceType.name;
        serviceTypes[serviceTypeName] = connection.serviceInstance.serviceType;
      });
      for (const serviceTypeName in serviceTypes) {
        const id = utils.idFromName(serviceTypeName, "_topo");
        const metaData = serviceTypes[serviceTypeName].addresses;
        let { position, newyInit, newanimate } = getPosition(
          serviceTypeName,
          width,
          height,
          localStorage,
          Object.keys(serviceTypes).length,
          yInit,
          animate
        );
        yInit = newyInit;
        animate = newanimate;
        this.addUsing(
          id,
          serviceTypeName,
          "_topo",
          this.nodes.length,
          position.x,
          position.y,
          serviceTypeName,
          undefined,
          position.fixed,
          metaData
        ).dataType = type;
      }
    }
    if (type === "service") {
      const serviceTypeName = extra.name;
      // add a cluster if it contains extra.serviceType
      const clusters = [];
      reality.serviceInstances.forEach(serviceInstance => {
        if (serviceInstance.serviceType.name === serviceTypeName) {
          if (
            !clusters.find(
              cluster => cluster.name === serviceInstance.cluster.name
            )
          ) {
            clusters.push(serviceInstance.cluster);
          }
        }
      });
      this.addClusters(clusters, width, height, yInit, animate, type, extra);
    }
    return animate;
  }
}
