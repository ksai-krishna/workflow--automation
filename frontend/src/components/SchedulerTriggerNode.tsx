import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface SchedulerTriggerData {
  label: string;
  scheduleValue: number;
  scheduleUnit: 'minutes' | 'seconds';
  onNodeDataChange?: (id: string, newData: Partial<SchedulerTriggerData>) => void;
}

const SchedulerTriggerNode: React.FC<NodeProps<SchedulerTriggerData>> = ({ id, data, selected }) => {
  const handleDataChange = (field: keyof SchedulerTriggerData, value: string | number) => {
    if (data.onNodeDataChange) {
      data.onNodeDataChange(id, { [field]: value });
    }
  };

  return (
    <div
      style={{
        border: selected ? '2px solid #27ae60' : '1px solid #27ae60',
        borderRadius: 8,
        background: '#eafaf1',
        width: 220,
        boxShadow: selected ? '0 2px 10px rgba(39,174,96,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ background: '#27ae60', color: 'white', padding: '8px 12px', borderRadius: '6px 6px 0 0', fontWeight: 'bold' }}>
        {data.label}
      </div>

      <div style={{ padding: '12px', fontSize: '13px', color: '#333' }}>
        <label style={{ display: 'block', fontWeight: 500, marginBottom: '4px' }}>Run Every:</label>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="number"
            value={data.scheduleValue || 5}
            onChange={(e) => handleDataChange('scheduleValue', parseInt(e.target.value, 10))}
            className="nodrag"
            style={{ 
              width: '60px', 
              padding: '6px', 
              borderRadius: '4px', 
              border: '1px solid #a3d9b8',
              marginRight: '8px',
            }}
          />
          <select
            value={data.scheduleUnit || 'minutes'}
            onChange={(e) => handleDataChange('scheduleUnit', e.target.value as 'minutes' | 'seconds')}
            className="nodrag"
            style={{
              flexGrow: 1,
              padding: '6px',
              borderRadius: '4px',
              border: '1px solid #a3d9b8',
            }}
          >
            <option value="minutes">Minutes</option>
            <option value="seconds">Seconds</option>
          </select>
        </div>
      </div>
      
      <Handle type="source" position={Position.Right} style={{ background: '#27ae60' }} />
    </div>
  );
};

export default SchedulerTriggerNode;
