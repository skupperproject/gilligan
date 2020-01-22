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
import GraphToolbar from "./graphToolbar";
import LegendComponent from "./legendComponent";

import * as d3 from "d3";
import { Traffic } from "./traffic.js";
import { separateAddresses } from "../chord/filters.js";
import { Nodes } from "./nodes.js";
import { Links } from "./links.js";
import { nextHop, connectionPopupHTML, getSizes } from "./topoUtils.js";
import { utils } from "../amqp/utilities.js";
//import { Legend } from "./legend.js";
//import LegendComponent from "./legendComponent";
import RouterInfoComponent from "./routerInfoComponent";
import ClientInfoComponent from "./clientInfoComponent";
import ContextMenuComponent from "../contextMenuComponent";
import { addDefs, scaledMouse } from "./svgUtils.js";
import { QDRLogger } from "../qdrGlobals";
import Graph from "./graph";
const TOPOOPTIONSKEY = "topoLegendOptions";

class TopologyPage extends Component {
  constructor(props) {
    super(props);
    // restore the state of the legend sections
    let savedOptions = {
      traffic: {
        open: false,
        dots: false,
        congestion: false,
        addresses: [],
        addressColors: []
      },
      legend: {
        open: true
      },
      arrows: {
        open: false,
        routerArrows: false,
        clientArrows: false
      }
    };
    this.state = {
      popupContent: "",
      showPopup: false,
      showLegend: false,
      legendOptions: savedOptions,
      showRouterInfo: false,
      showClientInfo: false,
      showContextMenu: false,
      lastUpdated: new Date()
    };
    this.QDRLog = new QDRLogger(console, "Topology");
    this.popupCancelled = true;

    //  - nodes is an array of router/client info. these are the circles
    //  - links is an array of connections between the routers. these are the lines with arrows
    this.forceData = {
      nodes: new Nodes(this.QDRLog),
      links: new Links(this.QDRLog)
    };

    this.force = null;
    this.traffic = new Traffic(
      this,
      this.props.service,
      separateAddresses,
      Nodes.radius("inter-router"),
      this.forceData,
      ["dots", "congestion"].filter(t => this.state.legendOptions.traffic[t])
    );

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
    this.view = new Graph(this.props.service);
    this.resetScale = 1;
  }

  // called only once when the component is initialized
  componentDidMount = () => {
    window.addEventListener("resize", this.resize);
    // we only need to update connections during steady-state
    this.props.service.management.topology.setUpdateEntities([
      "router",
      "connection"
    ]);
    // poll the routers for their latest entities (set to connection above)
    //this.props.service.management.topology.startUpdating();

    // create the svg
    this.init();

    // get notified when a router is added/dropped and when
    // the number of connections for a router changes
    this.props.service.management.topology.addChangedAction("topology", () => {
      this.init();
    });
  };

  componentWillUnmount = () => {
    this.props.service.management.topology.setUpdateEntities([]);
    this.props.service.management.topology.stopUpdating();
    this.props.service.management.topology.delChangedAction("topology");
    this.traffic.remove();
    this.forceData.nodes.savePositions();
    window.removeEventListener("resize", this.resize);
    d3.select(".pf-c-page__main").style("background-color", "white");
  };

  resize = () => {
    if (!this.svg) return;
    let sizes = getSizes(this.topologyRef, this.QDRLog);
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

  zoomed = () => {
    this.svg.attr(
      "transform",
      `translate(${this.zoom.translate()}) scale(${this.zoom.scale()})`
    );
  };

  // initialize the nodes and links array from the QDRService.topology._nodeInfo object
  init = () => {
    let sizes = getSizes(this.topologyRef, this.QDRLog);
    this.width = sizes[0];
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

      /*
      this.svg.call(zoom).on("mousemove", function() {
        const m = d3.mouse(this);
        // apply the translate buffer so mousewheel zooms on the correct point after dragging the graph
        const pt = [
          m[0] + self.translateBuffer[0],
          m[1] + self.translateBuffer[1]
        ];
        zoom.center(pt);
      });
      */
    }

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

    this.traffic.remove();
    if (this.state.legendOptions.traffic.dots)
      this.traffic.addAnimationType(
        "dots",
        separateAddresses,
        Nodes.radius("inter-router")
      );
    if (this.state.legendOptions.traffic.congestion)
      this.traffic.addAnimationType(
        "congestion",
        separateAddresses,
        Nodes.radius("inter-router")
      );

    // mouse event vars
    this.mousedown_node = null;

    // initialize the list of nodes and links
    const { nodeCount, size } = this.view.initNodesAndLinks(
      this.forceData.nodes,
      this.forceData.links,
      this.width,
      this.height,
      this.props.serviceTypeName
    );
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

    // don't pan while dragging
    this.clusterDrag = this.force
      .drag()
      .on("drag", d => {
        if (this.tried) {
          d.x = d.px;
          d.y = d.py;
          this.services.attr("transform", d => {
            return `translate(${d.x},${d.y})`;
          });
        }
      })
      .on("dragstart", () => {
        d3.event.sourceEvent.stopPropagation();
      });

    // app starts here
    this.restart();

    if (this.oldSelectedNode) {
      d3.selectAll("circle.inter-router").classed("selected", d => {
        if (d.key === this.oldSelectedNode.key) {
          this.selected_node = d;
          return true;
        }
        return false;
      });
    }
    if (this.oldMouseoverNode && this.selected_node) {
      d3.selectAll("circle.inter-router").each(d => {
        if (d.key === this.oldMouseoverNode.key) {
          this.mouseover_node = d;
          this.props.service.management.topology.ensureAllEntities(
            [
              {
                entity: "router.node",
                attrs: ["id", "nextHop"]
              }
            ],
            () => {
              this.nextHopHighlight(this.selected_node, d);
              this.restart();
            }
          );
        }
      });
    }
  };

