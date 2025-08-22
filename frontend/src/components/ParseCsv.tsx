import React, { useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import axios from "axios";

interface ParseCSVData {
  label?: string;
  s3Link?: string;
  outputRows?: any[];
  onNodeDataChange?: (id: string, newData: Partial<ParseCSVData>) => void;
}

const ParseCSVNode: React.FC<NodeProps<ParseCSVData>> = ({ id, data, selected }) => {
  useEffect(() => {
    // When s3Link is set, fetch CSV automatically (if workflow triggered)
    if (data.s3Link) {
      triggerParseCSV();
    }
  }, [data.s3Link]);

  const triggerParseCSV = async () => {
    try {
      const API_URL = process.env.API_URL;
      const res = await axios.post(`${API_URL}/parse-csv`, { s3Link: data.s3Link });
      const rows = res.data.rows;

      // Pass rows to workflow engine via onNodeDataChange
      data.onNodeDataChange?.(id, { outputRows: rows });
    } catch (err: any) {
      console.error("CSV parse failed:", err);
    }
  };

  return (
    <div
      style={{
        border: selected ? "2px solid #3498db" : "1px solid #3498db",
        borderRadius: 8,
        background: "#ebf5fb",
        width: 260,
      }}
    >
      <div
        style={{
          background: "#3498db",
          color: "white",
          padding: "8px 12px",
          borderRadius: "6px 6px 0 0",
          fontWeight: "bold",
        }}
      >
        {data.label || "Parse CSV from S3"}
      </div>

      <div style={{ padding: "12px", fontSize: "13px", color: "#333" }}>
        <input
          type="text"
          value={data.s3Link || ""}
          onChange={(e) => data.onNodeDataChange?.(id, { s3Link: e.target.value })}
          placeholder="s3://bucket-name/path/to/file.csv"
          className="nodrag"
          style={{
            width: "100%",
            padding: "6px",
            borderRadius: "4px",
            border: "1px solid #a3c8e6",
          }}
        />
      </div>

      <Handle type="target" position={Position.Left} style={{ background: "#3498db" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#3498db" }} />
    </div>
  );
};

export default ParseCSVNode;
