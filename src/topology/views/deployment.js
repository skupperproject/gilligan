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
import {
  adjustPositions,
  linkColor,
  getSaved,
  setSaved,
  initSankey,
  updateSankey,
  VIEW_DURATION,
  ServiceWidth,
  ServiceGap,
  ServiceHeight,
  reconcileArrays,
  reconcileLinks,
  genPath,
} from "../../utilities";
import { Site } from "./site";
import { Service } from "./service";
import { Nodes } from "../nodes";
import { Links } from "../links";
const DEPLOYMENT_POSITION = "dp";
const ZOOM_SCALE = "dscale";
const ZOOM_TRANSLATE = "dtrans";

export class Deployment extends Service {
  constructor(adapter) {
    super(adapter);
    this.Site = new Site(adapter);
    this.fields = [
      { title: "Address", field: "address" },
      { title: "Protocol", field: "protocol" },
      { title: "Deployed at", field: "site_name" },
    ];
  }

  initNodesAndLinks = (viewer) => {
    this.initNodes(this.Site.siteNodes, this.serviceNodes, viewer);
    let vsize = { width: viewer.width, height: viewer.height };
    vsize = this.initServiceLinks(
      this.Site.siteNodes,
      this.serviceNodes,
      this.serviceLinks,
      vsize
    );
    this.setSitePositions(viewer.sankey);
    this.setServicePositions(viewer.sankey);
    /*
    console.log(this.Site.siteNodes);
    console.log(this.serviceNodes);
    console.log(this.serviceLinks);
    */
    return { nodeCount: this.nodes().nodes.length, size: vsize };
  };

  updateNodesAndLinks = (viewer, adapter) => {
    this.adapter = adapter;
    const newSiteNodes = new Nodes();
    const newServiceNodes = new Nodes();
    const newServiceLinks = new Links();
    this.initNodes(newSiteNodes, newServiceNodes, viewer);
    const vsize = { width: viewer.width, height: viewer.height };
    this.initServiceLinks(
      newSiteNodes,
      newServiceNodes,
      newServiceLinks,
      vsize
    );
    reconcileArrays(this.Site.siteNodes.nodes, newSiteNodes.nodes);
    reconcileArrays(this.serviceNodes.nodes, newServiceNodes.nodes);
    reconcileLinks(this.serviceLinks.links, newServiceLinks.links);
    this.setSitePositions(viewer.sankey);
    this.setServicePositions(viewer.sankey);
    viewer.restart();
  };

  createSelections = (svg) => {
    this.Site.sitesSelection = this.Site.createSitesSelection(svg);
    super.createSelections(svg);
  };

  setupSelections = (viewer) => {
    this.Site.sitesSelection = this.Site.setupSitesSelection(viewer);
    super.setupSelections(viewer);
  };

  initNodes = (siteNodes, serviceNodes, viewer) => {
    this.Site.initNodes(siteNodes);
    super.initNodes(serviceNodes, true);
    this.setParentNodes(siteNodes, serviceNodes, viewer);
    this.adjustSites(siteNodes, serviceNodes, viewer);
  };

  setParentNodes = (siteNodes, serviceNodes, viewer) => {
    serviceNodes.nodes.forEach((service) => {
      if (service.cluster) {
        const siteNode = siteNodes.nodes.find(
          (s) => s.site_id === service.cluster.site_id
        );
        if (siteNode) {
          service.parentNode = siteNode;
        }
      } else {
        service.parentNode = {
          sankey: { x: 0, y: 0 },
          x: 0,
          y: 0,
          site_id: "",
          site_name: "",
          getWidth: () => viewer.width,
          getHeight: () => viewer.height,
        };
      }
    });
  };

