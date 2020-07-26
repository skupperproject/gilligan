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
import { ChartPie } from "@patternfly/react-charts";
import {
  Chart,
  ChartAxis,
  ChartBar,
  ChartLine,
  ChartGroup,
} from "@patternfly/react-charts";
import * as d3 from "d3";
import "./charts.css";
import { utils } from "../../../utilities";
import { LINE_CHART, BAR_CHART, PIE_CHART } from "./chartViewer";

const defaultData = [{ name: " ", x: " ", y: 0 }];
const defaultAreaData = { service: defaultData };

class PieBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: this.props.type === LINE_CHART ? defaultAreaData : defaultData,
      height: 300,
      width: 300,
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
      const id = `#sk-chart-container-${this.props.direction} svg`;
      const barChart = d3.select(id);
      const height = this.getHeight() + 20;
      if (barChart && barChart.size() > 0) {
        barChart
          .attr("height", height)
          .attr("viewBox", `0 0 ${barChart.attr("width")} ${height}`);
      }
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
    let headerText = "header text not set";
    let all = false;
    let address = this.props.data ? this.props.data.address : null;
    let site_info;
    if (this.props.site) {
      if (this.props.data === null) {
        if (this.props.deployment) {
          // all deployments
          all = true;
          headerText = utils.Icap(
            `${utils.statName(this.props.stat)} by ${
              this.props.direction === "in" ? "originating" : "destination"
            } deployment`
          );
        } else {
          // all sites
          all = true;
          headerText = utils.Icap(
            `${utils.statName(this.props.stat)} by ${
              this.props.direction === "in" ? "originating" : "destination"
            } site`
          );
        }
      } else {
        if (this.props.data.address) {
          // specific deployment
          headerText = utils.Icap(
            `${utils.statName(this.props.stat)} sent ${
              this.props.direction === "in" ? "from" : "to"
            } ${utils.shortName(this.props.data.address)} (${
              this.props.data.cluster.site_name
            })`
          );
          site_info = this.props.data.cluster.site_name;
        } else {
          // for specific site
          headerText = utils.Icap(
            `${utils.statName(this.props.stat)} sent ${
              this.props.direction === "in" ? "from" : "to"
            } ${this.props.data.site_name}`
          );
          address = this.props.data.site_id;
        }
      }
    } else {
      if (this.props.data === null) {
        // all services
        all = true;
        headerText = utils.Icap(
          `${utils.statName(this.props.stat)} by ${
            this.props.direction === "in" ? "originating" : "destination"
          } service`
        );
      } else {
        // for specific service
        headerText = utils.Icap(
          `${utils.statName(this.props.stat)} sent ${
            this.props.direction === "in" ? "from" : "to"
          } ${utils.shortName(this.props.data.address)}`
        );
      }
    }
    let requests, data;
    if (type !== LINE_CHART) {
      if (all) {
        requests = this.props.viewObj.allRequests(
          this.props.service.VAN,
          this.props.direction,
          this.props.stat
        );
      } else {
        requests = this.props.viewObj.specificRequests(
          this.props.service.VAN,
          this.props.direction,
          this.props.stat,
          address,
          site_info
        );
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
          x: request.shortName,
          y: request.requests,
          stroke,
          fill,
          label: " ",
        };
      });
    } else {
      // line charts
      if (all) {
        requests = this.props.viewObj.allTimeSeries({
          VAN: this.props.service.VAN,
          direction: this.props.direction,
          stat: this.props.stat,
          duration: this.props.duration,
        });
      } else {
        requests = this.props.viewObj.specificTimeSeries({
          VAN: this.props.service.VAN,
          direction: this.props.direction,
          stat: this.props.stat,
          duration: this.props.duration,
          address,
          site_name: site_info,
        });
      }
      /*
      [
        { name: "Cats", x: "2015", y: 1 },
        { name: "Cats", x: "2016", y: 2 },
        { name: "Cats", x: "2017", y: 5 },
        { name: "Cats", x: "2018", y: 3 },
      ]
      */
      data = {};
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
    }
    // only one datum and its value is 0? remove it
    // this can happen when a service has no input or output
    if (Object.keys(data).length === 1) {
      const key = Object.keys(data)[0];
      if (data[key].y === 0) {
        data = {};
      }
    }
    const containerId = this.props.containerId
      ? this.props.containerId
      : "sk-sidebar";
    const sizes = utils.getSizes(d3.select(`#${containerId}`).node());
    this.setState({
      data,
      width: sizes[0],
      height: sizes[0],
      headerText,
      tickLabel: utils.Icap(utils.statName(this.props.stat)),
    });
  };

  doUpdate = (type) => {
    this.init(type);
  };

  tickFormat = (tick, index, ticks) => {
    let tickValues = ticks.map((v) => utils.formatBytes(v, 0));
    if (tickValues.some((v) => v.includes("K"))) {
      tickValues = tickValues.map((v) => v.replace("K", ""));
    }
    return tickValues[index];
  };

  events = ({ accessor, tooltipGenerator, strokeWidth }) => {
    return [
      {
        target: "data",
        eventHandlers: {
          onMouseMove: (event, data) => {
            if (this.props.handleArcOver) {
              this.props.handleArcOver(
                {
                  key: accessor(data).key,
                  all: accessor(data).all,
                  legend: this.props.deployment && this.props.data !== null,
                },
                true
              );
            }
            if (this.props.showTooltip) {
              this.props.showTooltip(
                tooltipGenerator(data),
                event.clientX,
                event.clientY
              );
            }
            return [
              {
                target: "data",
                mutation: (props) => {
                  return {
                    style: {
                      strokeWidth,
                      stroke: "#06c",
                      fill: props.style.fill,
                    },
                  };
                },
              },
            ];
          },
          onMouseLeave: (e, data) => {
            if (this.props.handleArcOver) {
              this.props.handleArcOver(
                {
                  key: accessor(data).key,
                  all: accessor(data).all,
                  legend: this.props.deployment && this.props.data !== null,
                },
                false
              );
            }
            if (this.props.showTooltip) {
              this.props.showTooltip(null);
            }
            return [
              {
                target: "data",
                mutation: () => {
                  return null;
                },
              },
            ];
          },
        },
      },
    ];
  };

  getHeight = () => {
    if (this.props.type === PIE_CHART) return this.state.height;
    if (this.props.type === LINE_CHART) return this.state.height / 2;
    // 30 for each row, 40 for the x axis, at least 80
    const perRow = 30;
    const atLeast = 80;
    const count = this.state.data.length;
    return Math.max(count * perRow + 40, atLeast);
  };

  render() {
    const { height, width, headerText, tickLabel } = this.state;
    let { data } = this.state;

    // This component handles rendering linecharts and pie/bar charts. When switching between
    // chart types, if the format of the current state.data doesn't match
    // the requested chart type, don't render the chart.
    // The correct data will be generated immediately after this render and the chart will be
    // re-rendered.
    // An alternative is to not store the data in this.state, but to regenerate it before every render.
    // However, that would be inefficient since this component is rendered often.
    // TODO: A better alternative is to separate the chart types into their own components
    // and have the common methods in a base class.
    if (
      (this.props.type === LINE_CHART && Array.isArray(data)) ||
      (this.props.type !== LINE_CHART && !Array.isArray(data))
    ) {
      // The chart type changed but the data hasn't been recreated.
      // Don't render anything
      return null;
    }

    // Padding left for bar chart is needed to allow room for the service names.
    // Service names are stored in the .x attribute of the data
    // Use a sliding scale per character as an estimate
    const getPaddingLeft = () => {
      const ys = d3.scale
        .linear()
        .domain([3, 4, 20, 100])
        .range([48, 50, 170, 800]);

      let padding;
      if (this.props.type !== LINE_CHART) {
        padding = Math.max(...data.map((datum) => datum.x.length));
      } else {
        padding = 3;
      }
      return ys(padding);
    };
    return (
      Object.keys(data).length > 0 && (
        <div
          id={`sk-chart-container-${this.props.direction}`}
          className={`sk-chart-container ${
            this.props.direction === "out" ? "sk-chart-separated" : ""
          }`}
        >
          <div className="sk-chart-header">{headerText}</div>
          <div
            style={{
              height: `${this.getHeight() + 20}px`,
              width: `${width}px`,
            }}
          >
            {this.props.type === PIE_CHART && (
              <ChartPie
                ariaDesc="pie chart"
                constrainToVisibleArea={true}
                allowTooltip={false}
                data={data}
                height={height}
                width={width}
                padding={{
                  bottom: 0,
                  left: 20,
                  right: 20,
                  top: 0,
                }}
                padAngle={1}
                style={{
                  data: {
                    stroke: ({ datum }) => datum.stroke,
                    strokeWidth: 1,
                    fill: ({ datum }) => datum.fill,
                  },
                }}
                events={this.events({
                  accessor: (data) => data.datum,
                  tooltipGenerator: (data) =>
                    `${data.datum.name} ${data.datum.value}`,
                  strokeWidth: 2,
                })}
              />
            )}
            {this.props.type === LINE_CHART && (
              <Chart
                ariaDesc={headerText}
                interpolation="natural"
                allowTooltip={false}
                domainPadding={{ y: [10, 10] }}
                height={this.getHeight()}
                padding={{
                  bottom: 50,
                  left: getPaddingLeft(),
                  right: 40,
                  top: 20,
                }}
                width={width}
              >
                <ChartAxis
                  tickFormat={(t) => {
                    if (t === "1 min ago") return t;
                    const secs = parseInt(t);
                    // first one
                    if (secs === 0) return "Now";
                    const first = Object.keys(data)[0];
                    const count = data[first].length;
                    // last one
                    if ((count - 1) * 2 === secs) return t;
                    return "";
                  }}
                />
                <ChartAxis
                  comment="y-axis"
                  dependentAxis
                  showGrid
                  fixLabelOverlap={true}
                  tickFormat={(tick, index, ticks) => {
                    const t = utils.formatBytes(tick, 0);
                    return t;
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
                            fill: ({ data }) =>
                              data.length > 0 ? data[0].color : "#000000",
                            strokeWidth: 6,
                            width: "6px",
                          },
                        }}
                        events={this.events({
                          accessor: (data) => data.data[0],
                          tooltipGenerator: (data) =>
                            `${data.data[0].name} ${utils.formatStat(
                              this.props.stat,
                              data.data[0].y
                            )}`,
                          strokeWidth: 6,
                        })}
                      />
                    );
                  })}
                </ChartGroup>
              </Chart>
            )}
            {this.props.type === BAR_CHART && (
              <Chart
                ariaDesc={headerText}
                allowTooltip={false}
                domainPadding={{ x: [0, 0] }}
                height={this.getHeight()}
                padding={{
                  bottom: 50,
                  left: getPaddingLeft(),
                  right: 40,
                  top: 20,
                }}
                width={width}
              >
                <ChartAxis />
                <ChartAxis
                  dependentAxis
                  showGrid
                  fixLabelOverlap={true}
                  tickFormat={this.tickFormat}
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
                  events={this.events({
                    accessor: (data) => data.datum,
                    tooltipGenerator: (data) =>
                      `${data.datum.name} ${data.datum.value}`,
                    strokeWidth: 2,
                  })}
                />
              </Chart>
            )}
          </div>
        </div>
      )
    );
  }
}

export default PieBar;
