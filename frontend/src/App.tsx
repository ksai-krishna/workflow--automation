import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  OnInit,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';

import Sidebar from './components/Sidebar';
import BaseNode from './components/BaseNode';
import TriggerNode from './components/TriggerNode';
import EmailNode from './components/EmailNode';
import FormTriggerNode from './components/FormTriggerNode';
import ConditionNode from './components/ConditionNode';
import StartNode from './components/StartNode';
import EndNode from './components/EndNode';
import SchedulerTriggerNode from './components/SchedulerTriggerNode';
import HttpRequestNode from './components/HttpRequestNode';

const API_URL = 'http://192.168.1.5:4000';

const nodeTypes = {
  webhookTrigger: TriggerNode,
  schedulerTrigger: SchedulerTriggerNode,
  manualTrigger: (props: any) => (
    <TriggerNode {...props} data={{ ...props.data, isManualTrigger: true }} />
  ),
  formTrigger: FormTriggerNode,
  ifCondition: ConditionNode,
  startNode: StartNode,
  endNode: EndNode,
  sendEmail: EmailNode,
  sendSlack: BaseNode,
  parseCSV: BaseNode,
  parsePDF: BaseNode,
  s3GetFile: BaseNode,
  summarizeText: BaseNode,
  runScript: BaseNode,
  httpRequest: HttpRequestNode,
};

let id = 2;
const getId = () => `n${id++}`;

const initialNodes: Node[] = [];

type WorkflowListItem = {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  formId?: string;
};

