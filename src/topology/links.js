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

import { utils } from "../amqp/utilities.js";
import TooltipTable from "../tooltipTable";

var React = require("react");

class Link {
  constructor(source, target, dir, cls, uid) {
    this.source = source;
    this.target = target;
    this.left = dir === "in" || dir === "both";
    this.right = dir === "out" || dir === "both";
    this.cls = cls;
    this.uid = uid;
  }
  markerId(end) {
    let selhigh = this.highlighted
      ? "highlighted"
      : this.selected
      ? "selected"
      : "";
    if (selhigh === "" && (!this.left && !this.right)) selhigh = "unknown";
    //if (this.cls === "target") selhigh = "unknown";
    return `-${selhigh}-${
      end === "end" ? this.target.radius() : this.source.radius()
    }`;
  }
  toolTip(event) {
    return new Promise(resolve => {
      const rows = [];
      if (this.address)
        rows.push([
          "Address",
          `${this.target.name.toLowerCase()}/get${this.source.name.replace(
            " ",
            ""
          )}`
        ]);
      resolve(<TooltipTable rows={rows} />);
    });
  }
  endpoints(t) {
    let sx =
      this.source.orgx +
      (this.source.x - this.source.orgx) * t +
      this.source.parentNode.x * (1 - t);
    let sy =
      this.source.orgy +
      (this.source.y - this.source.orgy) * t +
      this.source.parentNode.y * (1 - t);
    let tx =
      this.target.orgx +
      (this.target.x - this.target.orgx) * t +
      this.target.parentNode.x * (1 - t);
    let ty =
      this.target.orgy +
      (this.target.y - this.target.orgy) * t +
      this.target.parentNode.y * (1 - t);
    const sxoff = 130;
    const syoff = 20;
    const txoff = 0;
    const tyoff = 20;
    return { sx, sy, tx, ty, sxoff, syoff, txoff, tyoff };
  }
}

export class Links {
  constructor() {
    this.links = [];
  }
  reset() {
    this.links.length = 0;
  }
  getLinkSource(nodesIndex) {
    for (let i = 0; i < this.links.length; ++i) {
      if (this.links[i].target === nodesIndex) return i;
    }
    return -1;
  }

  addLink({ source, target, dir, cls, uid }) {
    this.links.push(new Link(source, target, dir, cls, uid));
  }
  getLink(_source, _target, dir, cls, uid) {
    for (let i = 0; i < this.links.length; i++) {
      let s = this.links[i].source,
        t = this.links[i].target;
      if (typeof this.links[i].source === "object") {
        s = s.id;
        t = t.id;
      }
      if (s === _source && t === _target) {
        return i;
      }
      // same link, just reversed
      if (s === _target && t === _source) {
        return -i;
      }
    }
    if (
      this.links.some(function(l) {
        return l.uid === uid;
      })
    )
      uid = uid + "." + this.links.length;
    return this.links.push(new Link(_source, _target, dir, cls, uid)) - 1;
  }
  linkFor(source, target) {
    for (let i = 0; i < this.links.length; ++i) {
      if (this.links[i].source === source && this.links[i].target === target)
        return this.links[i];
      if (this.links[i].source === target && this.links[i].target === source)
        return this.links[i];
    }
    // the selected node was a client/broker
    return null;
  }

