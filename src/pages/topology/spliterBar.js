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

import React from "react";
import * as d3 from "d3";

class SplitterBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount = () => {
    this.registerHandlers();
    const rect = this.barRef.offsetParent.getBoundingClientRect();
    d3.select(this.barRef).style(
      "height",
      `${this.barRef.offsetParent.scrollHeight + rect.width}px`
    );
  };

  componentWillUnmount = () => {
    this.unregisterHandlers();
  };

  registerHandlers = () => {
    document.addEventListener("mousemove", this.handleDocumentMouseMove);
    document.addEventListener("mouseup", this.handleDocumentMouseUp);
  };

  unregisterHandlers = () => {
    document.removeEventListener("mousemove", this.handleDocumentMouseMove);
    document.removeEventListener("mouseup", this.handleDocumentMouseUp);
  };
  handleDocumentMouseUp = (e) => {
    if (this.props.onDragEnd && this.dragging) this.props.onDragEnd();
    this.dragging = false;
  };

  handleDocumentMouseMove = (e) => {
    if (this.dragging) {
      this.mouseMove(e);
    }
  };
  mouseDown = (event) => {
    this.dragging = true;
    this.dragStart = event.clientX;
  };
  mouseMove = (event) => {
    if (this.dragging) {
      event.preventDefault();
      const x = event.clientX;
      const moved = this.dragStart - x;
      this.dragStart = x;
      if (this.props.onDrag) this.props.onDrag(moved);
    }
  };
  render() {
    return (
      <div
        className="sk-splitter-bar"
        ref={(el) => (this.barRef = el)}
        onMouseDown={this.mouseDown}
      />
    );
  }
}

export default SplitterBar;
