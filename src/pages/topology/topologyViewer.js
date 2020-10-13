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
} from "@patternfly/react-topology";
import {
  Drawer,
  DrawerPanelContent,
  DrawerContent,
  DrawerContentBody,
} from "@patternfly/react-core";

import * as d3 from "d3";

import { addDefs } from "./svgUtils.js";
import { utils } from "../../utilities";
import GraphToolbar from "./graphToolbar";
import LegendComponent from "./legendComponent";
import ChartViewer from "./charts/chartViewer";
import PopupCard from "../../popupCard";
import ExpandButton from "./expandButton";
import { viewsMap as VIEWS } from "./views/views";
import "./topologyViewer.css";

class TopologyViewer extends Component {
  constructor(props) {
    super(props);

    this.view = this.props.view;
    this.viewObj = new VIEWS[this.view](this.props.service);
    this.state = {
      cardService: null,
      cardInfo: null,
      showLegend: false,
      chordData: null,
      initial: true,
      options: this.getOptions(true),
      overridden: false,
      chartExpanded: false,
    };
    this.popupCancelled = true;

    this.force = null;
    this.resetScale = 1;
    this.initialTransition = true;
    //debugger;
  }

  // called only once when the component is initialized
  componentDidMount = () => {
    //debugger;
    window.addEventListener("resize", this.resize);
    if (this.chordRef && this.chordRef.init) this.chordRef.init();

    // create the svg
    this.init();
    // call the to### transition
    this.callTransitions(this.initialTransition);
    this.initialTransition = false;
    const saved = this.viewObj.getGraphOptions(this.props.history, this.view);
    this.setHash(saved);
    //this.props.setOptions(saved, true);
  };

  componentWillUnmount = () => {
    window.removeEventListener("resize", this.resize);
    this.unmounting = true;
    d3.select(".pf-c-page__main").style("background-color", "white");
  };

  componentDidUpdate = () => {
    if (this.view !== this.props.view) {
      this.view = this.props.view;
      this.viewObj = new VIEWS[this.view](this.props.service);
      const options = this.getOptions();
      this.setHash(options);
      this.setState({ options, showCard: false }, this.updateComponent);
    }
  };

  updateComponent = () => {
    this.init();
    this.callTransitions(true);
    if (this.state.options.isExpanded > 0) {
      this.chordRef.init();
    }
  };

  getOptions = (skip) => {
    // get options for this view from localStorage
    const saved = this.viewObj.getGraphOptions(this.props.history, this.view);
    if (
      saved.isExpanded === undefined ||
      saved.isExpanded === true ||
      saved.isExpanded === false
    ) {
      saved.isExpanded = 0;
    }
    if (saved.showExternal === undefined) {
      saved.showExternal = false;
    }
    if (saved.color === undefined) {
      saved.color = true;
    }

    // update the address search parameters with the saved options
    //this.setHash(saved);
    //if (!skip) {
    //  this.props.setOptions(saved, true);
    //}
    return saved;
  };

  setHash = (options) => {
    options.view = this.view;
    this.props.setOptions(options, true);
    /*
    const newHash = Object.keys(options)
      .map((key) => {
        return `${key}=${options[key]}`;
      })
      .join("&");
    this.props.history.replace(`#${newHash}`);
    */
  };

  // called when a new URL is pasted/typed into the address bar
  handleOverrideOptions = () => {
    this.setState({ options: this.getOptions() }, this.updateComponent);
  };

  callTransitions = (initial) => {
    const to = `to${this.view}${this.state.options.traffic ? "sankey" : ""}`;
    this[to](initial);
  };

  update = () => {
    if (!this.viewObj.dragging && !this.viewObj.transitioning) {
      if (!this.unmounting) {
        this.doUpdate();
      }
    }
    this.setState({ overridden: false });
  };

  resize = () => {
    if (!this.svg) return;
    let sizes = utils.getSizes(this.topologyRef);
    this.width = sizes[0];
    this.height = sizes[1];
    if (this.width > 0) {
      // set attrs and 'resume' force
      d3.select("#SVG_ID")
        .attr("width", this.width)
        .attr("height", this.height);
      this.force.size(sizes).resume();
    }
    this.doUpdate();
  };

  setFixed = (item, data) => {
    data.setFixed(item.title !== "Unfreeze");
  };

