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
import { Button, Flex, FlexItem } from "@patternfly/react-core";
import ChordViewer from "../chord/chordViewer";
import SkupperLegend from "../../topology/charts/legendComponent";
import QDRPopup from "../../../qdrPopup";
import { utils } from "../../../utilities";
import * as d3 from "d3";

class SiteModal extends Component {
  constructor(props) {
    super(props);
    const deploymentLinks = this.props.service.adapter
      .getDeploymentLinks()
      .filter(
        (l) =>
          l.source.service.address === this.props.data.address ||
          l.target.service.address === this.props.data.address
      );

    this.state = {
      isSiteModalOpen: false,
      isSiteModalExpanded: false,
      popupContent: null,
      deploymentLinks,
    };
  }

  // this modal was either dismissed/cancelled or confirmed
  handleSiteModalToggle = (e) => {
    const { isSiteModalOpen } = this.state;
    this.setState({ isSiteModalOpen: !isSiteModalOpen }, () => {
      if (this.state.isSiteModalOpen && this.chordRef) {
        this.chordRef.init();
      }
    });
  };

  handleExpandModal = () => {
    const { isSiteModalExpanded } = this.state;
    this.setState({ isSiteModalExpanded: !isSiteModalExpanded }, () => {
      const modal = d3.select("#skSiteModal");
      let width = "600px";
      let height = "620px";
      if (this.state.isSiteModalExpanded) {
        width = "100%";
        height = "100%";
      }
      modal.style("width", width).style("height", height);
      this.chordRef.init();
    });
  };

  showTooltip = (content, eventX, eventY) => {
    this.setState({ popupContent: content }, () => {
      if (content) {
        // after the content has rendered, position it
        utils.positionPopup({
          containerSelector: "#skModalskAllCharts",
          popupSelector: "#modal-popover-div",
          constrainY: false,
          eventX,
          eventY,
        });
      }
    });
  };

  doUpdate = (props) => {
    if (this.state.isSiteModalOpen) {
      const deploymentLinks = props.service.adapter
        .getDeploymentLinks()
        .filter(
          (l) =>
            l.source.service.address === this.props.data.address ||
            l.target.service.address === this.props.data.address
        );
      this.setState({ deploymentLinks }, () => {
        this.chordRef.doUpdate();
      });
    }
  };

  render() {
    const { data } = this.props;
    const {
      isSiteModalOpen,
      isSiteModalExpanded,
      deploymentLinks,
    } = this.state;

    return (
      <React.Fragment>
        <Button variant="secondary" onClick={this.handleSiteModalToggle}>
          Show chord chart
        </Button>
        <Modal
          id="skSiteModal"
          width={"600px"}
          title=" "
          isOpen={isSiteModalOpen}
          onClose={this.handleSiteModalToggle}
        >
          <Button
            aria-expanded={true}
            onClick={this.handleExpandModal}
            className={`sk-topology-expand-button sk-modal-button`}
          >
            <i
              className={`fas ${
                isSiteModalExpanded ? "fa-compress" : "fa-expand"
              }`}
            />
          </Button>

          <Flex className="sk-site-form" direction={{ default: "column" }}>
            <FlexItem id="skModalChordContainer">
              <div id="skModalskAllCharts">
                <div className="sk-title">{`Site to site traffic for ${utils.shortName(
                  data.address
                )}`}</div>
                <ChordViewer
                  ref={(el) => (this.chordRef = el)}
                  {...this.props}
                  site
                  deployment
                  prefix="skModal"
                  containerId="skSiteModal"
                  noLegend
                  handleArcOver={() => {}}
                  handleChordOver={() => {}}
                  showTooltip={this.showTooltip}
                  deploymentLinks={deploymentLinks}
                  site2site
                />
              </div>
              <div className="sk-chart-legend-parent">
                <SkupperLegend
                  ref={(el) => (this.legendRef = el)}
                  {...this.props}
                  site
                  deployment={false}
                  showTooltip={this.showTooltip}
                  prefix="skModal"
                  handleArcOver={() => {}}
                  comment="Stand-alone legend"
                />
              </div>
              <div
                id="modal-popover-div"
                className={
                  this.state.popupContent
                    ? "sk-popover-div"
                    : "sk-popover-div hidden"
                }
                ref={(el) => (this.popupRef = el)}
              >
                <QDRPopup content={this.state.popupContent}></QDRPopup>
              </div>
            </FlexItem>
          </Flex>
        </Modal>
      </React.Fragment>
    );
  }
}

export default SiteModal;
