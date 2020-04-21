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

import TooltipTable from "./tooltipTable";

var React = require("react");

export class Link {
  constructor(source, target, dir, cls, uid) {
    this.source = source;
    this.target = target;
    this.left = dir === "in" || dir === "both";
    this.right = dir === "out" || dir === "both";
    this.cls = cls;
    this.uid = uid;
    this.uuid = uid;
  }
  markerId(end) {
    let selhigh = this.highlighted
      ? "highlighted"
      : this.selected
      ? "selected"
      : "";
    if (selhigh === "" && !this.left && !this.right) selhigh = "unknown";
    //if (this.cls === "target") selhigh = "unknown";
    return `-${selhigh}-${
      end === "end" ? this.target.radius() : this.source.radius()
    }`;
  }
  toolTip(event) {
    return new Promise((resolve) => {
      const rows = [];
      if (this.address)
        rows.push([
          "Address",
          `${this.target.name.toLowerCase()}/get${this.source.name.replace(
            " ",
            ""
          )}`,
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
    const sxoff = Math.max(this.source.getWidth(), 130);
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
    return this.links.push(new Link(source, target, dir, cls, uid)) - 1;
  }
  getLink(_source, _target, dir, cls, uid) {
    for (let i = 0; i < this.links.length; i++) {
      let s = this.links[i].source,
        t = this.links[i].target;
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

  clearHighlighted() {
    for (let i = 0; i < this.links.length; ++i) {
      this.links[i].highlighted = false;
    }
  }
}
