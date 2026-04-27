import React, { useRef, useEffect, useState, useCallback } from 'react';
import { getStroke } from 'perfect-freehand';
import { v4 as uuidv4 } from 'uuid';
import { recognizeShape } from '../utils/shapeRecognition';

const COLORS = {
  black: '#1e1e1e',
  blue: '#2563eb',
  red: '#ef4444',
  green: '#22c55e',
  purple: '#a855f7',
  orange: '#f97316'
};

const STYLES = {
  strokeWidth: 2,
  color: COLORS.black,
  fill: 'transparent'
};

function getSvgPathFromStroke(points) {
  if (!points.length) return '';

  const d = points.reduce((acc, point, i, a) => i === 0
    ? `M ${point[0].toFixed(3)},${point[1].toFixed(3)}`
    : `${acc} L ${point[0].toFixed(3)},${point[1].toFixed(3)}`,
    ''
  );

  return `${d} Z`;
}

function Canvas({
  currentTool,
  elements,
  onElementUpdate,
  onElementDelete,
  collaborators,
  cursorPositions,
  userId,
  roomId,
  isConnected,
  apiConfig,
  selectedElementId,
  onSelectedElementChange
}) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const inputRef = useRef(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [currentElement, setCurrentElement] = useState(null);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [isRecognizing, setIsRecognizing] = useState(false);
  
  const [editingTextElement, setEditingTextElement] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editPosition, setEditPosition] = useState({ x: 0, y: 0 });
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedElementId, setLastClickedElementId] = useState(null);

  const getScreenPoint = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - camera.x) / camera.zoom,
      y: (clientY - rect.top - camera.y) / camera.zoom
    };
  }, [camera]);

  const startTextEdit = useCallback((element, screenX, screenY) => {
    setEditingTextElement(element);
    setEditingText(element.text || '');
    setEditPosition({ x: screenX, y: screenY - 25 });
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, []);

  const finishTextEdit = useCallback(() => {
    if (editingTextElement) {
      const updatedElement = {
        ...editingTextElement,
        text: editingText
      };
      onElementUpdate(updatedElement);
    }
    setEditingTextElement(null);
    setEditingText('');
  }, [editingTextElement, editingText, onElementUpdate]);

  const cancelTextEdit = useCallback(() => {
    setEditingTextElement(null);
    setEditingText('');
  }, []);

  const handlePointerDown = useCallback((e) => {
    const point = getScreenPoint(e.clientX, e.clientY);
    const currentTime = Date.now();

    if (editingTextElement) {
      cancelTextEdit();
    }

    if (currentTool === 'hand' || (e.button === 1 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setOrigin({ x: camera.x, y: camera.y });
      return;
    }

    if (currentTool === 'select') {
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (isPointInElement(point, el)) {
          if (el.type === 'text' && 
              lastClickedElementId === el.id && 
              currentTime - lastClickTime < 300) {
            startTextEdit(el, e.clientX, e.clientY);
            setLastClickedElementId(null);
            setLastClickTime(0);
            return;
          }

          if (onSelectedElementChange) {
            onSelectedElementChange(el.id);
          }
          setSelectedElementId?.(el.id);
          setLastClickedElementId(el.id);
          setLastClickTime(currentTime);
          
          setIsDragging(true);
          setPanStart(point);
          return;
        }
      }
      
      if (onSelectedElementChange) {
        onSelectedElementChange(null);
      }
      setSelectedElementId?.(null);
      setLastClickedElementId(null);
      setLastClickTime(0);
      return;
    }

    if (currentTool === 'text') {
      const newElement = createNewElement(currentTool, point);
      onElementUpdate(newElement);
      startTextEdit(newElement, e.clientX, e.clientY);
      return;
    }

    setIsDragging(true);
    const newElement = createNewElement(currentTool, point);
    setCurrentElement(newElement);
  }, [currentTool, camera, elements, getScreenPoint, selectedElementId,
      editingTextElement, cancelTextEdit, startTextEdit,
      lastClickTime, lastClickedElementId, onSelectedElementChange, setSelectedElementId]);

  const handlePointerMove = useCallback((e) => {
    const point = getScreenPoint(e.clientX, e.clientY);

    if (isPanning) {
      setCamera(prev => ({
        ...prev,
        x: origin.x + (e.clientX - panStart.x),
        y: origin.y + (e.clientY - panStart.y)
      }));
      return;
    }

    if (isDragging && selectedElementId) {
      const dx = point.x - panStart.x;
      const dy = point.y - panStart.y;
      
      const element = elements.find(el => el.id === selectedElementId);
      if (element) {
        const updatedElement = {
          ...element,
          x: element.x + dx,
          y: element.y + dy
        };
        onElementUpdate(updatedElement);
        setPanStart(point);
      }
      return;
    }

    if (isDragging && currentElement) {
      const updatedElement = updateElement(currentElement, point, currentTool);
      setCurrentElement(updatedElement);
    }
  }, [isDragging, isPanning, currentElement, currentTool, selectedElementId, elements,
      panStart, origin, getScreenPoint, onElementUpdate]);

  const handlePointerUp = useCallback(async (e) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDragging && selectedElementId) {
      setIsDragging(false);
      return;
    }

    if (isDragging && currentElement) {
      let finalElement = currentElement;
      
      if (currentTool === 'pencil' && currentElement.points && currentElement.points.length > 5) {
        try {
          setIsRecognizing(true);
          const recognizedShape = await recognizeShape(currentElement, apiConfig);
          if (recognizedShape) {
            finalElement = recognizedShape;
          }
        } catch (error) {
          console.log('形状识别失败，使用原始笔迹:', error);
        } finally {
          setIsRecognizing(false);
        }
      }

      onElementUpdate(finalElement);
      setCurrentElement(null);
    }

    setIsDragging(false);
  }, [isDragging, isPanning, currentElement, currentTool, selectedElementId, apiConfig, onElementUpdate]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const point = getScreenPoint(e.clientX, e.clientY);
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, camera.zoom * zoomFactor));

    setCamera(prev => ({
      x: prev.x + point.x * prev.zoom - point.x * newZoom,
      y: prev.y + point.y * prev.zoom - point.y * newZoom,
      zoom: newZoom
    }));
  }, [camera, getScreenPoint]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingTextElement) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          finishTextEdit();
        } else if (e.key === 'Escape') {
          cancelTextEdit();
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          onElementDelete(selectedElementId);
          if (onSelectedElementChange) {
            onSelectedElementChange(null);
          }
          setSelectedElementId?.(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, editingTextElement, onElementDelete, 
      finishTextEdit, cancelTextEdit, onSelectedElementChange, setSelectedElementId]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        cursor: currentTool === 'hand' ? 'grab' : currentTool === 'select' ? 'default' : 'crosshair',
        backgroundColor: '#fafafa',
        backgroundImage: `
          radial-gradient(circle, #ddd 1px, transparent 1px)
        `,
        backgroundSize: `${20 * camera.zoom}px ${20 * camera.zoom}px`,
        backgroundPosition: `${camera.x}px ${camera.y}px`
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          touchAction: 'none'
        }}
      >
        <g transform={`translate(${camera.x}, ${camera.y}) scale(${camera.zoom})`}>
          {elements.map(element => (
            <g key={element.id}>
              {renderElement(element, selectedElementId === element.id)}
            </g>
          ))}
          
          {currentElement && (
            <g>
              {renderElement(currentElement, false)}
            </g>
          )}

          {Object.entries(cursorPositions).map(([uid, pos]) => {
            if (uid === userId) return null;
            const collaborator = collaborators.find(c => c.id === uid);
            return (
              <g key={uid} transform={`translate(${pos.x}, ${pos.y})`}>
                <circle r="6" fill={getUserColor(uid)} />
                {collaborator && (
                  <text
                    x="10"
                    y="4"
                    fontSize="12"
                    fill={getUserColor(uid)}
                    fontWeight="500"
                  >
                    {collaborator.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {editingTextElement && (
        <input
          ref={inputRef}
          type="text"
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={finishTextEdit}
          placeholder="输入文本..."
          style={{
            position: 'absolute',
            left: editPosition.x,
            top: editPosition.y,
            padding: '6px 10px',
            border: '2px solid #4f46e5',
            borderRadius: '4px',
            fontSize: editingTextElement.fontSize || 16,
            outline: 'none',
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '120px'
          }}
        />
      )}

      {isRecognizing && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          zIndex: 1000
        }}>
          正在识别图形...
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        backgroundColor: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: '12px',
        color: '#666',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <span>缩放: {Math.round(camera.zoom * 100)}%</span>
        {isConnected && roomId && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#22c55e'
            }} />
            已连接
          </span>
        )}
      </div>
    </div>
  );
}

function createNewElement(tool, point) {
  const id = uuidv4();
  const timestamp = Date.now();

  switch (tool) {
    case 'pencil':
      return {
        id,
        type: 'pencil',
        x: point.x,
        y: point.y,
        points: [[point.x, point.y, 0.5]],
        strokeWidth: STYLES.strokeWidth,
        color: STYLES.color,
        timestamp
      };
    case 'rectangle':
      return {
        id,
        type: 'rectangle',
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        strokeWidth: STYLES.strokeWidth,
        color: STYLES.color,
        fill: STYLES.fill,
        timestamp
      };
    case 'circle':
      return {
        id,
        type: 'circle',
        x: point.x,
        y: point.y,
        radiusX: 0,
        radiusY: 0,
        strokeWidth: STYLES.strokeWidth,
        color: STYLES.color,
        fill: STYLES.fill,
        timestamp
      };
    case 'arrow':
      return {
        id,
        type: 'arrow',
        x: point.x,
        y: point.y,
        endX: point.x,
        endY: point.y,
        strokeWidth: STYLES.strokeWidth,
        color: STYLES.color,
        timestamp
      };
    case 'line':
      return {
        id,
        type: 'line',
        x: point.x,
        y: point.y,
        endX: point.x,
        endY: point.y,
        strokeWidth: STYLES.strokeWidth,
        color: STYLES.color,
        timestamp
      };
    case 'text':
      return {
        id,
        type: 'text',
        x: point.x,
        y: point.y,
        text: '',
        fontSize: 16,
        color: STYLES.color,
        timestamp
      };
    default:
      return null;
  }
}

function updateElement(element, point, tool) {
  switch (tool) {
    case 'pencil':
      return {
        ...element,
        points: [...element.points, [point.x, point.y, 0.5]]
      };
    case 'rectangle':
      return {
        ...element,
        width: point.x - element.x,
        height: point.y - element.y
      };
    case 'circle':
      return {
        ...element,
        radiusX: Math.abs(point.x - element.x),
        radiusY: Math.abs(point.y - element.y)
      };
    case 'arrow':
    case 'line':
      return {
        ...element,
        endX: point.x,
        endY: point.y
      };
    default:
      return element;
  }
}

function renderElement(element, isSelected) {
  const selectionStyle = isSelected ? {
    filter: 'drop-shadow(0 0 3px rgba(79, 70, 229, 0.8))'
  } : {};

  switch (element.type) {
    case 'pencil': {
      const stroke = getStroke(element.points, {
        size: element.strokeWidth * 2,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5
      });
      const pathData = getSvgPathFromStroke(stroke);
      return (
        <path
          d={pathData}
          fill={element.color}
          style={selectionStyle}
        />
      );
    }
    case 'rectangle': {
      const x = element.width < 0 ? element.x + element.width : element.x;
      const y = element.height < 0 ? element.y + element.height : element.y;
      const width = Math.abs(element.width);
      const height = Math.abs(element.height);
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={element.fill}
          stroke={element.color}
          strokeWidth={element.strokeWidth}
          rx="4"
          style={selectionStyle}
        />
      );
    }
    case 'circle': {
      return (
        <ellipse
          cx={element.x}
          cy={element.y}
          rx={Math.abs(element.radiusX)}
          ry={Math.abs(element.radiusY)}
          fill={element.fill}
          stroke={element.color}
          strokeWidth={element.strokeWidth}
          style={selectionStyle}
        />
      );
    }
    case 'arrow': {
      const angle = Math.atan2(element.endY - element.y, element.endX - element.x);
      const arrowLength = 12;
      const arrowAngle = Math.PI / 6;
      
      const arrowPoint1 = {
        x: element.endX - arrowLength * Math.cos(angle - arrowAngle),
        y: element.endY - arrowLength * Math.sin(angle - arrowAngle)
      };
      const arrowPoint2 = {
        x: element.endX - arrowLength * Math.cos(angle + arrowAngle),
        y: element.endY - arrowLength * Math.sin(angle + arrowAngle)
      };

      return (
        <g style={selectionStyle}>
          <line
            x1={element.x}
            y1={element.y}
            x2={element.endX}
            y2={element.endY}
            stroke={element.color}
            strokeWidth={element.strokeWidth}
            strokeLinecap="round"
          />
          <polygon
            points={`${element.endX},${element.endY} ${arrowPoint1.x},${arrowPoint1.y} ${arrowPoint2.x},${arrowPoint2.y}`}
            fill={element.color}
          />
        </g>
      );
    }
    case 'line': {
      return (
        <line
          x1={element.x}
          y1={element.y}
          x2={element.endX}
          y2={element.endY}
          stroke={element.color}
          strokeWidth={element.strokeWidth}
          strokeLinecap="round"
          style={selectionStyle}
        />
      );
    }
    case 'text': {
      return (
        <g style={selectionStyle}>
          {element.text && (
            <text
              x={element.x}
              y={element.y}
              fontSize={element.fontSize}
              fill={element.color}
              dominantBaseline="middle"
            >
              {element.text}
            </text>
          )}
          {!element.text && (
            <g>
              <text
                x={element.x}
                y={element.y}
                fontSize={element.fontSize}
                fill="#999"
                dominantBaseline="middle"
                fontStyle="italic"
              >
                双击编辑
              </text>
              <rect
                x={element.x - 4}
                y={element.y - element.fontSize}
                width={80}
                height={element.fontSize * 1.5}
                fill="transparent"
                stroke="#ddd"
                strokeWidth="1"
                strokeDasharray="4,2"
                rx="2"
              />
            </g>
          )}
        </g>
      );
    }
    default:
      return null;
  }
}

