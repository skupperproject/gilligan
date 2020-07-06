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
import { Chart, ChartAxis, ChartBar } from "@patternfly/react-charts";
import * as d3 from "d3";
import "./charts.css";

import {
  getSizes,
  siteColors,
  serviceColors,
  shortName,
  statName,
  Icap,
  rgbToHex,
  lighten,
  aggregateAttributes,
  formatStat,
  formatBytes,
} from "../../../utilities";

class PieBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [{ x: "", y: 0 }],
      height: 300,
      width: 300,
      tickLabel: Icap(statName(this.props.stat)),
    };
    // so we can detect when the stat changes
    this.stat = this.props.stat;
  }

  componentWillUnmount = () => {
    this.unmounting = true;
  };

  componentDidUpdate = () => {
    if (this.props.type === "bar") {
      const id = `#sk-chart-container-${this.props.direction} svg`;
      const barChart = d3.select(id);
      const height = this.getHeight() + 20;
      if (barChart && barChart.size() > 0) {
        barChart
          .attr("height", height)
          .attr("viewBox", `0 0 ${barChart.attr("width")} ${height}`);
      }
      console.log(this.state.data);
      const kData =
        Array.isArray(this.state.data) &&
        this.state.data.some((datum) => formatBytes(datum.y).includes("K"));
      const kLabel = this.state.tickLabel.includes("K");
      if (kData !== kLabel || this.props.stat !== this.stat) {
        this.stat = this.props.stat;
        this.setState({
          tickLabel: `${kData ? "K" : ""} ${Icap(statName(this.props.stat))}`,
        });
      }
    }
  };

  init = () => {
    const sizes = getSizes(d3.select("#sk-sidebar").node());
    let data = [];
    let headerText = "header text not set";
    if (this.props.site) {
      if (this.props.data === null) {
        if (this.props.deployment) {
          // all deployments
          headerText = Icap(
            `${statName(this.props.stat)} by ${
              this.props.direction === "in" ? "originating" : "destination"
            } deployment`
          );
          const VAN = this.props.service.VAN;
          const requests = {};
          VAN.deploymentLinks.forEach((deploymentLink) => {
            const which = this.props.direction === "in" ? "source" : "target";
            const address = deploymentLink[which].service.address;
            const site = deploymentLink[which].site.site_name;
            if (!requests.hasOwnProperty(address)) requests[address] = {};
            aggregateAttributes(
              {
                service: address,
                shortName: `${shortName(address)} (${site})`,
                requests: deploymentLink.request[this.props.stat] || 0,
              },
              requests[address]
            );
          });
          data = Object.keys(requests).map((address) => {
            const request = requests[address];
            const color = serviceColors[address];
            const stroke = rgbToHex(d3.rgb(color).darker(0.6));
            const fill = rgbToHex(d3.rgb(color).brighter(0.6));
            return {
              key: request.service,
              all: true,
              name: request.shortName,
              value: formatStat(this.props.stat, request.requests),
              x: `${request.shortName}`,
              y: request.requests,
              stroke,
              fill,
              label: " ",
            };
          });
        } else {
          // all sites
          const VAN = this.props.service.VAN;
          let stat = this.props.stat;
          if (this.props.direction === "in" && stat === "bytes_out") {
            stat = "bytes_in";
          }
          if (this.props.direction === "out" && stat === "bytes_in") {
            stat = "bytes_out";
          }
          const to = this.props.direction === "in" ? "source" : "target";
          const from = this.props.direction === "in" ? "target" : "source";
          headerText = Icap(
            `${statName(this.props.stat)} by ${
              this.props.direction === "in" ? "originating" : "destination"
            } site`
          );
          const requests = {};
          VAN.deploymentLinks.forEach((deploymentLink) => {
            const toName = deploymentLink[to].site.site_name;
            const fromId = deploymentLink[from].site.site_id;
            const toId = deploymentLink[to].site.site_id;
            if (fromId !== toId) {
              if (!requests.hasOwnProperty(toId)) requests[toId] = {};
              aggregateAttributes(
                {
                  shortName: toName,
                  requests: deploymentLink.request[stat] || 0,
                },
                requests[toId]
              );
            }
          });
          data = Object.keys(requests).map((site) => {
            const request = requests[site];
            const color = siteColors[site].color;
            const stroke = lighten(-0.5, color);
            const fill = lighten(0.5, color);
            return {
              key: site,
              name: request.shortName,
              value: formatStat(this.props.stat, request.requests),
              x: request.shortName,
              y: request.requests,
              stroke,
              fill,
              label: " ",
            };
          });
        }
      } else {
        if (this.props.data.address) {
          // specific deployment
          const VAN = this.props.service.VAN;
          const requests = {};
          const adddressSite = `${this.props.data.address} (${this.props.data.cluster.site_name})`;

          let stat = this.props.stat;
          if (this.props.direction === "in" && stat === "bytes_out") {
            stat = "bytes_in";
          }
          if (this.props.direction === "out" && stat === "bytes_in") {
            stat = "bytes_out";
          }
          const from = this.props.direction === "in" ? "source" : "target";
          const to = this.props.direction === "in" ? "target" : "source";
          headerText = Icap(
            `${statName(this.props.stat)} sent ${
              this.props.direction === "in" ? "from" : "to"
            } ${shortName(this.props.data.address)} (${
              this.props.data.cluster.site_name
            })`
          );

          VAN.deploymentLinks.forEach((deploymentLink) => {
            const fromAddress = `${deploymentLink[from].service.address} (${deploymentLink[from].site.site_name})`;
            const toAddress = `${deploymentLink[to].service.address} (${deploymentLink[to].site.site_name})`;
            if (fromAddress === adddressSite) {
              if (!requests.hasOwnProperty(toAddress)) requests[toAddress] = {};
              aggregateAttributes(
                {
                  fromAddress,
                  colorAddress: deploymentLink[to].service.address,
                  shortName: `${shortName(
                    deploymentLink[to].service.address
                  )} (${deploymentLink[to].site.site_name})`,
                  site: deploymentLink[to].site.site_name,
                  requests: deploymentLink.request[stat] || 0,
                },
                requests[toAddress]
              );
            }
          });
          data = Object.keys(requests).map((address) => {
            const request = requests[address];
            const color = serviceColors[request.colorAddress];
            const stroke = rgbToHex(d3.rgb(color).darker(0.6));
            const fill = rgbToHex(d3.rgb(color).brighter(0.6));
            return {
              key: `${request.site}:${request.colorAddress}`,
              name: request.shortName,
              value: formatStat(this.props.stat, request.requests),
              x: request.shortName,
              y: request.requests,
              stroke,
              fill,
              label: " ",
            };
          });
        } else {
          // for specific site
          const VAN = this.props.service.VAN;
          const requests = {};
          let stat = this.props.stat;
          if (this.props.direction === "in" && stat === "bytes_out") {
            stat = "bytes_in";
          }
          if (this.props.direction === "out" && stat === "bytes_in") {
            stat = "bytes_out";
          }
          const from = this.props.direction === "in" ? "source" : "target";
          const to = this.props.direction === "in" ? "target" : "source";

          headerText = Icap(
            `${statName(this.props.stat)} sent ${
              this.props.direction === "in" ? "from" : "to"
            } ${this.props.data.site_name}`
          );

          VAN.deploymentLinks.forEach((deploymentLink) => {
            const site = deploymentLink[to].site.site_name;
            const fromId = deploymentLink[from].site.site_id;
            const toId = deploymentLink[to].site.site_id;
            if (fromId !== toId && fromId === this.props.data.site_id) {
              if (!requests.hasOwnProperty(toId)) requests[toId] = {};
              aggregateAttributes(
                {
                  shortName: site,
                  requests: deploymentLink.request[stat] || 0,
                },
                requests[toId]
              );
            }
          });
          data = Object.keys(requests).map((site) => {
            const request = requests[site];
            const color = siteColors[site].color;
            const stroke = lighten(-0.5, color);
            const fill = lighten(0.5, color);
            return {
              key: site,
              name: request.shortName,
              value: formatStat(this.props.stat, request.requests),
              x: request.shortName,
              y: request.requests,
              stroke,
              fill,
              label: " ",
            };
          });
        }
      }
    } else {
      if (this.props.data === null) {
        // all services
        const VAN = this.props.service.VAN;
        headerText = Icap(
          `${statName(this.props.stat)} by ${
            this.props.direction === "in" ? "originating" : "destination"
          } service`
        );
        const stat =
          this.props.stat === "bytes_in" ? "bytes_out" : this.props.stat;
        const requests = {};
        VAN.deploymentLinks.forEach((deploymentLink) => {
          const which = this.props.direction === "in" ? "source" : "target";
          const address = deploymentLink[which].service.address;
          if (!requests.hasOwnProperty(address)) requests[address] = {};
          aggregateAttributes(
            {
              service: address,
              shortName: shortName(address),
              requests: deploymentLink.request[stat] || 0,
            },
            requests[address]
          );
        });
        data = Object.keys(requests).map((address) => {
          const request = requests[address];
          const color = serviceColors[address];
          const stroke = rgbToHex(d3.rgb(color).darker(0.6));
          const fill = rgbToHex(d3.rgb(color).brighter(0.6));
          return {
            key: address,
            name: request.shortName,
            value: formatStat(this.props.stat, request.requests),
            x: request.shortName,
            y: request.requests,
            stroke,
            fill,
            label: " ",
          };
        });
      } else {
        // for specific service
        let stat = this.props.stat;
        if (this.props.direction === "in" && stat === "bytes_out") {
          stat = "bytes_in";
        }
        if (this.props.direction === "out" && stat === "bytes_in") {
          stat = "bytes_out";
        }
        const from = this.props.direction === "in" ? "source" : "target";
        const to = this.props.direction === "in" ? "target" : "source";
        headerText = Icap(
          `${statName(this.props.stat)} sent ${
            this.props.direction === "in" ? "from" : "to"
          } ${shortName(this.props.data.address)}`
        );
        const VAN = this.props.service.VAN;
        const requests = {};
        VAN.deploymentLinks.forEach((deploymentLink) => {
          const fromAddress = deploymentLink[from].service.address;
          const toAddress = deploymentLink[to].service.address;
          if (fromAddress === this.props.data.address) {
            if (!requests.hasOwnProperty(toAddress)) requests[toAddress] = {};
            aggregateAttributes(
              {
                fromAddress,
                toAddress,
                shortName: shortName(toAddress),
                requests: deploymentLink.request[stat] || 0,
              },
              requests[toAddress]
            );
          }
        });
        data = Object.keys(requests).map((address) => {
          const request = requests[address];
          const color = serviceColors[address];
          const stroke = rgbToHex(d3.rgb(color).darker(0.6));
          const fill = rgbToHex(d3.rgb(color).brighter(0.6));
          return {
            key: request.fromAddress,
            name: request.shortName,
            value: formatStat(this.props.stat, request.requests),
            x: request.shortName,
            y: request.requests,
            stroke,
            fill,
            label: " ",
          };
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
    this.setState({
      data,
      width: sizes[0],
      height: sizes[0],
      headerText,
    });
  };

  doUpdate = () => {
    this.init();
  };

  tickFormat = (tick, index, ticks) => {
    let tickValues = ticks.map((v) => formatBytes(v, 0));
    if (tickValues.some((v) => v.includes("K"))) {
      tickValues = tickValues.map((v) => v.replace("K", ""));
    }
    return tickValues[index];
  };
  getHeight = () => {
    if (this.props.type === "pie") return this.state.height;
    // 30 for each row, 40 for the x axis, at least 80
    return Math.max(Object.keys(this.state.data).length * 30 + 40, 80);
  };

  render() {
    // Padding left for bar chart is needed to allow room for the service names.
    // Service names are stored in the .x attribute of the data
    // Use a sliding scale per character as an estimate
    const getPaddingLeft = () => {
      const ys = d3.scale
        .linear()
        .domain([3, 4, 20, 100])
        .range([48, 50, 170, 800]);

      let padding = Math.max(
        ...Object.keys(this.state.data).map((k) => this.state.data[k].x.length)
      );
      return ys(padding);
    };
    return (
      Object.keys(this.state.data).length > 0 && (
        <div
          id={`sk-chart-container-${this.props.direction}`}
          className={`sk-chart-container ${
            this.props.direction === "out" ? "sk-chart-separated" : ""
          }`}
        >
          <div className="sk-chart-header">{this.state.headerText}</div>
          <div
            style={{
              height: `${this.getHeight() + 20}px`,
              width: `${this.state.width}px`,
            }}
          >
            {this.props.type === "pie" && (
              <ChartPie
                ariaDesc="pie chart"
                constrainToVisibleArea={true}
                allowTooltip={false}
                data={this.state.data}
                height={this.state.height}
                width={this.state.width}
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
                events={[
                  {
                    target: "data",
                    eventHandlers: {
                      onMouseMove: (event, data) => {
                        this.props.handleArcOver(
                          { key: data.datum.key, all: data.datum.all },
                          true
                        );
                        this.props.showTooltip(
                          `${data.datum.name} ${data.datum.value}`,
                          event.clientX,
                          event.clientY
                        );
                        return [
                          {
                            target: "data",
                            mutation: (props) => {
                              return {
                                style: {
                                  strokeWidth: 2,
                                  stroke: "#06c",
                                  fill: props.style.fill,
                                },
                              };
                            },
                          },
                        ];
                      },
                      onMouseLeave: (e, data) => {
                        this.props.handleArcOver(
                          { key: data.datum.key, all: data.datum.all },
                          false
                        );
                        this.props.showTooltip(null);
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
                ]}
              />
            )}
            {this.props.type === "bar" && (
              <Chart
                ariaDesc={this.state.headerText}
                allowTooltip={false}
                domainPadding={{ x: [0, 0] }}
                height={this.getHeight()}
                padding={{
                  bottom: 50,
                  left: getPaddingLeft(),
                  right: 40,
                  top: 20,
                }}
                width={this.state.width}
              >
                <ChartAxis />
                <ChartAxis
                  dependentAxis
                  showGrid
                  fixLabelOverlap={true}
                  tickFormat={this.tickFormat}
                  label={this.state.tickLabel}
                />
                <ChartBar
                  horizontal
                  data={this.state.data}
                  style={{
                    data: {
                      stroke: ({ datum }) => datum.stroke,
                      strokeWidth: 1,
                      fill: ({ datum }) => datum.fill,
                    },
                  }}
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
