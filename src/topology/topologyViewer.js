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
import { addDefs } from "./svgUtils.js";
import {
  Icap,
  getSizes,
  genPath,
  positionPopup,
  restoreSankey,
  setLinkStat
} from "../utilities";
import GraphToolbar from "./graphToolbar";
import LegendComponent from "./legendComponent";
import ClientInfoComponent from "./clientInfoComponent";
import { Graph } from "./graph";
import Transitions from "./transitions";
import ChordViewer from "../chord/chordViewer.js";
import ServiceCard from "../serviceCard";
import LinkInfo from "./linkInfo";
import {
  createSiteSelection,
  createSiteLinksSelection,
  setupSiteLinks
} from "./site";
import { createServiceSelection, createServiceLinksSelection } from "./service";
import {
  constrainDeployment,
  createDeploymentLinksSelection,
  createDeploymentSankeyLinksSelection,
  setupDeploymentLinks
} from "./deployment";

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

    this.forceData = {
      siteNodes: new Nodes(),
      serviceNodes: new Nodes(),
      serviceLinks: new Links(),
      siteLinks: new Links(),
      deploymentLinks: new Links(),
      deploymentSankeyLinks: new Links()
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
    this.view = this.props.view;
    this.resetScale = 1;
    this.transitions = new Transitions();
    this.showConnDir = false;
  }

  // called only once when the component is initialized
  componentDidMount = () => {
    window.addEventListener("resize", this.resize);

    this.init();
    // create the svg
    this[`to${Icap(this.view)}`](true);
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

    this.forceData.siteNodes.reset();
    this.forceData.serviceNodes.reset();
    this.forceData.serviceLinks.reset();
    this.forceData.siteLinks.reset();
    this.forceData.deploymentSankeyLinks.reset();
    this.forceData.deploymentLinks.reset();

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

    // sites and site links
    this.siteSelection = createSiteSelection(this.svg);
    this.siteLinksSelection = createSiteLinksSelection(this.svg);
    // services and service links
    this.serviceSelection = createServiceSelection(this.svg);
    this.serviceLinksSelection = createServiceLinksSelection(this.svg);
    // deployment service to service links
    this.deploymentSankeyLinksSelection = createDeploymentSankeyLinksSelection(
      this.svg
    );
    // deployment site to site
    this.deploymentLinksSelection = createDeploymentLinksSelection(this.svg);

    // mouse event vars
    this.mousedown_node = null;

    // initialize the list of nodes and links
    const { nodeCount, size } = this.graph.initNodesAndLinks(
      this.forceData,
      this.width,
      this.height,
      this.view
    );
    this.resetScale = this.width / size.width;
    this.zoom.scale(this.resetScale);
    this.zoomed();

    // init D3 force layout
    this.force = d3.layout
      .force()
      .nodes(this.forceData.siteNodes.nodes)
      .links(this.forceData.siteLinks.links)
      .size([this.width, this.height])
      .linkDistance(d => {
        return this.forceData.siteNodes.linkDistance(d, nodeCount);
      })
      .charge(d => {
        return this.forceData.siteNodes.charge(d, nodeCount);
      })
      .friction(0.1)
      .gravity(d => {
        return this.forceData.siteNodes.gravity(d, nodeCount);
      })
      .on("tick", this.tick);

    this.force.stop();
    this.force.start();
    this.drag = this.force
      .drag()
      .on("dragstart", d => {
        // don't pan while dragging
        d3.event.sourceEvent.stopPropagation();
        d.x = d[this.view].x = d.x0;
        d.y = d[this.view].y = d.y0;
      })
      .on("drag", d => {
        if (this.view === "deployment" && d.nodeType === "service") {
          constrainDeployment(d);
        } else {
          d.x = d.px;
          d.y = d.py;
        }

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

    link.selectAll("text").attr("font-weight", highlight ? "bold" : "unset");
  };

  highlightLink = (highlight, link, d) => {
    link
      .selectAll("path")
      .attr("opacity", highlight || this.view !== "servicesankey" ? 1 : 0.5);
    link.selectAll("text.stats").style("stroke", null);
    link.selectAll("path.servicesankeyDir").attr("opacity", 1);

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
    if (this.transitioning) return;
    this.blurAll(highlight, d);
    d.highlighted = highlight;
    // highlight all the services
    nsBox.selectAll(".cluster-rects").attr("opacity", 1);
    nsBox.selectAll("g.service-type").attr("opacity", 1);
  };

  blurAll = (blur, d) => {
    const opacity = blur ? 0.5 : 1;
    const pathOpacity = blur || this.view === "servicesankey" ? 0.5 : 1;
    const svg = d3.select("#SVG_ID");
    svg.selectAll(".cluster-rects").attr("opacity", opacity);
    svg
      .selectAll("g.service-type")
      .attr("opacity", opacity)
      .selectAll("rect")
      .style("stroke-width", "1px");
    svg
      .selectAll("path.service")
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
    if (this.view === "service" || this.view === "servicesankey") {
      this.serviceSelection.call(this.drag);
    } else if (this.view === "site" || this.view === "deployment") {
      // allow the site circles to be moved
      this.siteSelection.call(this.drag);
      if (this.view === "deployment") {
        // allow deployments to be moved within their sites
        this.serviceSelection.call(this.drag);
      }
    }
  };

  // Takes the forceData.nodes and forceData.links array and creates svg elements
  // Also updates any existing svg elements based on the updated values in forceData.nodes
  // and forceData.*Links
  restart = () => {
    this.siteLinksSelection = setupSiteLinks(
      this.siteLinksSelection,
      this.forceData.siteLinks.links,
      this.clearPopups,
      this.showLinkInfo,
      this.restart
    );
    this.siteLinksSelection
      .selectAll("path.site")
      .classed("highlighted", d => d.highlighted);

    this.deploymentLinksSelection = setupDeploymentLinks(
      this.deploymentLinksSelection,
      this.forceData.deploymentLinks.links,
      this.clearPopups,
      this.showLinkInfo,
      this.restart
    );
    this.deploymentLinksSelection
      .selectAll("path.deployment")
      .classed("highlighted", d => d.highlighted);

    // serviceLinksSelection is a selection of all g elements under the g.links svg:group
    // here we associate the links.links array with the {g.links g} selection
    // based on the link.uid
    this.serviceLinksSelection = this.serviceLinksSelection.data(
      this.forceData.serviceLinks.links,
      d => d.uid
    );

    // update each existing {g.links g.link} element
    this.serviceLinksSelection
      .select(".service")
      .classed("selected", function(d) {
        return d.selected;
      })
      .classed("highlighted", function(d) {
        return d.highlighted;
      });

    // reset the markers based on current highlighted/selected
    this.serviceLinksSelection
      .select(".service")
      .attr("marker-end", d => {
        return d.cls !== "network" && d.right && !d.source.expanded
          ? `url(#end${d.markerId("end")})`
          : null;
      })
      .attr("marker-start", d => {
        return d.cls !== "network" &&
          (d.left || (!d.left && !d.right && !d.source.expanded))
          ? `url(#start${d.markerId("start")})`
          : null;
      });
    // add new links. if a link with a new uid is found in the data, add a new path
    let enterpath = this.serviceLinksSelection
      .enter()
      .append("g")
      .style("mix-blend-mode", "multiply")
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
      .on("click", d => {
        d3.event.stopPropagation();
        this.clearPopups();
        this.showLinkInfo(d);
      });

    //addGradient(enterpath, serviceColor);

    // the d attribute of the following path elements is set in tick()
    enterpath
      .append("path")
      .attr("class", "service")
      .classed("serviceCall", true)
      .attr("stroke", d => d.target.color)
      .attr("marker-end", d => {
        return d.right && d.cls !== "network"
          ? `url(#end${d.markerId("end")})`
          : null;
      })
      .attr("marker-start", d => {
        return d.cls !== "network" && (d.left || (!d.left && !d.right))
          ? `url(#start${d.markerId("start")})`
          : null;
      });

    enterpath
      .append("path")
      .attr("class", "servicesankeyDir")
      .attr("marker-end", d => {
        return d.right ? `url(#end${d.markerId("end")})` : null;
      })
      .attr("marker-start", d => {
        return d.left ? `url(#start--undefined)` : null;
      });

    enterpath
      .append("path")
      .attr("class", "hittarget")
      .attr("id", d => `hitpath-${d.source.uid()}-${d.target.uid()}`);

    enterpath
      .append("text")
      .attr("class", "stats")
      .attr("font-size", "12px")
      .attr("font-weight", "bold");

    this.setLinkStat();

    // remove old links
    this.serviceLinksSelection.exit().remove();

    // circle (node) group
    // one svg:g with class "clusters" to contain them all
    this.siteSelection = d3
      .select("g.clusters")
      .selectAll("g.cluster")
      .data(this.forceData.siteNodes.nodes, function(d) {
        return d.uid();
      });

    let self = this;
    // add new circle nodes
    // add an svg:g with class "cluster" for each node in the data
    let enterCircle = this.siteSelection
      .enter()
      .append("g")
      .attr("class", "cluster site")
      .attr(
        "transform",
        d =>
          `translate(${this.width / 2 - d.getWidth() / 2},${this.height / 2 -
            d.getHeight() / 2})`
      )
      .attr("id", function(d) {
        return (d.nodeType !== "normal" ? "cluster" : "client") + "-" + d.index;
      });
    // for each node in the data, add sub elements like circles, rects, text
    this.graph
      .createGraph(enterCircle, this.forceData.serviceLinks.links)
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
          self.forceData.siteNodes.setFixed(d, true);
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
          this.forceData.siteNodes.setFixed(d, false);
          this.restart(); // redraw the node without a dashed line
          this.force.start(); // let the nodes move to a new position
        }
      })
      .on("click", d => {
        // circle
        this.clearPopups();
        if (d3.event.defaultPrevented) return; // click suppressed
        this.showChord(d);
        this.showCard(d);
        d3.event.stopPropagation();
      });

    this.serviceSelection = d3
      .select("g.services")
      .selectAll("g.service-type")
      .data(
        this.forceData.serviceNodes.nodes,
        d => `${d.parentNode.uuid}-${d.address}`
      );

    this.graph.appendServices(
      this.serviceSelection,
      this.forceData.serviceLinks.links
    );

    this.serviceSelection
      .classed("selected", d => d.selected)
      .on("mousedown", d => {
        if (this.view === "servicesankey") {
          d3.event.stopPropagation();
          d3.event.preventDefault();
        }
      })
      .on("mouseover", function(d) {
        // highlight this service-type and it's connected service-types
        if (self.view === "service" || self.view === "servicesankey") {
          d.selected = true;
          self.highlightServiceType(true, d3.select(this), d, self);
          self.restart();
        }
        d3.event.stopPropagation();
      })
      .on("mouseout", function(d) {
        if (self.view === "service" || self.view === "servicesankey") {
          d.selected = false;
          self.highlightServiceType(false, d3.select(this), d, self);
          self.restart();
        }
        d3.event.stopPropagation();
      })
      .on("click", function(d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        //if (self.view === "site" || self.view === "sitesankey") {
        self.showChord(d);
        self.showCard(d);
        if (self.view !== "servicesankey") {
          self.transitions.expandService(
            d,
            self.forceData.serviceNodes.nodes,
            self.view,
            self.serviceLinksSelection,
            self.width
          );
        }
        d3.event.stopPropagation();
        d3.event.preventDefault();
      });

    this.siteSelection.classed("highlighted", d => d.highlighted);
    this.siteSelection
      .selectAll("circle.network")
      .classed("dim", this.view === "deployment");
    // remove old nodes
    this.siteSelection.exit().remove();

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

    this.setDragBehavior();
    if (!this.mousedown_node || !this.selected_node) return;

    // set the graph in motion
    this.force.start();
  };

  showChord = chordData => {
    this.setState({ showChord: true, chordData }, () => {
      this.chordRef.doUpdate();
    });
  };

  showCard = cardService => {
    this.setState({ showLinkInfo: false, showCard: true, cardService }, () => {
      // after the content has rendered, position it
      positionPopup({
        containerSelector: ".diagram",
        popupSelector: "#topo_popover-div"
      });
    });
  };

  showLinkInfo = linkInfo => {
    this.setState({ showCard: false, showLinkInfo: true, linkInfo }, () => {
      positionPopup({
        containerSelector: ".diagram",
        popupSelector: "#topo_popover-div"
      });
    });
  };

  // update force layout (called automatically each iteration)
  tick = () => {
    // move the sites or services
    if (this.view === "site" || this.view === "deployment") {
      this.siteSelection.attr("transform", d => {
        // move the site circle
        d.site.x0 = d.x0 = d.x;
        d.site.y0 = d.y0 = d.y;
        d.site.x1 = d.x1 = d.x + d.getWidth();
        d.site.y1 = d.y1 = d.y0 + d.getHeight();
        return `translate(${d.x},${d.y})`;
      });
      if (this.view === "deployment") {
        // move the deployments in each site
        this.serviceSelection.attr("transform", d => {
          const x = (d.x0 = d.deployment.x0 = d.parentNode.x + d.siteOffsetX);
          const y = (d.y0 = d.deployment.y0 = d.parentNode.y + d.siteOffsetY);
          d.x1 = d.deployment.x1 = d.x0 + d.getWidth();
          d.y1 = d.deployment.y1 = d.y0 + d.getHeight();
          return `translate(${x},${y})`;
        });
      }
    } else if (this.view === "service" || this.view === "servicesankey") {
      this.serviceSelection.attr("transform", d => {
        d.x0 = d.x;
        d.y0 = d.y;
        d.x1 = d.x0 + d.getWidth();
        d.y1 = d.y0 + d.getHeight();
        this.graph.updateSankey({
          allNodes: this.forceData.serviceNodes,
          links: this.forceData.serviceLinks.links,
          excludeExtra: true
        });
        if (d.service) {
          d.service.x0 = d.x0;
          d.service.x1 = d.x1;
          d.service.y0 = d.y0;
          d.service.y1 = d.y1;
        }
        return `translate(${d.x},${d.y})`;
      });
    }

    // draw lines between services
    this.drawViewPath();
    this.force.stop();
  };

  drawViewPath = () => {
    if (this.view === "site") {
      this.drawSitePath(this);
    } else if (this.view === "sitesankey") {
      this.drawSiteTrafficPath(this);
    } else if (this.view === "deployment") {
      this.drawDeploymentPath(this);
    } else {
      this.drawPath(this.view === "service" ? 1 : 0, this);
    }
  };
  drawDeploymentPath = self => {
    this.graph.circularize(this.forceData.deploymentLinks.links);
    self.deploymentLinksSelection.selectAll("path").attr("d", d => {
      return genPath(d, "deployment");
    });
  };

  drawSiteTrafficPath = self => {
    self.deploymentSankeyLinksSelection.selectAll("path").attr("d", d => {
      const { sx, sy, tx, ty, sxoff, syoff, txoff, tyoff } = d.endpoints(1);
      return `M${sx + sxoff},${sy + syoff}L${tx + txoff},${ty + tyoff}`;
    });
  };
  drawSitePath = self => {
    self.siteLinksSelection.selectAll("path").attr("d", d => {
      if (d.source.x > d.target.x) {
        const tmp = d.source;
        d.source = d.target;
        d.target = tmp;
      }
      return genPath(d, "site");
    });
  };

  drawPath = (t, self) => {
    self.serviceLinksSelection.selectAll("path").attr("d", d => {
      if (self.view === "servicesankey") {
        return d.sankeyPath;
      } else {
        return d.path;
      }
    });

    self.serviceLinksSelection
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

  clearAllHighlights = () => {
    this.forceData.serviceLinks.clearHighlighted();
    this.forceData.siteNodes.clearHighlighted();
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

  toService = initial => {
    this.view = "service";
    this.transitioning = true;

    const subNodes = this.forceData.serviceNodes.nodes.filter(n => !n.extra);
    restoreSankey(subNodes, "service");
    if (initial) {
      d3.selectAll("g.cluster").attr("transform", "translate(0,0)");
      d3.selectAll("g.service-type")
        .filter(d => !d.extra)
        .attr("transform", d => {
          return `translate(${d.x},${d.y})`;
        })
        .attr("opacity", 1);
    }

    // collapse the service rects
    this.graph.expandSubNodes({
      allNodes: this.forceData.serviceNodes,
      expand: false,
      nonExtra: true
    });

    this.forceData.serviceLinks.links.forEach(link => {
      link.path = genPath(link, "service");
    });

    this.transitions.toService(initial, this.setLinkStat).then(() => {
      // after all the transitions are done:

      // allow mouse events to be processed
      this.transitioning = false;

      // force links to be black
      this.serviceLinksSelection
        .select(".service")
        .classed("serviceCall", true);
    });

    this.restart();
  };

  toDeployment = initial => {
    this.showChord(null);
    const previousView = this.view;
    this.view = "deployment";
    this.graph.expandSubNodes({
      allNodes: this.forceData.serviceNodes,
      expand: false,
      nonExtra: false
    });
    this.transitions
      .toDeployment(
        previousView,
        this.forceData,
        this.resetViewCallback,
        initial
      )
      .then(() => {
        this.deploymentSankeyLinksSelection
          .selectAll("path.sitesankey")
          .classed("siteCall", true);
      });
    this.restart();
  };

  toSite = initial => {
    const previousView = this.view;
    this.view = "site";
    this.transitions
      .toSite(
        previousView,
        this.forceData.siteNodes,
        this.resetViewCallback,
        initial
      )
      .then(() => {
        this.deploymentSankeyLinksSelection
          .selectAll("path.sitesankey")
          .classed("siteCall", true);
      });
    this.restart();
    if (previousView === "service" || previousView === "servicesankey")
      this.showChord(null);
  };

  toServicesankey = () => {
    this.view = "servicesankey";

    // allow links to take on color of source service
    this.serviceLinksSelection.select(".service").classed("serviceCall", false);

    //restore the sankey values
    const subNodes = this.forceData.serviceNodes.nodes.filter(n => !n.extra);
    restoreSankey(subNodes, "service");

    // expand the service rects to sankeyHeight
    this.graph.expandSubNodes({
      allNodes: this.forceData.serviceNodes,
      expand: true,
      nonExtra: true
    });

    // recreate the paths between service rects
    this.forceData.serviceLinks.links.forEach(link => {
      link.path = genPath(link, "service");
    });

    // transition rects and paths
    this.transitions.toServiceSankey(this.setLinkStat);

    this.restart();
  };

  handleCloseSidebar = () => {
    this.setState({ showChord: false });
  };

  handleShowAll = () => {
    this.showChord(null);
  };

  handleChangeSankey = checked => {
    const method = `to${Icap(this.props.view)}${checked ? "sankey" : ""}`;
    this[method]();
  };

  handleChangeShowStat = checked => {
    this.setLinkStat();
  };

  handleChangeShowConnDir = checked => {
    this.showConnDir = checked;
    this.restart();
    // TODO: show or hide the arrows on the site links for site view
  };

  setLinkStat = () => {
    let cls = this.view;
    let statSelection;
    if (this.view === "service") statSelection = this.serviceLinksSelection;
    else if (this.view === "servicesankey") {
      statSelection = statSelection = this.serviceLinksSelection;
      cls = "servicesankeyDir";
    } else if (this.view === "deployment")
      statSelection = this.deploymentLinksSelection;
    if (statSelection)
      setLinkStat(
        statSelection,
        cls,
        this.props.options.link.stat,
        this.toolbarRef.getShowStat()
      );
  };

  handleChordOver = (chord, over) => {
    const self = this;
    d3.selectAll("path.service").each(function(p) {
      if (
        `-${p.source.name}-${p.target.name}` === chord.key ||
        `-${p.target.name}-${p.source.name}` === chord.key
      ) {
        p.selected = over;
        self.highlightConnection(over, d3.select(this), p, self);
        self.restart();
      }
    });
  };

  handleArcOver = (arc, over) => {
    const self = this;
    d3.selectAll("g.service-type").each(function(d) {
      if (arc.key === d.address && !d.extra) {
        if (self.view === "service" || self.view === "servicesankey") {
          d.selected = over;
          self.highlightServiceType(over, d3.select(this), d, self);
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
            ref={el => (this.toolbarRef = el)}
            service={this.props.service}
            handleChangeView={this.props.handleChangeView}
            handleChangeSankey={this.handleChangeSankey}
            handleChangeOption={this.props.handleChangeOption}
            handleChangeShowStat={this.handleChangeShowStat}
            handleChangeShowConnDir={this.handleChangeShowConnDir}
            options={this.props.options}
            viewType={this.props.viewType}
            view={this.view}
          />
        }
        controlBar={<TopologyControlBar controlButtons={controlButtons} />}
        sideBar={
          <TopologySideBar id="sk-sidebar" show={this.state.showChord}>
            <ChordViewer
              ref={el => (this.chordRef = el)}
              service={this.props.service}
              data={this.state.chordData}
              deploymentLinks={this.forceData.deploymentLinks.links}
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