  // move the sites and move the services inside their respective site
  adjustSites = (siteNodes, serviceNodes, viewer) => {
    // size the sites based on the services deployed in them
    siteNodes.nodes.forEach((site) => {
      const links = [];
      // services deployed in this site
      const subServices = serviceNodes.nodes.filter(
        (sn) => sn.parentNode.site_id === site.site_id
      );
      // get links between services within each site
      subServices.forEach((fromService, s) => {
        subServices.forEach((toService, t) => {
          const { stat } = this.adapter.fromTo(
            fromService.address,
            site.site_id,
            toService.address,
            site.site_id
          );
          if (stat) {
            links.push({
              source: fromService,
              target: toService,
              value: stat,
            });
          }
        });
      });
      // set the site radius to hold all the site's services (non-expanded)
      const siteSize = adjustPositions({
        nodes: subServices,
        links,
        width: site.r * 2,
        height: site.r * 2,
        align: "left",
      });
      site.r = Math.max(site.r, Math.max(siteSize.width, siteSize.height) / 2);
      site.normalR = site.r;
      site.subServiceLinks = links;
    });

    const interSiteLinks = this.Site.interSiteLinks(siteNodes);
    // set the site x,y
    adjustPositions({
      nodes: siteNodes.nodes,
      links: interSiteLinks.links,
      width: viewer.width,
      height: viewer.height,
    });

    // position services
    siteNodes.nodes.forEach((cluster) => {
      const subServices = serviceNodes.nodes.filter(
        (sn) => sn.parentNode.site_id === cluster.site_id
      );
      // position subServices in sites
      // using the site size as the width and height
      adjustPositions({
        nodes: subServices,
        links: cluster.subServiceLinks,
        width: cluster.r * 2,
        height: cluster.r * 2,
        xyKey: "siteOffset",
      });
    });
    const orphans = serviceNodes.nodes.filter((n) => !n.siteOffset);
    adjustPositions({
      nodes: orphans,
      links: [],
      width: ServiceWidth,
      height: ServiceHeight,
      xyKey: "siteOffset",
    });
  };

  initServiceLinks = (siteNodes, serviceNodes, links, vsize) => {
    const subNodes = serviceNodes.nodes;
    const sites = siteNodes;
    // create links between all services
    subNodes.forEach((fromNode) => {
      subNodes.forEach((toNode) => {
        const { stat, request } = this.adapter.fromTo(
          fromNode.name,
          fromNode.parentNode ? fromNode.parentNode.site_id : null,
          toNode.name,
          toNode.parentNode ? toNode.parentNode.site_id : null
        );
        if (stat) {
          const linkIndex = links.addLink({
            source: fromNode,
            target: toNode,
            dir: "out",
            cls: "node2node",
            uid: `Link-${fromNode.parentNode.site_id}-${fromNode.uid()}-${
              toNode.parentNode.site_id
            }-${toNode.uid()}`,
          });
          const link = links.links[linkIndex];
          link.request = request;
          link.value = stat;
          link.getColor = () => linkColor(link, links.links);
        }
      });
    });
    // get the sankey height of each node based on link.value
    initSankey({
      nodes: subNodes,
      links: links.links,
      width: vsize.width,
      height: vsize.height,
      nodeWidth: ServiceWidth,
      nodePadding: ServiceGap,
      left: 20,
      bottom: 60,
    });
    // save the height and expand the subnodes
    subNodes.forEach((n) => {
      if (n.y0 === undefined) {
        n.y0 = n.y;
        n.y1 = n.y + ServiceHeight;
      }
      n.sankeyHeight = n.y1 - n.y0;
      n.expanded = true;
    });

    // set the sankeyR of the sites to accommodate expanded services
    sites.nodes.forEach((site) => {
      site.expanded = true;

      const subServices = subNodes.filter(
        (n) => n.parentNode.site_id === site.site_id
      );
      const siteSize = adjustPositions({
        nodes: subServices,
        links: site.subServiceLinks,
        width: site.r * 2,
        height: site.r * 2,
        xyKey: "sankeySiteOffset",
      });
      site.sankeyR = Math.max(
        site.r,
        Math.max(siteSize.width, siteSize.height) / 2
      );
    });
    // now each site has a site.sankeyR that is big enough
    // to encompass all its expanded deployments
    // adjust the positions of the sites using the new site.sankey.r
    const interSiteLinks = this.Site.interSiteLinks(siteNodes);
    // sites and services are currently .expanded = true
    const expandedSize = adjustPositions({
      nodes: sites.nodes,
      links: interSiteLinks.links,
      width: vsize.width,
      height: vsize.height - 20,
    });

    sites.nodes.forEach((site) => {
      site.expanded = false;
      site.y += 20;
    });

    const orphans = subNodes.filter((n) => !n.sankeySiteOffset);
    adjustPositions({
      nodes: orphans,
      links: [],
      width: ServiceWidth,
      height: ServiceHeight, //viewer.height,
      xyKey: "sankeySiteOffset",
    });
    // restore the saved positions
    subNodes.forEach((n) => {
      const pos = getSaved(
        `${DEPLOYMENT_POSITION}-${n.cluster.site_id}-${n.name}`
      );
      if (pos) {
        n.sankeySiteOffset = {
          x: pos.sox,
          y: pos.soy,
        };
        n.siteOffset = {
          x: pos.ox,
          y: pos.oy,
        };
      }
    });
    sites.nodes.forEach((s) => {
      const pos = getSaved(`${DEPLOYMENT_POSITION}-${s.site_id}`);
      if (pos && pos.cx) {
        s.cx = pos.cx;
        s.cy = pos.cy;
      } else {
        s.cx = s.x + s.r;
        s.cy = s.y + s.r;
      }
    });
    subNodes.forEach((n) => {
      n.expanded = false;
    });
    return expandedSize;
  };

