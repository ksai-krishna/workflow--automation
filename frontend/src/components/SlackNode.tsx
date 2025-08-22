import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface SlackNodeData {
  label: string;
  text: string;
  onNodeDataChange?: (id: string, newData: Partial<SlackNodeData>) => void;
  onDelete?: (id: string) => void;
}

const SlackNode: React.FC<NodeProps<SlackNodeData>> = ({ id, data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(data);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleDataChange = (field: keyof SlackNodeData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, formData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(data);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        style={{
          border: selected ? '2px solid #5a64a3' : '1px solid #5a64a3',
          borderRadius: 8,
          background: '#e0e7ff',
          width: 200,
          boxShadow: selected ? '0 2px 10px rgba(90,100,163,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
          cursor: 'pointer',
        }}
      >
        <div style={{ background: '#5a64a3', color: 'white', padding: '8px 12px', borderRadius: '6px 6px 0 0', fontWeight: 'bold' }}>
          {data.label || 'Send Slack Message'}
        </div>
        <div style={{ padding: '12px', fontSize: '12px', color: '#555' }}>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Message: {data.text || 'Not set'}
          </div>
          <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#888' }}>
            Click to edit details
          </div>
        </div>
        <Handle type="target" position={Position.Left} style={{ background: '#5a64a3' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#5a64a3' }} />
      </div>
    );
  }

  return (
    <div
      style={{
        border: '2px solid #5a64a3',
        borderRadius: 8,
        background: '#e0e7ff',
        width: 300,
        boxShadow: '0 2px 10px rgba(90,100,163,0.3)',
      }}
    >
      <div style={{ background: '#5a64a3', color: 'white', padding: '8px 12px', borderRadius: '6px 6px 0 0', fontWeight: 'bold' }}>
        {formData.label || 'Send Slack Message'}
      </div>

      <div style={{ padding: '12px', fontSize: '13px', color: '#333' }}>
        {/* --- Message Field --- */}
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Message:</label>
          <textarea
            value={formData.text || ''}
            onChange={(e) => handleDataChange('text', e.target.value)}
            rows={4}
            className="nodrag"
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #b3c2ff', marginTop: '4px' }}
          />
        </div>
        
        {/* --- Action Buttons --- */}
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleCancel} style={{ marginRight: '8px', padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: '#eee' }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '6px 12px', border: 'none', borderRadius: '4px', background: '#5a64a3', color: 'white' }}>Save</button>
        </div>
      </div>
      
      <Handle type="target" position={Position.Left} style={{ background: '#5a64a3' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#5a64a3' }} />
    </div>
  );
};

export default SlackNode;