  getPosition(name, nodes, source, client, height, localStorage) {
    let position = localStorage[name]
      ? JSON.parse(localStorage[name])
      : undefined;
    if (typeof position === "undefined") {
      position = {
        x: Math.round(
          nodes.get(source).x + 40 * Math.sin(client / (Math.PI * 2.0))
        ),
        y: Math.round(
          nodes.get(source).y + 40 * Math.cos(client / (Math.PI * 2.0))
        ),
        fixed: false,
        animate: true
      };
    } else position.animate = false;
    if (position.y > height) {
      position.y = Math.round(
        nodes.get(source).y + 40 + Math.cos(client / (Math.PI * 2.0))
      );
    }
    if (position.x === null || position.y === null) {
      position.x = Math.round(
        nodes.get(source).x + 40 * Math.sin(client / (Math.PI * 2.0))
      );
      position.y = Math.round(
        nodes.get(source).y + 40 * Math.cos(client / (Math.PI * 2.0))
      );
    }
    position.fixed = position.fixed ? true : false;
    return position;
  }
  initialize(reality, nodes, unknowns, height, localStorage, view, extra) {
    this.reset();
    if (view === "reality") {
      for (let i = 0; i < reality.clusters.length; i++) {
        for (let j = i + 1; j < reality.clusters.length; j++) {
          this.getLink(
            i,
            j,
            "both",
            "",
            `${nodes.get(i).uid()}-${nodes.get(j).uid()}`
          );
        }
      }
      reality.applications.forEach(application => {
        const source = nodes.nodes.findIndex(n => n.name === application.name);
        application.connections.forEach((connection, connectionIndex) => {
          const clusterName = connection.serviceInstance.cluster.name;
          const target = reality.clusters.findIndex(
            cluster => cluster.name === clusterName
          );
          const index =
            this.links.push(
              new Link(
                source,
                target,
                "bold",
                "cloud",
                `${nodes.get(source).uid()}-${nodes.get(target).uid()}-${this
                  .links.length - 1}`
              )
            ) - 1;
          const instance = reality.serviceInstances.findIndex(
            si =>
              si.serviceType.name ===
                connection.serviceInstance.serviceType.name &&
              si.type === connection.serviceInstance.type &&
              si.cluster.name === connection.serviceInstance.cluster.name &&
              si.namespace === connection.serviceInstance.namespace
          );
          console.log(
            `creating link between ${source} and ${target} to instance ${connectionIndex}`
          );
          this.links[index].instance = connectionIndex;
          this.links[index].sourceOffset = { x: 40, y: 40 };
        });
      });
    }
    // for view "network", links are between nodes that contain the same serviceType
    if (view === "network") {
      reality.serviceInstances.forEach(
        (serviceInstance, serviceInstanceIndex) => {
          const serviceTypeName = serviceInstance.serviceType.name;
          const clusterName = serviceInstance.cluster.name;
          for (
            let i = serviceInstanceIndex + 1;
            i < reality.serviceInstances.length;
            i++
          ) {
            const otherServiceInstance = reality.serviceInstances[i];
            if (otherServiceInstance.serviceType.name === serviceTypeName) {
              const source = reality.clusters.findIndex(
                cluster => cluster.name === clusterName
              );
              const target = reality.clusters.findIndex(
                cluster => cluster.name === otherServiceInstance.cluster.name
              );
              this.getLink(
                source,
                target,
                "both",
                "",
                `${nodes.get(source).uid()}-${nodes.get(target).uid()}`
              );
            }
          }
        }
      );
    } else if (view === "application") {
      // for each node, create a node for each of its metadata addresses
      nodes.nodes.forEach((node, nodeIndex) => {
        node.properties.forEach((address, addressIndex) => {
          const position = this.getPosition(
            address,
            nodes,
            nodeIndex,
            addressIndex,
            height,
            localStorage
          );
          let newnode = nodes.addUsing(
            node.key,
            address,
            "normal",
            nodes.getLength(),
            position.x,
            position.y,
            address,
            0,
            position.fixed,
            {}
          );
          newnode.host = "host";
          newnode.cdir = "in";
          newnode.user = "user";
          newnode.isEncrypted = true;
          newnode.connectionId = "";
          newnode.uuid = `${node.name}-${address}`;
          // create a  link between the node and the newnode
          const source = nodeIndex;
          const target = nodes.getLength() - 1;
          this.getLink(
            source,
            target,
            "in",
            "small",
            `${nodes.get(source).uid()}-${nodes.get(target).uid()}`
          );
        });
      });
    } else if (view === "service") {
      // each node is a cluster
      const serviceType = extra;
      // first, connect each node with resident serviceType to all the nodes with
      // a proxy of that serviceType
      const sourceInstance = reality.serviceInstances.find(
        si => si.serviceType.name === serviceType.name && si.type === "resident"
      );
      const targetInstances = reality.serviceInstances.filter(
        si => si.serviceType.name === serviceType.name && si.type === "proxy"
      );
      const source = nodes.nodes.findIndex(
        node => node.name === sourceInstance.cluster.location
      );
      if (source > -1) {
        nodes.nodes[source].properties.extra.type = "resident";
        targetInstances.forEach(targetInstance => {
          const target = nodes.nodes.findIndex(
            node => node.name === targetInstance.cluster.location
          );
          if (target > -1) {
            nodes.nodes[target].properties.extra.type = "proxy";
            this.getLink(
              source,
              target,
              "both",
              "",
              `${nodes.get(source).uid()}-${nodes.get(target).uid()}`
            );
          }
        });
      }
      // for each node, add sub nodes for each address used by extra.serviceType
      // node.properties.cluster is the cluster
      reality.applications.forEach((application, applicationIndex) => {
        application.connections.forEach((connection, connectionIndex) => {
          const serviceInstance = connection.serviceInstance;
          const serviceInstanceIndex = reality.serviceInstances.findIndex(
            si =>
              si.serviceType.name === serviceInstance.serviceType.name &&
              si.type === serviceInstance.type &&
              si.cluster.name === serviceInstance.cluster.name &&
              si.namespace === serviceInstance.namespace
          );
          if (serviceInstance.serviceType.name === serviceType.name) {
            const source = nodes.nodes.findIndex(
              node => node.name === serviceInstance.cluster.location
            );
            connection.addresses.forEach((addressIndex, client) => {
              // create a sub node for each address and create a link to this node
              const target = nodes.getLength();
              const address = serviceType.addresses[addressIndex];
              const container = `${nodes.nodes[source].name}-${address}`;
              const position = this.getPosition(
                container,
                nodes,
                source,
                client,
                height,
                localStorage
              );
              const addressStat = reality.addressStats.find(as => {
                return (
                  as.address === addressIndex &&
                  as.serviceInstance === serviceInstanceIndex
                );
              });
              let newnode = nodes.addUsing(
                nodes.nodes[source].key,
                container,
                "normal",
                target,
                position.x,
                position.y,
                container,
                0,
                position.fixed,
                { address, addressStat }
              );
              newnode.host = "host";
              newnode.cdir = "in";
              newnode.user = "user";
              newnode.isEncrypted = true;
              newnode.connectionId = "";
              newnode.uuid = `${nodes.nodes[source].name}-${address}`;
              // create a  link between the node and the newnode
              this.getLink(
                source,
                target,
                "in",
                "small",
                `${nodes.get(source).uid()}-${nodes.get(target).uid()}`
              );
            });
          }
        });
      });
    }
  }

