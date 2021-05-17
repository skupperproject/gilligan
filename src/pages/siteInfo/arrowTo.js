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
import * as d3 from "d3";
import { addMarkers } from "../topology/svgUtils";

const ARROW_ID = "SKARROWTO";

class ArrowTo extends React.Component {
  constructor(props) {
    super(props);
    this.state = { initialized: false };
  }

  componentDidMount = () => {
    const { initialized } = this.state;

    if (!initialized) {
      const targetRef = document.getElementById(this.props.targetId);
      const sourceRef = document.getElementById(`${ARROW_ID}_CONTAINER`);
      if (targetRef && sourceRef) {
        const targetRect = targetRef.getBoundingClientRect();
        const sourceRect = sourceRef.getBoundingClientRect();
        const body = d3.select("body");
        const gap = 5;
        const strokeWidth = 2;
        const width = targetRect.right - sourceRect.left + gap * 2;
        const height = sourceRect.top - targetRect.top + gap * 2;
        const fullHeight = (height * 4) / 3;
        if (!body.empty()) {
          const c0 = { x: width / 4, y: (height * 4) / 3 };
          const c1 = { x: width / 2, y: height / 2 };
          const d = `M0,${height - gap} C${c0.x},${c0.y} ${c1.x},${c1.y} ${
            width - targetRect.width - gap
          },${targetRect.height + gap}`;
          body.select(`#${ARROW_ID}`).remove();
          const svg = body
            .append("svg")
            .attr("id", ARROW_ID)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("width", width)
            .attr("height", fullHeight)
            .attr("class", "sk-initial-path")
            .style({ left: sourceRect.left, top: targetRect.top - gap * 2 });

          svg.append("svg:defs").attr("class", "marker-defs");

          addMarkers(svg);
          svg
            .append("g")
            .append("path")
            .attr("class", "bezier")
            .style({
              stroke: "black",
              "stroke-width": strokeWidth,
              fill: "transparent",
            })
            .attr("d", d)
            .attr("marker-end", "url(#http-end)");

          svg
            .append("g")
            .attr(
              "transform",
              `translate(${width - targetRect.width - gap * 2},${
                (gap * 3) / 2 + strokeWidth
              })`
            )
            .append("ellipse")
            .attr("cx", targetRect.width / 2)
            .attr("cy", targetRect.height / 2)
            .attr("rx", targetRect.width / 2 + gap)
            .attr("ry", targetRect.height / 2 + gap)
            .style({
              stroke: "black",
              "stroke-width": strokeWidth,
              fill: "transparent",
            });
        }
        this.setState({
          initialized: true,
        });
      }
    }
  };

  componentWillUnmount = () => {
    d3.select(`#${ARROW_ID}`).remove();
  };

  update = () => {};

  animateIn = () => {
    const svg = d3.select(`#${ARROW_ID}`);
    if (!svg.empty()) {
      // remove the sk-initial-path class to make the path visible
      svg.attr("class", null);

      const path = svg.select("path.bezier");
      var totalLength = path.node().getTotalLength();

      // make the path a single dash with a dashoffset of the length of the path
      // this makes the dash 0 length
      path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        // not transition the dash to the full length of the path
        .transition()
        .duration(100)
        .attr("stroke-dashoffset", 0);
    }
  };

  render() {
    return <div id={`${ARROW_ID}_CONTAINER`}></div>;
  }
}
export default ArrowTo;
