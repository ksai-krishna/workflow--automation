import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

const StartNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      style={{
        background: '#2ecc71',
        color: 'white',
        borderRadius: '50%',
        width: 80,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        border: selected ? '3px solid #27ae60' : '2px solid #27ae60',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      Start
      <Handle type="source" position={Position.Right} style={{ background: '#27ae60' }} />
    </div>
  );
};

export default StartNode;