  resetMouseVars = () => {
    this.mousedown_node = null;
    this.mouseover_node = null;
    this.mouseup_node = null;
  };

  handleMouseOutPath = d => {
    // mouse out of a path
    this.popupCancelled = true;
    this.props.service.management.topology.delUpdatedAction(
      "connectionPopupHTML"
    );
    this.setState({ showPopup: false });
    d.selected = false;
    connectionPopupHTML();
  };

  showMarker = d => {
    if (d.source.nodeType === "normal" || d.target.nodeType === "normal") {
      // link between router and client
      return this.state.legendOptions.arrows.clientArrows;
    } else {
      // link between routers or edge routers
      return this.state.legendOptions.arrows.routerArrows;
    }
  };

  highlightConnection = (highlight, link, d, self) => {
    this.blurAll(highlight, d);
    this.highlightLink(highlight, link, d);

    link.selectAll("text").attr("font-weight", highlight ? "bold" : "unset");
    //.style("display", highlight ? "block" : "none");
  };

  highlightLink = (highlight, link, d) => {
    link.selectAll("path").attr("opacity", 1);
    link.selectAll("text.stats").style("stroke", null);
    const services = d3
      .select("#SVG_ID")
      .selectAll("g.service-type")
      .filter(d1 => d1.key === d.source.key || d1.key === d.target.key)
      .attr("opacity", 1);

    services.selectAll("rect").style("stroke-width", highlight ? "2px" : "1px");
    services
      .selectAll("text")
      .attr("font-weight", highlight ? "bold" : "normal");

    services
      .selectAll("circle.end-point")
      .filter(
        d1 =>
          d1.key === d.source.key &&
          d1.targets.some(t => t.key === d.target.key)
      )
      .attr("opacity", 1);

    services
      .selectAll("rect.end-point")
      .filter(
        d1 =>
          d1.key === d.target.key &&
          d1.sources.some(t => t.key === d.source.key)
      )
      .attr("opacity", 1);
  };

  highlightServiceType = (highlight, st, d, self) => {
    this.blurAll(highlight, d);
    const links = d3
      .select("#SVG_ID")
      .selectAll("g.links g")
      .filter(d1 => d1.source.key === d.key || d1.target.key === d.key);
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
    const pathOpacity = blur ? 0.25 : 1;
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
    svg.selectAll("circle.end-point").attr("opacity", pathOpacity);
    svg.selectAll("rect.end-point").attr("opacity", pathOpacity);
    svg.selectAll("text").attr("font-weight", "normal");
    svg
      .selectAll("text.stats")
      .style("stroke", blur ? "#CCCCCC" : null)
      .attr("font-weight", "unset");
  };

  setLinkStat = () => {
    this.path.selectAll("text").text(d => {
      const which =
        this.props.options.link.stat === "security"
          ? "security"
          : this.props.options.link.stat === "protocol"
          ? "protocol"
          : this.props.options.link.stat === "throughput"
          ? "throughput"
          : this.props.options.link.stat === "latency"
          ? "latency"
          : "unknown";
      return d.stats[which];
    });
  };

