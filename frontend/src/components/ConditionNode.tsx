import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ConditionNodeData {
  label: string;
}

const ConditionNode: React.FC<NodeProps<ConditionNodeData>> = ({ data, selected }) => {
  return (
    <div
      style={{
        width: 150,
        height: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'rotate(45deg)',
        border: selected ? '2px solid #f39c12' : '1px solid #f39c12',
        background: '#fef5e7',
        boxShadow: selected ? '0 2px 10px rgba(243,156,18,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          transform: 'rotate(-45deg)',
          textAlign: 'center',
          fontWeight: 'bold',
          color: '#7d5a29',
        }}
      >
        {data.label}
      </div>
      <Handle type="target" position={Position.Top} style={{ background: '#f39c12' }} />
      <Handle type="source" id="true" position={Position.Right} style={{ background: '#27ae60', top: '50%' }} />
      <Handle type="source" id="false" position={Position.Bottom} style={{ background: '#c0392b', top: 'auto' }} />
      <Handle type="source" position={Position.Left} style={{ background: '#f39c12' }} />
    </div>
  );
};

export default ConditionNode;
