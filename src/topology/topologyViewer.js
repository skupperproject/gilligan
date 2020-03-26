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
  TopologyView,
  TopologyControlBar,
  createTopologyControlButtons,
  TopologySideBar
} from "@patternfly/react-topology";

import * as d3 from "d3";
import { addDefs } from "./svgUtils.js";
import { getSizes, positionPopup } from "../utilities";
import GraphToolbar from "./graphToolbar";
import LegendComponent from "./legendComponent";
import ClientInfoComponent from "./clientInfoComponent";
import ChordViewer from "../chord/chordViewer.js";
import ServiceCard from "../serviceCard";
import LinkInfo from "./linkInfo";
import { Site } from "./site";
import { Service } from "./service";
import { Deployment } from "./deployment";

const VIEWS = { site: Site, service: Service, deployment: Deployment };

class TopologyPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cardService: null,
      showLegend: false,
      showChord: true,
      showLinkInfo: false,
      showRouterInfo: false,
      showClientInfo: false,
      lastUpdated: new Date(),
      chordData: null,
      linkInfo: null
    };
    this.popupCancelled = true;

    this.force = null;
    this.contextMenuItems = [
      {
        title: "Freeze in place",
        action: this.setFixed,
        enabled: data => !this.isFixed(data)
      },
      {
        title: "Unfreeze",
        action: this.setFixed,
        enabled: this.isFixed,
        endGroup: true
      },
      {
        title: "Unselect",
        action: this.setSelected,
        enabled: this.isSelected
      },
      {
        title: "Select",
        action: this.setSelected,
        enabled: data => !this.isSelected(data)
      }
    ];
    this.view = this.props.view;
    this.sankey = this.props.getShowSankey();
    this.viewObj = new VIEWS[this.view](this.props.service.adapter);
    this.resetScale = 1;
    this.showConnDir = false;
  }

  // called only once when the component is initialized
  componentDidMount = () => {
    window.addEventListener("resize", this.resize);

    // create the svg
    this.init();
    // call the to### transition
    const to = `to${this.view}${this.sankey ? "sankey" : ""}`;
    this[to](true);
  };

  componentWillUnmount = () => {
    window.removeEventListener("resize", this.resize);
    d3.select(".pf-c-page__main").style("background-color", "white");
  };

  resize = () => {
    if (!this.svg) return;
    let sizes = getSizes(this.topologyRef);
    this.width = sizes[0];
    this.height = sizes[1];
    if (this.width > 0) {
      // set attrs and 'resume' force
      this.svg.attr("width", this.width);
      this.svg.attr("height", this.height);
      this.force.size(sizes).resume();
    }
    //this.updateLegend();
  };

  setFixed = (item, data) => {
    data.setFixed(item.title !== "Unfreeze");
  };

  isFixed = data => {
    return data.isFixed();
  };

  setSelected = (item, data) => {
    // remove the selected attr from each node
    this.siteSelection.each(function(d) {
      d.selected = false;
    });
    // set the selected attr for this node
    data.selected = item.title === "Select";
    this.selected_node = data.selected ? data : null;
    this.restart();
  };
  isSelected = data => {
    return data.selected ? true : false;
  };

  updateLegend = () => {
    //this.legend.update();
  };
  clearPopups = () => {
    this.setState({ showLinkInfo: false, showCard: false });
  };

  // initialize the nodes and links array from the QDRService.topology._nodeInfo object
  init = () => {
    let sizes = getSizes(this.topologyRef);
    this.width = sizes[0]; // - width of sidebar
    this.height = sizes[1];

    this.mouseover_node = null;
    this.selected_node = null;

    this.zoom = d3.behavior
      .zoom()
      .scaleExtent([0.25, 4])
      .on("zoom", this.zoomed);

    d3.select("#SVG_ID").remove();
    if (d3.select("#SVG_ID").empty()) {
      this.svg = d3
        .select("#topology")
        .append("svg")
        .attr("id", "SVG_ID")
        .attr("width", this.width)
        .attr("height", this.height)
        .on("click", () => {
          this.showChord(null);
          this.clearPopups();
        })
        .call(this.zoom)
        .append("g")
        .append("g")
        .attr("class", "zoom");

      addDefs(this.svg);
    }

    this.viewObj.createSelections(this.svg);
    const { nodeCount, size } = this.viewObj.initNodesAndLinks(this);

    // mouse event vars
    this.mousedown_node = null;

    this.resetScale = this.width / size.width;
    this.zoom.scale(this.resetScale);
    this.zoomed();

    // init D3 force layout
    this.force = d3.layout
      .force()
      .nodes(this.viewObj.nodes().nodes)
      .links(this.viewObj.links().links)
      .size([this.width, this.height])
      .linkDistance(d => {
        return this.viewObj.nodes().linkDistance(d, nodeCount);
      })
      .charge(d => {
        return this.viewObj.nodes().charge(d, nodeCount);
      })
      .friction(0.1)
      .gravity(d => {
        return this.viewObj.nodes().gravity(d, nodeCount);
      })
      .on("tick", this.tick);

    this.force.stop();
    this.force.start();
    this.drag = this.force
      .drag()
      .on("dragstart", d => {
        // don't pan while dragging
        d3.event.sourceEvent.stopPropagation();
        this.viewObj.dragStart(d, this.sankey);
      })
      .on("drag", d => {
        this.viewObj.drag(d, this.sankey);
        this.tick();
        this.setLinkStat();
      });
    // create svg elements
    this.restart();
  };

  resetMouseVars = () => {
    this.mousedown_node = null;
    this.mouseover_node = null;
    this.mouseup_node = null;
  };

  handleMouseOutPath = d => {
    // mouse out of a path
    this.popupCancelled = true;
    d.selected = false;
  };

  highlightConnection = (highlight, link, d, self) => {
    if (this.transitioning) return;
    this.blurAll(highlight, d);
    this.highlightLink(highlight, link, d);
    link.selectAll("text").attr("font-weight", highlight ? "bold" : null);
  };

  opaqueServiceType = d => {
    d3.select("#SVG_ID")
      .selectAll("g.service-type")
      .filter(d1 => d1 === d)
      .attr("opacity", 1);
  };

  highlightLink = (highlight, link, d) => {
    d3.selectAll("path.service").attr("opacity", highlight ? 1 : 0.5);
    link.selectAll("text.stats").style("stroke", null);
    link.selectAll("path.servicesankeyDir").attr("opacity", 1);

    const services = d3
      .select("#SVG_ID")
      .selectAll("g.service-type")
      .filter(
        d1 => d1.address === d.source.address || d1.address === d.target.address
      )
      .attr("opacity", 1);

    services
      .selectAll("text")
      .attr("font-weight", highlight ? "bold" : "normal");

    if (this.view === "service")
      services
        .selectAll("circle.end-point")
        .filter(
          d1 =>
            d1.address === d.source.address &&
            d1.targetNodes.some(t => t.address === d.target.address)
        )
        .attr("opacity", 1);

    if (this.view === "service")
      services
        .selectAll("rect.end-point")
        .filter(
          d1 =>
            d1.address === d.target.address &&
            d1.sourceNodes.some(t => t.address === d.source.address)
        )
        .attr("opacity", 1);
  };

  highlightServiceType = (highlight, st, d, self) => {
    if (this.transitioning) return;
    this.blurAll(highlight, d);
    d3.select("#SVG_ID")
      .selectAll(`g.links g`)
      .filter(
        d1 => d1.source.address === d.address || d1.target.address === d.address
      )
      .each(function(d1) {
        self.highlightLink(highlight, d3.select(this), d1);
      });
  };

  highlightNamespace = (highlight, nsBox, d, self) => {
    if (this.transitioning) return;
    this.blurAll(highlight, d);
    d.highlighted = highlight;
    // highlight all the services
    nsBox.selectAll(".cluster-rects").attr("opacity", 1);
    nsBox.selectAll("g.service-type").attr("opacity", 1);
  };

  blurAll = (blur, d) => {
    const opacity = blur ? 0.5 : 1;
    const pathOpacity =
      blur || this.view === "servicesankey" || this.view === "deploymentsankey"
        ? 0.5
        : 1;
    const svg = d3.select("#SVG_ID");
    svg.selectAll(".cluster-rects").attr("opacity", opacity);
    svg.selectAll("g.service-type").attr("opacity", opacity);
    svg
      .selectAll("path.service")
      .attr("opacity", d1 => (d && d1.uid !== d.uid ? pathOpacity : 1));
    svg
      .selectAll("path.deployment")
      .attr("opacity", d1 => (d && d1.uid !== d.uid ? pathOpacity : 1));
    if (this.view === "service")
      svg.selectAll(".end-point").attr("opacity", pathOpacity);
    svg.selectAll("text").attr("font-weight", "normal");
    svg
      .selectAll("text.stats")
      .style("stroke", blur ? "#CCCCCC" : null)
      .attr("font-weight", "unset");
  };

  setDragBehavior = () => {
    this.viewObj.setupDrag(this.drag);
  };

  // Takes the forceData.nodes and forceData.links array and creates svg elements
  // Also updates any existing svg elements based on the updated values in forceData.nodes
  // and forceData.*Links
  restart = () => {
    this.viewObj.setupSelections(this);
    this.setDragBehavior();
  };

  showChord = chordData => {
    this.setState({ showChord: true, chordData }, () => {
      this.chordRef.doUpdate();
    });
  };

  positionPopupContent = () => {
    positionPopup({
      containerSelector: ".diagram",
      popupSelector: "#topo_popover-div"
    });
  };
  showCard = cardService => {
    this.setState({ showLinkInfo: false, showCard: true, cardService }, () => {
      // after the content has rendered, position it
      this.positionPopupContent();
    });
  };
  showLinkInfo = linkInfo => {
    this.setState({ showCard: false, showLinkInfo: true, linkInfo }, () => {
      this.positionPopupContent();
    });
  };

  // update force layout (called automatically each iteration)
  tick = () => {
    // move the sites or services
    this.viewObj.tick(this.sankey);
    // draw lines between services
    this.viewObj.drawViewPath(this.sankey);
    this.force.stop();
  };

  // show the details dialog for a client or group of clients
  doDialog = (d, type) => {
    this.d = d;
    if (type === "router") {
      this.setState({ showRouterInfo: true });
    } else if (type === "client") {
      this.setState({ showClientInfo: true });
    }
  };
  handleCloseRouterInfo = type => {
    this.setState({ showRouterInfo: false });
  };
  handleCloseClientInfo = () => {
    this.setState({ showClientInfo: false, showRouterInfo: false });
  };

  clearAllHighlights = () => {
    this.viewObj.links().links.forEach(l => (l.highlighted = false));
    this.viewObj.nodes().nodes.forEach(n => (n.highlighted = false));
    d3.selectAll(".hittarget").classed("highlighted", false);
  };

  // clicked on the Legend button in the control bar
  handleLegendClick = id => {
    this.setState({ showLegend: !this.state.showLegend });
  };

  // clicked on the x button on the legend
  handleCloseLegend = () => {
    this.setState({ showLegend: false });
  };

  zoomInCallback = () => {
    this.zoom.scale(this.zoom.scale() * 1.1);
    this.zoomed();
  };

  zoomOutCallback = () => {
    this.zoom.scale(this.zoom.scale() * 0.9);
    this.zoomed();
  };

  zoomed = duration => {
    if (isNaN(duration)) duration = 100;
    this.svg
      .transition()
      .duration(duration)
      .attr(
        "transform",
        `translate(${this.zoom.translate()}) scale(${this.zoom.scale()})`
      );
  };

  resetViewCallback = duration => {
    this.zoom.scale(this.resetScale);
    this.zoom.translate([0, 0]);
    this.zoomed(duration);
  };

  toservice = initial => {
    this.view = "service";
    this.transitioning = true;

    // collapse the service rects
    this.viewObj.collapseNodes();
    this.viewObj.reGenPaths();
    this.tick();

    this.viewObj.transition(this.sankey, initial, this).then(() => {
      // after all the transitions are done:
      // allow mouse events to be processed
      this.transitioning = false;

      // force links to be black
      this.viewObj.setBlack(true);
      this.restart();
    });
  };

  todeployment = initial => {
    this.showChord(null);
    if (initial) {
      this.viewObj.setBlack(true);
      this.restart();
    }
    this.view = "deployment";
    this.viewObj.collapseNodes();
    this.tick();
    this.setLinkStat();
    this.viewObj.transition(this.sankey, initial).then(() => {
      this.viewObj.setBlack(true);
      this.restart();
    });
    /*
    this.forceData.serviceNodes.nodes.forEach(n => {
      n.x = n.x0;
      n.y = n.y0;
    });
*/
  };

  tosite = initial => {
    this.view = "site";
    this.viewObj.transition(this.sankey, initial, this.props.getShowTraffic());
    this.restart();
  };

  tositesankey = initial => {
    this.view = "sitesankey";
    this.restart();
    this.viewObj.drawViewPath(true);
    this.viewObj.transition(this.sankey, initial, this.props.getShowTraffic());
    this.restart();
  };

  toservicesankey = initial => {
    this.view = "servicesankey";

    // allow links to take on color of source service
    this.viewObj.setBlack(false);

    // expand the service rects to sankeyHeight
    this.viewObj.expandNodes();

    // recreate the paths between service rects
    this.viewObj.reGenPaths();

    // transition rects and paths
    this.viewObj.transition(this.sankey, initial, this);
    this.restart();
  };

  todeploymentsankey = initial => {
    this.view = "deploymentsankey";
    this.viewObj.setBlack(false);
    this.viewObj.expandNodes();

    // set initial x and y before calling drag.start
    // so dragging starts in correct location
    this.viewObj.setupNodePositions(true);
    // transition rects and paths
    this.viewObj.transition(this.sankey, initial, this);
    this.restart();
  };

  handleCloseSidebar = () => {
    this.setState({ showChord: false });
  };

  handleShowAll = () => {
    this.showChord(null);
  };

  handleChangeSankey = checked => {
    const method = `to${this.props.view}${checked ? "sankey" : ""}`;
    this.sankey = checked;
    this[method]();
    this.props.handleChangeSankey(checked);
  };

  handleChangeTraffic = checked => {
    if (this.viewObj.showTraffic)
      this.viewObj.showTraffic(checked, this.sankey);
    this.props.handleChangeTraffic(checked);
  };
  handleChangeShowStat = checked => {
    this.props.handleChangeShowStat(checked);
    this.setLinkStat();
  };

  setLinkStat = () => {
    this.viewObj.setLinkStat(this.sankey, this.props);
  };

  handleChordOver = (chord, over) => {
    const self = this;
    if (this.view === "service" || this.view === "servicesankey") {
      d3.selectAll("path.service").each(function(p) {
        if (
          `-${p.source.name}-${p.target.name}` === chord.key ||
          `-${p.target.name}-${p.source.name}` === chord.key
        ) {
          p.selected = over;
          self.blurAll(over, p);
          self.restart();
        }
      });
    } else if (this.view === "deployment") {
      d3.selectAll("path.deployment").each(function(p) {
        if (
          chord.info.source.site_name === p.source.parentNode.site_name &&
          chord.info.target.site_name === p.target.parentNode.site_name &&
          chord.info.source.address === p.source.address &&
          chord.info.target.address === p.target.address
        ) {
          p.highlighted = over;
          self.blurAll(over, p);
          self.restart();
        }
      });
    }
  };

  handleArcOver = (arc, over) => {
    const self = this;
    d3.selectAll("rect.service-type").each(function(d) {
      if (self.view === "service" || self.view === "servicesankey") {
        if (arc.key === d.address && !d.extra) {
          d.selected = over;
          self.blurAll(over, d);
          self.opaqueServiceType(d);
          self.restart();
        }
      } else if (self.view === "deployment") {
        if (arc.key === `${d.parentNode.site_name}:${d.address}`) {
          d.selected = over;
          self.blurAll(over, d);
          self.opaqueServiceType(d);
          self.restart();
        }
      }
    });
  };
  render() {
    const controlButtons = createTopologyControlButtons({
      zoomInCallback: this.zoomInCallback,
      zoomOutCallback: this.zoomOutCallback,
      resetViewCallback: this.resetViewCallback,
      fitToScreenHidden: true,
      legendCallback: this.handleLegendClick,
      legendAriaLabel: "topology-legend"
    });

    return (
      <TopologyView
        aria-label="topology-viewer"
        viewToolbar={
          <GraphToolbar
            service={this.props.service}
            handleChangeView={this.props.handleChangeView}
            handleChangeSankey={this.handleChangeSankey}
            handleChangeTraffic={this.handleChangeTraffic}
            handleChangeShowStat={this.handleChangeShowStat}
            options={this.props.options}
            viewType={this.props.viewType}
            view={this.view}
            getShowStat={this.props.getShowStat}
            getShowSankey={this.props.getShowSankey}
            getShowTraffic={this.props.getShowTraffic}
          />
        }
        controlBar={<TopologyControlBar controlButtons={controlButtons} />}
        sideBar={
          <TopologySideBar id="sk-sidebar" show={this.state.showChord}>
            <ChordViewer
              ref={el => (this.chordRef = el)}
              service={this.props.service}
              data={this.state.chordData}
              deploymentLinks={this.viewObj.links().links}
              deployment={this.view === "deployment"}
              site={
                this.view === "site" ||
                this.view === "deployment" ||
                this.view === "sitesankey"
              }
              handleShowAll={this.handleShowAll}
              handleChordOver={this.handleChordOver}
              handleArcOver={this.handleArcOver}
            />
          </TopologySideBar>
        }
        sideBarOpen={this.state.showChord}
        className="qdrTopology"
      >
        <div className="diagram">
          <div ref={el => (this.topologyRef = el)} id="topology"></div>
          <div id="topo_popover-div">
            {this.state.showCard && (
              <ServiceCard
                cardSize="expanded"
                cardService={this.state.cardService}
                service={this.props.service}
              />
            )}
            {this.state.showLinkInfo && (
              <LinkInfo
                linkInfo={this.state.linkInfo}
                service={this.props.service}
              />
            )}
          </div>
        </div>
        {this.state.showLegend && (
          <LegendComponent
            nodes={this.forceData.siteNodes}
            handleCloseLegend={this.handleCloseLegend}
          />
        )}
        {this.state.showClientInfo || this.state.showRouterInfo ? (
          <ClientInfoComponent
            d={this.d}
            handleCloseClientInfo={this.handleCloseClientInfo}
          />
        ) : (
          <div />
        )}
      </TopologyView>
    );
  }
}

export default TopologyPage;
