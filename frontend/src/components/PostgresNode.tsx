import React, { useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";

interface PostgresData {
  label?: string;
  tableName?: string;
  onNodeDataChange?: (id: string, newData: Partial<PostgresData>) => void;
  onDelete?: (id: string) => void;
}

const PostgresNode: React.FC<NodeProps<PostgresData>> = ({ id, data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    tableName: data.tableName || "",
  });

  const handleDataChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, formData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      tableName: data.tableName || "",
    });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        style={{
          border: selected ? "2px solid #3b82f6" : "1px solid #3b82f6",
          borderRadius: 8,
          background: "#eff6ff",
          width: 260,
          boxShadow: selected
            ? "0 2px 10px rgba(59,130,246,0.3)"
            : "0 1px 3px rgba(0,0,0,0.1)",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            background: "#3b82f6",
            color: "white",
            padding: "8px 12px",
            borderRadius: "6px 6px 0 0",
            fontWeight: "bold",
          }}
        >
          {data.label || "Push to Postgres"}
        </div>
        <div style={{ padding: "12px", fontSize: "12px", color: "#555" }}>
          <div>Table Name: {data.tableName || "Not set"}</div>
          <div style={{ fontStyle: "italic", marginTop: "4px", color: "#888" }}>
            Click to edit details
          </div>
        </div>
        <Handle type="target" position={Position.Left} style={{ background: "#3b82f6" }} />
        <Handle type="source" position={Position.Right} style={{ background: "#3b82f6" }} />
      </div>
    );
  }

  return (
    <div
      style={{
        border: "2px solid #3b82f6",
        borderRadius: 8,
        background: "#eff6ff",
        width: 300,
        boxShadow: "0 2px 10px rgba(59,130,246,0.3)",
      }}
    >
      <div
        style={{
          background: "#3b82f6",
          color: "white",
          padding: "8px 12px",
          borderRadius: "6px 6px 0 0",
          fontWeight: "bold",
        }}
      >
        {data.label || "Push to Postgres"}
      </div>

      <div style={{ padding: "12px", fontSize: "13px", color: "#333" }}>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", fontWeight: 500, marginBottom: "4px" }}>Table Name:</label>
          <input
            type="text"
            value={formData.tableName}
            onChange={(e) => handleDataChange("tableName", e.target.value)}
            placeholder="PostgreSQL Table Name"
            className="nodrag"
            style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #93c5fd" }}
          />
        </div>

        <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleCancel} style={{ marginRight: "8px", padding: "6px 12px", border: "1px solid #ccc", borderRadius: "4px", background: "#eee", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ padding: "6px 12px", border: "none", borderRadius: "4px", background: "#3b82f6", color: "white", cursor: "pointer" }}>
            Save
          </button>
        </div>
      </div>
      
      <Handle type="target" position={Position.Left} style={{ background: "#3b82f6" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#3b82f6" }} />
    </div>
  );
};

export default PostgresNode;