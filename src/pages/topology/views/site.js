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

import * as d3 from "d3";
import { utils } from "../../../utilities";
import { genPath, pathBetween } from "../../../paths";
import { interpolatePath } from "d3-interpolate-path";
import SiteCard from "../cards/siteCard";
import LinkCard from "../cards/linkCard";
import { Nodes } from "../nodes.js";
import { Links } from "../links.js";
const SITE_POSITION = "site";
const ZOOM_SCALE = "sitescale";
const ZOOM_TRANSLATE = "sitetrans";
const SITE_OPTIONS = "siteopts";
const SITE_TABLE_OPTIONS = "sitetblopts";
const SITE_DETAIL_OPTIONS = "sitedtlopts";
const DEFAULT_DETAIL_OPTIONS = {
  item: undefined,
};

const DEFAULT_OPTIONS = {
  traffic: false,
  color: false,
  showMetric: false,
  isExpanded: 0,
  showExternal: false,
  http: "bytes_out",
  tcp: "bytes_out",
};
const DEFAULT_TABLE_OPTIONS = {
  page: 1,
  sortBy: "",
  filterBy: "",
  perPage: 10,
};

export class Site {
  constructor(data, SVG_ID = "SVG_ID") {
    this.data = data;
    this.siteNodes = new Nodes();
    this.routerLinks = new Links();
    this.trafficLinks = new Links();
    this.nodes = () => this.siteNodes;
    this.links = () => this.trafficLinks;
    this.fields = [
      { title: "Name", field: "site_name" },
      { title: "Namespace", field: "namespace" },
      //{ title: "Edge", field: "edge" },
    ];
    this.card = new SiteCard();
    this.linkCard = new LinkCard();
    this.SVG_ID = `#${SVG_ID}`;
    //this.detailFormatter = true;
  }

  createSelections = (svg) => {
    this.createStatsGroup(svg);
    this.routerLinksSelection = this.createRouterLinksSelection(svg);
    this.trafficLinksSelection = this.createTrafficLinksSelection(svg);
    this.masksSelection = this.createMasksSelection(svg);
    this.sitesSelection = this.createSitesSelection(svg);
  };

  setupSelections = (viewer, handleEvents = true) => {
    this.setupStats();
    this.masksSelection = this.setupMasks(viewer);
    this.sitesSelection = this.setupSitesSelection(viewer, handleEvents);
    this.trafficLinksSelection = this.setupTrafficLinks(viewer, handleEvents);
    this.routerLinksSelection = this.setupRouterLinks(viewer, handleEvents);
  };

  initNodesAndLinks = (viewer, colors, radius) => {
    if (!radius) radius = utils.SiteRadius;
    this.initNodes(this.siteNodes, viewer, colors, radius);
    let vsize = { width: viewer.width, height: viewer.height };
    vsize = this.initRouterLinks(this.siteNodes, this.routerLinks, vsize);
    vsize = this.initTrafficLinks(
      this.siteNodes,
      this.trafficLinks,
      vsize,
      viewer,
      radius
    );
    return { nodeCount: this.siteNodes.nodes.length, size: vsize };
  };

  updateNodesAndLinks = (viewer, colors, radius) => {
    if (!radius) radius = utils.SiteRadius;
    const newNodes = new Nodes();
    const newRouterLinks = new Links();
    const newTrafficLinks = new Links();
    this.initNodes(newNodes, viewer, colors, radius);
    let vsize = { width: viewer.width, height: viewer.height };
    vsize = this.initRouterLinks(newNodes, newRouterLinks, vsize);
    vsize = this.initTrafficLinks(
      newNodes,
      newTrafficLinks,
      vsize,
      viewer,
      radius
    );

    utils.reconcileArrays(this.siteNodes.nodes, newNodes.nodes);
    utils.reconcileLinks(
      this.routerLinks.links,
      newRouterLinks.links,
      this.siteNodes.nodes
    );
    utils.reconcileLinks(
      this.trafficLinks.links,
      newTrafficLinks.links,
      this.siteNodes.nodes
    );
    viewer.restart();
    return { size: vsize };
  };

  initNodes = (siteNodes, viewer, colors, radius) => {
    if (!radius) radius = utils.SiteRadius;
    const clusters = this.data.adapter.data.sites;
    clusters.forEach((cluster) => {
      const name = cluster.site_name;

      const clusterNode = siteNodes.addUsing({
        name,
        nodeType: "cluster",
        fixed: true,
        heightFn: this.clusterHeight,
        widthFn: this.clusterWidth,
      });
      clusterNode.mergeWith(cluster);
      clusterNode.color = utils.siteColor(name, cluster.site_id, colors);
      clusterNode.r = radius;
      clusterNode.normalR = radius;
      clusterNode.sankeyR = radius;
      clusterNode.expanded = viewer.state.options.traffic;
      clusterNode.edge = cluster.edge;
    });
  };

