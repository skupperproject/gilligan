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
  TopologySideBar,
} from "@patternfly/react-topology";
import * as d3 from "d3";

import { addDefs } from "./svgUtils.js";
import { getSizes, positionPopup, getSaved, setSaved } from "../../utilities";
import GraphToolbar from "./graphToolbar";
import LegendComponent from "./legendComponent";
import ChartViewer from "./charts/chartViewer";
import SplitterBar from "./spliterBar";
import PopupCard from "../../popupCard";
import { viewsMap as VIEWS } from "./views/views";
const SPLITTER_POSITION = "split";
const SPLITTER_LEFT = "div.pf-topology-content";
const SPLITTER_RIGHT = "div.pf-topology-side-bar";

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
    };
    this.popupCancelled = true;

    this.force = null;
    this.sankey = this.state.options.traffic;
    this.resetScale = 1;
    this.initialTransition = true;
    //debugger;
  }

  // called only once when the component is initialized
  componentDidMount = () => {
    //debugger;
    window.addEventListener("resize", this.resize);
    this.setChordWidth(
      this.state.options.hideChart ? 0 : getSaved(SPLITTER_POSITION, 360)
    );
    if (!this.state.options.hideChart) {
      this.chordRef.init();
    }

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
    /*console.log(
      `TOPOLOGYVIEWER::COMPONTENTDIDUPDATE called this.view ${this.view} this.props.view ${this.props.view}`
    );*/
    if (this.view !== this.props.view) {
      //console.log(`view changed so re-initializing graph`);
      this.view = this.props.view;
      this.viewObj = new VIEWS[this.view](this.props.service);
      //debugger;
      const options = this.getOptions();
      this.setHash(options);
      this.setState({ options, showCard: false }, this.updateComponent);
    } else {
      //console.log("view didn't change so not getting new options");
    }
  };

  updateComponent = () => {
    this.init();
    this.callTransitions(true);
    this.setChordWidth(
      this.state.options.hideChart ? 0 : getSaved(SPLITTER_POSITION, 360)
    );
    if (!this.state.options.hideChart) {
      this.chordRef.init();
    }
  };

  getOptions = (skip) => {
    // get options for this view from localStorage
    const saved = this.viewObj.getGraphOptions(this.props.history, this.view);
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
    debugger;
    this.setState({ options: this.getOptions() }, this.updateComponent);
  };

  callTransitions = (initial) => {
    this.sankey = this.state.options.traffic && !this.state.options.color;
    const to = `to${this.view}${this.sankey ? "sankey" : ""}`;
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
    let sizes = getSizes(this.topologyRef);
    //console.log(`resize got sizes at ${sizes[0]}, ${sizes[1]}`);
    this.width = sizes[0];
    this.height = sizes[1];
    if (this.width > 0) {
      // set attrs and 'resume' force
      d3.select("#SVG_ID").attr("width", this.width);
      d3.select("#SVG_ID").attr("height", this.height);
      this.force.size(sizes).resume();
    }
    this.doUpdate();
    //this.updateLegend();
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

  // initialize the nodes and links array
  init = () => {
    let sizes = getSizes(this.topologyRef);
    this.width =
      sizes[0] -
      (this.state.options.hideChart ? 0 : getSaved(SPLITTER_POSITION, 360));
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
        this.viewObj.dragStart(d, this.sankey);
        this.viewObj.dragging = true;
      })
      .on("drag", (d) => {
        //setSaved(`${d.nodeType}:${d.name}`, { x: d.x, y: d.y });
        this.viewObj.drag(d, this.sankey);
        this.drawNodesAndPaths();
        this.setLinkStat();
      })
      .on("dragend", (d) => {
        this.viewObj.dragEnd(d, this.sankey);
        this.viewObj.dragging = false;
        // force d3 to honor the new positions
        // of nodes that were moved but not directly dragged
        this.force.start();
        this.force.stop();
      });
    // create svg elements
    this.restart();
  };

  doUpdate = () => {
    if (!this.unmounting) {
      this.viewObj.updateNodesAndLinks(this);
      this.force
        .nodes(this.viewObj.nodes().nodes)
        .links(this.viewObj.links().links);
      this.viewObj.transition(this.sankey, false, this.getShowColor(), this);
      this.props.handleChangeLastUpdated();
      this.setState({ initial: false }, () => {
        if (!this.state.options.hideChart) {
          this.chordRef.doUpdate();
        }
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
    if (this.transitioning) return;
    this.viewObj.blurAll(highlight, link, this.sankey, this.getShowColor());
    this.viewObj.highlightLink(
      highlight,
      link,
      d,
      this.sankey,
      this.getShowColor()
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
      this.sankey,
      this.getShowColor()
    );
  };

  highlightServiceType = (highlight, st, d, self) => {
    if (this.transitioning) return;
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
    if (this.transitioning) return;
    this.blurAll(highlight, d);
    d.highlighted = highlight;
    // highlight all the services
    nsBox.selectAll(".cluster-rects").attr("opacity", 1);
    nsBox.selectAll("g.service-type").attr("opacity", 1);
  };

  blurAll = (blur, d) => {
    this.viewObj.blurAll(blur, d, this.sankey, this.getShowColor());
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
        if (!this.state.options.hideChart) {
          this.chordRef.doUpdate();
        }
      });
    }
  };

  positionPopupContent = () => {
    positionPopup({
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
    this.viewObj.drawViewNodes(this.sankey);
    // draw lines between services
    this.viewObj.drawViewPaths(this.sankey);
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
    this.transitioning = true;

    // collapse the service rects
    this.viewObj.collapseNodes();
    this.viewObj
      .transition(this.sankey, initial, this.getShowColor(), this)
      .then(() => {
        // after all the transitions are done:
        // allow mouse events to be processed
        this.transitioning = false;
      });
  };

  todeployment = (initial) => {
    this.showChord(null, initial);
    this.view = "deployment";
    this.viewObj.collapseNodes();
    // transition rects and paths
    this.viewObj.transitioning = true;
    this.viewObj
      .transition(this.sankey, initial, this.getShowColor(), this)
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
      .transition(this.sankey, initial, this.getShowColor(), this)
      .then(() => {
        this.viewObj.transitioning = false;
      });
  };

  tosite = (initial) => {
    this.view = "site";
    this.showChord(null, initial);
    this.sankey = this.state.options.traffic && !this.state.options.color;
    this.viewObj.collapseNodes();
    this.viewObj.transitioning = true;
    this.viewObj
      .transition(this.sankey, initial, this.getShowColor(), this)
      .then(() => {
        this.viewObj.transitioning = false;
      });
    //this.restart();
  };

  tositesankey = (initial) => {
    if (this.state.options.color) {
      this.sankey = false;
      return this.tosite(initial);
    }
    this.showChord(null, initial);
    this.view = "site";
    this.viewObj.expandNodes();
    this.viewObj.transitioning = true;
    this.viewObj
      .transition(this.sankey, initial, this.getShowColor(), this)
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
    this.viewObj.transition(this.sankey, initial, this.getShowColor(), this);
    this.restart();
  };

  handleShowAll = () => {
    this.showChord(null, true);
  };

  handleChangeHideChart = (checked) => {
    if (!this.unmounting) {
      const { options } = this.state;
      options.hideChart = checked;
      if (!checked) {
        this.setChordWidth(getSaved(SPLITTER_POSITION, 360));
      } else {
        this.setChordWidth(0);
      }
      this.setState({ options }, () => {
        this.resize();
        this.viewObj.saveGraphOptions(options, this.props.history, this.view);
        this.showChord(this.state.chordData, false);
        this.setHash(options);
        //this.props.setOptions(options, true);
      });
    }
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

  handleChangeSankey = (checked) => {
    if (!this.unmounting) {
      const { options } = this.state;
      options.traffic = checked;
      this.setState({ options }, () => {
        this.sankey = options.traffic && !options.color;
        this.viewObj.saveGraphOptions(options, this.props.history, this.view);
        this.callTransitions();
        this.setHash(options);
        //this.props.setOptions(options, true);
      });
    }
  };
  handleChangeWidth = (checked) => {
    if (!this.unmounting) {
      const { options } = this.state;
      options.color = !checked;
      this.setState({ options }, () => {
        this.sankey = options.traffic && !options.color;
        this.viewObj.saveGraphOptions(options, this.props.history, this.view);
        this.callTransitions();
        this.setHash(options);
        //this.props.setOptions(options, true);
      });
    }
  };
  handleChangeColor = (checked) => {
    if (!this.unmounting) {
      const { options } = this.state;
      options.color = checked;
      this.setState({ options }, () => {
        this.sankey = options.traffic && !options.color;
        this.viewObj.saveGraphOptions(options, this.props.history, this.view);
        this.callTransitions();
        this.setHash(options);
        //this.props.setOptions(options, true);
      });
    }
  };
  handleChangeMetric = (metric) => {
    if (!this.unmounting) {
      const { options } = this.state;
      const protocolsPresent = this.statProtocol();
      const stat = protocolsPresent === "both" ? "tcp" : protocolsPresent;
      options[stat] = metric;
      this.setState({ options }, () => {
        this.sankey = options.traffic;
        this.viewObj.saveGraphOptions(options, this.props.history, this.view);
        this.doUpdate();
        this.setHash(options);
        //this.props.setOptions(options, true);
      });
    }
  };

  // only show links in color if showing traffic and by color
  getShowColor = () => this.state.options.traffic && this.state.options.color;

  setLinkStat = () => {
    const { options } = this.state;
    this.viewObj.setLinkStat(
      !(options.radio && !options.traffic) && this.state.options.showMetric, // show or hide the stat
      this.statForProtocol() // which stat to show
    );
  };

  handleChordOver = (chord, over) => {
    this.viewObj.chordOver(chord, over, this);
  };

  handleArcOver = (arc, over) => {
    this.viewObj.arcOver(arc, over, this);
  };

  handleSplitterChange = (moved) => {
    const minRight = 240;
    const maxRight = this.width / 2;
    const rightPane = d3.select(SPLITTER_RIGHT);
    let rightWidth = Math.min(
      Math.max(parseInt(rightPane.style("max-width"), 10) + moved, minRight),
      maxRight
    );
    this.setChordWidth(rightWidth);
    setSaved(SPLITTER_POSITION, rightWidth);
  };

  setChordWidth = (rightWidth) => {
    const leftPane = d3.select(SPLITTER_LEFT);
    const rightPane = d3.select(SPLITTER_RIGHT);
    leftPane.style("min-width", `calc(100% - ${rightWidth}px)`);
    rightPane.style("max-width", `${rightWidth}px`);
  };

  handleSplitterEnd = () => {
    if (!this.state.options.hideChart) {
      this.chordRef.init();
    }
    this.resize();
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
  render() {
    const controlButtons = createTopologyControlButtons({
      zoomInCallback: this.zoomInCallback,
      zoomOutCallback: this.zoomOutCallback,
      resetViewCallback: this.resetViewCallback,
      fitToScreenHidden: true,
      legendCallback: this.handleLegendClick,
      legendAriaLabel: "topology-legend",
    });

    return (
      <TopologyView
        aria-label="topology-viewer"
        viewToolbar={
          <GraphToolbar
            handleChangeSankey={this.handleChangeSankey}
            handleChangeShowStat={this.handleChangeShowStat}
            handleChangeHideChart={this.handleChangeHideChart}
            handleChangeWidth={this.handleChangeWidth}
            handleChangeColor={this.handleChangeColor}
            handleChangeMetric={this.handleChangeMetric}
            statProtocol={this.statProtocol()} // http || tcp || both
            stat={this.statForProtocol()} // requests || bytes_out etc.
            options={this.state.options}
          />
        }
        controlBar={<TopologyControlBar controlButtons={controlButtons} />}
        sideBar={
          <TopologySideBar
            id="sk-sidebar"
            className={"no-fade"}
            show={!this.state.options.hideChart}
          >
            <SplitterBar
              onDrag={this.handleSplitterChange}
              onDragEnd={this.handleSplitterEnd}
            />
            <ChartViewer
              ref={(el) => (this.chordRef = el)}
              initial={this.state.initial}
              service={this.props.service}
              data={this.state.chordData}
              deploymentLinks={this.viewObj.links().links}
              deployment={this.view === "deployment"}
              site={this.view === "site" || this.view === "deployment"}
              stat={this.statForProtocol()}
              handleShowAll={this.handleShowAll}
              handleChordOver={this.handleChordOver}
              handleArcOver={this.handleArcOver}
              view={this.props.view}
              viewObj={this.viewObj}
            />
          </TopologySideBar>
        }
        sideBarOpen={this.state.options.hideChart}
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
    );
  }
}

export default TopologyViewer;