  isFixed = (data) => {
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
  isSelected = (data) => {
    return data.selected ? true : false;
  };

  updateLegend = () => {
    //this.legend.update();
  };
  clearPopups = () => {
    if (!this.unmounting) {
      this.setState({ showCard: false });
    }
  };
  clearChosen = () => {
    this.viewObj.clearChosen();
  };

  // initialize the nodes and links array
  init = () => {
    let sizes = utils.getSizes(this.topologyRef);
    this.width = sizes[0];
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
          this.showChord(null, false);
          this.clearPopups();
          this.viewObj.clearChosen();
          this.restart();
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
    const { savedScale, savedTranslate } = this.viewObj.getSavedZoom(
      this.resetScale
    );
    //this.resetTranslate = savedTranslate;
    this.zoom.scale(savedScale);
    this.zoom.translate(savedTranslate);
    this.zoomed();

    // init D3 force layout
    this.force = d3.layout
      .force()
      .nodes(this.viewObj.nodes().nodes)
      .links(this.viewObj.links().links)
      .size([this.width, this.height])
      .linkDistance((d) => {
        return this.viewObj.nodes().linkDistance(d, nodeCount);
      })
      .charge((d) => {
        return this.viewObj.nodes().charge(d, nodeCount);
      })
      .friction(0.1)
      .gravity((d) => {
        return this.viewObj.nodes().gravity(d, nodeCount);
      });
    //.on("tick", this._tick);

    this.force.stop();
    this.force.start();
    this.drag = this.force
      .drag()
      .on("dragstart", (d) => {
        // don't pan while dragging
        d3.event.sourceEvent.stopPropagation();
        this.viewObj.dragStart(d, this.state.options.traffic);
        this.viewObj.dragging = true;
      })
      .on("drag", (d) => {
        // happens on newly added nodes that have never been dragged
        if (isNaN(d.px)) {
          d.px = d.x;
          d.py = d.y;
        }
        this.viewObj.drag(d, this.state.options.traffic);
        this.drawNodesAndPaths();
        this.setLinkStat();
      })
      .on("dragend", (d) => {
        this.viewObj.dragEnd(d, this.state.options.traffic);
        this.viewObj.dragging = false;
        // force d3 to honor the new positions
        // of nodes that were moved but not directly dragged
        this.force.start();
        this.force.stop();
      });
    if (this.state.options.isExpanded > 0) {
      if (this.state.options.isExpanded === 2) {
        this.handleExpandDrawer();
      } else if (this.state.options.isExpanded === 1) {
        const { options } = this.state;
        options.isExpanded = 0;
        this.setState({ options });
        this.handleExpandDrawer();
      }
    }
    // create svg elements
    this.restart();
  };

  doUpdate = () => {
    if (!this.unmounting) {
      this.viewObj.updateNodesAndLinks(this);
      this.force
        .nodes(this.viewObj.nodes().nodes)
        .links(this.viewObj.links().links);
      this.callTransitions(false);
      this.props.handleChangeLastUpdated();
      this.setState({ initial: false }, () => {
        if (this.state.options.isExpanded > 0) {
          this.chordRef.doUpdate();
        }
        this.restart();
      });
    }
  };

  resetMouseVars = () => {
    this.mousedown_node = null;
    this.mouseover_node = null;
    this.mouseup_node = null;
  };

  handleMouseOutPath = (d) => {
    // mouse out of a path
    this.popupCancelled = true;
    d.selected = false;
  };

  highlightConnection = (highlight, link, d, self) => {
    if (this.viewObj.transitioning) return;
    this.viewObj.blurAll(
      highlight,
      link,
      this.state.options.traffic,
      this.state.options.color
    );
    this.viewObj.highlightLink(
      highlight,
      link,
      d,
      this.state.options.traffic,
      this.state.options.color
    );
  };

  opaqueServiceType = (d) => {
    d3.select("#SVG_ID")
      .selectAll("g.service-type")
      .filter((d1) => d1 === d)
      .attr("opacity", 1);
  };

  highlightLink = (highlight, link, d) => {
    this.viewObj.highlightLink(
      highlight,
      link,
      d,
      this.state.options.traffic,
      this.state.options.color
    );
  };

  highlightServiceType = (highlight, st, d, self) => {
    if (this.viewObj.transitioning) return;
    this.blurAll(highlight, d);
    d3.select("#SVG_ID")
      .selectAll(`g.links g`)
      .filter(
        (d1) =>
          d1.source.address === d.address || d1.target.address === d.address
      )
      .each(function(d1) {
        self.highlightLink(highlight, d3.select(this), d1);
      });
  };

  highlightNamespace = (highlight, nsBox, d, self) => {
    if (this.viewObj.transitioning) return;
    this.blurAll(highlight, d);
    d.highlighted = highlight;
    // highlight all the services
    nsBox.selectAll(".cluster-rects").attr("opacity", 1);
    nsBox.selectAll("g.service-type").attr("opacity", 1);
  };

  blurAll = (blur, d) => {
    this.viewObj.blurAll(
      blur,
      d,
      this.state.options.traffic,
      this.state.options.color
    );
  };

  // Takes the forceData.nodes and forceData.links array and creates svg elements
  // Also updates any existing svg elements based on the updated values in forceData.nodes
  // and forceData.*Links
  restart = () => {
    this.viewObj.setupSelections(this);
    this.viewObj.setupDrag(this.drag);
  };

  showChord = (chordData, initial) => {
    if (!this.unmounting) {
      this.setState({ chordData, initial }, () => {
        if (this.state.options.isExpanded > 0) {
          this.chordRef.doUpdate();
        }
      });
    }
  };

  positionPopupContent = () => {
    utils.positionPopup({
      containerSelector: ".diagram",
      popupSelector: "#topo_popover-div",
    });
  };
  showPopup = (values, cardInfo) => {
    if (!this.unmounting) {
      this.setState(
        {
          showCard: true,
          cardService: values,
          cardInfo,
        },
        () => {
          // after the content has rendered, position it
          this.positionPopupContent();
        }
      );
    }
  };

  _tick = () => {};
  // update force layout (called automatically each iteration)
  drawNodesAndPaths = () => {
    // move the sites or services
    this.viewObj.drawViewNodes(this.state.options.traffic);
    // draw lines between services
    this.viewObj.drawViewPaths(this.state.options.traffic);
  };

  clearAllHighlights = () => {
    this.viewObj.links().links.forEach((l) => (l.highlighted = false));
    this.viewObj.nodes().nodes.forEach((n) => (n.highlighted = false));
    d3.selectAll(".hittarget").classed("highlighted", false);
  };

  // clicked on the Legend button in the control bar
  handleLegendClick = (id) => {
    if (!this.unmounting) {
      this.setState({ showLegend: !this.state.showLegend });
    }
  };

  // clicked on the x button on the legend
  handleCloseLegend = () => {
    if (!this.unmounting) {
      this.setState({ showLegend: false });
    }
  };

  zoomInCallback = () => {
    this.zoom.scale(this.zoom.scale() * 1.1);
    this.zoomed();
  };

  zoomOutCallback = () => {
    this.zoom.scale(this.zoom.scale() * 0.9);
    this.zoomed();
  };

  zoomed = (duration) => {
    if (isNaN(duration)) duration = 1;
    this.svg
      .transition()
      .duration(duration)
      .attr(
        "transform",
        `translate(${this.zoom.translate()}) scale(${this.zoom.scale()})`
      );
    this.viewObj.saveZoom(this.zoom);
  };

  resetViewCallback = (duration) => {
    this.zoom.scale(this.resetScale);
    this.zoom.translate([0, 0]); //this.resetTranslate);
    this.zoomed(duration);
  };

  toservice = (initial) => {
    this.showChord(null, initial);
    this.view = "service";
    this.viewObj.transitioning = true;

    // collapse the service rects
    this.viewObj.collapseNodes();
    this.viewObj
      .transition(
        this.state.options.traffic,
        initial,
        this.state.options.color,
        this
      )
      .then(() => {
        // after all the transitions are done:
        // allow mouse events to be processed
        this.viewObj.transitioning = false;
      });
  };

  todeployment = (initial) => {
    this.showChord(null, initial);
    this.view = "deployment";
    this.viewObj.collapseNodes();
    // transition rects and paths
    this.viewObj.transitioning = true;
    this.viewObj
      .transition(
        this.state.options.traffic,
        initial,
        this.state.options.color,
        this
      )
      .then(() => {
        this.viewObj.transitioning = false;
      });
  };
  todeploymentsankey = (initial) => {
    this.view = "deployment";
    this.showChord(null, initial);
    this.viewObj.expandNodes();
    // transition rects and paths
    this.viewObj.transitioning = true;
    this.viewObj
      .transition(true, initial, this.state.options.color, this)
      .then(() => {
        this.viewObj.transitioning = false;
      });
  };

  tosite = (initial) => {
    this.view = "site";
    this.showChord(null, initial);
    this.viewObj.collapseNodes();
    this.viewObj.transitioning = true;
    this.viewObj
      .transition(false, initial, this.state.options.color, this)
      .then(() => {
        this.viewObj.transitioning = false;
      });
    //this.restart();
  };

  tositesankey = (initial) => {
    this.showChord(null, initial);
    this.view = "site";
    this.viewObj.expandNodes();
    this.viewObj.transitioning = true;
    this.viewObj
      .transition(true, initial, this.state.options.color, this)
      .then(() => {
        this.viewObj.transitioning = false;
      });
    //this.restart();
  };

  toservicesankey = (initial) => {
    this.view = "service";
    this.showChord(null, initial);

    // expand the service rects to sankeyHeight
    this.viewObj.expandNodes();

    // transition rects and paths
    this.viewObj.transition(true, initial, this.state.options.color, this);
    this.restart();
  };

  handleChangeShowStat = (checked) => {
    if (!this.unmounting) {
      const { options } = this.state;
      options.showMetric = checked;
      this.setState({ options }, () => {
        this.viewObj.saveGraphOptions(options, this.props.history, this.view);
        this.callTransitions();
        this.setHash(options);
        //this.props.setOptions(options, true);
      });
    }
  };

  handleChangeStat = (type, stat) => {
    if (!this.unmounting) {
      const { stats } = this.state;
      if (type === "both") {
        stats.http = stat;
        stats.tcp = stat;
      } else {
        stats[type] = stat;
      }
      this.viewObj.saveStats(stats);
      this.setState({ stats }, this.doUpdate);
    }
  };

  handleChangeSankeyColor = (options) => {
    this.setState({ options }, () => {
      this.viewObj.saveGraphOptions(options, this.props.history, this.view);
      this.callTransitions();
      this.setHash(options);
      //this.props.setOptions(options, true);
    });
  };

  handleChangeSankey = (checked) => {
    if (!this.unmounting) {
      const { options } = this.state;
      options.traffic = checked;
      this.handleChangeSankeyColor(options);
    }
  };

  handleChangeColor = (checked) => {
    if (!this.unmounting) {
      const { options } = this.state;
      options.color = checked;
      this.handleChangeSankeyColor(options);
    }
  };

  handleChangeMetric = (metric) => {
    if (!this.unmounting) {
      const { options } = this.state;
      const protocolsPresent = this.statProtocol();
      const stat = protocolsPresent === "both" ? "tcp" : protocolsPresent;
      options[stat] = metric;
      this.setState({ options }, () => {
        this.viewObj.saveGraphOptions(options, this.props.history, this.view);
        this.doUpdate();
        this.setHash(options);
        this.update();
        //this.props.setOptions(options, true);
      });
    }
  };
  handleChangeExternal = (checked) => {
    if (!this.unmounting) {
      const { options } = this.state;
      options.showExternal = checked;
      this.setState({ options }, () => {
        this.viewObj.saveGraphOptions(options, this.props.history, this.view);
        this.props.service.update().then(() => {
          this.setHash(options);
          this.doUpdate();
        });
      });
    }
  };

  setLinkStat = () => {
    const { options } = this.state;
    this.viewObj.setLinkStat(
      options.showMetric && (options.color || options.traffic), // show or hide the stat
      this.statForProtocol() // which stat to show
    );
  };

  handleChordOver = (chord, over) => {
    this.viewObj.chordOver(chord, over, this);
  };

  handleArcOver = (arc, over) => {
    this.viewObj.arcOver(arc, over, this);
  };

  handleHighlightService = (highlight) => {
    this.viewObj.setClass(highlight, "highlighted", this);
  };
  handleHideService = (hide) => {
    this.viewObj.setClass(hide, "user-hidden", this);
  };

  statProtocol = () => {
    /*
    const links = this.viewObj.links().links;
    let tcp = links.some((l) => l.target.protocol === "tcp");
    let http = links.some((l) => l.target.protocol === "http");
    if (!tcp && !http) {
      return "both";
    }
    */
    return "http";
    //return tcp && http ? "both" : tcp ? "tcp" : "http";
  };

  // which stat to use is determined by the service protocols.
  // if we have both http and tcp protocols, use the tcp protocol (since its a subset)
  statForProtocol = () => this.state.options.http;
  /*
  ["both", "tcp"].includes(this.statProtocol())
      ? this.state.options.tcp
      : this.state.options.http;
*/

  handleExpandDrawer = (e, type = null) => {
    const { options } = this.state;
    options.isExpanded = Math.min(options.isExpanded + 1, 2);
    const expandPanel = d3.select("#sk-drawer-panel-content");
    expandPanel.classed("pf-m-width-25", options.isExpanded === 1);
    expandPanel.classed("pf-m-width-100", options.isExpanded === 2);
    this.setState({ options }, () => this.handleResizeDrawer(type));
  };

  handleCollapseDrawer = () => {
    const { options } = this.state;
    options.isExpanded = Math.max(options.isExpanded - 1, 0);
    const expandPanel = d3.select("#sk-drawer-panel-content");
    expandPanel.classed("pf-m-width-25", options.isExpanded < 2);
    expandPanel.classed("pf-m-width-100", options.isExpanded === 2);
    this.setState({ options }, () => this.handleResizeDrawer());
  };

  handleResizeDrawer = (type) => {
    this.viewObj.saveGraphOptions(
      this.state.options,
      this.props.history,
      this.view
    );
    if (this.state.options.isExpanded > 0) {
      this.chordRef.handleChangeChartType(type);
      this.chordRef.doUpdate();
      this.chordRef.resize();
    }
  };

  handleChangeChartType = (type) => {
    this.handleExpandDrawer(null, type);
  };

  render() {
    const { isExpanded } = this.state.options;
    const controlButtons = createTopologyControlButtons({
      zoomInCallback: this.zoomInCallback,
      zoomOutCallback: this.zoomOutCallback,
      resetViewCallback: this.resetViewCallback,
      fitToScreenHidden: true,
      legendCallback: this.handleLegendClick,
      legendAriaLabel: "topology-legend",
    });
    const panelContent = (
      <DrawerPanelContent id="sk-drawer-panel-content">
        <ChartViewer
          ref={(el) => (this.chordRef = el)}
          containerId="sk-drawer-panel-content"
          initial={this.state.initial}
          service={this.props.service}
          data={this.state.chordData}
          deploymentLinks={this.viewObj.links().links}
          deployment={this.view === "deployment"}
          site={this.view === "site" || this.view === "deployment"}
          stat={this.statForProtocol()}
          showExternal={this.state.options.showExternal}
          handleChordOver={this.handleChordOver}
          handleArcOver={this.handleArcOver}
          handleExpandDrawer={this.handleExpandDrawer}
          handleCollapseDrawer={this.handleCollapseDrawer}
          isExpanded={isExpanded}
          view={this.props.view}
          viewObj={this.viewObj}
        />
      </DrawerPanelContent>
    );

    return (
      <React.Fragment>
        {isExpanded === 0 && (
          <ExpandButton
            expanded={isExpanded}
            handleExpandDrawer={this.handleExpandDrawer}
            handleChangeChartType={this.handleChangeChartType}
          />
        )}
        <Drawer isExpanded={isExpanded}>
          <DrawerContent
            className="sk-drawer-content"
            panelContent={panelContent}
          >
            <DrawerContentBody>
              <div id="sk-topology-container" ref={(el) => (this.viewRef = el)}>
                <TopologyView
                  aria-label="topology-viewer"
                  viewToolbar={
                    <GraphToolbar
                      handleChangeSankey={this.handleChangeSankey}
                      handleChangeShowStat={this.handleChangeShowStat}
                      handleChangeColor={this.handleChangeColor}
                      handleChangeMetric={this.handleChangeMetric}
                      handleChangeExternal={this.handleChangeExternal}
                      handleHighlightService={this.handleHighlightService}
                      handleHideService={this.handleHideService}
                      statProtocol={this.statProtocol()} // http || tcp || both
                      stat={this.statForProtocol()} // requests || bytes_out etc.
                      options={this.state.options}
                      view={this.props.view}
                    />
                  }
                  controlBar={
                    <TopologyControlBar controlButtons={controlButtons} />
                  }
                  className="qdrTopology"
                >
                  <div className="diagram">
                    <div ref={(el) => (this.topologyRef = el)} id="topology" />
                    <div
                      id="topo_popover-div"
                      className={this.state.showCard ? "" : "hidden"}
                    >
                      {this.state.showCard && (
                        <PopupCard
                          cardSize="expanded"
                          cardService={this.state.cardService}
                          card={this.state.cardInfo}
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
                </TopologyView>
              </div>
            </DrawerContentBody>
          </DrawerContent>
        </Drawer>
      </React.Fragment>
    );
  }
}

export default TopologyViewer;