  _initialize(nodeInfo, nodes, unknowns, height, localStorage, type) {
    this.reset();
    let connectionsPerContainer = {};
    let nodeIds = Object.keys(nodeInfo);
    // collect connection info for each router
    for (let source = 0; source < nodeIds.length; source++) {
      let onode = nodeInfo[nodeIds[source]];
      // skip any routers without connections
      if (
        !onode.connection ||
        !onode.connection.results ||
        onode.connection.results.length === 0
      )
        continue;

      const suid = nodes.get(source).uid();
      for (let c = 0; c < onode.connection.results.length; c++) {
        let connection = utils.flatten(
          onode.connection.attributeNames,
          onode.connection.results[c]
        );

        // we need a unique connection.container
        if (connection.container === "") {
          connection.container = connection.name
            .replace("/", "")
            .replace(":", "-");
          //utils.uuidv4();
        }
        // this is a connection to another interior router
        if (connection.role === "inter-router") {
          const target = getContainerIndex(connection.container, nodeInfo);
          if (target >= 0) {
            const tuid = nodes.get(target).uid();
            this.getLink(source, target, connection.dir, "", `${suid}-${tuid}`);
          }
          // continue;
        } else {
          if (type !== "network") {
            let target = nodes.getLength();
            let position = this.getPosition(
              connection.name,
              nodes,
              source,
              target,
              height,
              localStorage
            );
            let node = nodes.addUsing(
              nodeIds[source],
              connection.name,
              connection.role,
              target,
              position.x,
              position.y,
              connection.container,
              c,
              position.fixed,
              connection.properties
            );
            node.host = connection.host;
            node.cdir = "in";
            node.user = connection.user;
            node.isEncrypted = connection.isEncrypted;
            node.connectionId = connection.identity;
            node.uuid = `${connection.container}-${node.routerId}-${node.nodeType}-${node.cdir}`;
            const suid = nodes.get(source).uid();
            const tuid = nodes.get(target).uid();
            this.getLink(source, target, "in", "small", `${suid}-${tuid}`);
          }
        }
        /*
        if (!connectionsPerContainer[connection.container])
          connectionsPerContainer[connection.container] = [];
        let linksDir = getLinkDir(connection, onode);
        if (linksDir === "unknown") unknowns.push(nodeIds[source]);
        connectionsPerContainer[connection.container].push({
          source: source,
          linksDir: linksDir,
          connection: connection,
          resultsIndex: c
        });
        */
      }
    }
    /*
    let unique = {};
    // create map of type:id:dir to [containers]
    for (let container in connectionsPerContainer) {
      let key = getKey(connectionsPerContainer[container]);
      if (!unique[key])
        unique[key] = {
          c: [],
          nodes: []
        };
      unique[key].c.push(container);
    }
    for (let key in unique) {
      let containers = unique[key].c;
      for (let i = 0; i < containers.length; i++) {
        let containerId = containers[i];
        let connections = connectionsPerContainer[containerId];
        let container = connections[0];
        let name =
          utils.nameFromId(nodeIds[container.source]) +
          "." +
          container.connection.identity;
        let position = this.getPosition(
          name,
          nodes,
          container.source,
          container.resultsIndex,
          height,
          localStorage
        );
        let node = nodes.getOrCreateNode(
          nodeIds[container.source],
          name,
          container.connection.role,
          nodes.getLength(),
          position.x,
          position.y,
          container.connection.container,
          container.resultsIndex,
          position.fixed,
          container.connection.properties
        );
        node.host = container.connection.host;
        node.cdir = container.linksDir;
        node.user = container.connection.user;
        node.isEncrypted = container.connection.isEncrypted;
        node.connectionId = container.connection.identity;
        node.uuid = `${containerId}-${node.routerId}-${node.nodeType}-${node.cdir}`;
        // in case a created node (or group) is connected to multiple
        // routers, we need to remember all the routers for traffic animations
        for (let c = 1; c < connections.length; c++) {
          if (!node.alsoConnectsTo) node.alsoConnectsTo = [];
          node.alsoConnectsTo.push({
            key: nodeIds[connections[c].source],
            cdir: connections[c].linksDir,
            connectionId: connections[c].connection.identity
          });
        }
        unique[key].nodes.push(node);
      }
    }
    for (let key in unique) {
      nodes.add(unique[key].nodes[0]);
      let target = nodes.nodes.length - 1;
      unique[key].nodes[0].normals = [unique[key].nodes[0]];
      for (let n = 1; n < unique[key].nodes.length; n++) {
        unique[key].nodes[0].normals.push(unique[key].nodes[n]);
      }
      let containerId = unique[key].c[0];
      let links = connectionsPerContainer[containerId];
      for (let l = 0; l < links.length; l++) {
        let source = links[l].source;
        const suid = nodes.get(source).uid();
        const tuid = nodes.get(target).uid();
        this.getLink(
          links[l].source,
          target,
          links[l].linksDir,
          "small",
          `${suid}-${tuid}`
        );
      }
    }
    */
  }

