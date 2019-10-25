import React from "react";

import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { clusterColor, darkerColor } from "../topology/views/clusterColors";

class SankeyComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.formatNumber = d3.format(",.0f"); // zero decimal places
    this.format = function(d) {
      return this.formatNumber(d) + " messages";
    };
    this.color = d3.scale.category20();
  }

  SankeyNode = ({ name, x0, x1, y0, y1, value, index }) => {
    const color = clusterColor(index);
    return (
      <g key={`node-${name}`} className="sankey-node">
        <rect
          x={x0}
          y={y0}
          width={x1 - x0}
          height={y1 - y0}
          fill={color}
          stroke={darkerColor(index)}
        />
        <title>{`${name}\n${this.format(value)}`}</title>
        <text
          x={x0 < this.props.width / 2 ? x1 + 15 : x0 - 6}
          y={y0 + (y1 - y0) / 2}
          dy=".35em"
          textAnchor={x0 < this.props.width / 2 ? "start" : "end"}
        >
          {name}
        </text>
      </g>
    );
  };

  SankeyLink = link => {
    const color = darkerColor(link.source.index);
    return (
      <g key={`link-${link.index}`} className="sankey-link">
        <path
          onClick={() => this.props.handleChangeAddress(link.address)}
          className={`traffic ${
            link.address === this.props.address ? "highlighted" : ""
          }`}
          d={sankeyLinkHorizontal()(link)}
          stroke={color}
          strokeWidth={Math.max(1, link.width)}
        />
        <title>{`${link.source.name} - ${link.target.name}\n${
          link.address
        }\n${this.format(link.value)}`}</title>
      </g>
    );
  };

  render() {
    const { data, width, height } = this.props;
    const { nodes, links } = sankey()
      .nodeWidth(15)
      .nodePadding(20)
      .extent([[1, 1], [width - 1, height - 5]])(data);
    return (
      <g style={{ mixBlendMode: "multiply" }}>
        {nodes.map(node => this.SankeyNode(node))}
        {links.map(link => this.SankeyLink(link))}
      </g>
    );
  }
}

export default SankeyComponent;