  initTrafficLinks = (nodes, links, vsize, viewer, radius) => {
    let deploymentLinks = this.data.adapter.getDeploymentLinks(
      viewer.state.options.showExternal
    );
    deploymentLinks.forEach((link) => {
      let stat = viewer.statForProtocol();
      if (stat === "bytes_in") stat = "bytes_out";
      // only traffic between sites
      if (link.source.site.site_id !== link.target.site.site_id) {
        // see if we already have a link between these sites
        const found = links.links.find(
          (l) =>
            l.source.site_id === link.source.site.site_id &&
            l.target.site_id === link.target.site.site_id
        );
        let value = link.request[stat] || 0;
        if (found) {
          if (stat === "latency_max") {
            value = Math.max(found.value, value);
          } else {
            value += found.value;
          }
          found.value = value;
          utils.aggregateAttributes(link.request, found.request);
        } else {
          const linkIndex = links.addLink({
            source: nodes.nodes.find(
              (n) => n.site_id === link.source.site.site_id
            ),
            target: nodes.nodes.find(
              (n) => n.site_id === link.target.site.site_id
            ),
            dir: "in",
            cls: "siteTraffic",
            uid: `SiteLink-${link.source.site.site_id}-${link.target.site.site_id}`,
          });
          const alink = links.links[linkIndex];
          alink.value = value;
          alink.request = { ...link.request };
          alink.getColor = () => "black"; //utils.linkColor(alink, links.links);
        }
      }
    });

    // site-to-site traffic
    // position sites based on router links
    utils.adjustPositions({
      nodes: nodes.nodes,
      links: links.links,
      width: vsize.width,
      height: vsize.height - 50,
      align: "left",
    });

    if (links.links.length > 0) {
      // sets the y0, y1, width of the links
      // sets the x0 y0, x1 y1 of the nodes
      utils.initSankey({
        nodes: nodes.nodes,
        links: links.links,
        width: vsize.width,
        height: vsize.height - 50,
        nodeWidth: 1,
        nodePadding: utils.ClusterPadding,
        left: 50,
        top: 10,
        right: 50,
        bottom: 10,
      });
    }
    // set the site.sankeyR based on traffic
    nodes.nodes.forEach((n) => {
      n.sankeyR = n.y0 !== undefined ? (n.y1 - n.y0) / 2 : n.r;
      n.sankeyR = Math.max(50, n.sankeyR);
      n.sankeyHeight = n.sankeyR * 2;
      n.normalR = n.r;
    });

    // move the sankey starting points to the site location
    nodes.nodes.forEach((n) => {
      n.x0 = n.x;
      n.y0 = n.y;
      n.x1 = n.x + n.getWidth();
      n.y1 = n.y + n.getHeight();
    });

    // don't let sites overlap or expand beyond width of container
    const finalSize = utils.adjustPositions({
      nodes: nodes.nodes,
      links: links.links,
      width: vsize.width,
      height: vsize.height,
    });

    // move sites to their saved position
    nodes.nodes.forEach((n) => {
      const pos = utils.getSaved(`${SITE_POSITION}-${n.site_id}`);
      if (pos) {
        n.x = pos.x;
        n.y = pos.y;
        n.x0 = pos.x0;
        n.y = pos.y0;
        n.fixed = true;
        n.x1 = n.x + n.getWidth();
        n.y1 = n.y + n.getHeight();
      }
    });

    vsize = { width: finalSize.width, height: finalSize.height };

    if (links.links.length > 0) {
      utils.updateSankey({
        nodes: this.siteNodes.nodes,
        links: this.trafficLinks.links,
      });

      // update the links
      //utils.updateSankey({ nodes: nodes.nodes, links: links.links });
    }
    return vsize;
  };

  initRouterLinks = (nodes, links, vsize) => {
    this.data.adapter.data.sites.forEach((site, i) => {
      const source = nodes.nodes.find((n) => n.site_id === site.site_id);
      site.connected.forEach((targetSite) => {
        const target = nodes.nodes.find((s) => s.site_id === targetSite);
        links.getLink(
          source,
          target,
          "out",
          "cluster",
          `Link-${source.name}-${target.name}`
        );
      });
    });
    return vsize;
  };

  createStatsGroup = (svg) => svg.append("svg:defs").attr("class", "statPaths");
  createSitesSelection = (svg) =>
    svg
      .append("svg:g")
      .attr("class", "clusters")
      .selectAll("g.cluster")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

  createRouterLinksSelection = (svg) =>
    svg.append("svg:g").attr("class", "siteRouterLinks").selectAll("g");

  createTrafficLinksSelection = (svg) =>
    svg.append("svg:g").attr("class", "siteTrafficLinks").selectAll("g");

  createMasksSelection = (svg) =>
    svg.append("svg:g").attr("class", "masks").selectAll("g");

  setupStats = () => {
    const selection = d3
      .select(this.SVG_ID)
      .select("defs.statPaths")
      .selectAll("path")
      .data(
        this.trafficLinks.links,
        (d) => `${d.source.site_id}-${d.target.site_id}`
      );

    selection.exit().remove();

    selection
      .enter()
      .append("path")
      .attr("id", (d) => utils.statId(d, this.SVG_ID));
  };

