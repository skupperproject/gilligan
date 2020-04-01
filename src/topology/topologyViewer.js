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
import { viewsMap as VIEWS } from "../views";

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
    this.sankey = this.props.getShowSankey() && !this.props.getShowColor();
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
    this.callTransitions(true);
  };

  componentWillUnmount = () => {
    window.removeEventListener("resize", this.resize);
    d3.select(".pf-c-page__main").style("background-color", "white");
  };

  callTransitions = initial => {
    this.sankey = this.props.getShowSankey() && !this.props.getShowColor();
    const to = `to${this.view}${this.sankey ? "sankey" : ""}`;
    this[to](initial);
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

    // create the svg groups in the correct order for this view
    this.viewObj.createSelections(this.svg);

    // create the nodes and links for this view
    const { nodeCount, size } = this.viewObj.initNodesAndLinks(this);

    // mouse event vars
    this.mousedown_node = null;

    // the required height may be larger than the available height
    // adjust the scale of make sure the entire graph is visible
    this.resetScale = this.height / size.height;
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
        //setSaved(`${d.nodeType}:${d.name}`, { x: d.x, y: d.y });
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
    link.selectAll("text.stats").style("stroke", null);
    link.selectAll("path.servicesankeyDir").attr("opacity", 1);
    // highlight the link
    link
      .selectAll("path.service")
      .attr("opacity", highlight ? 1 : this.sankey ? 0.5 : 1);

    // highlight/blur the services on each end of the link
    const services = d3
      .select("#SVG_ID")
      .selectAll("g.service-type")
      .filter(
        d1 => d1.address === d.source.address || d1.address === d.target.address
      )
      .attr("opacity", 1);

    // bold/normal the text on each end of the link
    services
      .selectAll("text")
      .attr("font-weight", highlight ? "bold" : "normal");

    // highlight/blur the connection circles and diamonds
    if (!this.sankey && this.view === "service") {
      services
        .selectAll("circle.end-point")
        .filter(
          d1 =>
            d1.address === d.source.address &&
            d1.targetNodes.some(t => t.address === d.target.address)
        )
        .attr("opacity", 1);
      services
        .selectAll("rect.end-point")
        .filter(
          d1 =>
            d1.address === d.target.address &&
            d1.sourceNodes.some(t => t.address === d.source.address)
        )
        .attr("opacity", 1);
    }
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
    const opacity = blur ? 0.25 : 1;
    const pathOpacity = blur ? 0.25 : this.sankey ? 0.5 : 1;
    const svg = d3.select("#SVG_ID");
    svg.selectAll(".cluster-rects").attr("opacity", opacity);
    svg.selectAll("g.service-type").attr("opacity", opacity);
    svg.selectAll("path.service").attr("opacity", pathOpacity);
    svg
      .selectAll("path.mask")
      .attr("opacity", blur ? 0 : this.sankey ? 0.5 : 1);
    svg
      .selectAll("path.servicesankeyDir")
      .attr("opacity", !blur ? 1 : pathOpacity);
    if (!this.sankey && this.view === "service")
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

    if (this.getShowColor()) this.viewObj.setBlack(false);
    this.viewObj.selectionSetBlack();
    this.viewObj
      .transition(this.sankey, initial, this.getShowColor(), this)
      .then(() => {
        // after all the transitions are done:
        // allow mouse events to be processed
        this.transitioning = false;

        // force links to be black
        if (!this.getShowColor()) this.viewObj.setBlack(true);
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
    this.viewObj.setupNodePositions(true);
    // transition rects and paths
    this.viewObj.regenPaths(this.sankey);
    if (this.getShowColor()) this.viewObj.setBlack(false);
    this.viewObj.selectionSetBlack();
    this.viewObj
      .transition(this.sankey, initial, this.getShowColor(), this)
      .then(() => {
        if (!this.getShowColor()) this.viewObj.setBlack(true);
        this.restart();
      });
  };

  tosite = initial => {
    this.view = "site";
    this.sankey =
      this.props.getShowSankey() &&
      this.props.getShowTraffic() &&
      !this.props.getShowColor();
    if (this.getShowColor()) this.viewObj.setBlack(false);
    this.viewObj.selectionSetBlack();
    this.viewObj
      .transition(
        this.sankey,
        initial,
        this.props.getShowTraffic(),
        this.getShowColor(),
        this
      )
      .then(() => {
        if (!this.getShowColor()) this.viewObj.setBlack(true);
        this.setLinkStat();
      });
    this.restart();
  };

  tositesankey = initial => {
    if (!this.props.getShowTraffic() || this.props.getShowColor()) {
      this.sankey = false;
      return this.tosite(initial);
    }
    this.view = "site";
    this.restart();
    this.viewObj.drawViewPath(true);
    this.viewObj
      .transition(
        this.sankey,
        initial,
        this.props.getShowTraffic(),
        this.getShowColor(),
        this
      )
      .then(() => {
        this.setLinkStat();
      });
    this.restart();
  };

  toservicesankey = initial => {
    this.view = "service";

    // allow links to take on color of source service
    this.viewObj.setBlack(false);

    // expand the service rects to sankeyHeight
    this.viewObj.expandNodes();

    // recreate the paths between service rects
    this.viewObj.reGenPaths();

    // transition rects and paths
    this.viewObj.transition(this.sankey, initial, this.getShowColor(), this);
    this.restart();
  };

  todeploymentsankey = initial => {
    this.view = "deployment";
    this.viewObj.setBlack(false);
    this.viewObj.selectionSetBlack();
    this.viewObj.expandNodes();

    // set initial x and y before calling drag.start
    // so dragging starts in correct location
    this.viewObj.setupNodePositions(true);
    // transition rects and paths
    this.viewObj.regenPaths(this.sankey);
    this.viewObj
      .transition(this.sankey, initial, this.getShowColor(), this)
      .then(() => {
        this.restart();
      });
  };

  handleCloseSidebar = () => {
    this.setState({ showChord: false });
  };

  handleShowAll = () => {
    this.showChord(null);
  };

  handleChangeTraffic = checked => {
    this.props.handleChangeTraffic(checked);
    if (this.viewObj.showTraffic) {
      this.viewObj.showTraffic(
        checked,
        this.props.getShowSankey() && !this.props.getShowColor(),
        this
      );
      this.setLinkStat();
    }
  };
  handleChangeShowStat = checked => {
    this.props.handleChangeShowStat(checked);
    this.setLinkStat();
  };
  handleChangeSankey = checked => {
    this.props.handleChangeSankey(checked);
    this.callTransitions();
  };
  handleChangeWidth = checked => {
    this.props.handleChangeWidth(checked);
    this.callTransitions();
  };
  handleChangeColor = checked => {
    this.props.handleChangeColor(checked);
    this.callTransitions();
  };
  // only show links in color if showing traffic and by color
  getShowColor = () => this.props.getShowSankey() && this.props.getShowColor();
  setLinkStat = () => {
    this.viewObj.setLinkStat(this.sankey, this.props);
  };

  handleChordOver = (chord, over) => {
    const self = this;
    if (this.view === "service") {
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
      if (self.view === "service") {
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
            handleChangeWidth={this.handleChangeWidth}
            handleChangeColor={this.handleChangeColor}
            options={this.props.options}
            viewType={this.props.viewType}
            view={this.view}
            getShowStat={this.props.getShowStat}
            getShowSankey={this.props.getShowSankey}
            getShowTraffic={this.props.getShowTraffic}
            getShowWidth={this.props.getShowWidth}
            getShowColor={this.props.getShowColor}
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
              site={this.view === "site" || this.view === "deployment"}
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
            nodes={this.viewObj.nodes()}
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
