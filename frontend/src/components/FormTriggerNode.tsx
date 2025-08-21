import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface FormTriggerNodeData {
  label: string;
  workflowId?: string; // The ID of the saved workflow
  apiUrl?: string;     // The base URL of your API
}

const FormTriggerNode: React.FC<NodeProps<FormTriggerNodeData>> = ({ id, data, selected }) => {
  const webhookUrl = data.workflowId ? `${data.apiUrl}/workflows/${data.workflowId}/execute` : 'Save the workflow to get a URL';

  const copyToClipboard = () => {
    if (data.workflowId) {
      navigator.clipboard.writeText(webhookUrl);
      alert('Webhook URL copied to clipboard!');
    }
  };

  return (
    <div
      style={{
        border: selected ? '2px solid #28a745' : '1px solid #28a745',
        borderRadius: 8,
        background: '#f0fff4',
        width: 350,
        boxShadow: selected ? '0 2px 10px rgba(40,167,69,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ background: '#28a745', color: 'white', padding: '8px 12px', borderRadius: '6px 6px 0 0', fontWeight: 'bold' }}>
        {data.label}
      </div>

      <div style={{ padding: '12px', fontSize: '13px', color: '#333' }}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Webhook URL:</label>
        <p style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>
          Use this URL as the 'action' in your HTML form.
        </p>
        <input
          type="text"
          readOnly
          value={webhookUrl}
          style={{ 
            width: '100%', 
            padding: '6px', 
            borderRadius: '4px', 
            border: '1px solid #ccc', 
            background: '#eee',
            marginBottom: '8px',
          }}
        />
        <button 
          onClick={copyToClipboard}
          disabled={!data.workflowId}
          style={{
            width: '100%',
            padding: '8px',
            border: 'none',
            borderRadius: '4px',
            background: data.workflowId ? '#007bff' : '#ccc',
            color: 'white',
            cursor: data.workflowId ? 'pointer' : 'not-allowed',
          }}
        >
          Copy URL
        </button>
      </div>
      
      <Handle type="source" position={Position.Right} style={{ background: '#28a745' }} />
    </div>
  );
};

export default FormTriggerNode;