  // don't allow dragging deployment rect outside of parent site circle
  constrainDeployment = (d, sankey) => {
    const bbox = {
      left: d.parentNode.x,
      right: d.parentNode.x + d.parentNode.getWidth(),
      top: d.parentNode.y,
      bottom: d.parentNode.y + d.parentNode.getHeight(),
    };

    if (d.px + d.getWidth() > bbox.right) {
      d.x = bbox.right - d.getWidth();
    }
    if (d.px < bbox.left) {
      d.x = bbox.left;
    }
    if (d.py + d.getHeight() > bbox.bottom) {
      d.y = bbox.bottom - d.getHeight();
    }
    if (d.py < bbox.top) {
      d.y = bbox.top;
    }
    // update the offsets within the site
    const key = sankey ? "sankeySiteOffset" : "siteOffset";
    d[key].x = d.x - d.parentNode.x;
    d[key].y = d.y - d.parentNode.y;
  };

  saveAllPositions = () => {
    this.Site.siteNodes.nodes.forEach((site) => {
      this.savePosition(site);
    });
    this.serviceNodes.nodes.forEach((n) => {
      this.savePosition(n);
    });
  };

  savePosition = (d) => {
    let save;
    let key;
    if (d.nodeType === "service") {
      save = {
        sox: d.sankeySiteOffset.x,
        soy: d.sankeySiteOffset.y,
        ox: d.siteOffset.x,
        oy: d.siteOffset.y,
      };
      key = `${DEPLOYMENT_POSITION}-${d.cluster.site_id}-${d.name}`;
    } else {
      save = { cx: d.x + d.r, cy: d.y + d.r };
      key = `${DEPLOYMENT_POSITION}-${d.site_id}`;
    }
    setSaved(key, save);
  };

  setupDrag(drag) {
    this.Site.setupDrag(drag);
    this.servicesSelection.call(drag);
  }
  setSitePositions = (sankey) => {
    this.Site.siteNodes.nodes.forEach((d) => {
      d.r = sankey ? d.sankeyR : d.normalR;
      d.x = d.cx - d.r;
      d.y = d.cy - d.r;
    });
  };
  setServicePositions = (sankey) => {
    this.serviceNodes.nodes.forEach((d) => {
      const key = sankey ? "sankeySiteOffset" : "siteOffset";
      d.x = d.parentNode.x + d[key].x;
      d.y = d.parentNode.y + d[key].y;
    });
  };
  dragStart = (d, sankey) => {
    this.setSitePositions(sankey);
    this.setServicePositions(sankey);
  };

  drag = (d, sankey) => {
    if (d.nodeType === "service") {
      this.constrainDeployment(d, sankey);
      this.setServicePositions(sankey);
    } else {
      // we are dragging a site
      d.x = d.px;
      d.y = d.py;
      d.cx = d.x + d.r;
      d.cy = d.y + d.r;
      // set the services.x,y
      this.setServicePositions(sankey);
    }
  };
  dragEnd = (d, sankey) => {
    this.setServicePositions(sankey);
    this.saveAllPositions(sankey);
  };

  // called whenever we need to draw the sites/services
  drawViewNodes = (sankey) => {
    this.Site.sitesSelection.attr("transform", (d) => {
      return `translate(${d.x},${d.y})`;
    });
    this.servicesSelection.attr("transform", (d) => {
      return `translate(${d.x},${d.y})`;
    });
  };

