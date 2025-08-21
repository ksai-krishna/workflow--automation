import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

const EndNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div
      style={{
        background: '#e74c3c',
        color: 'white',
        borderRadius: '50%',
        width: 80,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        border: selected ? '3px solid #c0392b' : '2px solid #c0392b',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      End
      <Handle type="target" position={Position.Left} style={{ background: '#c0392b' }} />
    </div>
  );
};

export default EndNode;