  setupMasks = (viewer) => {
    const links = this.trafficLinks.links;
    const targets = links.map((l) => ({
      mask: "target",
      link: l,
      uid: `MaskTarget-${l.uid}`,
    }));
    const selection = this.masksSelection.data(targets, (d) => d.uid);
    selection.exit().remove();
    const enter = selection.enter().append("g");
    enter.append("path").attr("class", "mask");

    return selection;
  };

  setupSitesSelection = (viewer, handleEvents = true) => {
    const selection = this.sitesSelection.data(this.siteNodes.nodes, (d) =>
      d.uid()
    );

    // remove old nodes
    selection.exit().each((d) => {
      utils.removeSiteColor(d.site_id);
    });
    selection.exit().remove();

    // add new circle nodes
    // add an svg:g with class "cluster" for each node in the data
    const enterCircle = selection
      .enter()
      .append("g")
      .attr("class", "cluster site")
      .attr(
        "transform",
        (d) =>
          `translate(${viewer.width / 2 - d.getWidth() / 2},${
            viewer.height / 2 - d.getHeight() / 2
          })`
      )
      .attr("id", (d) => `${this.SVG_ID}-$cluster-${d.name}`);

    const rects = enterCircle
      .append("svg:g")
      .attr("class", "cluster-rects")
      .attr("opacity", 1);

    rects
      .append("svg:circle")
      .attr("class", "network")
      .classed("edge", (d) => d.edge)
      .attr("r", (d) => d.r)
      .attr("cx", (d) => d.r)
      .attr("cy", (d) => d.r)
      .attr("fill", (d) => utils.lighten(0.9, d.color))
      .attr("stroke", (d) => d.color)
      .attr("opacity", 1);

    rects
      .append("svg:text")
      .attr("class", "cluster-name")
      .attr("x", (d) => d.getWidth() / 2)
      .attr("y", (d) => d.getHeight() / 2)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .text((d) => d.name);

    if (handleEvents) {
      enterCircle
        .on("mouseover", (d) => {
          viewer.clearPopups();
          viewer.showChord(d);
          viewer.showPopup(d, this.card);
          viewer.viewObj.mouseoverCircle(d, viewer);
          viewer.clearChosen();
          //d.chosen = true;
          viewer.restart();
        })
        .on("mouseout", (d) => {
          this.unSelectAll();
          viewer.showChord(null, false);
          viewer.clearPopups();
          this.clearChosen();
          viewer.blurAll(false, d);
          d3.event.stopPropagation();
          viewer.viewObj.mouseoutCircle(d, viewer);
          viewer.restart();
        })
        .on("mousedown", (d) => {
          // mouse down for circle
          viewer.current_node = d;
          if (d3.event.button !== 0) {
            // ignore all but left button
            return;
          }
          viewer.mousedown_node = d;
          // mouse position relative to svg
          this.initial_mouse_down_position = d3.mouse(viewer.svg.node());
        })
        .on("mouseup", (d) => {
          // mouse up for circle
          if (!viewer.mousedown_node) return;

          viewer.mouseup_node = d;
          viewer.clearAllHighlights();
          viewer.mousedown_node = null;
          // apply any data changes to the interface
          viewer.restart();
        })
        .on("click", (d) => {
          // circle
          // if we dragged the node, make it fixed
          let cur_mouse = d3.mouse(viewer.svg.node());
          if (
            Math.abs(this.initial_mouse_down_position[0] - cur_mouse[0]) < 3 &&
            Math.abs(this.initial_mouse_down_position[1] - cur_mouse[1]) < 3
          ) {
            viewer.handleViewDetails(d);
          }
          viewer.restart();
          d3.event.stopPropagation();
        });
    }

    selection
      .classed("selected", (d) => d.selected)
      .classed("highlighted", (d) => d.highlighted)
      .classed("chosen", (d) => d.chosen);
    selection
      .selectAll("circle.network")
      .classed("dim", viewer.view === "deployment");

    selection.classed("hidden", (d) => d.site_name === "unknown");

    return selection;
  };

  mouseoverCircle = (d, viewer) => {
    viewer.blurAll(true, d);
    d.selected = true;
  };
  mouseoutCircle = (d, viewer) => {
    // mouse out for a circle
    this.unSelectAll();
    viewer.blurAll(false, d);
    viewer.clearAllHighlights();
  };

  setupTrafficLinks = (viewer, handleEvents) => {
    const links = this.trafficLinks.links;
    const selection = this.trafficLinksSelection.data(
      links.sort((a, b) =>
        a.width < b.width ? 1 : a.width > b.width ? -1 : 0
      ),
      (d) => d.uid
    );
    selection.exit().remove();

    const enter = selection.enter().append("g");
    enter
      .append("path")
      .attr("class", "siteTrafficLink")
      .attr("fill", (d) => d.getColor())
      .attr("d", (d) => {
        return genPath({ link: d });
      });

    enter
      .append("path")
      .attr("class", "siteTrafficDir")
      .attr("stroke", "black")
      .attr("stroke-width", 1);
    //.attr("marker-end", "url(#end--15)"); // site markers are manually moved

    const eventPath = enter.append("path").attr("class", "hittarget");
    if (handleEvents) {
      eventPath
        .on("click", (d) => {
          d3.event.stopPropagation();
          viewer.clearPopups();
        })
        .on("mouseover", (d) => {
          viewer.blurAll(true, d);
          d.selected = true;
          viewer.showPopup(d, this.linkCard);
          viewer.restart();
        })
        .on("mouseout", (d) => {
          d.selected = false;
          viewer.blurAll(false, d);
          viewer.clearPopups();
          viewer.restart();
        });
    }

    enter
      .append("text")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .append("textPath")
      .attr("class", "stats")
      .attr("text-anchor", "middle")
      .attr("startOffset", "50%")
      .attr("text-length", "100%")
      .attr("href", (d) => `#${utils.statId(d, this.SVG_ID)}`);

    d3.select(this.SVG_ID)
      .selectAll(".siteTrafficLink")
      .classed("selected", (d) => d.selected);
    d3.select(this.SVG_ID)
      .selectAll("path.mask")
      .classed("selected", (d) => d.link.selected);

    return selection;
  };

