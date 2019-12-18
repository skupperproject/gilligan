class ViewBase {
  initNodesAndLinks(nodes, links, width, height, serviceTypeName) {
    this.initNodes(nodes, width, height, serviceTypeName);
    let nodeCount = nodes.nodes.length;
    nodes.savePositions();

    this.initLinks(nodes, links, width, height, serviceTypeName);
    return nodeCount;
  }
}

export default ViewBase;
