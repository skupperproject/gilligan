import React from "react";

import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal } from "d3-sankey";
import { clusterColor, darkerColor } from "../topology/views/clusterColors";

class SankeyComponent {
  constructor(props) {
    this.formatNumber = d3.format(",.0f"); // zero decimal places
    this.format = function(d) {
      return this.formatNumber(d) + " messages";
    };
    this.color = d3.scale.category20();
    this.particles = [];
  }

  stop = () => {
    if (this.t) {
      this.t.stop();
    }
  };

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

  handleMouseOver = link => {
    console.log(`handleMouseOver ${link.index}`);
    d3.selectAll("path.traffic").classed(
      "highlighted",
      (d, i) => i === link.index
    );
  };

  SankeyLink = (link, i) => {
    const color = clusterColor(link.source.index);
    return (
      <g
        key={`link-${link.index}`}
        className="sankey-link"
        onMouseOver={() => this.handleMouseOver(link)}
      >
        <path
          onClick={() => this.props.handleChangeAddress(link.address)}
          className={`traffic ${
            link.address === this.props.address ? "highlighted" : ""
          }`}
          id={`link-${i}`}
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

  tick = elapsed => {
    this.particles = this.particles.filter(
      d => d.current < d.path.getTotalLength() - 15
    );

    const self = this;
    d3.selectAll("path.traffic").each(function(d, i) {
      d = self.links[i];
      for (var x = 0; x < 2; x++) {
        const offset = (Math.random() - 0.5) * d.width * 0.8 + 20;
        if (Math.random() < d.freq) {
          var length = this.getTotalLength();
          const speed = 0.5 + Math.random(); // 0.5 - 1.5
          const size = speed + 0.5; // 1 - 2
          self.particles.push({
            link: d,
            time: elapsed,
            offset,
            path: this,
            length,
            animateTime: length,
            speed,
            size
          });
        }
      }
    });

    this.particleEdgeCanvasPath(elapsed);
  };

  particleEdgeCanvasPath = elapsed => {
    var context = d3.select("canvas").node();
    if (!context) return;
    context = context.getContext("2d");

    context.clearRect(0, 0, this.width, this.height);

    context.fillStyle = "gray";
    context.lineWidth = "1px";
    for (var x in this.particles) {
      var currentTime = elapsed - this.particles[x].time;
      this.particles[x].current = currentTime * 0.15 * this.particles[x].speed;
      var currentPos = this.particles[x].path.getPointAtLength(
        this.particles[x].current
      );
      context.beginPath();

      context.fillStyle = this.particles[x].link.particleColor(
        this.particles[x].current / this.particles[x].path.getTotalLength()
      );
      context.arc(
        currentPos.x + 20,
        currentPos.y + this.particles[x].offset,
        this.particles[x].size,
        //this.particles[x].link.particleSize,
        0,
        2 * Math.PI
      );
      context.fill();
    }
  };

  init({ width, height, address, handleChangeAddress, data }) {
    this.width = width - 45;
    this.height = height - 30;
    this.address = address;
    const { nodes, links } = sankey()
      .nodeWidth(15)
      .nodePadding(20)
      .extent([[1, 1], [this.width - 1, this.height - 5]])(data);
    this.links = links;

    const linkExtent = d3.extent(links, function(d) {
      return d.value;
    });
    const frequencyScale = d3.scale
      .linear()
      .domain(linkExtent)
      .range([0.05, 1]);
    const particleSize = d3.scale
      .linear()
      .domain(linkExtent)
      .range([2, 2]);

    links.forEach(function(link) {
      link.freq = frequencyScale(link.value);
      link.particleSize = particleSize(link.value);
      link.particleColor = d3.scale
        .linear()
        .domain([0, 1])
        .range([
          darkerColor(link.source.index),
          darkerColor(link.target.index)
        ]);
    });

    if (this.particles.length === 0) {
      this.t = d3.timer(this.tick, 10);
    }

    const svg = d3
      .select(".qdrChord")
      .append("svg")
      .attr("width", width - 30)
      .attr("height", height)
      .append("g")
      .attr("transform", "translate(15,15)")
      .style({ mixBlendMode: "multiply" });

    const enterLink = svg
      .selectAll(".traffic")
      .data(links)
      .enter();

    const enterPath = enterLink.append("g").attr("class", "sankey-link");

    enterPath
      .append("path")
      .attr("class", "traffic")
      .classed("highlighted", d => d.address === address)
      .attr("d", sankeyLinkHorizontal())
      .attr("stroke", d => clusterColor(d.source.index))
      .attr("stroke-width", d => d.width)
      .on("mouseover", this.handleMouseOver)
      .on("click", d => handleChangeAddress(d.address));

    enterPath
      .append("title")
      .text(
        d =>
          `${d.source.name} - ${d.target.name}\n${d.address}\n${this.format(
            d.value
          )}`
      );

    const enterNode = svg
      .selectAll(".sankey-node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "sankey-node");

    enterNode
      .append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("fill", (d, i) => clusterColor(i))
      .attr("stroke", (d, i) => darkerColor(i));

    enterNode.append("title").text(d => `${d.name}\n${this.format(d.value)}`);

    enterNode
      .append("text")
      .attr("x", d => d.x0 - 6)
      .attr("y", d => d.y0 + (d.y1 - d.y0) / 2)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .text(d => d.name)
      .filter(d => d.x0 < this.width / 2)
      .attr("x", d => d.x1 + 6)
      .attr("text-anchor", "start");
  }
}

export default SankeyComponent;
