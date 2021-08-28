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
import {
  Chart,
  ChartAxis,
  ChartLine,
  ChartGroup,
} from "@patternfly/react-charts";
import * as d3 from "d3";
import "./charts.css";
import { utils } from "../../../utilities";
import { chartUtils } from "./chartUtils";
import { defaultData } from "./pieBar";

const defaultTSData = { service: defaultData };

class TimeSeries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: defaultTSData,
      height: 0,
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
    if (this.props.type !== this.type) {
      this.type = this.props.type;
      this.init(this.props.type);
    }
  };

  update = () => {
    this.init(this.props.type);
  };

  init = (type) => {
    if (!type) type = this.props.type;
    let dir = this.props.direction;
    if (this.props.data) {
      //dir = this.props.direction === "in" ? "out" : "in";
    }
    let { all, headerText, address, site_info } = chartUtils.init(
      this.props.site,
      this.props.data,
      this.props.deployment,
      dir,
      this.props.stat,
      type
    );
    let requests;
    // line charts
    if (all) {
      requests = this.props.viewObj.allTimeSeries({
        VAN: this.props.service.VAN,
        direction: this.props.direction,
        stat: this.props.stat,
        duration: this.props.duration,
        showExternal: this.props.showExternal,
      });
    } else {
      requests = this.props.viewObj.specificTimeSeries({
        VAN: this.props.service.VAN,
        direction: this.props.direction,
        stat: this.props.stat,
        duration: this.props.duration,
        address,
        site_name: site_info,
        showExternal: this.props.showExternal,
      });
    }
    let data = {};
    const now = new Date();
    if (requests) {
      Object.keys(requests).forEach((key) => {
        data[key] = requests[key].samples.map((sample) => {
          const timeAgoInSeconds = Math.floor((now - sample.date) / 1000);
          let { interval, epoch } = utils.getDuration(timeAgoInSeconds);
          if (epoch === "second") epoch = "sec";
          if (epoch === "minute") epoch = "min";
          const suffix = interval === 1 ? "" : "s";
          return {
            key: requests[key].key,
            name: requests[key].shortName,
            x: `${interval} ${epoch}${suffix} ago`,
            y: sample.val,
            color: requests[key].color,
          };
        });
      });
    }
    // only one datum and its value is 0? remove it
    // this can happen when a service has no input or output
    if (Object.keys(data).length === 1) {
      const key = Object.keys(data)[0];
      if (data[key].y === 0) {
        data = defaultTSData;
      }
    }
    let { legendHeight, toolbarHeight, headerHeight, width, height } =
      this.state;
    //if (height === 0) {
    const containerId = this.props.containerId
      ? this.props.containerId
      : "skAllCharts";
    const sizes = utils.getSizes(d3.select(`#${containerId}`).node());
    const legendSize = utils.getSizes(
      d3.select(".sk-chart-legend-container").node(),
      [0, 0]
    );
    const toolbarSize = utils.getSizes(
      d3.select(".sk-chart-toolbar").node(),
      [0, 0]
    );
    const headerSize = utils.getSizes(d3.select(".sk-chart-header").node(), [
      toolbarSize[0],
      56,
    ]);
    width = sizes[0];
    height = sizes[1];
    legendHeight = legendSize[1];
    toolbarHeight = toolbarSize[1];
    headerHeight = headerSize[1];
    //console.log(`${containerId} width ${width} height ${height} legend ${legendHeight} toolbar ${toolbarHeight} header ${headerHeight}`)
    //}
    let allChartsContainer = d3.select("#skAllCharts");
    if (!allChartsContainer.empty()) {
      allChartsContainer.style("display", "block");
    }

    this.setState({
      data,
      width,
      height,
      legendHeight,
      toolbarHeight,
      headerHeight,
      headerText,
      tickLabel: utils.Icap(utils.statName(this.props.stat)),
    });
  };

  doUpdate = (type) => {
    this.init(type);
  };

  getHeight = () => {
    const { data } = this.state;
    const atLeast = 80;
    const xAxis = 40;
    const count = Object.keys(data).length;

    //console.log(`${this.props.direction} count ${count} height ${Math.max(count * perRow + xAxis, atLeast)}`);
    //if (this.props.direction === "out") console.log(data);
    const scale = d3.scale.linear().domain([1, 5, 100]).range([100, 40, 30]);
    return Math.max(count * scale(count) + xAxis, atLeast);

    //return (height - toolbarHeight - headerHeight * 2 - legendHeight) / 2 - 10;
  };

  render() {
    const { width, headerText } = this.state;
    let { data } = this.state;

    // Padding left for bar chart is needed to allow room for the service names.
    // Service names are stored in the .x attribute of the data
    // Use a sliding scale per character as an estimate
    const getPaddingLeft = () => {
      const ys = d3.scale
        .linear()
        .domain([3, 4, 20, 100])
        .range([48, 50, 170, 800]);

      return ys(3);
    };
    if (this.getHeight() === 0) {
      return <React.Fragment />;
    }
    return (
      Object.keys(data).length > 0 && (
        <div
          id={`sk-chart-container-${this.props.type}-${this.props.direction}`}
          className={`sk-chart-container ${
            this.props.direction === "out" ? "sk-chart-separated" : ""
          }`}
        >
          <div className="sk-chart-header">{`${headerText} for the past minute`}</div>
          <div
            style={{
              height: `${this.getHeight()}px`,
              width: `${width}px`,
            }}
          >
            <Chart
              ariaDesc={headerText}
              interpolation="natural"
              allowTooltip={false}
              domainPadding={{ y: [10, 10] }}
              width={width}
              height={this.getHeight()}
              padding={{
                bottom: 50,
                left: getPaddingLeft() + 10,
                right: 40,
                top: 20,
              }}
            >
              <ChartAxis
                tickFormat={(t, index, ticks) => {
                  // first one
                  if (index === ticks.length - 1) return "Now";
                  // last one
                  if (index === 0) return t;
                  return "";
                }}
              />
              <ChartAxis
                comment="y-axis"
                dependentAxis
                showGrid
                fixLabelOverlap={true}
                style={{
                  tickLabels: { fontSize: 12 },
                }}
                tickFormat={(tick, index, ticks) => {
                  let same = index === 0;
                  this.decimalPlaces = 0;
                  // first time in, ensure y-axis ticks don't have duplicate labels
                  while (same) {
                    same = false;
                    let ts = ticks.map((t) =>
                      utils.formatBytes(t, this.decimalPlaces)
                    );
                    const uniqueTicks = [...new Set(ts)];
                    if (uniqueTicks.length !== ts.length) {
                      same = true;
                      if (++this.decimalPlaces > 10) {
                        same = false;
                        // all the numbers are the same up to 10 decimal places
                        ts = ticks.map((t) => utils.formatBytes(t, 0));
                      }
                    }
                    if (!same) {
                      this.ts = ts;
                    }
                  }
                  return this.ts[index];
                }}
              />
              <ChartGroup>
                {Object.keys(data).map((d) => {
                  return (
                    <ChartLine
                      key={d}
                      data={data[d]}
                      style={{
                        data: {
                          stroke: ({ data }) =>
                            data.length > 0 ? data[0].color : "#000000",
                          strokeWidth: 6,
                          width: "6px",
                        },
                      }}
                      events={chartUtils.events({
                        accessor: (data) => data.data[0],
                        tooltipGenerator: (data) =>
                          `${data.data[0].name} ${utils.formatStat(
                            this.props.stat,
                            data.data[0].y
                          )}`,
                        strokeWidth: 6,
                        handleArcOver: this.props.handleArcOver,
                        showTooltip: this.props.showTooltip,
                        data: this.props.data,
                        deployment: this.props.deployment,
                      })}
                    />
                  );
                })}
              </ChartGroup>
            </Chart>
          </div>
        </div>
      )
    );
  }
}

export default TimeSeries;
