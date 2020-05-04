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
//import { Tabs, Tab } from "@patternfly/react-core";
import {
  getSizes,
  //pretty,
  formatBytes,
  positionPopup,
  siteColors,
  serviceColors,
  shortName,
} from "../../../utilities";
import { aggregateAddresses, separateAddresses } from "./filters.js";
import { ChordData } from "./data.js";
import { qdrRibbon } from "./ribbon/ribbon.js";
import { qdrlayoutChord } from "./layout/layout.js";
import QDRPopup from "../../../qdrPopup";
import * as d3 from "d3";
import RoutersComponent from "./routersComponent";
//import PieBreakdownComponent from "./pieComponent";
import KebabDropdown from "./kebob";
import PropTypes from "prop-types";

const DOUGHNUT = "#chord svg .empty";
const ERROR_RENDERING = "Error while rendering ";
const ARCPADDING = 0.06;
const SMALL_OFFSET = 210;
const MIN_RADIUS = 50;
const TRANSITION_DURATION = 500;

class ChordViewer extends Component {
  static propTypes = {
    service: PropTypes.object.isRequired,
    data: PropTypes.object,
    site: PropTypes.bool.isRequired,
    handleShowAll: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      addresses: {},
      showPopup: false,
      popupContent: "",
      showEmpty: false,
      emptyText: "",
      activeTabKey: 0,
    };
    this.excludedAddresses = [];
    this.chordData = new ChordData(
      this.props.service,
      false,
      aggregateAddresses
    );
    this.chordData.setFilter(this.excludedAddresses);
    this.outerRadius = null;
    this.innerRadius = null;
    this.textRadius = null;

    // format with commas
    this.formatNumber = formatBytes;

    // keep track of previous chords so we can animate to the new values
    this.last_chord = null;
    this.last_labels = null;

    // global pointer to the diagram
    this.svg = null;

