import React from "react";

class TooltipTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <table className="skipper-table network">
        <tbody>
          {this.props.rows.map((row, i) => (
            <tr key={`row-${i}`}>
              {row.map((col, j) => {
                return <td key={`r${i}c${j}`}>{col}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}

export default TooltipTable;