  setupRouterLinks = (viewer, handleEvents) => {
    const links = this.routerLinks.links;
    const selection = this.routerLinksSelection.data(links, (d) => d.uid);

    selection.exit().remove();
    const enter = selection.enter().append("g");

    enter.append("path").attr("class", "site");

    const eventPath = enter
      .append("path")
      .attr("marker-end", "url(#site-end)")
      .attr("class", "site-hittarget")
      .attr("stroke-width", 6);
    if (handleEvents) {
      eventPath
        .on("click", (d) => {
          d3.event.stopPropagation();
          viewer.clearPopups();
          viewer.showPopup(d, this.linkCard);
        })
        .on("mouseover", (d) => {
          d.highlighted = true;
          d.selected = true;
          viewer.restart();
        })
        .on("mouseout", (d) => {
          d.highlighted = false;
          d.selected = false;
          viewer.restart();
        });
    }

    selection
      .selectAll("path.site")
      .classed("highlighted", (d) => d.highlighted);

    return selection;
  };

  interSiteLinks = (siteNodes) => {
    // set the site non-sankey x,y based on its new size
    // using site-to-site traffic as the links
    const interSiteLinks = new Links();
    siteNodes.nodes.forEach((fromSite) => {
      siteNodes.nodes.forEach((toSite) => {
        if (fromSite.site_id !== toSite.site_id) {
          const value = this.data.adapter.siteToSite(fromSite, toSite);
          if (value) {
            const linkIndex = interSiteLinks.addLink({
              source: fromSite,
              target: toSite,
              dir: "out",
              cls: "cls",
              uid: "uid",
            });
            interSiteLinks.links[linkIndex].value = value;
          }
        }
      });
    });
    return interSiteLinks;
  };

  savePosition = (d) => {
    utils.setSaved(`${SITE_POSITION}-${d.site_id}`, {
      x: d.x,
      y: d.y,
      x0: d.x0,
      y0: d.y0,
    });
  };

  setSitePositions = (sankey) => {
    this.siteNodes.nodes.forEach((n) => {
      n.r = sankey ? n.sankeyR : n.normalR;
    });
  };

  dragStart = (d, sankey) => {
    this.setSitePositions(sankey);
  };

  drag = (d, sankey) => {
    d.x = d.px;
    d.y = d.py;
  };
  dragEnd = (d) => {
    this.savePosition(d);
  };

  drawViewNodes = (sankey) => {
    this.sitesSelection.attr("transform", (d) => {
      return `translate(${d.x},${d.y})`;
    });
  };

  genTraffic = (d, sankey) =>
    genPath({
      link: d,
      sankey: true,
      width: sankey ? undefined : 6,
      site: sankey,
    });
  genTrafficDir = (d, sankey) =>
    genPath({ link: d, sankey: true, width: 1, site: true });
  genMask = (d, selection, sankey) =>
    genPath({ link: d.link, mask: d.mask, selection, site: sankey });
  genStatPath = (d) =>
    genPath({
      link: d,
      reverse: d.circular,
      offsetY: 4,
      width: 1,
      site: true,
    });

  drawViewPaths = (sankey) => {
    const self = this;
    utils.updateSankey({
      nodes: this.siteNodes.nodes,
      links: this.trafficLinks.links,
    });

    // for the non-sankey mode, path.service is hidden
    this.trafficLinksSelection
      .selectAll("path.siteTrafficLink")
      .attr("d", (d) =>
        genPath({
          link: d,
          sankey: true,
          width: sankey ? undefined : 6,
          site: true,
        })
      );

    this.trafficLinksSelection
      .selectAll("path.siteTrafficDir")
      .attr("d", (d) => {
        return genPath({ link: d, sankey: true, width: 1, site: true });
      });
    d3.select(this.SVG_ID)
      .select("defs.statPaths")
      .selectAll("path")
      .attr("d", (d) => this.genStatPath(d));

    this.trafficLinksSelection
      .selectAll("path.hittarget")
      .attr("stroke-width", (d) => (sankey ? Math.max(d.width, 6) : 6))
      .attr("d", (d) => genPath({ link: d }));

    this.routerLinksSelection
      .selectAll("path") // this includes the .site and .hittarget
      .attr("d", (d) => pathBetween(d.source, d.target));

    // the arrows on the trafficDir lines.
    // not using markers since the arrows are not at the end of the lines
    d3.select(this.SVG_ID)
      .selectAll("path.mask")
      .attr("d", function (d) {
        return self.genMask(d, this, sankey);
      });
  };

