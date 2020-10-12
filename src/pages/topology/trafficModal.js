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
import { Split, SplitItem } from "@patternfly/react-core";
import { Button, Radio, Checkbox } from "@patternfly/react-core";
import { Service } from "../topology/views/service";
import { Site } from "../topology/views/site";
import Adapter from "../../adapter";
import { addDefs } from "../topology/svgUtils";
import { utils } from "../../utilities";
import { data } from "./modalData";
import * as d3 from "d3";

class Controller {
  constructor(view, width, state) {
    this.viewObj = view;
    this.width = width;
    this.height = 280;
    this.state = state;
  }
  statForProtocol = () => this.state.options.stat;
  restart = () => this.viewObj.setupSelections(this, false); // no event handlers
  setLinkStat = () => {
    this.viewObj.setLinkStat(
      this.state.options.showMetric, // show or hide the stat
      this.state.options.stat // which stat to show
    );
  };
}

class TrafficModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      options: { ...this.props.options },
    };
    this.dropdownItems = [
      {
        key: "requests",
        name: "Requests",
      },
      {
        key: "bytes_out",
        name: "Bytes",
      },
    ];
    // keep our colors separate from main view's colors
    this.colors = {};
    this.siteColors = {};

    // radius of circles when showing sites
    this.siteRadius = 40;

    // use static data for the diagrams
    this.adapter = new Adapter(data);

    // site view uses circles, otherwise use service rectangles
    this.view = this.props.view;
  }

  // called by react when the state or properties changes
  componentDidUpdate = (nextprops) => {
    if (nextprops.isTrafficModalOpen !== this.props.isTrafficModalOpen) {
      let changedStat = false;
      if (nextprops.stat !== this.state.options.stat) {
        changedStat = true;
      }
      const { options } = this.state;
      options.showMetric = nextprops.options.showMetric;
      options.stat = nextprops.stat;
      options.traffic = nextprops.options.traffic;
      options.color = nextprops.options.color;
      console.log(
        `trafficModal radio ${options.radio} traffic ${options.traffic} color ${options.color}`
      );
      this.setState({ options }, () => {
        if (changedStat) {
          this.setShowMetric(true);
        }
      });
      if (nextprops.view !== this.view) {
        this.view = nextprops.view;
      }
    }
  };

  // create the views and controllers
  setupViews = () => {
    if (this.view === "site") {
      this.lineView = new Site({ adapter: this.adapter }, "SVG_LINE");
    } else {
      this.lineView = new Service({ adapter: this.adapter }, "SVG_LINE");
    }

    this.lineController = new Controller(this.lineView, 400, this.state);
  };

  // called externally when this modal is displayed to create the svg diagrams
  init = () => {
    if (d3.select("#DIV_LINE").empty()) {
      return;
    }
    this.setupViews();
    const sizes = utils.getSizes(d3.select("#skTrafficDiagrams").node(), [
      400,
      280,
    ]);

    // set the svgs' width to the width of the modal's diagram container / 2
    this.lineController.width = sizes[0];
    const setupService = (view, controller, id, sankey) => {
      d3.select(`#SVG_${id}`).remove();
      const svg = d3
        .select(`#DIV_${id}`)
        .append("svg")
        .attr("id", `SVG_${id}`)
        .attr("width", this.lineController.width)
        .attr("height", controller.height)
        .append("g")
        .append("g")
        .attr("class", "zoom");
      addDefs(svg);
      controller.svg = svg;
      view.createSelections(svg);

      // TODO: fix possible bug in when contentWidth is calculated
      view.nodes().nodes.forEach((n) => {
        delete n.contentWidth;
      });
      let { nodeCount } = view.initNodesAndLinks(
        controller,
        this.view === "site" ? this.siteColors : this.colors,
        this.siteRadius
      );
      controller.force = d3.layout
        .force()
        .nodes(view.nodes().nodes)
        .links(view.links().links)
        .size([this.lineController.width, controller.height])
        .linkDistance((d) => {
          return view.nodes().linkDistance(d, nodeCount);
        })
        .charge((d) => {
          return view.nodes().charge(d, nodeCount);
        })
        .friction(0.1)
        .gravity((d) => {
          return view.nodes().gravity(d, nodeCount);
        });
      controller.force.stop();
      controller.force.start();
      controller.restart();
      this.transition(true);
    };

    setupService(this.lineView, this.lineController, "LINE", false);
    this.setShowMetric(true);
  };

  // show the diagram collapsed/expanded based on options.traffic
  transition = (initial) => {
    const { options } = this.state;
    if (options.traffic) {
      this.lineView.expandNodes();
    } else {
      this.lineView.collapseNodes();
    }
    if (this.view === "site") {
      let transX = options.traffic ? -60 : -20;
      let transY = options.traffic ? -80 : -40;
      const duration = initial ? 0 : utils.VIEW_DURATION;
      if (this.props.options.traffic) {
        transX = options.traffic ? 0 : 40;
        transY = options.traffic ? -20 : 40;
      }
      this.lineController.svg
        .transition()
        .duration(duration)
        .attr("transform", `translate(${transX},${transY})`);
    }
    this.lineView.transition(
      options.traffic,
      initial,
      options.color,
      this.lineController
    );
  };

  // change the sankey link sizes to reflect which metric is being used
  // if initial is false, the transition will be animated
  resizeLinks = (initial) => {
    // resize the sankey links for the new metric
    if (this.state.options.traffic) {
      this.lineView.updateNodesAndLinks(
        this.lineController,
        this.view === "site" ? this.siteColors : this.colors,
        this.siteRadius
      );
      this.lineController.force
        .nodes(this.lineView.nodes().nodes)
        .links(this.lineView.links().links);
      this.transition(initial);
    }
  };

  // this modal was either dismissed/cancelled or confirmed
  handleTrafficModalToggle = (e) => {
    if (e && e.target.textContent === "Confirm") {
      this.props.handleTrafficModalToggle(true, this.state.options);
    } else {
      this.props.handleTrafficModalToggle(false);
    }
  };

  // display the current metric states
  setShowMetric = (initial) => {
    this.resizeLinks(initial);
    // show/hide the new metric
    this.lineView.setLinkStat(
      this.state.options.showMetric, // show or hide the stat
      this.state.options.stat // which stat to show
    );
    /*
    this.sankeyView.setLinkStat(
      this.state.options.showMetric, // show or hide the stat
      this.state.options.stat // which stat to show
    );
    */
  };

  // the show/hide metric checkbox was changed
  handleChangeShowMetric = (checked) => {
    const { options } = this.state;
    options.showMetric = checked;
    this.setState({ options }, () => {
      this.setShowMetric();
    });
  };

  // the bytes/requests radio buttons were changed
  handleChangeMetric = (checked, e) => {
    const id = e.target.id;
    const { options } = this.state;
    options.stat = id === "traffic-requests" ? "requests" : "bytes_out";
    this.setState({ options }, () => {
      this.setShowMetric(false);
    });
  };

  // the show traffic as line/sankey radio buttons were changed
  handleChangeSankey = (checked) => {
    const { options } = this.state;
    console.log(
      `handleChangeSankey called with checked ${checked} options traffic was ${options.traffic}`
    );
    options.traffic = checked;
    this.setState({ options }, () => {
      this.transition(false);
    });
  };

  // the show router connections radio was changed
  handleChangeConnection = (checked, event) => {
    const { options } = this.state;
    const id = event.target.id;
    options.traffic = false;
    options.color = id === "showAsLine" ? true : false;
    this.setState({ options }, () => {
      this.transition(false);
    });
  };

  radio = (which) => {
    if (this.view === "site") {
      if (which === "connections") return this.state.options.color;
      if (which === "line")
        return this.state.options.color ? false : !this.state.options.traffic;
      return this.state.options.color ? false : this.state.options.traffic;
    } else {
      if (which === "line") {
        return !this.state.options.traffic;
      }
      return this.state.options.traffic;
    }
  };

  render() {
    const { isTrafficModalOpen } = this.props;
    const { showMetric, stat, color, traffic } = this.state.options;

    const showTraffic = (
      <React.Fragment>
        <Split>
          {this.view === "site" && (
            <SplitItem>
              <Radio
                className="sk-traffic-checkbox"
                label="Show site connections"
                isChecked={traffic === false && color !== true}
                onChange={this.handleChangeConnection}
                aria-label="show connection direction"
                id="showConnections"
                name="showConnections"
              />
            </SplitItem>
          )}
          <SplitItem>
            <Radio
              className="sk-traffic-checkbox"
              label="Show traffic as a line"
              isChecked={traffic === false && color === true}
              onChange={this.handleChangeConnection}
              aria-label="show traffic as line"
              id="showAsLine"
              name="showAsLine"
            />
          </SplitItem>
          <SplitItem>
            <Radio
              className="sk-traffic-checkbox"
              label="Show relative traffic"
              isChecked={traffic}
              onChange={this.handleChangeSankey}
              aria-label="show relative traffic"
              id="showAsSankey"
              name="showAsSankey"
            />
          </SplitItem>
        </Split>
        <div className="sk-traffic-svg" id="DIV_LINE" />
      </React.Fragment>
    );

    const showMetricsCheckbox = (
      <React.Fragment>
        <Checkbox
          label="Show traffic metrics as"
          isChecked={showMetric}
          onChange={this.handleChangeShowMetric}
          aria-label="show metrics"
          id="showMetric"
          name="showMetric"
        />
        <div className="sk-flex">
          {this.dropdownItems.map((item) => (
            <Radio
              label={item.name}
              key={item.key}
              isChecked={item.key === stat}
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
        title={this.props.view === "site" ? "Graph options" : "Traffic options"}
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
          <FlexItem id="skTrafficDiagrams">{showTraffic}</FlexItem>
          <FlexItem id="skTrafficMetrics">{showMetricsCheckbox}</FlexItem>
        </Flex>
      </Modal>
    );
  }
}

export default TrafficModal;
