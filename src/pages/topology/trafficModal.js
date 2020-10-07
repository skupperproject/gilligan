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
import { Modal } from "@patternfly/react-core";
import { Flex, FlexItem } from "@patternfly/react-core";
import { Grid, GridItem } from "@patternfly/react-core";
import { Button, Radio, Checkbox } from "@patternfly/react-core";
import { Service } from "../topology/views/service";
import Adapter from "../../adapter";
import { addDefs } from "../topology/svgUtils";
import { utils } from "../../utilities";
import * as d3 from "d3";

class TrafficModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      traffic: this.props.options.traffic,
      showMetrics: this.props.options.showMetric,
      metric: this.props.stat,
    };
    this.dropdownItems = [
      {
        key: "requests",
        name: "Requests",
        type: "http",
      },
      {
        key: "bytes_out",
        name: "Bytes",
      },
    ];
    // keep our service colors separate from main view's colors
    this.colors = {};

    let t1Requests = 8;
    let t2Requests = 4;
    let t1RequestSize = 400;
    let t2RequestSize = 350;
    const data = {
      sites: [
        {
          site_name: "west",
          site_id: "west_site",
          connected: [],
          namespace: "west",
          url: "10.106.199.200",
          edge: false,
        },
      ],
      services: [
        {
          address: "s",
          protocol: "http",
          targets: [
            {
              name: "s",
              site_id: "west_site",
            },
          ],
          requests_received: [],
          requests_handled: [],
        },
        {
          address: "t1",
          protocol: "http",
          targets: [
            {
              name: "t1",
              site_id: "west_site",
            },
          ],
          requests_received: [
            {
              site_id: "west_site",
              by_client: {
                s: {
                  requests: t1Requests,
                  bytes_in: 0,
                  bytes_out: t1Requests * t1RequestSize,
                  details: {
                    "GET:200": t1Requests,
                  },
                  latency_max: 9,
                  by_handling_site: {
                    west_site: {
                      requests: t1Requests,
                      bytes_in: 0,
                      bytes_out: t1Requests * t1RequestSize,
                      details: {
                        "GET:200": t1Requests,
                      },
                      latency_max: 9,
                    },
                  },
                },
              },
            },
          ],
          requests_handled: [
            {
              site_id: "west_site",
              by_server: {
                t1: {
                  requests: t1Requests,
                  bytes_in: 0,
                  bytes_out: t1Requests * t1RequestSize,
                  details: {
                    "GET:200": t1Requests,
                  },
                  latency_max: 3,
                },
              },
              by_originating_site: {
                west_site: {
                  requests: t1Requests,
                  bytes_in: 0,
                  bytes_out: t1Requests * t1RequestSize,
                  details: {
                    "GET:200": t1Requests,
                  },
                  latency_max: 3,
                },
              },
            },
          ],
        },
        {
          address: "t2",
          protocol: "http",
          targets: [
            {
              name: "t2",
              site_id: "west_site",
            },
          ],
          requests_received: [
            {
              site_id: "west_site",
              by_client: {
                s: {
                  requests: t2Requests,
                  bytes_in: 0,
                  bytes_out: t2Requests * t2RequestSize,
                  details: {
                    "GET:200": t2Requests,
                  },
                  latency_max: 9,
                  by_handling_site: {
                    west_site: {
                      requests: t2Requests,
                      bytes_in: 0,
                      bytes_out: t2Requests * t2RequestSize,
                      details: {
                        "GET:200": t2Requests,
                      },
                      latency_max: 9,
                    },
                  },
                },
              },
            },
          ],
          requests_handled: [
            {
              site_id: "west_site",
              by_server: {
                t2: {
                  requests: t2Requests,
                  bytes_in: 0,
                  bytes_out: t2Requests * t2RequestSize,
                  details: {
                    "GET:200": t2Requests,
                  },
                  latency_max: 3,
                },
              },
              by_originating_site: {
                west_site: {
                  requests: t2Requests,
                  bytes_in: 0,
                  bytes_out: t2Requests * t2RequestSize,
                  details: {
                    "GET:200": t2Requests,
                  },
                  latency_max: 3,
                },
              },
            },
          ],
        },
      ],
    };
    const adapter = new Adapter(data);

    this.serviceLine = new Service({ adapter }, "SVG_LINE");
    this.serviceSankey = new Service({ adapter }, "SVG_SANKEY");

    this.lineViewer = {
      width: 400,
      height: 300,
      sankey: false,
      statForProtocol: () => "bytes_out",
      restart: () => {
        this.serviceLine.setupSelections(this.lineViewer, false);
      },
      setLinkStat: () => {
        this.serviceLine.setLinkStat(
          false, // show or hide the stat
          "bytes_out" // which stat to show
        );
      },
      blurAll: () => {},
      showPopup: () => {},
      clearPopups: () => {},
      showChord: () => {},
      state: {
        options: {
          showExternal: false,
          traffic: false,
        },
      },
    };
    this.lineViewer.viewObj = this.serviceLine;

    this.sankeyViewer = {
      width: 400,
      height: 300,
      sankey: true,
      statForProtocol: () => "bytes_out",
      restart: () => {
        this.serviceSankey.setupSelections(this.sankeyViewer, false);
      },
      setLinkStat: () => {
        this.serviceSankey.setLinkStat(
          false, // show or hide the stat
          "bytes_out" // which stat to show
        );
      },
      blurAll: () => {},
      showPopup: () => {},
      clearPopups: () => {},
      showChord: () => {},
      state: {
        options: {
          showExternal: false,
          traffic: true,
        },
      },
    };
    this.sankeyViewer.viewObj = this.serviceSankey;
  }

  componentDidUpdate = (lastp, lasts) => {
    if (lastp.isTrafficModalOpen !== this.props.isTrafficModalOpen) {
      let changedStat = false;
      if (lastp.stat !== this.state.metric) {
        changedStat = true;
      }
      this.setState(
        {
          showMetrics: lastp.options.showMetric,
          metric: lastp.stat,
          traffic: lastp.options.traffic,
        },
        () => {
          if (changedStat) {
            this.setShowMetric();
          }
        }
      );
    }
  };
  init = () => {
    if (d3.select("#DIV_LINE").empty()) {
      return;
    }
    //this.setState({ traffic: this.props.options.traffic });
    const sizes = utils.getSizes(d3.select(".sk-traffic-section").node(), [
      400,
      200,
    ]);

    this.lineViewer.width = this.sankeyViewer.width = sizes[0] / 2 - 5;

    const setupService = (service, viewer, id, sankey) => {
      d3.select(`#SVG_${id}`).remove();
      const svg = d3
        .select(`#DIV_${id}`)
        .append("svg")
        .attr("id", `SVG_${id}`)
        .attr("width", viewer.width)
        .attr("height", viewer.height)
        .append("g")
        .append("g")
        .attr("class", "zoom");
      addDefs(svg);
      service.createSelections(svg);

      // TODO: fix possible bug in calculating contentWidth
      service.nodes().nodes.forEach((n) => delete n.contentWidth);

      let { nodeCount } = service.initNodesAndLinks(viewer, this.colors);
      viewer.force = d3.layout
        .force()
        .nodes(service.nodes().nodes)
        .links(service.links().links)
        .size([viewer.width, viewer.height])
        .linkDistance((d) => {
          return service.nodes().linkDistance(d, nodeCount);
        })
        .charge((d) => {
          return service.nodes().charge(d, nodeCount);
        })
        .friction(0.1)
        .gravity((d) => {
          return service.nodes().gravity(d, nodeCount);
        });
      viewer.force.stop();
      viewer.force.start();
      service.nodes().nodes.forEach((n) => (n.expanded = sankey));
      viewer.restart();
      service.transition(sankey, true, sankey, viewer);
    };
    setupService(this.serviceLine, this.lineViewer, "LINE", false);
    setupService(this.serviceSankey, this.sankeyViewer, "SANKEY", true);
    // move the expanded "s" to a bit for cosmetic reasons

    this.serviceSankey.nodes().nodes.some((n) => {
      if (n.address === "s") {
        let sheight = n.y1 - n.y0;
        n.y0 = n.y / 2;
        n.y1 = n.y0 + sheight;
        return true;
      }
      return false;
    });
    this.sankeyViewer.restart();
    this.serviceSankey.transition(true, true, true, this.sankeyViewer);

    this.setShowMetric();
  };

  handleChangeSankey = () => {
    this.setState({ traffic: !this.state.traffic });
  };

  setShowMetric = () => {
    this.serviceLine.setLinkStat(
      this.state.showMetrics, // show or hide the stat
      this.state.metric // which stat to show
    );
    this.serviceSankey.setLinkStat(
      this.state.showMetrics, // show or hide the stat
      this.state.metric // which stat to show
    );
  };

  handleChangeShowMetric = (checked) => {
    this.setState({ showMetrics: checked }, () => {
      this.setShowMetric();
    });
  };

  handleChangeMetric = (checked, e) => {
    const id = e.target.id;
    this.setState(
      {
        metric: id === "traffic-requests" ? "requests" : "bytes_out",
      },
      () => {
        this.setShowMetric();
      }
    );
  };

  handleTrafficModalToggle = (e) => {
    if (e && e.target.textContent === "Confirm") {
      this.props.handleTrafficModalToggle(true, this.state);
    } else {
      this.props.handleTrafficModalToggle(false);
    }
  };

  render() {
    const { isTrafficModalOpen } = this.props;
    const { traffic, showMetrics, metric } = this.state;

    const showTraffic = (
      <Grid hasGutter>
        <GridItem span={6}>
          <Radio
            className="sk-traffic-checkbox"
            label="Show traffic as a line"
            isChecked={!traffic}
            onChange={this.handleChangeSankey}
            aria-label="show traffic as line"
            id="showAsLine"
            name="showAsLine"
          />
        </GridItem>
        <GridItem span={6}>
          <Radio
            className="sk-traffic-checkbox"
            label="Show traffic using relative size"
            isChecked={traffic}
            onChange={this.handleChangeSankey}
            aria-label="show relative traffic"
            id="showAsSankey"
            name="showAsSankey"
          />
        </GridItem>
        <GridItem span={6}>
          <div className="sk-traffic-svg" id="DIV_LINE" />
        </GridItem>
        <GridItem span={6}>
          <div className="sk-traffic-svg" id="DIV_SANKEY" />
        </GridItem>
      </Grid>
    );

    const showMetricsCheckbox = (
      <React.Fragment>
        <Checkbox
          label="Show traffic metrics"
          isChecked={showMetrics}
          onChange={this.handleChangeShowMetric}
          aria-label="show metrics"
          id="showMetrics"
          name="showMetrics"
        />
        <div id="skTrafficRadioContainer" className="sk-flex">
          {this.dropdownItems.map((item) => (
            <Radio
              label={item.name}
              key={item.key}
              isChecked={item.key === metric}
              onChange={this.handleChangeMetric}
              aria-label={`show ${item.name} metric`}
              id={`traffic-${item.key}`}
            />
          ))}
        </div>
      </React.Fragment>
    );

    return (
      <Modal
        id="skTrafficModal"
        width={"800px"}
        title="Traffic options"
        isOpen={isTrafficModalOpen}
        onClose={this.handleTrafficModalToggle}
        actions={[
          <Button
            key="confirm"
            variant="primary"
            onClick={this.handleTrafficModalToggle}
          >
            Confirm
          </Button>,
          <Button
            key="cancel"
            variant="link"
            onClick={this.handleTrafficModalToggle}
          >
            Cancel
          </Button>,
        ]}
      >
        <Flex className="sk-traffic-form" direction={{ default: "column" }}>
          <FlexItem className="sk-traffic-section">{showTraffic}</FlexItem>
          <FlexItem className="sk-traffic-section" id="skTrafficMetrics">
            {showMetricsCheckbox}
          </FlexItem>
        </Flex>
      </Modal>
    );
  }
}

export default TrafficModal;