  clearHighlighted() {
    for (let i = 0; i < this.links.length; ++i) {
      this.links[i].highlighted = false;
    }
  }
}

var getContainerIndex = function(_id, nodeInfo) {
  let nodeIndex = 0;
  for (let id in nodeInfo) {
    if (utils.nameFromId(id) === _id) return nodeIndex;
    ++nodeIndex;
  }
  return -1;
};

var getLinkDir = function(connection, onode) {
  let links = onode["router.link"];
  if (!links) {
    return "unknown";
  }
  let inCount = 0,
    outCount = 0;
  let typeIndex = links.attributeNames.indexOf("linkType");
  let connectionIdIndex = links.attributeNames.indexOf("connectionId");
  let dirIndex = links.attributeNames.indexOf("linkDir");
  links.results.forEach(function(linkResult) {
    if (
      linkResult[typeIndex] === "endpoint" &&
      linkResult[connectionIdIndex] === connection.identity
    )
      if (linkResult[dirIndex] === "in") ++inCount;
      else ++outCount;
  });
  if (inCount > 0 && outCount > 0) return "both";
  if (inCount > 0) return "in";
  if (outCount > 0) return "out";
  return "unknown";
};
var getKey = function(containers) {
  let parts = {};
  let connection = containers[0].connection;
  let d = {
    nodeType: connection.role,
    properties: connection.properties || {}
  };
  let connectionType = "client";
  if (utils.isConsole(connection)) connectionType = "console";
  else if (utils.isArtemis(d)) connectionType = "artemis";
  else if (utils.isQpid(d)) connectionType = "qpid";
  else if (connection.role === "edge") connectionType = "edge";
  for (let c = 0; c < containers.length; c++) {
    let container = containers[c];
    parts[`${container.source}-${container.linksDir}`] = true;
  }
  return `${connectionType}:${Object.keys(parts).join(":")}`;
};