    this.popoverChord = null;
    this.popoverArc = null;
    this.theyveBeenWarned = false;
  }

  // called only once when the component is initialized
  componentDidMount() {
    //this.init();
  }

  componentWillUnmount() {
    this.unmounting = true;
    // stop updated the data
    // clean up memory associated with the svg
    //d3.select("#chord").remove();
    //d3.select(window).on("resize.updatesvg", null);
    //window.removeEventListener("resize", this.windowResized);
  }

  init = () => {
    this.setSizes();

    // used to transition chords along a circular path instead of linear.
    // qdrRibbon is a replacement for d3.svg.chord() that avoids the twists
    this.chordReference = qdrRibbon().radius(this.innerRadius);
    //this.chordReference = d3.svg.chord().radius(this.innerRadius);

    // used to transition arcs along a circular path instead of linear
    this.arcReference = d3.svg
      .arc()
      .startAngle((d) => {
        return d.startAngle;
      })
      .endAngle((d) => {
        return d.endAngle;
      })
      .innerRadius(this.innerRadius)
      .outerRadius(this.textRadius);

    d3.select("#chord svg").remove();

    let xtrans =
      this.outerRadius === MIN_RADIUS ? SMALL_OFFSET : this.outerRadius;
    this.svg = d3
      .select("#chord")
      .append("svg")
      .attr("width", this.outerRadius * 2)
      .attr("height", this.outerRadius * 2)
      .attr("aria-label", "chord-svg")
      .append("g")
      .attr("id", "circle")
      .attr("transform", `translate(${xtrans},${this.outerRadius}) scale(.95)`);

    // mouseover target for when the mouse leaves the diagram
    this.svg
      .append("circle")
      .attr("r", this.innerRadius * 2)
      .on("mouseover", this.showAllChords);

    // background circle. will only get a mouseover event if the mouse is between chords
    this.svg
      .append("circle")
      .attr("r", this.innerRadius)
      .on("mouseover", () => {
        d3.event.stopPropagation();
      });

    this.svg = this.svg.append("g").attr("class", "chart-container");
    window.addEventListener("resize", () => {
      this.windowResized();
      setTimeout(this.windowResized, 1);
    });

    // get the raw data and render the svg
    this.getMatrix();
  };

  getMatrix = () => {
    if (this.props.site) {
      if (this.props.data === null) {
        if (this.props.deployment) {
          this.chordData
            .getAllDeploymentMatrix(
              this.props.deploymentLinks,
              separateAddresses
            )
            .then(this.renderChord);
        } else {
          // all sites
          this.chordData
            .getSiteMatrix(aggregateAddresses, this.props.stat)
            .then(this.renderChord);
        }
      } else {
        if (this.props.data.address) {
          // site traffic involving a service
          this.chordData
            .getDeploymentMatrix(
              this.props.data,
              aggregateAddresses,
              this.props.deploymentLinks
            )
            .then(this.renderChord);
        } else {
          // for specific site
          this.chordData
            .getSiteMatrixForSite(
              this.props.data,
              aggregateAddresses,
              this.props.stat
            )
            .then(this.renderChord);
        }
      }
    } else {
      if (this.props.data === null) {
        // all services
        this.chordData.getAllServiceMatrix().then(this.renderChord);
      } else {
        // for specific service
        this.chordData
          .getMatrix(this.props.data, this.props.stat)
          .then(this.renderChord, (e) => {
            console.log(ERROR_RENDERING + e);
          });
      }
    }
  };
  // TODO: handle window resizes
  //let updateWindow  = function () {
  //setSizes();
  //startOver();
  //};
  //d3.select(window).on('resize.updatesvg', updateWindow);
  windowResized = () => {};

  handleTabClick = (event, tabIndex) => {
    if (!this.unmounting) {
      this.setState({
        activeTabKey: tabIndex,
      });
    }
  };
  // size the diagram based on the browser window size
  getRadius = () => {
    const sizes = getSizes(d3.select("#chordContainer").node());
    const width = sizes[0];
    const height = sizes[1];
    const radius = Math.max(
      Math.floor((Math.min(width, height) * 0.9) / 2),
      MIN_RADIUS
    );
    return radius;
  };

  // diagram sizes that change when browser is resized
  setSizes = () => {
    // size of circle + text
    this.outerRadius = this.getRadius();
    // size of chords
    this.innerRadius = this.outerRadius - 10;
    // arc ring around chords
    this.textRadius = Math.min(this.innerRadius * 1.1, this.innerRadius + 15);
  };

  // arc colors are taken from every other color starting at 0
  getArcColor = (info) => {
    return siteColors[info.target.site_id].color;
  };
  // chord colors are taken from every other color starting at 19 and going backwards
  getChordColor = (n) => {
    return serviceColors[n];
  };

  // fade out the empty circle that is shown when there is no traffic
  fadeDoughnut = () => {
    d3.select(DOUGHNUT)
      .transition()
      .duration(200)
      .attr("opacity", 0)
      .remove();
  };

  // return the color associated with a router
  fillArc = (matrixValues, row) => {
    let router = matrixValues.routerName(row);
    const info = matrixValues.rows[row].info;
    return this.props.site
      ? this.getArcColor(info)
      : this.getChordColor(router);
  };

  // return the color associated with a chord.
  // if viewing by address, the color will be the address color.
  // if viewing aggregate, the color will be the router color of the largest chord ending
  fillChord = (matrixValues, d) => {
    // aggregate
    if (matrixValues.aggregate) {
      return this.fillArc(matrixValues, d.source.index);
    }
    // by address
    /*let addr = this.props.sent
      ? matrixValues.rows[d.orgIndex].ingress
      : matrixValues.rows[d.orgIndex].ingress;
      */
    let addr = matrixValues.getAddress(d.source.orgindex, d.source.orgsubindex);
    return this.getChordColor(addr);
  };

  emptyCircle = () => {
    d3.select(DOUGHNUT).remove();

    let arc = d3.svg
      .arc()
      .innerRadius(this.innerRadius)
      .outerRadius(this.textRadius)
      .startAngle(0)
      .endAngle(Math.PI * 2);

    d3.select("#circle")
      .append("path")
      .attr("class", "empty")
      .attr("d", arc);
    if (!this.unmounting) this.setState({ noValues: false });
  };

  chordKey = (d, matrix) => {
    // sort so that if the soure and target are flipped, the chord doesn't
    // get destroyed and recreated
    return this.getRouterNames(d, matrix)
      .sort()
      .join("-");
  };

  chordInfo = (d, matrix) => {
    const routerNames = this.getRouterNames(d, matrix);
    const sourceKey = routerNames[0];
    const targetKey = routerNames[1];
    const row = matrix.rows.find(
      (r) => r.ingress === sourceKey && r.egress === targetKey
    );
    if (row) {
      return row.info;
    }
  };

  arcInfo = (fg, matrix) => {
    const row = matrix.rows.find(
      (r) => (!matrix.aggregate ? r.ingress : r.chordName) === fg.key
    );
    if (row) {
      return row.info;
    }
  };

  getRouterNames = (d, matrix) => {
    let egress,
      ingress,
      address = "";
    // for arcs d will have an index, for chords d will have a source.index and target.index
    let eindex = !typeof d.index === "undefined" ? d.index : d.source.index;
    let iindex = !typeof d.index === "undefined" ? d.index : d.source.subindex;
    if (matrix.aggregate) {
      egress = matrix.rows[eindex].chordName;
      ingress = matrix.rows[iindex].chordName;
    } else {
      egress = matrix.routerName(eindex);
      ingress = matrix.routerName(iindex);
      // if a chord
      if (d.source) {
        address = matrix.getAddress(d.source.orgindex, d.source.orgsubindex);
      }
    }
    return [ingress, egress, address];
  };

  // popup title when mouse is over a chord
  // shows the address, from and to routers, and the values
  chordTitle = (d, matrix) => {
    let rinfo = this.getRouterNames(d, matrix);
    let from = rinfo[0],
      to = rinfo[1],
      address = rinfo[2];
    if (!matrix.aggregate) {
      address = "";
      //address += "<br/>";
    }
    address = shortName(address);
    to = shortName(to);
    from = shortName(from);
    let title =
      address + from + " → " + to + ": " + this.formatNumber(d.source.value);
    if (d.target.value > 0 && to !== from) {
      title +=
        "<br/>" + to + " → " + from + ": " + this.formatNumber(d.target.value);
    }
    return title;
  };
  arcTitle = (d, matrix) => {
    let egress,
      value = 0;
    if (matrix.aggregate) {
      egress = shortName(matrix.rows[d.index].chordName);
      value = d.value;
    } else {
      egress = matrix.routerName(d.index);
      value = d.value;
    }
    return egress + ": " + this.formatNumber(value);
  };

  decorateChordData = (rechord, matrix) => {
    let data = rechord.chords();
    data.forEach((d, i) => {
      d.key = this.chordKey(d, matrix);
      d.info = this.chordInfo(d, matrix);
      d.orgIndex = i;
      d.color = this.fillChord(matrix, d);
    });
    return data;
  };

  decorateArcData = (fn, matrix) => {
    let fixedGroups = fn();
    fixedGroups.forEach((fg) => {
      fg.orgIndex = fg.index;
      fg.angle = (fg.endAngle + fg.startAngle) / 2;
      fg.key = matrix.routerName(fg.index);
      fg.components = [fg.index];
      fg.router = matrix.aggregate ? fg.key : matrix.getEgress(fg.index);
      fg.info = this.arcInfo(fg, matrix);
      fg.color = this.props.site
        ? this.getArcColor(fg.info)
        : this.getChordColor(fg.router);
    });
    return fixedGroups;
  };

  // create and/or update the chord diagram
  renderChord = (matrix) => {
    if (!this.unmounting) {
      this.setState({ addresses: this.chordData.getAddresses() }, () => {
        return this.doRenderChord(matrix);
      });
    }
  };
  doRenderChord = (matrix) => {
    // populate the arcColors object with a color for each router
    // if all the addresses are excluded, update the message
    let addressLen = Object.keys(this.state.addresses).length;
    this.allAddressesFiltered = false;
    if (addressLen > 0 && this.excludedAddresses.length === addressLen) {
      this.allAddressesFiltered = true;
    }
    this.noValues = false;
    let matrixMessages,
      duration = this.props.initial ? 0 : TRANSITION_DURATION;

    // if there is no data, show an empty circle and a message
    if (!matrix.hasValues()) {
      this.noValues = true;
      if (!this.theyveBeenWarned) {
        this.theyveBeenWarned = true;
        let msg = "There is no message traffic";
        if (addressLen !== 0) {
          msg += " for the selected addresses";
        }
        if (!this.unmounting) {
          this.setState({ showEmpty: true, emptyText: msg });
        }
      }
      this.emptyCircle();
      matrixMessages = [];
    } else {
      matrixMessages = matrix.matrixMessages();
      if (!this.unmounting) {
        this.setState({ showEmpty: false });
      }
      this.theyveBeenWarned = false;
      this.fadeDoughnut();
    }

    // create a new chord layout so we can animate between the last one and this one
    let groupBy = matrix.getGroupBy();
    let rechord = qdrlayoutChord()
      .padding(ARCPADDING)
      .groupBy(groupBy)
      .matrix(matrixMessages);

    // The chord layout has a function named .groups() that returns the
    // data for the arcs. We decorate this data with a unique key.
    rechord.arcData = this.decorateArcData(rechord.groups, matrix);

    // join the decorated data with a d3 selection
    let arcsGroup = this.svg
      .selectAll("g.arc")
      .data(rechord.arcData, (d) => d.key);

    // get a d3 selection of all the new arcs that have been added
    let newArcs = arcsGroup
      .enter()
      .append("svg:g")
      .attr("class", "arc")
      .attr("aria-label", (d) => d.key);

    // each new arc is an svg:path that has a fixed color
    newArcs
      .append("svg:path")
      .style("fill", (d) => d.color)
      .style("stroke", (d) => d.color);

    /*
      newArcs
      .append("svg:text")
      .attr("dy", ".35em")
      .text(d => d.router);
*/
    // attach event listeners to all arcs (new or old)
    arcsGroup
      .on("mouseover", this.mouseoverArc)
      .on("mousemove", (d) => {
        let popupContent = this.arcTitle(d, matrix);
        this.showToolTip(popupContent);
      })
      .on("mouseout", (d) => {
        this.popoverArc = null;
        if (!this.unmounting) {
          this.setState({ showPopup: false });
        }
        this.props.handleArcOver(d, false);
      });

    // animate the arcs path to it's new location
    arcsGroup
      .select("path")
      .transition()
      .duration(duration)
      //.ease('linear')
      .attrTween("d", this.arcTween(this.last_chord));
    /*
      arcsGroup
      .select("text")
      .attr("text-anchor", d => (d.angle > Math.PI ? "end" : "begin"))
      .transition()
      .duration(duration)
      .attrTween("transform", this.tickTween(this.last_labels));
      */
    // check if the mouse is hovering over an arc. if so, update the tooltip
    arcsGroup.each((d) => {
      if (this.popoverArc && this.popoverArc.index === d.index) {
        //let popoverContent = this.arcTitle(d, matrix);
        //this.displayTooltip(d3.event, popoverContent);
      }
    });

    // animate the removal of any arcs that went away
    let exitingArcs = arcsGroup.exit();
    exitingArcs
      .selectAll("text")
      .transition()
      .duration(duration / 2)
      .attrTween("opacity", () => {
        return (t) => {
          return 1 - t;
        };
      });

    exitingArcs
      .selectAll("path")
      .transition()
      .duration(duration / 2)
      .attrTween("d", this.arcTweenExit)
      .each("end", function() {
        d3.select(this)
          .node()
          .parentNode.remove();
      });

    // decorate the chord layout's .chord() data with key, color, and orgIndex
    rechord.chordData = this.decorateChordData(rechord, matrix);
    let chordPaths = this.svg
      .selectAll("path.chord")
      .data(rechord.chordData, (d) => d.key);

    // new chords are paths
    chordPaths
      .enter()
      .append("path")
      .attr("class", "chord");

    if (!this.switchedByAddress) {
      // do multiple concurrent tweens on the chords
      chordPaths
        .call(this.tweenChordEnds, duration, this.last_chord)
        .call(this.tweenChordColor, duration, this.last_chord, "stroke")
        .call(this.tweenChordColor, duration, this.last_chord, "fill");
    } else {
      // switchByAddress is only true when we have new chords
      chordPaths
        .attr("d", (d) => {
          return this.chordReference(d);
        })
        .attr("stroke", (d) => d3.rgb(d.color).darker(1))
        .attr("fill", (d) => d.color)
        .attr("opacity", 1e-6)
        .transition()
        .duration(duration / 2)
        .attr("opacity", 0.67);
    }

    // if the mouse is hovering over a chord, update it's tooltip
    chordPaths.each((d) => {
      if (
        this.popoverChord &&
        this.popoverChord.source.orgindex === d.source.orgindex &&
        this.popoverChord.source.orgsubindex === d.source.orgsubindex
      ) {
        //let popoverContent = this.chordTitle(d, matrix);
        //this.displayTooltip(d3.event, popoverContent);
      }
    });

    // attach mouse event handlers to the chords
    chordPaths
      .on("mouseover", (d) => {
        this.mouseoverChord(d);
      })
      .on("mousemove", (d) => {
        this.popoverChord = d;
        let popoverContent = this.chordTitle(d, matrix);
        this.showToolTip(popoverContent);
      })
      .on("mouseout", (d) => {
        this.popoverChord = null;
        if (!this.unmounting) {
          this.setState({ showPopup: false });
        }
        this.props.handleChordOver(d, false);
      });

    let exitingChords = chordPaths.exit().attr("class", "exiting-chord");
    exitingChords.remove();
    /*
    if (!this.switchedByAddress) {
      // shrink chords to their center point upon removal
      exitingChords
        .transition()
        .duration(duration / 2)
        .attrTween("d", this.chordTweenExit)
        .remove();
    } else {
      // just fade them out if we are switching between byAddress and aggregate
      exitingChords
        .transition()
        .duration(duration / 2)
        .ease("linear")
        .attr("opacity", 1e-6)
        .remove();
    }
*/
    // keep track of this layout so we can animate from this layout to the next layout
    this.last_chord = rechord;
    this.last_labels = this.last_chord.arcData;
    this.switchedByAddress = false;
  };

  showToolTip = (content) => {
    // setting the popupContent state will cause the popup to render
    if (!this.unmounting) {
      this.setState({ showPopup: true, popupContent: content }, () => {
        // after the content has rendered, position it
        positionPopup({
          containerSelector: "#chordContainer",
          popupSelector: "#popover-div",
          constrainY: false,
        });
      });
    }
  };

  // animate the disappearance of an arc by shrinking it to its center point
  arcTweenExit = (d) => {
    let angle = (d.startAngle + d.endAngle) / 2;
    let to = { startAngle: angle, endAngle: angle, value: 0 };
    let from = {
      startAngle: d.startAngle,
      endAngle: d.endAngle,
      value: d.value,
    };
    let tween = d3.interpolate(from, to);
    return (t) => {
      return this.arcReference(tween(t));
    };
  };
  // animate the exit of a chord by shrinking it to the center points of its arcs
  chordTweenExit = (d) => {
    let angle = (d) => (d.startAngle + d.endAngle) / 2;
    let from = {
      source: {
        startAngle: d.source.startAngle,
        endAngle: d.source.endAngle,
      },
      target: { startAngle: d.target.startAngle, endAngle: d.target.endAngle },
    };
    let to = {
      source: { startAngle: angle(d.source), endAngle: angle(d.source) },
      target: { startAngle: angle(d.target), endAngle: angle(d.target) },
    };
    let tween = d3.interpolate(from, to);

    return (t) => {
      return this.chordReference(tween(t));
    };
  };

  // Animate an arc from its old location to its new.
  // If the arc is new, grow the arc from its startAngle to its full size
  arcTween = (oldLayout) => {
    var oldGroups = {};
    if (oldLayout) {
      oldLayout.arcData.forEach((groupData) => {
        oldGroups[groupData.index] = groupData;
      });
    }
    return (d) => {
      var tween;
      var old = oldGroups[d.index];
      if (old) {
        //there's a matching old group
        try {
          tween = d3.interpolate(old, d);
        } catch (e) {}
      }
      if (!old || !tween) {
        //create a zero-width arc object
        let mid = (d.startAngle + d.endAngle) / 2;
        let emptyArc = { startAngle: mid, endAngle: mid };
        tween = d3.interpolate(emptyArc, d);
      }

      return (t) => {
        return this.arcReference(tween(t));
      };
    };
  };

  // animate all the chords to their new positions
  tweenChordEnds = (chords, duration, last_layout) => {
    let oldChords = {};
    if (last_layout) {
      last_layout.chordData.forEach((d) => {
        oldChords[d.key] = d;
      });
    }
    let self = this;
    chords.each(function(d) {
      let chord = d3.select(this);
      // This version of d3 doesn't support multiple concurrent transitions on the same selection.
      // Since we want to animate the chord's path as well as its color, we create a dummy selection
      // and use that to directly transition each chord
      d3.select({})
        .transition()
        .duration(duration)
        .tween("attr:d", () => {
          let old = oldChords[d.key],
            interpolate;
          if (old) {
            // avoid swapping the end of cords where the source/target have been flipped
            // Note: the chord's colors will be swapped in a different tween
            if (
              old.source.index === d.target.index &&
              old.source.subindex === d.target.subindex
            ) {
              let s = old.source;
              old.source = old.target;
              old.target = s;
            }
          } else {
            // there was no old chord so make a fake one
            let midStart = (d.source.startAngle + d.source.endAngle) / 2;
            let midEnd = (d.target.startAngle + d.target.endAngle) / 2;
            old = {
              source: { startAngle: midStart, endAngle: midStart },
              target: { startAngle: midEnd, endAngle: midEnd },
            };
          }
          // d3.interpolate can't interpolate from undefined to an object
          if (d.info && !old.info) {
            old.info = {};
          } else if (old.info && !d.info) {
            d.info = {};
          }
          interpolate = d3.interpolate(old, d);
          return (t) => {
            chord.attr("d", self.chordReference(interpolate(t)));
          };
        });
    });
  };

  // animate a chord to its new color
  tweenChordColor = (chords, duration, last_layout, style) => {
    let oldChords = {};
    if (last_layout) {
      last_layout.chordData.forEach((d) => {
        oldChords[d.key] = d;
      });
    }
    chords.each(function(d) {
      let chord = d3.select(this);
      d3.select({})
        .transition()
        .duration(duration)
        .tween("style:" + style, function() {
          let old = oldChords[d.key],
            interpolate;
          let oldColor = "#CCCCCC",
            newColor = d.color;
          if (old) {
            oldColor = old.color;
          }
          if (style === "stroke") {
            oldColor = d3.rgb(oldColor).darker(1);
            newColor = d3.rgb(newColor).darker(1);
          }
          interpolate = d3.interpolate(oldColor, newColor);
          return (t) => {
            chord.style(style, interpolate(t));
          };
        });
    });
  };

  // animate the arc labels to their new locations
  tickTween = (oldArcs) => {
    var oldTicks = {};
    if (oldArcs) {
      oldArcs.forEach((d) => {
        oldTicks[d.key] = d;
      });
    }
    let angle = (d) => (d.startAngle + d.endAngle) / 2;
    return (d) => {
      var tween;
      var old = oldTicks[d.key];
      let start = angle(d);
      let startTranslate = this.textRadius - 40;
      let orient = d.angle > Math.PI ? "rotate(180)" : "";
      if (old) {
        //there's a matching old group
        start = angle(old);
        startTranslate = this.textRadius;
      }
      tween = d3.interpolateNumber(start, angle(d));
      let same = start === angle(d);
      let tsame = startTranslate === this.textRadius;

      let transTween = d3.interpolateNumber(
        startTranslate,
        this.textRadius + 10
      );

      return (t) => {
        let rot = same ? start : tween(t);
        if (isNaN(rot)) rot = 0;
        let tra = tsame ? this.textRadius + 10 : transTween(t);
        return `rotate(${(rot * 180) / Math.PI -
          90}) translate(${tra},0) ${orient}`;
      };
    };
  };

  // fade all chords that don't belong to the given arc index
  mouseoverArc = (d) => {
    d3.selectAll("path.chord").classed(
      "fade",
      (p) => d.index !== p.source.index && d.index !== p.target.index
    );
    this.props.handleArcOver(d, true);
  };

  // fade all chords except the given one
  mouseoverChord = (d) => {
    this.svg
      .selectAll("path.chord")
      .classed(
        "fade",
        (p) =>
          !(
            p.source.orgindex === d.source.orgindex &&
            p.target.orgindex === d.target.orgindex
          )
      );
    this.props.handleChordOver(d, true);
  };

  showAllChords = () => {
    this.svg.selectAll("path.chord").classed("fade", false);
  };

  // called periodically to refresh the data
  doUpdate = () => {
    if (!this.chordReference) {
      this.init();
    }
    this.getMatrix();
  };

  handleHoverRouter = (router, over) => {
    if (over) {
      this.enterRouter(router);
    } else {
      this.leaveLegend();
    }
  };
  handleHoverSite = (site, over) => {
    //console.log(`handleHoverSite ${site}, ${over}`);
  };

  // called when mouse enters one of the router legends
  enterRouter = (router) => {
    if (!this.props.data || !this.props.data.address) return;
    let indexes = [];
    // fade all chords that are not associated with this router
    let agg = this.chordData.last_matrix.aggregate;
    this.chordData.last_matrix.rows.forEach((row, r) => {
      if (agg) {
        if (row.chordName === router) indexes.push(r);
      } else {
        if (row.ingress === router || row.egress === router) indexes.push(r);
      }
    });
    d3.selectAll("path.chord").classed(
      "fade",
      (p) =>
        indexes.indexOf(p.source.orgindex) < 0 &&
        indexes.indexOf(p.target.orgindex) < 0
    );
  };
  leaveLegend = () => {
    this.showAllChords();
  };

  render() {
    const getArcColors = () => {
      if (this.props.site) {
        const colors = {};
        for (let site_id in siteColors) {
          let name = siteColors[site_id].name;
          const color = siteColors[site_id].color;
          colors[name] = color;
        }
        return colors;
      }
      return serviceColors;
    };

    const getTitle = () => {
      if (this.props.site) {
        if (this.props.data === null) {
          if (this.props.deployment) {
            return <div className="chord-title">All deployments</div>;
          } else {
            return <div className="chord-title">All sites</div>;
          }
        }
        if (this.props.data.address) {
          // site to site for a service
          return (
            <div className="chord-title">
              {
                <React.Fragment>
                  <span>Involving </span>{" "}
                  <span>
                    {this.props.data.parentNode.site_name}:
                    {this.props.data.shortName}
                  </span>
                </React.Fragment>
              }
            </div>
          );
        }
        return (
          <div className="chord-title">
            {`Involving site ${this.props.data.site_name}`}
          </div>
        );
      } else if (this.props.data === null) {
        return <div className="chord-title">All services</div>;
      }
      return (
        <div className="chord-title">{`Involving ${this.props.data.shortName}`}</div>
      );
    };
    return (
      <div id="chordContainer" className="qdrChord">
        {false && (
          <div className="chord-kebob">
            <KebabDropdown
              disableAll={!this.props.data ? true : false}
              allText={this.props.site ? "sites" : "services"}
              handleShowAll={this.props.handleShowAll}
            />
          </div>
        )}
        {getTitle()}
        <div aria-label="chord-diagram" id="chord"></div>
        <div
          id="popover-div"
          className={this.state.showPopup ? "" : "hidden"}
          ref={(el) => (this.popupRef = el)}
        >
          <QDRPopup content={this.state.popupContent}></QDRPopup>
        </div>
        <RoutersComponent
          arcColors={getArcColors()}
          handleHoverRouter={this.handleHoverRouter}
        ></RoutersComponent>
      </div>
    );
  }
}

export default ChordViewer;