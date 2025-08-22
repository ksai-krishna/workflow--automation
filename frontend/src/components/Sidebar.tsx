import React from 'react';

// A reusable component for the draggable node items
const NodeItem: React.FC<{ type: string; label: string; category: 'trigger' | 'action' | 'logic' }> = ({ type, label, category }) => {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const categoryStyles = {
    trigger: {
      borderColor: '#0ea5e9', // sky-500
      backgroundColor: '#f0f9ff', // sky-50
      color: '#0369a1', // sky-700
    },
    action: {
      borderColor: '#ec4899', // pink-500
      backgroundColor: '#fdf2f8', // pink-50
      color: '#9d174d', // pink-700
    },
    logic: {
      borderColor: '#f97316', // orange-500
      backgroundColor: '#fff7ed', // orange-50
      color: '#9a3412', // orange-700
    },
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      style={{
        padding: '10px 12px',
        marginBottom: '8px',
        border: `1px solid ${categoryStyles[category].borderColor}`,
        borderRadius: '6px',
        background: categoryStyles[category].backgroundColor,
        color: categoryStyles[category].color,
        cursor: 'grab',
        userSelect: 'none',
        fontWeight: 500,
        fontSize: '14px',
        textAlign: 'center',
        transition: 'box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
    >
      {label}
    </div>
  );
};

const Sidebar: React.FC = () => {
  const triggerNodes = [
    { type: 'formTrigger', label: 'Form Trigger' },
    { type: 'webhookTrigger', label: 'Webhook Trigger' },
    { type: 'schedulerTrigger', label: 'Scheduler' },
    { type: 'manualTrigger', label: 'Manual' },
    { type: 'webhookingTrigger', label: 'Weebhook Trigger' },
  ];

  const actionNodes = [
    { type: 'sendEmail', label: 'Send Email' },
    { type: 'sendSlack', label: 'Send Slack Message' },
    { type: 'Http Trigger', label: 'HTTP TRIGGER' },
    { type: 'Parse CSV', label: 'Parse CSV' },
    { type: 'Summarize Text', label: 'Summarize Text' },   
  ];
  
  const logicNodes = [
    { type: 'startNode', label: 'Start' },
    { type: 'endNode', label: 'end' },
    // You can add 'startNode', 'endNode', etc. here if they have unique logic
    // For now, they can be represented by BaseNode or a new simple component
  ];

  return (
    <aside
      style={{
        width: 250,
        padding: '16px',
        background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        boxSizing: 'border-box',
        overflowY: 'auto',
        height: '100vh',
      }}
    >
      <div style={{ marginBottom: '16px', fontWeight: 'bold', fontSize: '16px', color: '#475569' }}>Triggers</div>
      {triggerNodes.map((node) => (
        <NodeItem key={node.type} {...node} category="trigger" />
      ))}

      <div style={{ margin: '24px 0 16px', fontWeight: 'bold', fontSize: '16px', color: '#475569' }}>Actions</div>
      {actionNodes.map((node) => (
        <NodeItem key={node.type} {...node} category="action" />
      ))}
      
      <div style={{ margin: '24px 0 16px', fontWeight: 'bold', fontSize: '16px', color: '#475569' }}>Logic & Control</div>
      {logicNodes.map((node) => (
        <NodeItem key={node.type} {...node} category="logic" />
      ))}
      
    </aside>
  );
};

export default Sidebar;
