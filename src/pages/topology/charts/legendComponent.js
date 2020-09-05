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
import RoutersComponent from "../chord/routersComponent";
import { utils } from "../../../utilities";

class SkupperLegend extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  handleHoverLegend = (legend, over) => {
    this.props.handleArcOver({ key: legend, all: true, legend: true }, over);
  };

  render() {
    const getArcColors = () => {
      if (
        this.props.site &&
        (!this.props.deployment ||
          (this.props.data !== null && this.props.data.nodeType === "cluster"))
      ) {
        const colors = {};
        for (let site_id in utils.siteColors) {
          let name = utils.siteColors[site_id].name;
          const color = utils.siteColors[site_id].color;
          colors[name] = color;
        }
        return colors;
      }
      return utils.serviceColors;
    };

    return (
      <div className="sk-chart-legend-container">
        <RoutersComponent
          arcColors={getArcColors()}
          handleHoverRouter={this.handleHoverLegend}
        ></RoutersComponent>
      </div>
    );
  }
}

export default SkupperLegend;