  // draw all the paths between nodes
  drawViewPaths = (sankey) => {
    updateSankey({
      nodes: this.serviceNodes.nodes,
      links: this.serviceLinks.links,
    });
    // for the non-sankey mode, path.service is hidden
    this.linksSelection
      .selectAll("path.service")
      .style("display", sankey ? null : "none")
      .attr("d", (d) => genPath({ link: d, sankey: true }));

    this.linksSelection.selectAll("path.servicesankeyDir").attr("d", (d) => {
      return genPath({ link: d });
    });

    this.linksSelection
      .selectAll("path.hittarget")
      .attr("stroke-width", (d) => (sankey ? Math.max(d.width, 6) : 6))
      .attr("d", (d) => genPath({ link: d }));

    d3.select("defs.statPaths")
      .selectAll("path")
      .attr("d", (d) =>
        genPath({
          link: d,
          reverse: d.circular,
          offsetY: 4,
        })
      );
  };

  collapseNodes = () => {
    super.collapseNodes();
    this.Site.collapseNodes();
  };
  expandNodes = () => {
    super.expandNodes();
    this.Site.expandNodes();
  };

  transition = (sankey, initial, color, viewer) => {
    this.setSitePositions(sankey);
    this.setServicePositions(sankey);
    viewer.setLinkStat();

    updateSankey({
      nodes: this.serviceNodes.nodes,
      links: this.serviceLinks.links,
    });

    const duration = initial ? 0 : VIEW_DURATION;
    if (sankey) {
      this.toSankey(duration);
      return this.toServiceSankey(duration);
    } else {
      this.toColor(duration, color);
      return this.toServiceColor(duration, color);
    }
  };

  toColor = (duration) => {
    d3.select("g.clusters")
      .transition()
      .duration(duration)
      .attr("opacity", 1);

    // transition the containers to their proper position
    d3.selectAll(".cluster")
      .transition()
      .duration(duration)
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .each("end", function() {
        d3.select(this)
          .style("display", "block")
          .attr("opacity", 1)
          .select(".cluster-rects")
          .attr("opacity", 1)
          .style("display", "block");
      });

    d3.select("g.clusters")
      .selectAll("circle.network")
      .transition()
      .duration(duration)
      .attr("r", (d) => d.r)
      .attr("cx", (d) => d.r)
      .attr("cy", (d) => d.r);

    d3.select("g.clusters")
      .selectAll("text.cluster-name")
      .transition()
      .duration(duration)
      .attr("y", -10)
      .attr("x", (d) => d.getWidth() / 2);
  };

  toSankey = (duration) => {
    d3.select("g.clusters")
      .selectAll("circle.network")
      .transition()
      .duration(duration)
      .attr("r", (d) => d.r)
      .attr("cx", (d) => d.r)
      .attr("cy", (d) => d.r);

    d3.select("g.clusters")
      .selectAll("g.cluster")
      .transition()
      .duration(duration)
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    d3.select("g.clusters")
      .selectAll("text.cluster-name")
      .transition()
      .duration(duration)
      .attr("y", -10)
      .attr("x", (d) => d.getWidth(true) / 2);
  };

  // get records for the table view
  doFetch = (page, perPage) => {
    return new Promise((resolve) => {
      const data = this.serviceNodes.nodes.map((n) => ({
        address: n.address,
        protocol: n.protocol,
        site_name: n.parentNode.site_name,
      }));
      resolve({ data, page, perPage });
    });
  };

  // handle mouse over a chord. highlight the path
  chordOver(chord, over, viewer) {
    if (!chord.info) return;
    d3.selectAll("path.service").each(function(p) {
      if (
        chord.info.source.site_name === p.source.parentNode.site_name &&
        chord.info.target.site_name === p.target.parentNode.site_name &&
        chord.info.source.address === p.source.address &&
        chord.info.target.address === p.target.address
      ) {
        p.selected = over;
        viewer.blurAll(over, p);
        viewer.restart();
      }
    });
  }

  // handle mouse over an arc. highlight the service
  arcOver(arc, over, viewer) {
    d3.selectAll("rect.service-type").each(function(d) {
      if (arc.key === `${d.parentNode.site_name}:${d.address}`) {
        d.selected = over;
        viewer.blurAll(over, d);
        viewer.opaqueServiceType(d);
        viewer.restart();
      }
    });
  }
  getSavedZoom = (defaultScale) => {
    const savedScale = getSaved(ZOOM_SCALE, defaultScale);
    const savedTranslate = getSaved(ZOOM_TRANSLATE, [0, 0]);
    return { savedScale, savedTranslate };
  };
  saveZoom = (zoom) => {
    setSaved(ZOOM_SCALE, zoom.scale());
    setSaved(ZOOM_TRANSLATE, zoom.translate());
  };
}
