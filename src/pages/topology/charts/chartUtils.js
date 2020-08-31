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

import { utils } from "../../../utilities";

const chartUtils = {
  init: (site, data, deployment, direction, stat) => {
    let all = false;
    let headerText = "headerText not set";
    let address = data ? data.address : null;
    let site_info;

    if (site) {
      if (data === null) {
        if (deployment) {
          // all deployments
          all = true;
          headerText = utils.Icap(
            `${utils.statName(stat)} by ${
              direction === "in" ? "originating" : "destination"
            } deployment`
          );
        } else {
          // all sites
          all = true;
          headerText = utils.Icap(
            `${utils.statName(stat)} by ${
              direction === "in" ? "originating" : "destination"
            } site`
          );
        }
      } else {
        if (data.address) {
          // specific deployment
          headerText = utils.Icap(
            `${utils.statName(stat)} sent ${
              direction === "in" ? "from" : "to"
            } ${utils.shortName(data.address)} (${data.cluster.site_name})`
          );
          site_info = data.cluster.site_name;
        } else {
          // for specific site
          headerText = utils.Icap(
            `${utils.statName(stat)} sent ${
              direction === "in" ? "from" : "to"
            } ${data.site_name}`
          );
          address = data.site_id;
        }
      }
    } else {
      if (data === null) {
        // all services
        all = true;
        headerText = utils.Icap(
          `${utils.statName(stat)} by ${
            direction === "in" ? "originating" : "destination"
          } service`
        );
      } else {
        // for specific service
        headerText = utils.Icap(
          `${utils.statName(stat)} sent ${
            direction === "in" ? "from" : "to"
          } ${utils.shortName(data.address)}`
        );
      }
    }

    return { all, headerText, address, site_info };
  },

  tickFormat: (tick, index, ticks) => {
    let tickValues = ticks.map((v) => utils.formatBytes(v, 0));
    if (tickValues.some((v) => v.includes("K"))) {
      tickValues = tickValues.map((v) => v.replace("K", ""));
    }
    return tickValues[index];
  },

  events: ({
    accessor,
    tooltipGenerator,
    strokeWidth,
    handleArcOver,
    showTooltip,
    data,
    deployment,
  }) => {
    return [
      {
        target: "data",
        eventHandlers: {
          onMouseMove: (event, d) => {
            if (handleArcOver) {
              handleArcOver(
                {
                  key: accessor(d).key,
                  all: accessor(d).all,
                  legend: deployment && data !== null,
                },
                true
              );
            }
            if (showTooltip) {
              showTooltip(tooltipGenerator(d), event.clientX, event.clientY);
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
          onMouseLeave: (e, d) => {
            if (handleArcOver) {
              handleArcOver(
                {
                  key: accessor(d).key,
                  all: accessor(d).all,
                  legend: deployment && data !== null,
                },
                false
              );
            }
            if (showTooltip) {
              showTooltip(null);
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
  },
};

export { chartUtils };
