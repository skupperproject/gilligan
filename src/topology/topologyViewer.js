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
import { Nodes } from "./nodes.js";
import { Links } from "./links.js";
import { addDefs, midPoints } from "./svgUtils.js";
import { getSizes } from "../qdrGlobals";
import GraphToolbar from "./graphToolbar";
import LegendComponent from "./legendComponent";
import ClientInfoComponent from "./clientInfoComponent";
import { Graph } from "./graph";
import Transitions from "./transitions";
import ChordViewer from "../chord/chordViewer.js";

class TopologyPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      popupContent: "",
      showPopup: false,
      showLegend: false,
      showChord: true,
      showRouterInfo: false,
      showClientInfo: false,
      lastUpdated: new Date(),
      chordData: {},
      chordSent: false
    };
    this.popupCancelled = true;

    //  - nodes is an array of clusters. these are the colored rectangles
    //  - links is an array of connections between the services. these are the lines with arrows
    this.forceData = {
      nodes: new Nodes(),
      links: new Links(),
      site: new Links()
    };

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
    this.graph = new Graph(this.props.service, this.drawViewPath);
    this.view = this.props.initialView;
    this.resetScale = 1;
    this.transitions = new Transitions(this.drawPath);
  }

  // called only once when the component is initialized
  componentDidMount = () => {
    window.addEventListener("resize", this.resize);

    // create the svg
    this.init();
    this.toNamespace(true);
  };

  componentWillUnmount = () => {
    this.forceData.nodes.savePositions();
    window.removeEventListener("resize", this.resize);
    d3.select(".pf-c-page__main").style("background-color", "white");
  };

  resize = () => {
    if (!this.svg) return;
    let sizes = getSizes(this.topologyRef);
    this.width = sizes[0] - 350;
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
    this.circle.each(function(d) {
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
  clearPopups = () => {};

  zoomed = duration => {
    if (!duration) duration = 100;
    this.svg
      .transition()
      .duration(duration)
      .attr(
        "transform",
        `translate(${this.zoom.translate()}) scale(${this.zoom.scale()})`
      );
  };

  // initialize the nodes and links array from the QDRService.topology._nodeInfo object
  init = () => {
    let sizes = getSizes(this.topologyRef);
    this.width = sizes[0] - 350; // - width of sidebar
    this.height = sizes[1];
    //let nodeInfo = getData(this.props.type, this.props.service);
    //let nodeCount = Object.keys(nodeInfo).length;

    this.mouseover_node = null;
    this.selected_node = null;

    this.forceData.nodes.reset();
    this.forceData.links.reset();

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
        .call(this.zoom)
        .append("g")
        .append("g")
        .attr("class", "zoom")
        .on("click", this.clearPopups);

      addDefs(this.svg);
    }
    this.links = this.svg
      .append("svg:g")
      .attr("class", "siteLinks")
      .selectAll("g");

    // handles to link and node element groups
    this.circle = this.svg
      .append("svg:g")
      .attr("class", "clusters")
      .selectAll("g.cluster");

    this.services = this.svg.selectAll("g.service-type");

    this.path = this.svg
      .append("svg:g")
      .attr("class", "links")
      .selectAll("g");

    // mouse event vars
    this.mousedown_node = null;

    // initialize the list of nodes and links
    const { nodeCount, size } = this.graph.initNodesAndLinks(
      this.forceData.nodes,
      this.forceData.links,
      this.width,
      this.height,
      this.props.serviceTypeName
    );
    this.graph.initSiteLinks(this.forceData.nodes, this.forceData.site);

    this.resetScale = this.width / size.width;
    this.zoom.scale(this.resetScale);
    this.zoomed();

    // init D3 force layout
    this.force = d3.layout
      .force()
      .nodes(this.forceData.nodes.nodes)
      .links([])
      .size([this.width, this.height])
      .linkDistance(d => {
        return this.forceData.nodes.linkDistance(d, nodeCount);
      })
      .charge(d => {
        return this.forceData.nodes.charge(d, nodeCount);
      })
      .friction(0.1)
      .gravity(d => {
        return this.forceData.nodes.gravity(d, nodeCount);
      })
      .on("tick", this.tick)
      .on("end", () => {
        this.forceData.nodes.savePositions();
      });
    this.force.stop();
    this.force.start();

    this.clusterDrag = this.force
      .drag()
      .on("dragstart", () => {
        // don't pan while dragging
        d3.event.sourceEvent.stopPropagation();
      })
      .on("drag", d => {
        if (this.view === "application") {
          d.x = d.px;
          d.y = d.py;
          this.services.attr("transform", d => {
            return `translate(${d.x},${d.y})`;
          });
        }
      });

    // app starts here
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
    this.setState({ showPopup: false });
    d.selected = false;
  };

  highlightConnection = (highlight, link, d, self) => {
    this.blurAll(highlight, d);
    this.highlightLink(highlight, link, d);

    link.selectAll("text").attr("font-weight", highlight ? "bold" : "unset");
  };

  highlightLink = (highlight, link, d) => {
    link
      .selectAll("path")
      .attr("opacity", highlight || this.view !== "traffic" ? 1 : 0.25);
    link.selectAll("text.stats").style("stroke", null);
    const services = d3
      .select("#SVG_ID")
      .selectAll("g.service-type")
      .filter(
        d1 => d1.address === d.source.address || d1.address === d.target.address
      )
      .attr("opacity", 1);

    services.selectAll("rect").style("stroke-width", highlight ? "2px" : "1px");
    services
      .selectAll("text")
      .attr("font-weight", highlight ? "bold" : "normal");

    if (this.view === "application")
      services
        .selectAll("circle.end-point")
        .filter(
          d1 =>
            d1.address === d.source.address &&
            d1.targetNodes.some(t => t.address === d.target.address)
        )
        .attr("opacity", 1);

    if (this.view === "application")
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
    this.blurAll(highlight, d);
    const links = d3
      .select("#SVG_ID")
      .selectAll("g.links g")
      .filter(
        d1 => d1.source.address === d.address || d1.target.address === d.address
      );
    links.each(function(d1) {
      self.highlightLink(highlight, d3.select(this), d1);
    });
  };

  highlightNamespace = (highlight, nsBox, d, self) => {
    this.blurAll(highlight, d);
    d.highlighted = highlight;
    // highlight all the services
    nsBox.selectAll(".cluster-rects").attr("opacity", 1);
    nsBox.selectAll("g.service-type").attr("opacity", 1);
  };

  blurAll = (blur, d) => {
    const opacity = blur ? 0.5 : 1;
    const pathOpacity = blur || this.view === "traffic" ? 0.25 : 1;
    const svg = d3.select("#SVG_ID");
    svg.selectAll(".cluster-rects").attr("opacity", opacity);
    svg
      .selectAll("g.service-type")
      .attr("opacity", opacity)
      .selectAll("rect")
      .style("stroke-width", "1px");
    svg
      .selectAll("path.link")
      .attr("opacity", d1 => (d && d1.uid !== d.uid ? pathOpacity : 1));
    if (this.view === "application")
      svg.selectAll(".end-point").attr("opacity", pathOpacity);
    svg.selectAll("text").attr("font-weight", "normal");
    svg
      .selectAll("text.stats")
      .style("stroke", blur ? "#CCCCCC" : null)
      .attr("font-weight", "unset");
  };

  setLinkStat = () => {
    this.path.selectAll("text").text(d => {
      return d.request[this.props.options.link.stat];
    });
  };

  // Takes the forceData.nodes and forceData.links array and creates svg elements
  // Also updates any existing svg elements based on the updated values in forceData.nodes
  // and forceData.links
  restart = () => {
    if (this.view === "application") {
      this.circle.on("mousedown.drag", null);
      this.services.call(this.clusterDrag);
    } else {
      this.circle.call(this.clusterDrag);
      this.services.on("mousedown.drag", null);
    }

    this.links = this.links.data(this.forceData.site.links, d => d.uid);
    this.links.exit().remove();
    const enterLinks = this.links.enter().append("g");
    enterLinks
      .append("path")
      .attr("class", "siteLink")
      .attr("marker-end", `url(#site-end)`)
      .attr("marker-start", `url(#site-start)`);

    // path is a selection of all g elements under the g.links svg:group
    // here we associate the links.links array with the {g.links g} selection
    // based on the link.uid
    this.path = this.path.data(this.forceData.links.links, function(d) {
      return d.uid;
    });

    // update each existing {g.links g.link} element
    this.path
      .select(".link")
      .classed("selected", function(d) {
        return d.selected;
      })
      .classed("highlighted", function(d) {
        return d.highlighted;
      });
    //.classed("unknown", d => d.cls === "target");

    // reset the markers based on current highlighted/selected
    this.path
      .select(".link")
      .attr("marker-end", d => {
        return d.cls !== "network" && d.right
          ? `url(#end${d.markerId("end")})`
          : null;
      })
      .attr("marker-start", d => {
        return d.cls !== "network" && (d.left || (!d.left && !d.right))
          ? `url(#start${d.markerId("start")})`
          : null;
      });
    // add new links. if a link with a new uid is found in the data, add a new path
    let enterpath = this.path
      .enter()
      .append("g")
      .on("mouseover", function(d) {
        // mouse over a path
        d.selected = true;
        self.highlightConnection(true, d3.select(this), d, self);
        self.popupCancelled = false;
        self.restart();
      })
      .on("mouseout", function(d) {
        self.handleMouseOutPath(d);
        self.highlightConnection(false, d3.select(this), d, self);
        self.restart();
      })
      // left click a path
      .on("click", () => {
        d3.event.stopPropagation();
        this.clearPopups();
      });

    // the d attribute of the following path elements is set in tick()
    enterpath
      .append("path")
      .attr("class", "link")
      .attr("marker-end", d => {
        return d.right && d.cls !== "network"
          ? `url(#end${d.markerId("end")})`
          : null;
      })
      .attr("marker-start", d => {
        return d.cls !== "network" && (d.left || (!d.left && !d.right))
          ? `url(#start${d.markerId("start")})`
          : null;
      })
      .attr("id", function(d, i) {
        const si = d.source.uid();
        const ti = d.target.uid();
        return ["path", si, ti, i].join("-");
      });
    //.classed("unknown", d => d.cls === "target");

    enterpath
      .append("path")
      .attr("class", "hittarget")
      .attr("id", d => `hitpath-${d.source.uid()}-${d.target.uid()}`);

    enterpath
      .append("text")
      .attr("class", "stats")
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .attr(
        "x",
        d => Math.abs(d.source.parentNode.x - d.target.parentNode.x) / 2
      )
      .attr(
        "y",
        d => Math.abs(d.source.parentNode.y - d.target.parentNode.y) / 2 - 15
      )
      .attr("font-size", "12px")
      .attr("font-weight", "bold");
    //.style("display", "none");

    this.setLinkStat();
    // remove old links
    this.path.exit().remove();

    // circle (node) group
    // one svg:g with class "clusters" to contain them all
    this.circle = d3
      .select("g.clusters")
      .selectAll("g.cluster")
      .data(
        this.forceData.nodes.nodes.filter(n => n.nodeType !== "cloud"),
        function(d) {
          return d.uid();
        }
      );

    this.services = d3.selectAll("g.service-type");

    let self = this;
    let enterShadow = this.circle
      .enter()
      .append("g")
      .attr("class", "shadow site")
      .attr("id", d => `shadow-${d.index}`);
    // for each node in the data, add sub elements like circles, rects, text
    //appendCircle(enterCircle, this.props.type, this.svg)
    this.graph.createGraph(enterShadow, null, true);

    // add new circle nodes
    // add an svg:g with class "cluster" for each node in the data
    let enterCircle = this.circle
      .enter()
      .append("g")
      .attr("class", "cluster site")
      .attr("id", function(d) {
        return (d.nodeType !== "normal" ? "cluster" : "client") + "-" + d.index;
      });
    // for each node in the data, add sub elements like circles, rects, text
    //appendCircle(enterCircle, this.props.type, this.svg)
    this.graph
      .createGraph(enterCircle, this.forceData.links.links, false)
      .on("mouseover", function(d) {
        // mouseover a namespace box
        self.current_node = d;
        // highlight the namespace box
        self.restart();
      })
      .on("mouseout", function(d) {
        // mouse out for a circle
        self.current_node = null;
        self.highlightNamespace(false, d3.select(this), d, self);
        // unenlarge target node
        self.setState({ showPopup: false });
        self.popupCancelled = true;
        self.clearAllHighlights();
        self.mouseover_node = null;
        self.restart();
      })
      .on("mousedown", d => {
        // mouse down for circle
        this.current_node = d;
        if (d3.event.button !== 0) {
          // ignore all but left button
          return;
        }
        this.mousedown_node = d;
        // mouse position relative to svg
        this.initial_mouse_down_position = d3
          .mouse(this.topologyRef.parentNode.parentNode.parentNode)
          .slice();
        this.setState({ showPopup: false });
      })
      .on("mouseup", function(d) {
        // mouse up for circle
        if (!self.mousedown_node) return;

        // check for drag
        self.mouseup_node = d;

        // if we dragged the node, make it fixed
        let cur_mouse = d3.mouse(self.svg.node());
        if (
          cur_mouse[0] !== self.initial_mouse_down_position[0] ||
          cur_mouse[1] !== self.initial_mouse_down_position[1]
        ) {
          self.forceData.nodes.setFixed(d, true);
          self.forceData.nodes.savePositions();
          self.resetMouseVars();
          self.restart();
          self.mousedown_node = null;
          return;
        }

        self.clearAllHighlights();
        self.mousedown_node = null;
        // apply any data changes to the interface
        self.restart();
      })
      .on("dblclick", d => {
        // circle
        d3.event.preventDefault();
        if (d.fixed) {
          this.forceData.nodes.setFixed(d, false);
          this.restart(); // redraw the node without a dashed line
          this.force.start(); // let the nodes move to a new position
        }
      })
      .on("click", d => {
        // circle
        this.clearPopups();
        if (d3.event.defaultPrevented) return; // click suppressed
        self.doDialog(d, "router");
        d3.event.stopPropagation();
      });

    d3.selectAll("g.service-type")
      .on("mousedown", d => {
        if (this.view === "traffic") {
          d3.event.stopPropagation();
          d3.event.preventDefault();
        }
      })
      .on("mouseover", function(d) {
        // highlight this service-type and it's connected service-types
        if (this.view === "application")
          self.highlightServiceType(true, d3.select(this), d, self);
        d3.event.stopPropagation();
      })
      .on("mouseout", function(d) {
        if (this.view === "application")
          self.highlightServiceType(false, d3.select(this), d, self);
        d3.event.stopPropagation();
      })
      .on("click", function(d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        self.showChord(d);
        //self.doDialog(d, "client");
        if (self.view !== "traffic") {
          self.transitions.expandService(
            d,
            self.forceData.nodes.nodes,
            self.view,
            self.path,
            self.width
          );
        }
        d3.event.stopPropagation();
        d3.event.preventDefault();
      });

    this.circle.classed("highlighted", d => d.highlighted);
    // remove old nodes
    this.circle.exit().remove();

    // add text to client circles if there are any that represent multiple clients
    this.svg.selectAll(".subtext").remove();
    let multiples = this.svg.selectAll(".multiple");
    multiples.each(function(d) {
      let g = d3.select(this);
      let r = Nodes.radius(d.nodeType);
      g.append("svg:text")
        .attr("x", r + 4)
        .attr("y", Math.floor(r / 2 - 4))
        .attr("class", "subtext")
        .text("* " + d.normals.length);
    });

    if (!this.mousedown_node || !this.selected_node) return;

    // set the graph in motion
    this.force.start();
  };

  showChord = chordData => {
    const chordSent = chordData.requests_sent !== undefined;
    this.setState(
      { showPopup: false, showChord: true, chordData, chordSent },
      () => {
        this.chordRef.doUpdate(chordData);
      }
    );
  };

  // update force layout (called automatically each iteration)
  tick = () => {
    // move the circles
    this.circle.attr("transform", d => {
      if (this.view === "application") {
        return `translate(0,0)`;
      }
      return `translate(${d.x},${d.y})`;
    });
    // draw lines between services
    this.drawViewPath();
    this.force.stop();
  };

  drawViewPath = () => {
    if (this.view === "namespace") {
      this.drawSitePath();
    } else {
      this.drawPath(this.view === "application" ? 1 : 0);
    }
  };

  drawSitePath = () => {
    this.links.selectAll("path").attr("d", d => {
      const { sx, sy, tx, ty } = midPoints(d.source, d.target);
      return `M${sx},${sy}L${tx},${ty}`;
    });
  };

  drawPath = t => {
    this.path
      .selectAll("path")
      .attr("d", (d, i) => {
        if (this.view === "traffic") {
          return d.sankeyLinkHorizontal(d, i);
        } else {
          const { sx, sy, tx, ty, sxoff, syoff, txoff, tyoff } = d.endpoints(t);
          return `M${sx + sxoff},${sy + syoff}L${tx + txoff},${ty + tyoff}`;
        }
      })
      .attr("stroke-width", d => {
        if (this.view === "traffic") {
          return d.width;
        }
        return 2.5;
      });

    this.path
      .selectAll("text")
      .attr("x", d => {
        const { sx, tx, sxoff, txoff } = d.endpoints(t);
        return Math.abs(sx + sxoff + tx + txoff) / 2;
      })
      .attr("y", d => {
        const { sy, ty, syoff, tyoff } = d.endpoints(t);
        return Math.abs(sy + syoff + ty + tyoff) / 2 - 5;
      });
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

  showToolTip = (tip, mouse) => {
    // show the tooltip
    this.setState({ popupContent: tip, showPopup: true }, () => {
      this.displayTooltip(mouse);
    });
  };

  displayTooltip = mouse => {
    if (this.popupCancelled) {
      this.setState({ showPopup: false });
      return;
    }
    let width = this.topologyRef.offsetWidth;
    // position the popup
    d3.select("#popover-div")
      .style("left", `${mouse[0] + 5}px`)
      .style("top", `${mouse[1]}px`);
    // show popup
    let pwidth = this.popupRef.offsetWidth;
    this.setState({ showPopup: true }, () =>
      d3
        .select("#popover-div")
        .style("left", `${Math.min(width - pwidth, mouse[0])}px`)
        .on("mouseout", () => {
          this.setState({ showPopup: false });
        })
    );
  };

  clearAllHighlights = () => {
    this.forceData.links.clearHighlighted();
    this.forceData.nodes.clearHighlighted();
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

  resetViewCallback = duration => {
    this.zoom.scale(this.resetScale);
    this.zoom.translate([0, 0]);
    this.zoomed(duration);
  };

  toApplication = () => {
    const previousView = this.view;
    this.view = "application";
    this.transitions.toApplication(
      previousView,
      this.forceData.nodes.nodes,
      this.path,
      this.resetViewCallback
    );
    this.restart();
  };

  toNamespace = initial => {
    const previousView = this.view;
    this.view = "namespace";
    this.transitions.toNamespace(
      previousView,
      this.forceData.nodes.nodes,
      this.path,
      this.resetViewCallback,
      initial
    );
    this.restart();
  };

  toTraffic = () => {
    const previousView = this.view;
    this.view = "traffic";
    this.transitions.toTraffic(
      previousView,
      this.forceData.nodes.nodes,
      this.path,
      this.zoom,
      this.svg
    );
    this.restart();
  };

  toChord = () => {
    const previousView = this.view;
    this.view = "chord";
    this.transitions.toChord(
      previousView,
      this.forceData.nodes.nodes,
      this.path,
      this.zoom,
      this.svg
    );
    this.restart();
  };

  handleCloseSidebar = () => {
    this.setState({ showChord: false });
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
            handleChangeOption={this.props.handleChangeOption}
            options={this.props.options}
            initialView={this.props.initialView}
          />
        }
        controlBar={<TopologyControlBar controlButtons={controlButtons} />}
        sideBar={
          <TopologySideBar show={this.state.showChord}>
            <ChordViewer
              ref={el => (this.chordRef = el)}
              service={this.props.service}
              data={this.state.chordData}
              sent={this.state.chordSent}
            />
          </TopologySideBar>
        }
        sideBarOpen={this.state.showChord}
        className="qdrTopology"
      >
        <div className="diagram">
          <div ref={el => (this.topologyRef = el)} id="topology"></div>
          <div
            id="popover-div"
            className={this.state.showPopup ? "qdrPopup" : "qdrPopup hidden"}
            ref={el => (this.popupRef = el)}
          >
            {this.state.popupContent}
          </div>
        </div>
        {this.state.showLegend && (
          <LegendComponent
            nodes={this.forceData.nodes}
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
