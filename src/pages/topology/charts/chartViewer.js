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
import ChordViewer from "../chord/chordViewer";
import PieBar from "./pieBar";
import ChartToolbar from "./chartToolbar";
import SkupperLegend from "./legendComponent";
import QDRPopup from "../../../qdrPopup";
import { getSaved, setSaved, positionPopup } from "../../../utilities";

const CHART_TYPE_KEY = "chrtype";
const CHART_TYPE_DEFAULT = {
  service: "pie",
  site: "pie",
  deployment: "pie",
};

class ChartViewer extends Component {
  constructor(props) {
    super(props);
    this.savedTypes = getSaved(CHART_TYPE_KEY, CHART_TYPE_DEFAULT);
    this.state = { type: this.savedTypes[this.props.view], popupContent: null };
  }

  componentDidMount = () => {
    if (this.props.handleMounted) {
      this.props.handleMounted();
    }
  };
  doUpdate = () => {
    this.pieRef1.doUpdate();
    this.pieRef2.doUpdate();
    this.chordRef.doUpdate();
  };

  init = () => {
    this.setState({ type: this.savedTypes[this.props.view] }, () => {
      this.pieRef1.init();
      this.pieRef2.init();
      this.chordRef.init();
    });
  };

  handleChangeChartType = (type) => {
    this.savedTypes[this.props.view] = type;
    this.setState({ type }, () => {
      setSaved(CHART_TYPE_KEY, this.savedTypes);
    });
  };

  showTooltip = (content, eventX, eventY) => {
    this.setState({ popupContent: content }, () => {
      if (content) {
        // after the content has rendered, position it
        positionPopup({
          containerSelector: "#skAllCharts",
          popupSelector: "#popover-div",
          constrainY: false,
          eventX,
          eventY,
        });
      }
    });
  };

  render() {
    return (
      <React.Fragment>
        <ChartToolbar
          type={this.state.type}
          handleChangeChartType={this.handleChangeChartType}
        />
        <div className="sk-all-charts-container" id="skAllCharts">
          <div
            id="popover-div"
            className={
              this.state.popupContent
                ? "sk-popover-div"
                : "sk-popover-div hidden"
            }
            ref={(el) => (this.popupRef = el)}
          >
            <QDRPopup content={this.state.popupContent}></QDRPopup>
          </div>

          <PieBar
            ref={(el) => (this.pieRef1 = el)}
            {...this.props}
            direction="in"
            type={this.state.type}
            showTooltip={this.showTooltip}
            comment="Pie or bar chart for incoming metric"
          />
          <PieBar
            ref={(el) => (this.pieRef2 = el)}
            {...this.props}
            direction="out"
            type={this.state.type}
            showTooltip={this.showTooltip}
            comment="Pie or bar chart for outgoing metric"
          />
          <ChordViewer
            ref={(el) => (this.chordRef = el)}
            {...this.props}
            showTooltip={this.showTooltip}
            noLegend
            comment="Chord chart that show both incoming and outgoing"
          />
          <SkupperLegend
            ref={(el) => (this.legendRef = el)}
            {...this.props}
            showTooltip={this.showTooltip}
            comment="Stand-alone legend"
          />
        </div>
      </React.Fragment>
    );
  }
}

export default ChartViewer;