  setLinkStat = (show, stat) => {
    utils.setLinkStat(this.trafficLinksSelection, show, stat);
  };

  setupDrag = (drag) => {
    this.sitesSelection.call(drag);
  };

  collapseNodes = () => {
    this.siteNodes.nodes.forEach((n) => {
      n.expanded = false;
    });
  };
  expandNodes = () => {
    this.siteNodes.nodes.forEach((n) => {
      n.expanded = true;
    });
  };

  clusterHeight = (n, expanded) =>
    expanded || n.expanded ? n.sankeyR * 2 : n.normalR * 2;
  clusterWidth = (n, expanded) => this.clusterHeight(n, expanded);

  highlightLink(highlight, link, d, sankey, color) {
    this.trafficLinksSelection
      .selectAll("path.siteTrafficLink")
      .filter((d1) => d1 === d)
      .attr("opacity", highlight ? (sankey ? 0.8 : 0) : sankey ? 0.5 : 0);

    this.trafficLinksSelection
      .selectAll("path.siteTrafficDir")
      .filter((d1) => d1 === d)
      .attr("opacity", 1);
  }

  // returns true if any path or service is currently selected.
  // selected means that the mouse is hoving over it
  anySelected = () =>
    this.siteNodes.nodes.some((n) => n.selected) ||
    this.trafficLinks.links.some((l) => l.selected) ||
    this.routerLinks.links.some((l) => l.selected);

  clearChosen = () => {
    this.siteNodes.nodes.forEach((n) => (n.chosen = false));
  };

  unSelectAll = () => {
    this.siteNodes.nodes.forEach((n) => (n.selected = false));
    this.trafficLinks.links.forEach((l) => (l.selected = false));
    this.routerLinks.links.forEach((l) => (l.selected = false));
  };
  blurAll(blur, d, sankey, color) {
    if (blur || !this.anySelected()) {
      //this.sitesSelection.attr("opacity", opacity);
      // instead of changing the site opacity, change the colors
      this.sitesSelection
        .selectAll(".network")
        .attr("fill", (s) =>
          blur && s !== d
            ? utils.lighten(0.95, s.color)
            : utils.lighten(0.9, s.color)
        )
        .attr("stroke", (s) =>
          blur && s !== d ? utils.lighten(0.8, s.color) : s.color
        );
      this.sitesSelection
        .selectAll("text")
        .attr("opacity", (s) => (blur && s !== d ? 0.5 : 1));
      this.trafficLinksSelection
        .selectAll("path.siteTrafficLink")
        .attr("opacity", blur ? (color ? 0 : 0.25) : sankey ? 0.5 : 0);
      this.trafficLinksSelection
        .selectAll("path.siteTrafficDir")
        .attr("opacity", blur ? 0.25 : 1);
      this.trafficLinksSelection
        .selectAll("text")
        .attr("opacity", (l) => (blur && l !== d ? 0.25 : 1));
      this.masksSelection.attr("opacity", (l) =>
        blur && l.link !== d ? 0.25 : 1
      );

      this.routerLinksSelection
        .selectAll("path.site")
        .attr("opacity", blur ? 0.25 : 1);
    }
  }

  transition = (sankey, initial, color, viewer) => {
    this.setSitePositions(sankey);
    viewer.setLinkStat();
    utils.updateSankey({
      nodes: this.siteNodes.nodes,
      links: this.trafficLinks.links,
    });
    this.drawViewPaths(sankey);
    const duration = initial ? 0 : utils.VIEW_DURATION;
    if (sankey) {
      return this.toSiteSankey(duration);
    } else if (color) {
      return this.toSiteColor(duration);
    } else {
      return this.toSite(duration);
    }
  };

