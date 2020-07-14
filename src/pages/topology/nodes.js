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
import TooltipTable from "./tooltipTable";
import { utils } from "../../utilities";

var React = require("react");

export class Node {
  constructor({ name, nodeType, x, y, fixed, heightFn, widthFn }) {
    this.name = name;
    this.nodeType = nodeType; // cluster || service || client
    this.x = x;
    this.y = y;
    this.fixed = fixed ? true : false;
    this.cls = "";
    this.score = 0;
    this.expanded = false;
    this.heightFn = heightFn;
    this.widthFn = widthFn;
    this.gap = 20;
    this.sourceNodes = [];
    this.targetNodes = [];
    this.uuid = name;
  }

  toolTip(verbose) {
    return new Promise((resolve) => {
      if (this.nodeType === "service" || this.nodeType === "client") {
        resolve(this.clientTooltip());
      } else {
        this.clusterTooltip(verbose).then((toolTip) => {
          resolve(toolTip);
        });
      }
    });
  }

  clientTooltip() {
    const rows = [];

    for (const prop in this.properties) {
      if (prop === "cluster") {
        rows.push(["Cluster", this.parentNode.properties.cluster.name]);
      } else if (prop === "namespace") {
        rows.push([
          "Namespace",
          this.parentNode.properties.cluster.namespaces[this.properties[prop]],
        ]);
      } else {
        rows.push([prop, this.properties[prop]]);
      }
    }
    return <TooltipTable rows={rows} />;
  }

  clusterTooltip(verbose) {
    return new Promise((resolve) => {
      const rows = [];
      if (this.dataType === "cluster") {
        rows.push(["Provider", this.properties.cluster.provider]);
        rows.push(["Zone", this.properties.cluster.zone]);
        if (this.properties.cluster.namespaces.length > 1) {
          rows.push([
            "Namespaces",
            <ul>
              {this.properties.cluster.namespaces.map((ns) => (
                <li>{ns}</li>
              ))}
            </ul>,
          ]);
        } else {
          rows.push(["Namespace", this.properties.cluster.namespaces[0]]);
        }
      }
      resolve(<TooltipTable className="gilligan-table network" rows={rows} />);
    });
  }
  uid() {
    return this.nodeType === "cluster" ? this.site_id : this.address;
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
  radius() {
    return nodeProperties[this.nodeType].radius;
  }
  getHeight = (expanded) => this.heightFn(this, expanded);
  getWidth = (expanded) => this.widthFn(this, expanded);

  mergeWith(obj) {
    for (const key in obj) {
      this[key] = obj[key];
    }
  }
  setSubNodePositions = (key) => {
    if (this.subNodes && this.subNodes.length > 0) {
      let curY = this.subNodes[0].y0;
      this.subNodes.forEach((n) => {
        n[key].y1 = n.y1 = curY + (n.y1 - n.y0);
        n[key].y0 = n.y0 = curY;
        curY += n.getHeight() + utils.ServiceGap;
      });
    }
  };
}
const nodeProperties = {
  // router types
  cluster: {
    radius: 100,
    refX: {
      end: 12,
      start: -19,
    },
    linkDistance: [300, 300],
    charge: [-1800, -900],
  },
  edge: {
    radius: 20,
    refX: {
      end: 24,
      start: -12,
    },
    linkDistance: [110, 55],
    charge: [-1350, -900],
  },
  // generated nodes from connections. key is from connection.role
  service: {
    radius: 15,
    refX: {
      end: 10,
      start: -7,
    },
    linkDistance: [250, 250],
    charge: [-1900, -1900],
  },
  cloud: {
    charge: [-1900, -900],
    linkDistance: [150, 70],
  },
};

export class Nodes {
  constructor() {
    this.nodes = [];
  }
  static radius(type) {
    if (!nodeProperties[type]) debugger;
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
      if (!nodeProperties[key]) debugger;
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
    if (!nodeProperties[d.nodeType])
      console.log(`no properties for nodeType ${d.nodeType}`);
    let charge = nodeProperties[d.nodeType].charge;
    return Nodes.forceScale(nodeCount, charge);
  }
  gravity(d, nodeCount) {
    return Nodes.forceScale(nodeCount, [0.0001, 0.1]);
  }
  setFixed(d, fixed) {
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
    return this.nodes.find((n) => n.name === name);
    /*
    for (let i = 0; i < this.nodes.length; ++i) {
      if (this.nodes[i].name === name) return this.nodes[i];
    }
    return null;
    */
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
        fixed: d.fixed,
      });
    });
  }

  getOrCreateNode({ name, nodeType, x, y, fixed, heightFn, widthFn }) {
    return new Node({ name, nodeType, x, y, fixed, heightFn, widthFn });
  }

  add(obj) {
    this.nodes.push(obj);
    return obj;
  }

  addUsing({ name, nodeType, x, y, fixed, heightFn, widthFn }) {
    let obj = this.getOrCreateNode({
      name,
      nodeType,
      x,
      y,
      fixed,
      heightFn,
      widthFn,
    });
    return this.add(obj);
  }
  clearHighlighted() {
    for (let i = 0; i < this.nodes.length; ++i) {
      this.nodes[i].highlighted = false;
    }
  }
}
