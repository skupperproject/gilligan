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

import React from "react";
import { pretty } from "../../../utilities";

export class LinkCard {
  constructor() {
    this.icon = (
      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="18">
        <g transform="scale(0.75)">
          <g id="path">
            <path stroke="black" strokeWidth="2" d="M2,1 L 6 1" />
            <path
              stroke="black"
              strokeWidth="2"
              fill="transparent"
              d="M6,1 C18,2, 18,12, 30,12"
            />
            <g transform="translate(30, 12)">
              <path stroke="black" fill="black" d="M 0 -5 L 10 0 L 0 5 z" />
            </g>
          </g>
          <use
            href="#path"
            transform="scale(1, -1) translate(0, -6)"
            transform-origin="center"
          />
        </g>
      </svg>
    );
    this.getTitle = (link) => {
      return "Traffic";
    };
    this.popupInfo = {
      compact: [
        { title: "Protocol", getFn: this.getProtocol },
        {
          title: (link) => this.getAttrTitle(link, "requests", "Requests"),
          getFn: (link) => this.getAttr(link, "requests"),
        },
        { title: "Bytes in", getFn: (link) => this.getAttr(link, "bytes_in") },
        {
          title: "Bytes out",
          getFn: (link) => this.getAttr(link, "bytes_out"),
        },
        {
          title: (link) => this.getAttrTitle(link, "details", "Details"),
          getFn: this.getDetails,
        },
        {
          title: (link) =>
            this.getAttrTitle(link, "latency_max", "Latency max"),
          getFn: (link) => this.getAttr(link, "latency_max"),
        },
        {
          title: (link) => this.getAttrTitle(link, "id", "Id"),
          getFn: (link) => this.getAttr(link, "id"),
        },
        {
          title: (link) => this.getAttrTitle(link, "client", "Client"),
          getFn: (link) => this.getAttr(link, "client"),
        },
      ],
      expanded: [
        {
          title: (link) => this.getAttrTitle(link, "start_time", "Start time"),
          getFn: (link) => this.getTime(link, "start_time"),
        },
        {
          title: (link) => this.getAttrTitle(link, "last_in", "Last in"),
          getFn: (link) => this.getTime(link, "last_in"),
        },
        {
          title: (link) => this.getAttrTitle(link, "last_out", "Last out"),
          getFn: (link) => this.getTime(link, "last_out"),
        },
      ],
    };
  }
  getAttrTitle = (link, attr, title) =>
    link.request[attr] ? title : undefined;
  getAttr = (link, attr) => {
    if (link.request[attr]) {
      return pretty(link.request[attr]);
    }
  };
  getTime = (link, attr) => {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    };
    return link.request[attr]
      ? new Date(link.request[attr]).toLocaleDateString("en-US", options)
      : undefined;
  };

  getDetails = (link) =>
    link.request.details
      ? JSON.stringify(link.request.details, null, 2)
      : undefined;
  getProtocol = (link) => {
    if (link.target.protocol) {
      return link.target.protocol.toUpperCase();
    }
  };
}

export default LinkCard;
