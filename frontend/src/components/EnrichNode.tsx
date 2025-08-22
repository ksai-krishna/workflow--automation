// components/EnrichNode.tsx
import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "./BaseNode"; // Assuming BaseNode is used

interface EnrichData {
  label?: string;
  // inputRows would conceptually come from the previous node in the workflow context (backend)
  // outputRows would be set by the backend worker into the context
  onNodeDataChange?: (id: string, newData: Partial<EnrichData>) => void;
  // You might add fields here for display or specific enrichment parameters if needed
}

const EnrichNode: React.FC<NodeProps<EnrichData>> = ({ id, data, selected }) => {
  // We no longer need the useEffect to trigger enrichment directly from the frontend
  // The actual enrichment happens in the backend worker (src/worker.ts)
  // This component now primarily displays information or provides configuration for the enrichment process.

  return (
    <BaseNode
      id={id}
      data={{ ...data, label: data.label || "Enrich Data" }}
      selected={selected}
    >
      <div style={{ fontSize: "12px", color: "#333", textAlign: "center", padding: "8px" }}>
        This node sends data to an enrichment service.
        <br />
        (Processing handled by backend worker)
      </div>
      {/* You could add UI elements here to configure enrichment parameters */}
      {/* For example, an input field for an "enrichment type" */}
      {/* <input
        type="text"
        placeholder="Enrichment Type (e.g., 'geocoding')"
        value={data.enrichmentType || ''}
        onChange={(e) => data.onNodeDataChange?.(id, { enrichmentType: e.target.value })}
        className="nodrag"
        style={{
          width: "100%",
          padding: "6px",
          borderRadius: "4px",
          border: "1px solid #ccc",
          marginTop: "8px",
        }}
      /> */}
      <Handle type="target" position={Position.Left} style={{ background: "#2ecc71" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#2ecc71" }} />
    </BaseNode>
  );
};

export default EnrichNode;