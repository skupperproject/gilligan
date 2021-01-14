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

import React, { Component } from "react";
import Draggable from "react-draggable";
import * as d3 from "d3";
import { utils } from "../../utilities";
import { addMarkers } from "../topology/svgUtils";
import "./legend.css";

const LEGEND_POSITION = "legend";
class LegendComponent extends Component {
  constructor(props) {
    super(props);
    this.state = { legendPosition: { x: 0, y: 0 } };
    this.legendSections = [{ title: "Connections", data: [] }];
  }

  componentDidMount = () => {
    const legendRect = d3
      .select("#sk-legend")
      .node()
      .getBoundingClientRect();
    const containerRect = d3
      .select("#topology")
      .node()
      .getBoundingClientRect();
    let initialOffset = utils.getSaved(LEGEND_POSITION, { x: 0, y: 0 });
    const legendPosition = {
      x: containerRect.width - legendRect.width - 10 + initialOffset.x,
      y: containerRect.height - legendRect.height - 10 + initialOffset.y,
    };
    this.setState({ legendPosition });
    this.svg = d3
      .select("#sk-legend-svg")
      .append("svg")
      .attr("width", legendRect.width);

    this.svg.append("svg:defs").attr("class", "marker-defs");

    addMarkers(this.svg);

    const data = [
      {
        cls: "site",
        marker: "site-end",
        text: "Router connection",
        stroke: null,
      },
      {
        cls: "service",
        marker: "http-end",
        text: "HTTP traffic",
        stroke: "black",
      },
      {
        cls: "servicesankeyDir tcp",
        marker: "http-end",
        text: "TCP traffic",
        stroke: "black",
      },
    ];
    let connections = this.svg.append("g").attr("class", "connections");
    connections = connections.selectAll("g").data(data);
    const connEnter = connections.enter();
    let connSection = connEnter
      .append("g")
      .attr("transform", (d, i) => `translate(0, ${i * 25})`);
    connSection
      .append("path")
      .attr("class", (d) => d.cls)
      .attr("marker-end", (d) => `url(#${d.marker})`)
      .attr("stroke", (d) => d.stroke)
      .attr("d", "M 10 10 L 100 10");
    connSection
      .append("text")
      .attr("x", 110)
      .attr("y", 15)
      .text((d) => d.text);

    let objs = this.svg.append("g").attr("class", "objects");
    objs.attr("transform", "translate(320, 0)");
    const site = objs.append("g");
    site
      .append("circle")
      .attr("class", "network")
      .attr("r", 10)
      .attr("cx", 10)
      .attr("cy", 12)
      .attr("fill", "#eaeaea")
      .attr("stroke", "black");
    site
      .append("text")
      .attr("x", 50)
      .attr("y", 15)
      .text("Site");

    const edgeSite = objs.append("g").attr("transform", "translate(0, 30)");
    edgeSite
      .append("circle")
      .attr("class", "network edge")
      .attr("r", 10)
      .attr("cx", 10)
      .attr("cy", 12)
      .attr("fill", "#eaeaea")
      .attr("stroke", "black");
    edgeSite
      .append("text")
      .attr("x", 50)
      .attr("y", 15)
      .text("Edge site");

    const service = objs.append("g").attr("transform", "translate(0, 60)");
    service
      .append("rect")
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("width", 40)
      .attr("height", 20)
      .attr("fill", "#eaeaea")
      .attr("stroke", "black");
    service
      .append("text")
      .attr("x", 50)
      .attr("y", 15)
      .text("Service");
  };

  handleStop = (e, o) => {
    const legendRect = d3
      .select("#sk-legend")
      .node()
      .getBoundingClientRect();
    const containerRect = d3
      .select("#topology")
      .node()
      .getBoundingClientRect();

    const lowerRight = {
      x: containerRect.width - legendRect.width - 10,
      y: containerRect.height - legendRect.height - 10,
    };
    const offset = {
      x: legendRect.left - lowerRight.x - containerRect.x,
      y: legendRect.top - lowerRight.y - containerRect.y,
    };
    utils.setSaved(LEGEND_POSITION, offset);
  };

  render() {
    return (
      <Draggable
        axis="both"
        handle=".handle"
        positionOffset={this.state.legendPosition}
        scale={1}
        onStop={this.handleStop}
      >
        <div
          className="pf-c-modal-box sk-modal sk-legendbox"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          id="sk-legend"
        >
          <div className="pf-c-title pf-m-2xl handle" id="modal-title">
            Legend
            <button
              className="pf-c-button pf-m-plain sk-close"
              type="button"
              aria-label="Close"
              onClick={this.props.handleCloseLegend}
            >
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
          <div
            className="pf-c-modal-box__body"
            id="modal-description"
            ref={(el) => (this.legendRef = el)}
          >
            <div id="sk-legend-svg"></div>
          </div>
        </div>
      </Draggable>
    );
  }
}

export default LegendComponent;
