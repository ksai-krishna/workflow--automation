import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

// Define the shape of the data object for this specific node
interface EmailNodeData {
  label: string;
  to: string;
  subject: string;
  text: string;
  subjectType: 'manual' | 'previous';
  textType: 'manual' | 'previous';
  onDelete?: (id: string) => void;
  onNodeDataChange?: (id: string, newData: Partial<EmailNodeData>) => void;
}

const EmailNode: React.FC<NodeProps<EmailNodeData>> = ({ id, data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  // Temporary state to hold form data while editing
  const [formData, setFormData] = useState(data);

  // When the node's external data changes, update our temporary form state
  useEffect(() => {
    setFormData(data);
  }, [data]);

  const handleDataChange = (field: keyof EmailNodeData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, formData);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset form data to original and exit editing mode
    setFormData(data);
    setIsEditing(false);
  };

  if (!data) {
    return <div>Loading...</div>;
  }

  // --- COMPACT VIEW ---
  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        style={{
          border: selected ? '2px solid #ff0072' : '1px solid #ff0072',
          borderRadius: 8,
          background: '#fff0f7',
          width: 200, // Smaller width for compact view
          boxShadow: selected ? '0 2px 10px rgba(255,0,114,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
          cursor: 'pointer',
        }}
      >
        <div style={{ background: '#ff0072', color: 'white', padding: '8px 12px', borderRadius: '6px 6px 0 0', fontWeight: 'bold' }}>
          {data.label}
        </div>
        <div style={{ padding: '12px', fontSize: '12px', color: '#555' }}>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            To: {data.to || 'Not set'}
          </div>
          <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#888' }}>
            Click to edit details
          </div>
        </div>
        <Handle type="target" position={Position.Left} style={{ background: '#ff0072' }} />
        <Handle type="source" position={Position.Right} style={{ background: '#ff0072' }} />
      </div>
    );
  }

  // --- EXPANDED FORM VIEW ---
  return (
    <div
      style={{
        border: '2px solid #ff0072',
        borderRadius: 8,
        background: '#fff0f7',
        width: 300,
        boxShadow: '0 2px 10px rgba(255,0,114,0.3)',
      }}
    >
      <div style={{ background: '#ff0072', color: 'white', padding: '8px 12px', borderRadius: '6px 6px 0 0', fontWeight: 'bold' }}>
        {formData.label}
      </div>

      <div style={{ padding: '12px', fontSize: '13px', color: '#333' }}>
        {/* --- To Field --- */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>To:</label>
          <input
            type="email"
            value={formData.to || ''}
            onChange={(e) => handleDataChange('to', e.target.value)}
            className="nodrag"
            style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ffbadc' }}
          />
        </div>

        {/* --- Subject Field --- */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Subject:</label>
          <div>
            <label style={{ marginRight: '10px' }}>
              <input type="radio" name={`subjectType-${id}`} value="manual" checked={formData.subjectType === 'manual'} onChange={(e) => handleDataChange('subjectType', e.target.value)} className="nodrag" /> Manual
            </label>
            <label>
              <input type="radio" name={`subjectType-${id}`} value="previous" checked={formData.subjectType === 'previous'} onChange={(e) => handleDataChange('subjectType', e.target.value)} className="nodrag" /> From Previous
            </label>
          </div>
          {formData.subjectType === 'manual' ? (
            <input
              type="text"
              value={formData.subject || ''}
              onChange={(e) => handleDataChange('subject', e.target.value)}
              className="nodrag"
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ffbadc', marginTop: '4px' }}
            />
          ) : (
            <div style={{ padding: '6px', background: '#eee', borderRadius: '4px', marginTop: '4px', fontStyle: 'italic', color: '#666' }}>
              Using output from previous node
            </div>
          )}
        </div>

        {/* --- Content Field --- */}
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Content:</label>
           <div>
            <label style={{ marginRight: '10px' }}>
              <input type="radio" name={`textType-${id}`} value="manual" checked={formData.textType === 'manual'} onChange={(e) => handleDataChange('textType', e.target.value)} className="nodrag" /> Manual
            </label>
            <label>
              <input type="radio" name={`textType-${id}`} value="previous" checked={formData.textType === 'previous'} onChange={(e) => handleDataChange('textType', e.target.value)} className="nodrag" /> From Previous
            </label>
          </div>
          {formData.textType === 'manual' ? (
            <textarea
              value={formData.text || ''}
              onChange={(e) => handleDataChange('text', e.target.value)}
              rows={3}
              className="nodrag"
              style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ffbadc', marginTop: '4px' }}
            />
          ) : (
             <div style={{ padding: '6px', background: '#eee', borderRadius: '4px', marginTop: '4px', fontStyle: 'italic', color: '#666' }}>
              Using output from previous node
            </div>
          )}
        </div>
        
        {/* --- Action Buttons --- */}
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleCancel} style={{ marginRight: '8px', padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: '#eee' }}>Cancel</button>
            <button onClick={handleSave} style={{ padding: '6px 12px', border: 'none', borderRadius: '4px', background: '#ff0072', color: 'white' }}>Save</button>
        </div>
      </div>
      
      <Handle type="target" position={Position.Left} style={{ background: '#ff0072' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#ff0072' }} />
    </div>
  );
};

export default EmailNode;