const App: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstanceRef = useRef<any>(null);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('My New Workflow');
  const [savedWorkflowId, setSavedWorkflowId] = useState<string | null>(null);

  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [workflowList, setWorkflowList] = useState<WorkflowListItem[]>([]);

  // Track active scheduler timers in the browser
  const schedulerIntervalsRef = useRef<Record<string, number>>({});
  const [isRunning, setIsRunning] = useState(false);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) => addEdge({ ...params, animated: true, type: 'smoothstep' }, eds)),
    []
  );

  const onInit: OnInit = (instance) => {
    reactFlowInstanceRef.current = instance;
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onLabelChange = useCallback((id: string, label: string) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)));
  }, []);

  const onNodeDataChange = useCallback((id: string, newData: any) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...newData } } : n)));
  }, []);

  const onDelete = useCallback(
    (id: string) => {
      // if a scheduler node is removed, stop its timer
      const removed = nodes.find((n) => n.id === id);
      if (removed?.type === 'schedulerTrigger' && schedulerIntervalsRef.current[id]) {
        window.clearInterval(schedulerIntervalsRef.current[id]);
        delete schedulerIntervalsRef.current[id];
        setIsRunning(Object.keys(schedulerIntervalsRef.current).length > 0);
      }

      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      if (selectedNodeId === id) setSelectedNodeId(null);
    },
    [nodes, selectedNodeId]
  );

  const handleManualTrigger = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    console.log(`Manually triggering node: ${node.id}, type: ${node.type}`, node.data);

    try {
      if (node.type === 'sendEmail') {
        await axios.post(`${API_URL}/send-email`, {
          to: node.data.to,
          subject: node.data.subject,
          text: node.data.text,
        });
        alert('Email sent successfully!');
      } else if (node.type === 'sendSlack') {
        await axios.post(`${API_URL}/send-slack`, {
          text: node.data.text,
        });
        alert('Slack message sent successfully!');
      } else if (node.type === 'httpRequest') {
        const response = await axios({
          method: node.data.method || 'GET',
          url: node.data.url,
        });
        console.log('HTTP Response:', response.data);
        alert('HTTP request successful! Check console for response.');
      } else if (node.type === 'database') {
        const response = await axios.post(`${API_URL}/test-db-connection`, {
          dbType: node.data.dbType,
          host: node.data.host,
          port: node.data.port,
          database: node.data.database,
          username: node.data.username,
          password: node.data.password,
        });
        console.log('DB Connection Response:', response.data);
        alert('Database connection successful! 🎉');
      }
    } catch (error: any) {
      console.error(`Error executing node ${nodeId}`, error);
      alert(`Error executing node ${node.type}: ${error.message}`);
    }
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || typeof type === 'undefined') return;

      const position = reactFlowBounds
        ? { x: event.clientX - reactFlowBounds.left, y: event.clientY - reactFlowBounds.top }
        : { x: 0, y: 0 };

      const initialData: any = {
        label: `${type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1').trim()}`,
        onLabelChange,
        onDelete,
        onNodeDataChange,
        isManualTrigger: type === 'manualTrigger',
        onManualTrigger: handleManualTrigger,
      };

      if (type === 'schedulerTrigger') {
        initialData.scheduleValue = 5;
        initialData.scheduleUnit = 'minutes'; // or 'seconds'
      }

      if (type === 'formTrigger') {
        initialData.apiUrl = API_URL;
      }

      if (type === 'sendEmail') {
        initialData.to = 'ksaikrishna5601@gmail.com';
        initialData.subject = 'Default Subject';
        initialData.text = 'Hello, how are you?';
        initialData.subjectType = 'manual';
        initialData.textType = 'manual';
      }

      if (type === 'sendSlack') {
        initialData.text = 'A form was filled out!';
      }

      if (type === 'httpRequest') {
        initialData.url = 'https://jsonplaceholder.typicode.com/posts/1';
        initialData.method = 'GET';
      }

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: initialData,
      };

      setNodes((nds) => nds.concat(newNode));
      setTimeout(() => reactFlowInstanceRef.current?.fitView(), 100);
    },
    [onLabelChange, onDelete, onNodeDataChange, nodes, edges]
  );

  const saveWorkflow = async () => {
    try {
      const cleanNodes = nodes.map(({ id, type, position, data }) => ({ id, type, position, data }));
      const cleanEdges = edges.map(({ id, source, target }) => ({ id, source, target }));

      const payload = {
        name: workflowName,
        nodes: cleanNodes,
        edges: cleanEdges,
      };

      const response = await axios.post(`${API_URL}/workflows`, payload);
      const savedWorkflow = response.data;

      setSavedWorkflowId(savedWorkflow.id);

      if (savedWorkflow.formId) {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.type === 'formTrigger') {
              return { ...node, data: { ...node.data, formId: savedWorkflow.formId } };
            }
            return node;
          })
        );
      }

      alert(`Workflow saved successfully! ID: ${savedWorkflow.id}`);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Error: Could not save workflow.');
    }
  };

  const loadWorkflows = async () => {
    try {
      const response = await axios.get(`${API_URL}/workflows`);
      if (response.data && response.data.length > 0) {
        setWorkflowList(response.data);
        setIsLoadModalOpen(true);
      } else {
        alert('No saved workflows found.');
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
      alert('Error: Could not load workflows.');
    }
  };

  const handleSelectWorkflow = (wf: WorkflowListItem) => {
    // stop any running schedules when switching workflows
    stopWorkflow();

    const loadedNodes = (wf.nodes || []).map((node: any) => ({
      ...node,
      position: node.position || { x: 0, y: 0 },
      data: {
        ...node.data,
        onLabelChange,
        onDelete,
        onNodeDataChange,
        onManualTrigger: handleManualTrigger,
        ...(node.type === 'formTrigger' && { apiUrl: API_URL, formId: wf.formId }),
      },
    }));

    setNodes(loadedNodes);
    setEdges(wf.edges || []);
    setWorkflowName(wf.name);
    setSavedWorkflowId(wf.id);

    setIsLoadModalOpen(false);
    setTimeout(() => reactFlowInstanceRef.current?.fitView(), 100);
  };

  const handleDeleteWorkflow = async (
    workflowId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        await axios.delete(`${API_URL}/workflows/${workflowId}`);
        setWorkflowList((prevList) => prevList.filter((wf) => wf.id !== workflowId));
        alert('Workflow deleted successfully.');
      } catch (error) {
        console.error('Failed to delete workflow:', error);
        alert('Error: Could not delete workflow.');
      }
    }
  };

  const executeWorkflow = async () => {
    if (!savedWorkflowId) {
      alert('Please save the workflow before executing.');
      return;
    }

    try {
      // For each scheduler node, create an interval that calls your backend
      nodes.forEach((node) => {
        if (node.type === 'schedulerTrigger') {
          const value = Number(node.data?.scheduleValue || 0);
          const unit = (node.data?.scheduleUnit || 'minutes') as 'seconds' | 'minutes';
          if (!value || value <= 0) return;

          const intervalMs = unit === 'seconds' ? value * 1000 : value * 60000;

          // Clear existing interval for this node if present
          if (schedulerIntervalsRef.current[node.id]) {
            window.clearInterval(schedulerIntervalsRef.current[node.id]);
          }

          // Immediate kick-off
          axios.post(`${API_URL}/workflows/${savedWorkflowId}/execute`).catch(console.error);

          // Recurring
          const timerId = window.setInterval(async () => {
            console.log(`Scheduler ${node.id}: executing workflow ${savedWorkflowId}`);
            try {
              await axios.post(`${API_URL}/workflows/${savedWorkflowId}/execute`);
            } catch (e) {
              console.error('Scheduler tick failed:', e);
            }
          }, intervalMs);

          schedulerIntervalsRef.current[node.id] = timerId;
        }
      });

      const hasAny = Object.keys(schedulerIntervalsRef.current).length > 0;
      setIsRunning(hasAny);
      alert(hasAny ? 'Workflow execution started! Scheduler(s) active.' : 'No scheduler nodes found.');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      alert('Error: Could not execute workflow.');
    }
  };

  const stopWorkflow = () => {
    Object.values(schedulerIntervalsRef.current).forEach((id) => window.clearInterval(id));
    schedulerIntervalsRef.current = {};
    setIsRunning(false);
    // optional: notify backend if you also start jobs there
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
        if (selectedNodeId) onDelete(selectedNodeId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNodeId, onDelete]);

  // Clean up timers on unmount / refresh
  useEffect(() => {
    return () => stopWorkflow();
  }, []);

  return (
    <div
      style={{ display: 'flex', height: '100vh', width: '100vw' }}
      ref={reactFlowWrapper}
    >
      <Sidebar />
      <div style={{ flexGrow: 1, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            background: 'white',
            padding: '10px',
            borderRadius: '5px',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            style={{
              border: '1px solid #ccc',
              padding: '5px',
              borderRadius: '3px',
              marginRight: '10px',
            }}
          />
          <button onClick={saveWorkflow} style={{ padding: '5px 10px' }}>
            Save
          </button>
          <button onClick={loadWorkflows} style={{ padding: '5px 10px' }}>
            Load
          </button>
          <button
            onClick={executeWorkflow}
            disabled={!savedWorkflowId}
            style={{
              padding: '5px 10px',
              background: savedWorkflowId ? '#28a745' : '#ccc',
              color: 'white',
            }}
          >
            Execute
          </button>
          <button
            onClick={stopWorkflow}
            disabled={!isRunning}
            style={{
              padding: '5px 10px',
              background: isRunning ? '#dc3545' : '#ccc',
              color: 'white',
            }}
          >
            Stop
          </button>
        </div>

        {isLoadModalOpen && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                width: '500px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <h2 style={{ margin: 0 }}>Select a workflow to load</h2>
                <button
                  onClick={() => setIsLoadModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer' }}
                >
                  &times;
                </button>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto' }}>
                {workflowList.map((wf) => (
                  <li
                    key={wf.id}
                    onClick={() => handleSelectWorkflow(wf)}
                    style={{
                      padding: '10px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{wf.name}</span>
                    <button
                      onClick={(e) => handleDeleteWorkflow(wf.id, e)}
                      style={{ padding: '4px 8px', background: '#dc3545', color: 'white', borderRadius: 4 }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            onInit={onInit}
            attributionPosition="bottom-left"
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
          >
            <MiniMap />
            <Controls />
            <Background gap={16} size={1} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default App;
