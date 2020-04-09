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
} from "../utilities";
import { Site } from "./site";
import { Service } from "./service";
const DEPLOYMENT_POSITION = "dpl";

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
    this.initNodes(viewer);
    let vsize = { width: viewer.width, height: viewer.height };
    vsize = this.initServiceLinks(viewer, vsize);
    /*
    console.log(this.Site.siteNodes);
    console.log(this.serviceNodes);
    console.log(this.serviceLinks);
    */
    this.setupNodePositions(true);
    this.setupNodePositions(false);

    return { nodeCount: this.nodes().nodes.length, size: vsize };
  };

  createSelections = (svg) => {
    this.Site.sitesSelection = this.Site.createSitesSelection(svg);
    super.createSelections(svg);
  };

  setupSelections = (viewer) => {
    this.Site.sitesSelection = this.Site.setupSitesSelection(viewer);
    super.setupSelections(viewer);
  };

  initNodes = (viewer) => {
    this.Site.initNodes(viewer);
    super.initNodes(viewer, true);
    this.setParentNodes(viewer);
    this.adjustSites(viewer);
  };

  setParentNodes = (viewer) => {
    this.serviceNodes.nodes.forEach((service) => {
      if (service.cluster) {
        const siteNode = this.Site.siteNodes.nodes.find(
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
  adjustSites = (viewer) => {
    const siteNodes = this.Site.siteNodes;
    const serviceNodes = this.serviceNodes;
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
      site.subServiceLinks = links;
    });

    const interSiteLinks = this.Site.interSiteLinks();
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

  initServiceLinks = (viewer, vsize) => {
    const subNodes = this.serviceNodes.nodes;
    const links = this.serviceLinks;
    const sites = this.Site.siteNodes;
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
    // get the sankey height of each node
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
    // set the sankey.r of the sites to accommodate expanded services
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
      site.sankey = {
        r: Math.max(site.r, Math.max(siteSize.width, siteSize.height) / 2),
      };
    });
    // now each site has a site.sankey.r that is big enough
    // to encompass all its expanded deployments
    // adjust the positions of the sites using the new site.sankey.r
    const interSiteLinks = this.Site.interSiteLinks();
    // sites and services are currently .expanded = true
    const expandedSize = adjustPositions({
      nodes: sites.nodes,
      links: interSiteLinks.links,
      width: vsize.width,
      height: vsize.height - 20,
      xyKey: "sankey",
    });

    sites.nodes.forEach((site) => {
      site.expanded = false;
      site.sankey.y += 20;
      // keep expanded/contracted site location difference
      // so that we can drag nodes and then expand/contract correctly
      site.sankeySiteOffset = {
        x: site.x - site.sankey.x,
        y: site.y - site.sankey.y,
      };
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
      const pos = getSaved(`${DEPLOYMENT_POSITION}-${n.name}`);
      if (pos) {
        n.x = pos.x;
        n.x0 = pos.x0;
        n.y = pos.y;
        n.y0 = pos.y0;
        n.sankeySiteOffset = {
          x: pos.ssox,
          y: pos.ssoy,
        };
        n.siteOffset = {
          x: pos.sox,
          y: pos.soy,
        };
      }
    });
    /*
    sites.nodes.forEach(s => {
      const pos = getSaved(`${DEPLOYMENT_POSITION}-${s.site_id}`);
      if (pos) {
        s.x = pos.x;
        s.y = pos.y;
        s.x0 = pos.x0;
        s.y0 = pos.y0;
        s.sankey = { x: pos.sx, y: pos.sy };
      }
    });
    */
    this.regenPaths(true);
    subNodes.forEach((n) => {
      n.expanded = false;
    });
    return expandedSize;
  };

  regenPaths = (sankey) => {
    this.serviceNodes.nodes.forEach((n) => {
      this.dragStart(n, sankey);
      n.y1 = n.y0 + n.getHeight();
      n.x1 = n.x0 + n.getWidth();
    });
    if (sankey) {
      updateSankey({
        nodes: this.serviceNodes.nodes,
        links: this.serviceLinks.links,
      });
    }
  };
  // don't allow dragging deployment rect outside of parent site circle
  constrainDeployment = (d, sankey) => {
    const left = sankey ? d.parentNode.sankey.x : d.parentNode.x;
    const top = sankey ? d.parentNode.sankey.y : d.parentNode.y;
    const bbox = {
      left,
      right: left + d.parentNode.getWidth(),
      top,
      bottom: top + d.parentNode.getHeight(),
    };
    if (d.px + d.getWidth() > bbox.right) {
      d.px = bbox.right - d.getWidth();
    }
    if (d.px < bbox.left) {
      d.px = bbox.left;
    }
    if (d.py + d.getHeight() > bbox.bottom) {
      d.py = bbox.bottom - d.getHeight();
    }
    if (d.py < bbox.top) {
      d.py = bbox.top;
    }
    d.x = d.x0 = d.px;
    d.y = d.y0 = d.py;
    d.x1 = d.x + d.getWidth();
    d.y1 = d.y + d.getHeight();
    if (sankey) {
      d.sankeySiteOffset.x = d.x - d.parentNode.sankey.x;
      d.sankeySiteOffset.y = d.y - d.parentNode.sankey.y;
    } else {
      d.siteOffset.x = d.x - d.parentNode.x;
      d.siteOffset.y = d.y - d.parentNode.y;
    }
  };

  setupNodePositions = (sankey) => {
    this.Site.siteNodes.nodes.forEach((s) => {
      this.dragStart(s, sankey);
    });
    this.serviceNodes.nodes.forEach((n) => {
      this.dragStart(n, sankey);
    });
    this.regenPaths(sankey);
  };

  savePosition = (d) => {
    const save =
      d.nodeType === "service"
        ? {
            x: d.x,
            y: d.y,
            x0: d.x0,
            y0: d.y0,
            ssox: d.sankeySiteOffset.x,
            ssoy: d.sankeySiteOffset.y,
            sox: d.siteOffset.x,
            soy: d.siteOffset.y,
          }
        : {
            x: d.x,
            y: d.y,
            x0: d.x0,
            y0: d.y0,
            sx: d.sankey.x,
            sy: d.sankey.y,
          };
    setSaved(
      `${DEPLOYMENT_POSITION}-${d.nodeType === "service" ? d.name : d.site_id}`,
      save
    );
  };

  dragStart = (d, sankey) => {
    if (d.nodeType === "service") {
      if (sankey) {
        d.x = d.x0 = d.parentNode.sankey.x + d.sankeySiteOffset.x;
        d.y = d.y0 = d.parentNode.sankey.y + d.sankeySiteOffset.y;
      } else {
        d.x = d.x0 = d.parentNode.x + d.siteOffset.x;
        d.y = d.y0 = d.parentNode.y + d.siteOffset.y;
      }
    } else {
      if (sankey) {
        d.x = d.x0 = d.sankey.x;
        d.y = d.y0 = d.sankey.y;
      } else {
        d.x = d.x0;
        d.y = d.y0;
      }
    }
    this.savePosition(d);
  };

  drag = (d, sankey) => {
    if (d.nodeType === "service") {
      this.constrainDeployment(d, sankey);
    } else {
      // move the circle
      this.Site.drag(d, sankey, true);
      // set the new sankey position
      d.sankey.x = d.x;
      d.sankey.y = d.y;
      // now move the deployments that are in the circle
      const subNodes = this.serviceNodes.nodes.filter(
        (n) => n.parentNode.site_id === d.site_id
      );
      subNodes.forEach((n) => {
        this.dragStart(n, sankey);
      });
    }
    this.regenPaths(sankey);
    this.savePosition(d);
  };

  tick = (sankey) => {
    this.Site.tick(sankey);
    super.tick(sankey);
  };

  setupDrag = (drag) => {
    super.setupDrag(drag);
    this.Site.setupDrag(drag);
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
    this.setupNodePositions(sankey);
    if (sankey) {
      this.toDeploymentSankey(initial, viewer.setLinkStat);
    } else {
      this.toDeployment(initial, viewer.setLinkStat, color);
    }
    return super.transition(sankey, false, color, viewer);
  };

  toDeployment = () => {
    return new Promise((resolve) => {
      d3.select("g.clusters")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 1);

      // transition the containers to their proper position
      d3.selectAll(".cluster")
        .transition()
        .duration(VIEW_DURATION)
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
        .duration(VIEW_DURATION)
        .attr("r", (d) => d.r)
        .attr("cx", (d) => d.r)
        .attr("cy", (d) => d.r);

      d3.select("g.clusters")
        .selectAll("text.cluster-name")
        .transition()
        .duration(VIEW_DURATION)
        .attr("y", -10)
        .attr("x", (d) => d.getWidth() / 2);
    });
  };

  toDeploymentSankey = () => {
    return new Promise((resolve, reject) => {
      d3.select("g.clusters")
        .selectAll("circle.network")
        .transition()
        .duration(VIEW_DURATION)
        .attr("r", (d) => d.sankey.r)
        .attr("cx", (d) => d.sankey.r)
        .attr("cy", (d) => d.sankey.r);

      d3.select("g.clusters")
        .selectAll("g.cluster")
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", (d) => `translate(${d.sankey.x},${d.sankey.y})`);

      d3.select("g.clusters")
        .selectAll("text.cluster-name")
        .transition()
        .duration(VIEW_DURATION)
        .attr("y", -10)
        .attr("x", (d) => d.getWidth(true) / 2);
    });
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
}
