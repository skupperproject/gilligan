import React from "react";

import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";

const SankeyNode = ({ name, x0, x1, y0, y1 }) => (
  <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="black" />
);

const SankeyLink = link => (
  <path
    d={sankeyLinkHorizontal()(link)}
    style={{
      fill: "none",
      strokeOpacity: 0.5,
      stroke: "black",
      strokeWidth: Math.max(1, link.width)
    }}
  />
);

export class SankeyChart {
  init(data, width, height, svg) {
    const { nodes, links } = sankey()
      .nodeWidth(20)
      .nodePadding(20)
      .extent([[1, 1], [width - 1, height - 5]])(data);
    this.nodes = nodes;
    this.links = links;

    console.log(nodes);
    console.log(links);
    const sankeyNodes = svg.selectAll("g.nodes").data(nodes);
    sankeyNodes.exit().remove();

    const sankeyNodesEnter = sankeyNodes
      .enter()
      .append("svg:g")
      .attr("class", "nodes");

    sankeyNodesEnter
      .append("svg:rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", "black");

    sankeyNodesEnter.append("svg:title");
  }
}