  expandNode = (d, node) => {
    if (!d.expanded) {
      /*
      d.expanded = true;
      node
        .select("g.extra-info")
        .transition()
        .duration(250)
        .attr("opacity", 1);

      node
        .select("rect.service-type")
        .transition()
        .duration(250)
        .attr("height", 70);
*/
      /*
      const mouse = d3.mouse(this.svg.node());
      mouse[0] = -mouse[0];
      mouse[1] = -mouse[1];
      this.svg
        .transition()
        .duration(250)
        .attr("transform", `translate(${mouse}) scale(2)`)
        .each("end", () => {
          this.zoom.scale(2);
          this.zoom.translate(mouse);
          this.zoomed();
        });
        */
    } else {
      d.expanded = false;
      /*
      node
        .select("g.extra-info")
        .transition()
        .duration(250)
        .attr("opacity", 0);

      node
        .select("rect.service-type")
        .transition()
        .duration(250)
        .attr("height", 40);
        */
    }
  };

  // Takes the forceData.nodes and forceData.links array and creates svg elements
  // Also updates any existing svg elements based on the updated values in forceData.nodes
  // and forceData.links
  restart = () => {
    if (this.tried) {
      this.circle.on("mousedown.drag", null);
      this.services.call(this.clusterDrag);
    } else {
      this.circle.call(this.clusterDrag);
      this.services.on("mousedown.drag", null);
    }

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
        /*
        let event = d3.event;
        d.toolTip().then(toolTip => {
          this.showToolTip(toolTip, event);
        });
*/
        /*
        let updateTooltip = () => {
          if (d.selected) {
            this.setState({
              popupContent: connectionPopupHTML(
                d,
                this.props.service.management.topology._nodeInfo
              )
            });
            this.displayTooltip(event);
          } else {
            this.handleMouseOutPath(d);
          }
        };
        */
        /*
        // update the contents of the popup tooltip each time the data is polled
        this.props.service.management.topology.addUpdatedAction(
          "connectionPopupHTML",
          updateTooltip
        );
        // request the data and update the tooltip as soon as it arrives
        this.props.service.management.topology.ensureAllEntities(
          [
            {
              entity: "router.link",
              force: true
            },
            {
              entity: "connection"
            }
          ],
          updateTooltip
        );
        // just show the tooltip with whatever data we have
        updateTooltip();
*/
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
      .attr("class", "shadow")
      .attr("id", d => `shadow-${d.index}`);
    // for each node in the data, add sub elements like circles, rects, text
    //appendCircle(enterCircle, this.props.type, this.svg)
    this.view.createGraph(enterShadow, null, true);

    // add new circle nodes
    // add an svg:g with class "cluster" for each node in the data
    let enterCircle = this.circle
      .enter()
      .append("g")
      .attr("class", "cluster")
      .attr("id", function(d) {
        return (d.nodeType !== "normal" ? "cluster" : "client") + "-" + d.index;
      });
    // for each node in the data, add sub elements like circles, rects, text
    //appendCircle(enterCircle, this.props.type, this.svg)
    this.view
      .createGraph(enterCircle, this.forceData.links.links, false)
      .on("mouseover", function(d) {
        // mouseover a namespace box
        self.current_node = d;
        // highlight the namespace box
        self.highlightNamespace(true, d3.select(this), d, self);
        /*
        if (!self.mousedown_node) {
          const mouse = scaledMouse(self.svg.node(), d3.event);
          self.popupCancelled = false;
          d.toolTip(self.props.service.management.topology).then(toolTip => {
            self.showToolTip(toolTip, mouse);
          });
        }
        */
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
      .on("contextmenu", d => {
        // circle
        d3.event.preventDefault();
        this.contextEventPosition = [d3.event.pageX, d3.event.pageY];
        this.contextEventData = d;
        this.setState({ showContextMenu: true });
        return false;
      })
      .on("click", d => {
        // circle
        this.clearPopups();
        if (d3.event.defaultPrevented) return; // click suppressed
        self.doDialog(d, "router");
        d3.event.stopPropagation();
      });

    d3.selectAll("g.service-type")
      .on("mouseover", function(d) {
        // highlight this service-type and it's connected service-types
        self.highlightServiceType(true, d3.select(this), d, self);
        d3.event.stopPropagation();
        /*
        const mouse = scaledMouse(self.svg.node(), d3.event);
        self.popupCancelled = false;
        d.toolTip(self.props.service.management.topology).then(toolTip => {
          self.showToolTip(toolTip, mouse);
        });
        */
      })
      .on("mouseout", function(d) {
        self.highlightServiceType(false, d3.select(this), d, self);
        d3.event.stopPropagation();
      })
      .on("click", function(d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        self.doDialog(d, "client");
        //self.expandNode(d, d3.select(this));
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

  // update force layout (called automatically each iteration)
  tick = () => {
    // move the circles
    this.circle.attr("transform", d => {
      if (this.tried) {
        return `translate(0,0)`;
      }
      return `translate(${d.x},${d.y})`;
    });
    // draw lines between services
    const t = this.tried ? 1 : 0;
    this.drawPath(t);
    this.force.stop();
  };

  drawPath = t => {
    this.path.selectAll("path").attr("d", d => {
      const { sx, sy, tx, ty, sxoff, syoff, txoff, tyoff } = d.endpoints(t);
      return `M${sx + sxoff},${sy + syoff}L${tx + txoff},${ty + tyoff}`;
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

  nextHopHighlight = (selected_node, d) => {
    selected_node.highlighted = true;
    d.highlighted = true;
    // if the selected node isn't a router,
    // find the router to which it is connected
    if (selected_node.nodeType !== "_topo") {
      let connected_node = this.forceData.nodes.find(
        selected_node.routerId,
        {},
        selected_node.routerId
      );
      // push the link between the selected_node and the router
      let link = this.forceData.links.linkFor(selected_node, connected_node);
      if (link) {
        link.highlighted = true;
        d3.select(`path[id='hitpath-${link.uid}']`).classed(
          "highlighted",
          true
        );
      }
      // start at the router
      selected_node = connected_node;
    }
    if (d.nodeType !== "_topo") {
      let connected_node = this.forceData.nodes.find(
        d.routerId,
        {},
        d.routerId
      );
      // push the link between the target_node and its router
      let link = this.forceData.links.linkFor(d, connected_node);
      if (link) {
        link.highlighted = true;
        d3.select(`path[id='hitpath-${link.uid}']`).classed(
          "highlighted",
          true
        );
      }
      // end at the router
      d = connected_node;
    }
    nextHop(
      selected_node,
      d,
      this.forceData.nodes,
      this.forceData.links,
      this.props.service.management.topology.nodeInfo(),
      selected_node,
      (link, fnode, tnode) => {
        link.highlighted = true;
        d3.select(`path[id='hitpath-${link.uid}']`).classed(
          "highlighted",
          true
        );
        fnode.highlighted = true;
        tnode.highlighted = true;
      }
    );
    let hnode = this.forceData.nodes.nodeFor(d.name);
    hnode.highlighted = true;
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
    console.log(
      `displayTooltip width is ${pwidth} mouse[0] ${mouse[0]} mouse[1] ${
        mouse[1]
      }`
    );
    this.setState({ showPopup: true }, () =>
      d3
        .select("#popover-div")
        .style("left", `${Math.min(width - pwidth, mouse[0])}px`)
        .on("mouseout", () => {
          console.log(`popover-div mouseout`);
          this.setState({ showPopup: false });
        })
    );
  };

  clearAllHighlights = () => {
    this.forceData.links.clearHighlighted();
    this.forceData.nodes.clearHighlighted();
    d3.selectAll(".hittarget").classed("highlighted", false);
  };

  saveLegendOptions = legendOptions => {
    localStorage.setItem(TOPOOPTIONSKEY, JSON.stringify(legendOptions));
  };
  handleLegendOptionsChange = (legendOptions, callback) => {
    this.saveLegendOptions(legendOptions);
    this.setState({ legendOptions }, () => {
      if (callback) {
        callback();
      }
      this.restart();
    });
  };

  handleOpenChange = (section, open) => {
    const { legendOptions } = this.state;
    legendOptions[section].open = open;
    if (section === "legend" && open) {
      //this.legend.update();
    }
    this.handleLegendOptionsChange(this.state.legendOptions);
  };
  handleChangeArrows = (checked, event) => {
    const { legendOptions } = this.state;
    legendOptions.arrows[event.target.name] = checked;
    this.handleLegendOptionsChange(legendOptions);
  };

  // checking and unchecking of which traffic animation to show
  handleChangeTrafficAnimation = (checked, event) => {
    const { legendOptions } = this.state;
    const name = event.target.name;
    legendOptions.traffic[name] = checked;
    if (!checked) {
      this.traffic.remove(name);
    } else {
      this.traffic.addAnimationType(
        name,
        separateAddresses,
        Nodes.radius("inter-router")
      );
    }
    this.handleLegendOptionsChange(legendOptions);
  };

  handleChangeTrafficFlowAddress = (address, checked) => {
    const { legendOptions } = this.state;
    legendOptions.traffic.addresses[address] = checked;
    this.handleLegendOptionsChange(legendOptions, this.addressFilterChanged);
  };

  // called from traffic
  // the list of addresses has changed. set new addresses to true
  handleUpdatedAddresses = addresses => {
    const { legendOptions } = this.state;
    let changed = false;
    // set any new keys to the passed in value
    Object.keys(addresses).forEach(address => {
      if (typeof legendOptions.traffic.addresses[address] === "undefined") {
        legendOptions.traffic.addresses[address] = addresses[address];
        changed = true;
      }
    });
    // remove any old keys that were not passed in
    Object.keys(legendOptions.traffic.addresses).forEach(address => {
      if (typeof addresses[address] === "undefined") {
        delete legendOptions.traffic.addresses[address];
        changed = true;
      }
    });
    if (changed) {
      this.handleLegendOptionsChange(legendOptions, this.addressFilterChanged);
    }
  };

  handleUpdateAddressColors = addressColors => {
    const { legendOptions } = this.state;
    let changed = false;
    // set any new keys to the passed in value
    Object.keys(addressColors).forEach(address => {
      if (typeof legendOptions.traffic.addressColors[address] === "undefined") {
        legendOptions.traffic.addressColors[address] = addressColors[address];
        changed = true;
      }
    });
    // remove any old keys that were not passed in
    Object.keys(legendOptions.traffic.addressColors).forEach(address => {
      if (typeof addressColors[address] === "undefined") {
        delete legendOptions.traffic.addressColors[address];
        changed = true;
      }
    });
    if (changed) {
      this.handleLegendOptionsChange(legendOptions);
    }
  };

  // the mouse was hovered over one of the addresses in the legend
  handleHoverAddress = (address, over) => {
    // this.enterLegend and this.leaveLegend are defined in traffic.js
    if (over) {
      this.enterLegend(address);
    } else {
      this.leaveLegend();
    }
  };

  handleContextHide = () => {
    this.setState({ showContextMenu: false });
  };

  translateFn = dir => d => t => {
    if (dir === "ns") t = 1 - t;
    this.drawPath(t);
    return `translate(${d.orgx + (d.x - d.orgx) * t},${d.orgy +
      (d.y - d.orgy) * t})`;
  };

  toApplication = () => {
    // Note: all the transitions happen concurrently
    this.tried = true;

    // show the shadow rects and then fade them out
    this.forceData.nodes.nodes.forEach(d => {
      d3.select(`#shadow-${d.index}`)
        .attr("transform", `translate(${d.x},${d.y})`)
        .select(".shadow-rects")
        .attr("opacity", 1)
        .style("display", "block")
        .transition()
        .duration(1000)
        .attr("opacity", 0)
        .each("end", function() {
          d3.select(this).style("display", "none");
        });
    });

    // hide the real cluster rects
    d3.selectAll(".cluster-rects").style("display", "none");

    // make the cluster container start at the left of the svg
    // in order to move the services to their correct locations
    d3.selectAll(".cluster")
      .transition()
      .duration(1000)
      .attr("transform", "translate(0,0)");

    // move the service rects to their full-page locations
    d3.selectAll("g.service-type")
      .transition()
      .duration(1000)
      .attrTween("transform", this.translateFn("app"));
  };

  toNamespace = () => {
    this.tried = false;

    // fade in the shadow rects and then hide them
    this.forceData.nodes.nodes.forEach(d => {
      d3.select(`#shadow-${d.index}`)
        .select(".shadow-rects")
        .style("display", "block")
        .attr("opacity", 0)
        .transition()
        .duration(1000)
        .attr("opacity", 1)
        .each("end", function() {
          d3.select(this)
            .attr("opacity", 0)
            .style("display", "none");
        });
    });

    // while the above is happening, transition the containers to their proper position
    d3.selectAll(".cluster")
      .transition()
      .duration(1000)
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .each("end", function() {
        d3.select(this)
          .style("display", "block")
          .attr("opacity", 1)
          .select(".cluster-rects")
          .attr("opacity", 1)
          .style("display", "block");
      });

    // and also move the service rects to their proper position within the container
    d3.selectAll("g.service-type")
      .transition()
      .duration(1000)
      .attrTween("transform", this.translateFn("ns"));
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

  resetViewCallback = () => {
    this.zoom.scale(this.resetScale);
    this.zoom.translate([0, 0]);
    this.zoomed();
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
            handleChangeView={this.props.handleChangeView}
            handleChangeOption={this.props.handleChangeOption}
            options={this.props.options}
          />
        }
        controlBar={<TopologyControlBar controlButtons={controlButtons} />}
        sideBar={<TopologySideBar show={false}></TopologySideBar>}
        sideBarOpen={false}
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
            topology={this.props.service.management.topology}
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