  // show traffic as a single colored line
  toSiteColor = (duration) => {
    return new Promise((resolve) => {
      const self = this;
      d3.select(this.SVG_ID)
        .select("g.siteTrafficLinks")
        .style("display", null)
        .transition()
        .duration(duration)
        .attr("opacity", function (d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        });

      // hide the wide traffic paths
      d3.select(this.SVG_ID)
        .selectAll("path.siteTrafficLink")
        .transition()
        .duration(duration)
        .attr("stroke-width", 2)
        .attr("opacity", 0)
        .call(utils.endall, () => {
          resolve();
        });

      // transition the containers to their proper position
      d3.select(this.SVG_ID)
        .selectAll(".cluster")
        .transition()
        .duration(duration)
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .each("end", function () {
          d3.select(this)
            .style("display", "block")
            .attr("opacity", function (d) {
              const current = d3.select(this).attr("opacity");
              return self.anySelected() ? current : 1;
            })
            .select(".cluster-rects")
            .attr("opacity", function (d) {
              const current = d3.select(this).attr("opacity");
              return self.anySelected() ? current : 1;
            })
            .style("display", "block");
        });

      d3.select(this.SVG_ID)
        .select("g.clusters")
        .selectAll("circle.network")
        .transition()
        .duration(duration)
        .attr("r", (d) => d.r)
        .attr("cx", (d) => d.r)
        .attr("cy", (d) => d.r);

      d3.select(this.SVG_ID)
        .select("g.clusters")
        .selectAll("text.cluster-name")
        .transition()
        .duration(duration)
        .attr("x", (d) => d.getWidth() / 2)
        .attr("y", (d) => d.getHeight() / 2);

      // traffic mouseover path
      d3.select(this.SVG_ID)
        .selectAll("path.hittarget")
        .style("display", "block")
        .attr("stroke-width", 6)
        .attr("d", (d) => this.genTrafficDir(d, false));

      d3.select(this.SVG_ID)
        .select("defs.statPaths")
        .selectAll("path")
        .transition()
        .duration(duration)
        .attrTween("d", function (d) {
          const previous = d3.select(this).attr("d");
          const current = self.genStatPath(d);
          return interpolatePath(previous, current);
        });

      // show the traffic direction in color
      d3.select(this.SVG_ID)
        .selectAll("path.siteTrafficDir")
        .transition()
        .duration(duration)
        .attr("opacity", function (d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        })
        .attr("stroke-width", 2)
        .attr("stroke", (d) => d.getColor())
        .attrTween("d", function (d, i) {
          const previous = d3.select(this).attr("d");
          const current = self.genTrafficDir(d, false);
          return interpolatePath(previous, current);
        });

      // let the stats show if/when the checkbox is checked
      d3.select(this.SVG_ID)
        .select("g.siteTrafficLinks")
        .selectAll("text.stats")
        .transition()
        .duration(duration)
        .attr("opacity", function (d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        });

      // hide the wide masks

      d3.select(this.SVG_ID)
        .selectAll("path.mask")
        .attr("stroke-width", 0)
        .transition()
        .duration(duration)
        .attr("opacity", function (d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        })
        .attr("fill", "black")
        .attrTween("d", function (d, i) {
          const previous = d3.select(this).attr("d");
          const current = self.genMask(d, this, false);
          return interpolatePath(previous, current);
        });

      // hide all inter-router paths
      d3.select(this.SVG_ID)
        .select("g.siteRouterLinks")
        .transition()
        .duration(duration)
        .attr("opacity", 0);
    });
  };

  // show site connections only as dashed line
  toSite = (duration) => {
    return new Promise((resolve) => {
      const self = this;
      // hide all traffic paths
      d3.select(this.SVG_ID)
        .select("g.siteTrafficLinks")
        .transition()
        .duration(duration)
        .attr("opacity", 0)
        .each("end", function (d) {
          // so mouseover events don't fire
          d3.select(this).style("display", "none");
        });

      d3.select(this.SVG_ID)
        .select("g.siteRouterLinks")
        .transition()
        .duration(duration)
        .attr("opacity", function (d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        });

      // show all inter router links
      this.routerLinksSelection
        .selectAll("path") // this includes the .site and .hittarget
        .transition()
        .duration(duration)
        .attr("opacity", function (d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        })
        .attrTween("d", function (d, i) {
          const previous = d3.select(this).attr("d");
          const current = pathBetween(d.source, d.target);
          return interpolatePath(previous, current);
        })
        .call(utils.endall, () => {
          resolve();
        });

      // transition the containers to their proper position
      d3.select(this.SVG_ID)
        .selectAll(".cluster")
        .transition()
        .duration(duration)
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .each("end", function () {
          d3.select(this)
            .style("display", "block")
            .attr("opacity", function (d) {
              const current = d3.select(this).attr("opacity");
              return self.anySelected() ? current : 1;
            })
            .select(".cluster-rects")
            .attr("opacity", function (d) {
              const current = d3.select(this).attr("opacity");
              return self.anySelected() ? current : 1;
            })
            .style("display", "block");
        });

      //d3.selectAll("path.hittarget").style("display", "none");

      d3.select(this.SVG_ID)
        .selectAll("path.mask")
        .transition()
        .duration(duration)
        .attr("opacity", 0);

      d3.select(this.SVG_ID)
        .select("g.clusters")
        .selectAll("circle.network")
        .transition()
        .duration(duration)
        .attr("r", (d) => d.r)
        .attr("cx", (d) => d.r)
        .attr("cy", (d) => d.r);

      d3.select(this.SVG_ID)
        .select("g.clusters")
        .selectAll("text.cluster-name")
        .transition()
        .duration(duration)
        .attr("x", (d) => d.r)
        .attr("y", (d) => d.r);
      /*
      d3.select(this.SVG_ID)
        .selectAll("text.cluster-name")
        .attr("y", (d) => d.getHeight() / 2);
*/
      // hide services
      d3.select(this.SVG_ID).selectAll("g.services").style("display", "none");
    });
  };

