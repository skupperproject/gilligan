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
import { utils } from "../../../utilities";
import * as d3 from "d3";

class RoutersComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  color = (c) => utils.rgbToHex(d3.rgb(c).brighter(0.6));

  render() {
    return (
      <ul className="sk-topology-legend-container">
        {Object.keys(this.props.arcColors).map((router, i) => {
          const color = this.props.arcColors[router];
          return (
            <li
              className="sk-topology-legend-line"
              key={`legend-${i}`}
              onMouseEnter={() => this.props.handleHoverRouter(router, true)}
              onMouseLeave={() => this.props.handleHoverRouter(router, false)}
            >
              <span
                className="sk-topology-legend-color"
                style={{
                  backgroundColor: this.color(color),
                  borderColor: utils.rgbToHex(
                    d3.rgb(this.color(color)).darker(0.6)
                  ),
                }}
              ></span>
              <span className="sk-topology-legend-text" title={router}>
                {utils.shortName(router)}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }
}

export default RoutersComponent;

/*
        <ul className="routers">
          {Object.keys(this.props.arcColors).map((router, i) => {
            return (
              <li
                key={`router-${i}`}
                className="legend-line"
                onMouseEnter={() => this.props.handleHoverRouter(router, true)}
                onMouseLeave={() => this.props.handleHoverRouter(router, false)}
              >
                <span
                  className="legend-color"
                  style={{
                    backgroundColor: this.color(this.props.arcColors[router]),
                    borderColor: utils.rgbToHex(
                      d3
                        .rgb(this.color(this.props.arcColors[router]))
                        .darker(0.6)
                    ),
                  }}
                ></span>
                <span className="legend-router legend-text" title={router}>
                  {utils.shortName(router)}
                </span>
              </li>
            );
          })}
        </ul>
*/