function isPointInElement(point, element) {
  const tolerance = 10;
  
  switch (element.type) {
    case 'rectangle': {
      const x = element.width < 0 ? element.x + element.width : element.x;
      const y = element.height < 0 ? element.y + element.height : element.y;
      const width = Math.abs(element.width);
      const height = Math.abs(element.height);
      return point.x >= x - tolerance && point.x <= x + width + tolerance &&
             point.y >= y - tolerance && point.y <= y + height + tolerance;
    }
    case 'circle': {
      const rx = Math.max(Math.abs(element.radiusX), 1);
      const ry = Math.max(Math.abs(element.radiusY), 1);
      const dx = (point.x - element.x) / (rx + tolerance);
      const dy = (point.y - element.y) / (ry + tolerance);
      return dx * dx + dy * dy <= 1;
    }
    case 'arrow':
    case 'line': {
      const dist = pointToLineDistance(
        point.x, point.y,
        element.x, element.y,
        element.endX, element.endY
      );
      return dist < tolerance;
    }
    case 'pencil': {
      if (!element.points) return false;
      for (const p of element.points) {
        const dx = point.x - p[0];
        const dy = point.y - p[1];
        if (Math.sqrt(dx * dx + dy * dy) < tolerance) {
          return true;
        }
      }
      return false;
    }
    case 'text': {
      const textWidth = element.text ? element.text.length * (element.fontSize || 16) * 0.6 : 80;
      const textHeight = (element.fontSize || 16) * 1.5;
      return point.x >= element.x - tolerance && point.x <= element.x + textWidth + tolerance &&
             point.y >= element.y - textHeight / 2 - tolerance && point.y <= element.y + textHeight / 2 + tolerance;
    }
    default:
      return false;
  }
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function getUserColor(userId) {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
  ];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export default Canvas;