  // show traffic as wide lines
  toSiteSankey = (duration) => {
    return new Promise((resolve) => {
      const self = this;
      d3.select(this.SVG_ID)
        .select("g.siteTrafficLinks")
        .style("display", null)
        .transition()
        .duration(duration)
        .attr("opacity", function (d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        });

      d3.select(this.SVG_ID)
        .select("g.siteRouterLinks")
        .transition()
        .duration(duration)
        .attr("opacity", 0)
        .call(utils.endall, () => {
          resolve();
        });

      d3.select(this.SVG_ID)
        .select("defs.statPaths")
        .selectAll("path")
        .transition()
        .duration(duration)
        .attrTween("d", function (d) {
          const previous = d3.select(this).attr("d");
          const current = self.genStatPath(d);
          return interpolatePath(previous, current);
        });

      d3.select(this.SVG_ID)
        .selectAll("path.siteTrafficDir")
        .transition()
        .duration(duration)
        .attr("opacity", function (d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        })
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attrTween("d", function (d, i) {
          const previous = d3.select(this).attr("d");
          const current = self.genTrafficDir(d, true);
          return interpolatePath(previous, current);
        });

      d3.select(this.SVG_ID)
        .select("g.siteTrafficLinks")
        .selectAll("text.stats")
        .transition()
        .duration(duration)
        .attr("opacity", function (d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        });

      d3.select(this.SVG_ID)
        .selectAll("path.siteTrafficLink")
        .attr("stroke-width", 0)
        .transition()
        .duration(duration)
        .attr("opacity", function (d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 0.5;
        })
        .attr("fill", (d) => d.target.color)
        .attrTween("d", function (d, i) {
          let previous = d3.select(this).attr("d");
          const current = self.genTraffic(d, true);
          return interpolatePath(previous, current);
        });

      d3.select(this.SVG_ID)
        .selectAll("path.hittarget")
        .style("display", "block")
        .attr("stroke-width", (d) => Math.max(d.width, 6))
        .attr("d", (d) => this.genTrafficDir(d, true));

      d3.select(this.SVG_ID)
        .selectAll("path.mask")
        .attr("stroke-width", 0)
        .transition()
        .duration(duration)
        .attr("opacity", function (d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        })
        .attr("fill", "black")
        .attrTween("d", function (d, i) {
          const previous = d3.select(this).attr("d");
          const current = self.genMask(d, this, true);
          return interpolatePath(previous, current);
        });

      d3.select(this.SVG_ID)
        .select("g.clusters")
        .selectAll("circle.network")
        .transition()
        .duration(duration)
        .attr("r", (d) => d.r)
        .attr("cx", (d) => d.r)
        .attr("cy", (d) => d.r);

      d3.select(this.SVG_ID)
        .select("g.clusters")
        .selectAll("g.cluster")
        .transition()
        .duration(duration)
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

      d3.select(this.SVG_ID)
        .select("g.clusters")
        .selectAll("text.cluster-name")
        .transition()
        .duration(duration)
        .attr("x", (d) => d.getWidth() / 2)
        .attr("y", (d) => d.getHeight() / 2);
    });
  };

  doFetch = (page, perPage) => {
    const data = this.siteNodes.nodes.map((n) => ({
      cardData: n,
      site_name: n.site_name,
      namespace: n.namespace,
      edge: n.edge ? "true" : "false",
      servers: [
        ...new Set(
          n.servers.map((s) => this.data.adapter.serviceNameFromClientId(s))
        ),
      ].join(", "),
    }));
    return new Promise((resolve) => {
      resolve({ data, page, perPage });
    });
  };

  // get requests for all sites
  allRequests = (VAN, direction, stat, showExternal = false) => {
    const requests = {};
    stat = "bytes_out";
    const to = direction === "in" ? "source" : "target";
    const from = direction === "in" ? "target" : "source";

    VAN.getDeploymentLinks(showExternal).forEach((deploymentLink) => {
      const toName = deploymentLink[to].site.site_name;
      const fromId = deploymentLink[from].site.site_id;
      const toId = deploymentLink[to].site.site_id;
      if (fromId !== toId) {
        if (!requests.hasOwnProperty(fromId)) requests[fromId] = {};
        utils.aggregateAttributes(
          {
            key: toName,
            shortName: toName,
            baseName: toName,
            requests: deploymentLink.request[stat] || 0,
            color: utils.siteColors[fromId].color,
          },
          requests[fromId]
        );
      }
    });
    return requests;
  };

  specificRequests = ({
    VAN,
    direction,
    stat,
    site_info,
    showExternal = false,
  }) => {
    const requests = {};
    stat = "bytes_out";
    VAN.getDeploymentLinks(showExternal).forEach((deploymentLink) => {
      const testSiteId =
        direction === "in"
          ? deploymentLink.target.site.site_id
          : deploymentLink.source.site.site_id;
      const otherSiteId =
        direction === "out"
          ? deploymentLink.target.site.site_id
          : deploymentLink.source.site.site_id;
      const otherSiteName =
        direction === "out"
          ? deploymentLink.target.site.site_name
          : deploymentLink.source.site.site_name;

      if (testSiteId !== otherSiteId && testSiteId === site_info) {
        if (deploymentLink.request[stat] !== undefined) {
          if (!requests.hasOwnProperty(otherSiteId)) requests[otherSiteId] = {};
          utils.aggregateAttributes(
            {
              key: otherSiteName,
              shortName: otherSiteName,
              baseName: otherSiteName,
              requests: deploymentLink.request[stat],
              color: utils.siteColors[otherSiteId].color,
            },
            requests[otherSiteId]
          );
        }
      }
    });
    return requests;
  };

