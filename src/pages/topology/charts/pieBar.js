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
import { Chart, ChartAxis, ChartBar, ChartPie } from "@patternfly/react-charts";
import * as d3 from "d3";
import "./charts.css";
import { utils } from "../../../utilities";
import { chartUtils } from "./chartUtils";
import { BAR_CHART, PIE_CHART } from "./chartViewer";
export const defaultData = [{ name: " ", x: " ", y: 0 }];

class PieBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: defaultData,
      height: 0,
      realHeight: 0,
      width: 300,
      legendHeight: 31,
      toolbarHeight: 36,
      headerHeight: 56,
      tickLabel: utils.Icap(utils.statName(this.props.stat)),
    };
    // so we can detect when the stat changes
    this.stat = this.props.stat;

    // detect when type changes
    this.type = this.props.type;
  }

  componentDidMount = () => {
    this.init();
  };

  componentDidUpdate = () => {
    if (this.props.type === BAR_CHART) {
      /*
      const id = `#sk-chart-container-${this.props.type}-${this.props.direction} svg`;
      const barChart = d3.select(id);
      const height = this.getHeight() + 20;
      if (barChart && barChart.size() > 0) {
        barChart
          .attr("height", height)
          .attr("viewBox", `0 0 ${this.state.width} ${height}`);
      }
      */
      const kData =
        Array.isArray(this.state.data) &&
        this.state.data.some((datum) =>
          utils.formatBytes(datum.y).includes("K")
        );
      const kLabel = this.state.tickLabel.includes("K");
      if (kData !== kLabel || this.props.stat !== this.stat) {
        this.stat = this.props.stat;
        this.setState({
          tickLabel: `${kData ? "K" : ""} ${utils.Icap(
            utils.statName(this.props.stat)
          )}`,
        });
      }
    }
    if (this.props.type !== this.type) {
      this.type = this.props.type;
      this.init(this.props.type);
    }
  };

  init = (type) => {
    if (!type) type = this.props.type;
    let { all, headerText, address, site_info } = chartUtils.init(
      this.props.site,
      this.props.data,
      this.props.deployment,
      this.props.direction,
      this.props.stat
    );
    let requests, data;
    if (all) {
      requests = this.props.viewObj.allRequests(
        this.props.service.VAN,
        this.props.direction,
        this.props.stat,
        this.props.showExternal
      );
    } else {
      requests = this.props.viewObj.specificRequests({
        VAN: this.props.service.VAN,
        direction: this.props.direction,
        stat: this.props.stat,
        address,
        site_info,
        showExternal: this.props.showExternal,
      });
    }
    data = Object.keys(requests).map((key) => {
      const request = requests[key];
      const color = request.color;
      const stroke = utils.rgbToHex(d3.rgb(color).darker(0.6));
      const fill = utils.rgbToHex(d3.rgb(color).brighter(0.6));
      return {
        key: request.key,
        all: request.all,
        name: request.shortName,
        value: utils.formatStat(this.props.stat, request.requests),
        x: request.baseName,
        y: request.requests,
        stroke,
        fill,
        label: " ",
      };
    });
    // only one datum and its value is 0? remove it
    // this can happen when a service has no input or output
    if (Object.keys(data).length === 1) {
      const key = Object.keys(data)[0];
      if (data[key].y === 0) {
        data = {};
      }
    }

    let {
      legendHeight,
      toolbarHeight,
      headerHeight,
      width,
      height,
      realHeight,
    } = this.state;
    const containerId = this.props.containerId
      ? this.props.containerId
      : "skAllCharts";
    const container = d3.select(`#${containerId}`);
    const sizes = utils.getSizes(container.node());
    const bounding = container.node().getBoundingClientRect();
    const pageHeight =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight;
    const legendSize = utils.getSizes(
      d3.select(".sk-chart-legend-container").node()
    );
    const toolbarSize = utils.getSizes(d3.select(".sk-chart-toolbar").node());
    const headerSize = utils.getSizes(d3.select(".sk-chart-header").node(), [
      toolbarSize[0],
      56,
    ]);
    width = sizes[0];
    height = sizes[0];
    realHeight = pageHeight - bounding.top + 2;
    legendHeight = legendSize[1];
    toolbarHeight = toolbarSize[1];
    headerHeight = headerSize[1];

    //console.log(`${containerId} w ${width} rh ${realHeight}`);
    let allChartsContainer = d3.select("#skAllCharts");
    if (!allChartsContainer.empty()) {
      if (width > realHeight && this.props.type === PIE_CHART) {
        // set container display to flex
        //console.log("flex");
        allChartsContainer.style("display", "flex");
      } else {
        allChartsContainer.style("display", "block");
        //console.log("block");
      }
    }

    this.setState({
      data,
      width,
      height,
      realHeight,
      toolbarHeight,
      headerHeight,
      legendHeight,
      headerText,
      tickLabel: utils.Icap(utils.statName(this.props.stat)),
    });
  };

  doUpdate = (type) => {
    this.init(type);
  };

  getWidth = () => {
    if (this.props.type === PIE_CHART) {
      if (this.state.width > this.state.realHeight) {
        // side by side
        return `${this.state.width / 2}px`;
      }
      // top bottom
      return "100%";
    }
  };
  getBarHeight = () => {
    if (this.state.width > this.state.realHeight) {
    }
    const count = this.state.data.length;
    const perRow = 30;
    const xAxis = 80;
    return count * perRow + xAxis + this.state.headerHeight;
  };

  getHeight = () => {
    if (this.props.type === PIE_CHART) {
      if (this.state.width > this.state.realHeight) {
        // side by side
        return (
          this.state.realHeight -
          this.state.toolbarHeight -
          this.state.legendHeight
        );
      }
      // over under
      //console.log(`getting height for over/under pie ${this.state.realHeight}-${}`)
      return (
        (this.state.realHeight -
          this.state.toolbarHeight -
          this.state.legendHeight) /
        2
      );
    }
    return this.getBarHeight() + this.state.headerHeight;
  };

  getPieHeight = () => {
    if (this.state.width > this.state.realHeight) {
      // side by side
      return (
        this.state.realHeight -
        this.state.toolbarHeight -
        this.state.legendHeight -
        this.state.headerHeight
      );
    }
    // over under
    //console.log(`getting height for over/under pie ${this.state.realHeight}-${}`)
    return (
      (this.state.realHeight -
        this.state.legendHeight -
        this.state.toolbarHeight -
        this.state.headerHeight * 2) /
      2
    );
  };

  getPieWidth = () => {
    if (this.state.width > this.state.realHeight) {
      return this.state.width / 2;
    }
    return this.state.width;
  };
  render() {
    const { width, headerText, tickLabel } = this.state;
    let { data } = this.state;

    // Padding left for bar chart is needed to allow room for the service names.
    // Service names are stored in the .x attribute of the data
    // Use a sliding scale per character as an estimate
    const getPaddingLeft = () => {
      const ys = d3.scale
        .linear()
        .domain([3, 4, 20, 100])
        .range([48, 50, 170, 800]);

      const padding = Math.max(...data.map((datum) => datum.x.length));
      return ys(padding);
    };
    const showChart =
      Object.keys(data).length > 0 &&
      JSON.stringify(data) !== JSON.stringify(defaultData);

    if (this.state.height === 0) {
      return <React.Fragment />;
    }
    /*

                height={this.getHeight()}
                width={width}

            */
    return (
      showChart && (
        <div
          style={{
            height: `${this.getHeight()}px`,
            width: this.getWidth(),
          }}
          id={`sk-chart-container-${this.props.type}-${this.props.direction}`}
          className={`sk-chart-container ${
            this.props.direction === "out" ? "sk-chart-separated" : ""
          }`}
        >
          <div className="sk-chart-header">{headerText}</div>
          {this.props.type === PIE_CHART && (
            <ChartPie
              ariaDesc="pie chart"
              constrainToVisibleArea={true}
              allowTooltip={false}
              data={data}
              padding={{
                bottom: 20,
                left: 20,
                right: 20,
                top: 0,
              }}
              padAngle={0.5}
              height={this.getPieHeight()}
              width={this.getPieWidth()}
              style={{
                data: {
                  stroke: ({ datum }) => datum.stroke,
                  strokeWidth: 1,
                  fill: ({ datum }) => datum.fill,
                },
              }}
              events={chartUtils.events({
                accessor: (data) => data.datum,
                tooltipGenerator: (data) =>
                  `${data.datum.name} ${data.datum.value}`,
                strokeWidth: 2,
                handleArcOver: this.props.handleArcOver,
                showTooltip: this.props.showTooltip,
                data: this.props.data,
                deployment: this.props.deployment,
              })}
            />
          )}
          {this.props.type === BAR_CHART && (
            <Chart
              ariaDesc={headerText}
              allowTooltip={false}
              domainPadding={{ x: [0, 0] }}
              width={width}
              height={this.getBarHeight()}
              padding={{
                bottom: 60,
                left: getPaddingLeft(),
                right: 40,
                top: 20,
              }}
            >
              <ChartAxis />
              <ChartAxis
                dependentAxis
                showGrid
                fixLabelOverlap={true}
                tickFormat={chartUtils.tickFormat}
                label={tickLabel}
              />
              <ChartBar
                horizontal
                data={data}
                style={{
                  data: {
                    stroke: ({ datum }) => datum.stroke,
                    strokeWidth: 1,
                    fill: ({ datum }) => datum.fill,
                  },
                }}
                events={chartUtils.events({
                  accessor: (data) => data.datum,
                  tooltipGenerator: (data) =>
                    `${data.datum.name} ${data.datum.value}`,
                  strokeWidth: 2,
                  handleArcOver: this.props.handleArcOver,
                  showTooltip: this.props.showTooltip,
                  data: this.props.data,
                  deployment: this.props.deployment,
                })}
              />
            </Chart>
          )}
        </div>
      )
    );
  }
}

export default PieBar;