  allTimeSeries = ({
    VAN,
    direction,
    stat,
    duration = "min",
    showExternal = false,
  }) => {
    const requests = {};
    stat = "bytes_out";
    const to = direction === "in" ? "source" : "target";
    const from = direction === "in" ? "target" : "source";

    VAN.getDeploymentLinks(showExternal).forEach((deploymentLink) => {
      const toName = deploymentLink[to].site.site_name;
      const fromId = deploymentLink[from].site.site_id;
      const toId = deploymentLink[to].site.site_id;
      if (fromId !== toId) {
        const samples = utils.getHistory({
          histories: deploymentLink.history,
          stat,
          ago: duration === "min" ? 60 + 1 : 60 * 60 + 1,
          skipUndefined: true,
        });
        if (samples.length > 0) {
          if (!requests.hasOwnProperty(toId)) {
            requests[toId] = {
              shortName: toName,
              samples,
              color: utils.siteColors[toId].color,
              key: toName,
            };
          } else {
            utils.combineSamples(requests[toId].samples, samples);
          }
        }
      }
    });
    return requests;
  };

  specificTimeSeries = ({
    VAN,
    direction,
    stat,
    duration = "min",
    address,
    showExternal = false,
  }) => {
    const requests = {};
    stat = "bytes_out";
    const from = direction === "out" ? "source" : "target";
    const to = direction === "out" ? "target" : "source";

    VAN.getDeploymentLinks(showExternal).forEach((deploymentLink) => {
      const site = deploymentLink[to].site.site_name;
      const fromId = deploymentLink[from].site.site_id;
      const toId = deploymentLink[to].site.site_id;
      if (fromId !== toId && fromId === address) {
        const samples = utils.getHistory({
          histories: deploymentLink.history,
          stat,
          ago: duration === "min" ? 60 + 1 : 60 * 60 + 1,
          skipUndefined: true,
        });
        if (samples.length > 0) {
          if (!requests.hasOwnProperty(toId)) {
            requests[toId] = {
              key: site,
              shortName: site,
              samples,
              color: utils.siteColors[toId].color,
            };
          } else {
            utils.combineSamples(requests[toId].samples, samples);
          }
        }
      }
    });
    return requests;
  };

  // handle mouse over a chord. highlight the path
  chordOver(chord, over, viewer) {
    if (!chord.info) return;
    //console.log(`------- chordOver site path`);
    d3.select(this.SVG_ID)
      .selectAll("path.siteTrafficLink")
      .each(function (p) {
        /*
      console.log(`${p.source.site_name}-${p.target.site_name} chordInfo is`);
      console.log(chord.info);
      console.log(p);
      */
        if (
          chord.info.source &&
          chord.info.target &&
          chord.info.source.site_id === p.source.site_id &&
          chord.info.target.site_id === p.target.site_id
        ) {
          p.selected = over;
          viewer.blurAll(over, p);
          viewer.restart();
        }
      });
  }

  setClass(site, cls, viewer) {
    d3.select(this.SVG_ID)
      .selectAll("g.cluster-rects")
      .each(function (d) {
        const match = d.site_name.includes(site) && site.length > 0;
        d3.select(this).classed(cls, match);
        d[cls] = match;
      });

    viewer.restart();
  }

  // handle mouse over an arc. highlight the service
  arcOver(arc, over, viewer) {
    d3.select(this.SVG_ID)
      .selectAll("g.cluster")
      .each(function (d) {
        const match = arc.legend ? d.site_name : d.site_id;
        if (arc.key === match) {
          d.selected = over;
          viewer.blurAll(over, d);
          viewer.restart();
        }
      });
  }
  getSavedZoom = (defaultScale) => {
    const savedScale = utils.getSaved(ZOOM_SCALE, defaultScale);
    const savedTranslate = utils.getSaved(ZOOM_TRANSLATE, [0, 0]);
    return { savedScale, savedTranslate };
  };
  saveZoom = (zoom) => {
    utils.setSaved(ZOOM_SCALE, zoom.scale());
    utils.setSaved(ZOOM_TRANSLATE, zoom.translate());
  };

  static saveOverrideOptions = (options) =>
    options.mode === "graph"
      ? utils.setOptions(SITE_OPTIONS, options, DEFAULT_OPTIONS)
      : utils.setOptions(SITE_TABLE_OPTIONS, options, DEFAULT_TABLE_OPTIONS);
  getGraphOptions = () => utils.getOptions(SITE_OPTIONS, DEFAULT_OPTIONS);
  saveGraphOptions = (options) => utils.setOptions(SITE_OPTIONS, options);
  getTableOptions = () =>
    utils.getOptions(SITE_TABLE_OPTIONS, DEFAULT_TABLE_OPTIONS);
  getDetailOptions = () =>
    utils.getOptions(SITE_DETAIL_OPTIONS, DEFAULT_DETAIL_OPTIONS);
  saveDetailOptions = (options) =>
    utils.setOptions(SITE_DETAIL_OPTIONS, options);
}
