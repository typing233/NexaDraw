import { v4 as uuidv4 } from 'uuid';

const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const DEFAULT_MODEL = 'doubao-pro-32k';

async function callArkAPI(apiConfig, messages, options = {}) {
  const { apiKey, modelName, endpoint } = apiConfig;
  
  if (!apiKey) {
    throw new Error('请先配置火山方舟 API Key');
  }

  const baseUrl = endpoint || DEFAULT_BASE_URL;
  const model = modelName || DEFAULT_MODEL;

  const url = baseUrl.includes('/chat/completions') 
    ? baseUrl 
    : `${baseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      ...options
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `API 请求失败: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function generateFromPrompt(prompt, chartType, apiConfig) {
  const systemPrompt = getSystemPromptForChartType(chartType);
  
  const messages = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: `请根据以下描述生成${getChartTypeName(chartType)}：\n\n${prompt}\n\n请以 JSON 格式返回结果，不要包含其他内容。`
    }
  ];

  const response = await callArkAPI(apiConfig, messages, {
    temperature: 0.3,
    max_tokens: 8192
  });

  return parseGeneratedElements(response, chartType);
}

function getChartTypeName(chartType) {
  const types = {
    flowchart: '流程图',
    mindmap: '思维导图',
    relation: '关系图'
  };
  return types[chartType] || '图表';
}

function getSystemPromptForChartType(chartType) {
  const basePrompt = `你是一个专业的图表生成助手。用户会用自然语言描述一个图表，你需要将其转换为结构化的 JSON 数据。

输出要求：
1. 只输出 JSON 格式，不要有任何其他内容
2. 生成的元素应该有合理的布局
3. 使用以下元素类型：rectangle（矩形）、circle（圆形）、arrow（箭头）、line（直线）、text（文本）

每个元素的 JSON 结构：
{
  "id": "唯一ID",
  "type": "rectangle|circle|arrow|line|text",
  "x": 数字（画布坐标）,
  "y": 数字（画布坐标）,
  "text": "文本内容（可选）",
  "endX": 箭头/直线的终点x（可选）,
  "endY": 箭头/直线的终点y（可选）,
  "width": 矩形宽度（可选）,
  "height": 矩形高度（可选）,
  "radiusX": 椭圆x半径（可选）,
  "radiusY": 椭圆y半径（可选）,
  "color": "#333333",
  "strokeWidth": 2
}

重要：坐标表示方式
- 矩形 (rectangle)：x, y 表示左上角坐标
- 圆形 (circle)：x, y 表示中心点坐标 (cx, cy)，radiusX 和 radiusY 是半径
- 文本 (text)：x, y 表示文本基线位置
- 箭头/直线：x, y 是起点，endX, endY 是终点

布局建议：
- 元素之间要有适当的间距（建议 40px 以上）
- 箭头起点应该连接到前一个节点的右侧边缘
- 箭头终点应该连接到后一个节点的左侧边缘
- 圆形节点的箭头连接点：从中心右侧 (x + radiusX) 出发，到中心左侧 (x - radiusX) 结束
- 矩形节点的箭头连接点：从右上角 (x + width, y + height/2) 出发，到左上角 (x, y + height/2) 结束`;

  const typeSpecificPrompts = {
    flowchart: `\n\n流程图布局规则：
- 使用矩形表示流程节点
- 使用箭头表示流程方向
- 节点水平或垂直排列，有清晰的流向
- 条件分支使用菱形或带文字说明的箭头
- 开始和结束节点可以用不同形状或颜色标注

示例：一个登录流程可能包括：开始 -> 输入账号密码 -> 验证 -> (成功)进入主页 / (失败)显示错误`,

    mindmap: `\n\n思维导图布局规则：
- 中心主题在中央，使用圆形或矩形
- 分支从中心向外辐射
- 同级节点水平对齐
- 子节点使用矩形，连接使用直线或箭头
- 层级分明：中心 -> 一级分支 -> 二级分支 -> ...

示例：产品开发中心 -> 需求分析、UI设计、开发、测试、上线`,

    relation: `\n\n关系图布局规则：
- 主要节点使用圆形或矩形
- 关系使用带标签的箭头或直线连接
- 父子关系、层级关系要清晰
- 同级节点水平排列，层级垂直排列

示例：公司组织架构 -> CEO -> CTO、CFO、COO -> 各部门`
  };

  return basePrompt + (typeSpecificPrompts[chartType] || '');
}

function parseGeneratedElements(response, chartType) {
  let jsonContent = response;
  
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1];
  }
  
  const jsonMatch2 = response.match(/\{[\s\S]*\}/);
  if (jsonMatch2 && !jsonMatch) {
    jsonContent = jsonMatch2[0];
  }

  try {
    const parsed = JSON.parse(jsonContent);
    
    if (Array.isArray(parsed)) {
      return normalizeElements(parsed);
    }
    
    if (parsed.elements && Array.isArray(parsed.elements)) {
      return normalizeElements(parsed.elements);
    }
    
    if (parsed.nodes && parsed.connections) {
      return convertNodesAndConnections(parsed.nodes, parsed.connections);
    }
    
    return [];
  } catch (error) {
    console.error('解析 JSON 失败:', error, '原始内容:', jsonContent);
    throw new Error('无法解析生成的图表数据');
  }
}

function normalizeElements(elements) {
  return elements.map(el => ({
    id: el.id || uuidv4(),
    type: el.type || 'rectangle',
    x: el.x || 0,
    y: el.y || 0,
    text: el.text || el.label || el.content || '',
    endX: el.endX,
    endY: el.endY,
    width: el.width || 180,
    height: el.height || 60,
    radiusX: el.radiusX || 40,
    radiusY: el.radiusY || 40,
    color: el.color || '#1e1e1e',
    strokeWidth: el.strokeWidth || 2,
    fill: el.fill || 'transparent',
    timestamp: Date.now()
  }));
}

function convertNodesAndConnections(nodes, connections) {
  const elements = [];
  const nodeMap = new Map();
  
  const startX = 100;
  const startY = 100;
  const nodeWidth = 160;
  const nodeHeight = 50;
  const gapX = 40;
  const gapY = 30;
  const circleRadius = 40;
  
  nodes.forEach((node, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    
    const isCircle = node.type === 'circle' || node.shape === 'circle';
    
    let x, y;
    
    if (isCircle) {
      x = startX + col * (nodeWidth + gapX) + nodeWidth / 2;
      y = startY + row * (nodeHeight + gapY) + nodeHeight / 2;
    } else {
      x = startX + col * (nodeWidth + gapX);
      y = startY + row * (nodeHeight + gapY);
    }
    
    const element = {
      id: node.id || uuidv4(),
      type: isCircle ? 'circle' : 'rectangle',
      x,
      y,
      text: node.text || node.label || node.content || '',
      width: nodeWidth,
      height: nodeHeight,
      radiusX: circleRadius,
      radiusY: circleRadius,
      color: '#1e1e1e',
      strokeWidth: 2,
      fill: 'transparent',
      timestamp: Date.now()
    };
    
    nodeMap.set(node.id || index, element);
    elements.push(element);
  });
  
  connections.forEach(conn => {
    const fromNode = nodeMap.get(conn.from);
    const toNode = nodeMap.get(conn.to);
    
    if (fromNode && toNode) {
      let startX, startY, endX, endY;
      
      if (fromNode.type === 'circle') {
        startX = fromNode.x + fromNode.radiusX;
        startY = fromNode.y;
      } else {
        startX = fromNode.x + fromNode.width;
        startY = fromNode.y + fromNode.height / 2;
      }
      
      if (toNode.type === 'circle') {
        endX = toNode.x - toNode.radiusX;
        endY = toNode.y;
      } else {
        endX = toNode.x;
        endY = toNode.y + toNode.height / 2;
      }
      
      const arrow = {
        id: uuidv4(),
        type: 'arrow',
        x: startX,
        y: startY,
        endX: endX,
        endY: endY,
        color: '#666666',
        strokeWidth: 2,
        timestamp: Date.now()
      };
      elements.push(arrow);
    }
  });
  
  return elements;
}

export async function autoOrganizeElements(elements, apiConfig) {
  const elementsInfo = elements.map(el => ({
    id: el.id,
    type: el.type,
    x: el.x,
    y: el.y,
    text: el.text || '',
    width: el.width || 100,
    height: el.height || 50,
    endX: el.endX,
    endY: el.endY
  }));

  const messages = [
    {
      role: 'system',
      content: `你是一个专业的图表布局助手。用户会提供画布上的元素列表，你需要分析元素之间的关系，给出优化后的布局位置。

分析要素：
1. 识别节点元素（矩形、圆形、文本框）和连接元素（箭头、直线）
2. 分析连接关系：哪些节点通过箭头/直线连接
3. 分析语义关系：根据文本内容判断节点的层级关系、类别关系

布局规则：
- 相关的节点应该靠近
- 有连接关系的节点应该对齐
- 层级关系的节点应该垂直或水平排列
- 元素之间应有适当的间距
- 整体布局应该整洁、对称

输出格式：
返回一个 JSON 数组，每个元素包含：
- id: 原始元素的 id
- x: 新的 x 坐标
- y: 新的 y 坐标
- (如果是箭头/直线) endX, endY: 新的终点坐标

只返回 JSON，不要有其他内容。`
    },
    {
      role: 'user',
      content: `请分析以下画布元素并给出优化后的布局：

${JSON.stringify(elementsInfo, null, 2)}

请返回每个元素的新位置坐标。保持元素的 id 不变。`
    }
  ];

  const response = await callArkAPI(apiConfig, messages, {
    temperature: 0.3,
    max_tokens: 8192
  });

  return parseOrganizedElements(response, elements);
}

function parseOrganizedElements(response, originalElements) {
  let jsonContent = response;
  
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1];
  }
  
  const jsonMatch2 = response.match(/\[[\s\S]*\]/);
  if (jsonMatch2 && !jsonMatch) {
    jsonContent = jsonMatch2[0];
  }

  try {
    const organized = JSON.parse(jsonContent);
    
    if (!Array.isArray(organized)) {
      throw new Error('返回数据格式错误');
    }

    const positionMap = new Map();
    organized.forEach(item => {
      if (item.id) {
        positionMap.set(item.id, {
          x: item.x,
          y: item.y,
          endX: item.endX,
          endY: item.endY
        });
      }
    });

    return originalElements.map(el => {
      const newPos = positionMap.get(el.id);
      if (newPos) {
        return {
          ...el,
          x: newPos.x ?? el.x,
          y: newPos.y ?? el.y,
          endX: newPos.endX ?? el.endX,
          endY: newPos.endY ?? el.endY
        };
      }
      return el;
    });
  } catch (error) {
    console.error('解析整理结果失败:', error);
    return simpleOrganize(originalElements);
  }
}

function simpleOrganize(elements) {
  const nodes = elements.filter(el => 
    el.type === 'rectangle' || el.type === 'circle' || el.type === 'text'
  );
  const connections = elements.filter(el => 
    el.type === 'arrow' || el.type === 'line'
  );

  const result = [...elements];
  
  const nodeWidth = 160;
  const nodeHeight = 50;
  const gapX = 40;
  const gapY = 30;
  const startX = 100;
  const startY = 100;

  nodes.forEach((node, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    
    let x, y;
    
    if (node.type === 'circle') {
      x = startX + col * (nodeWidth + gapX) + nodeWidth / 2;
      y = startY + row * (nodeHeight + gapY) + nodeHeight / 2;
    } else {
      x = startX + col * (nodeWidth + gapX);
      y = startY + row * (nodeHeight + gapY);
    }
    
    const elIndex = result.findIndex(el => el.id === node.id);
    if (elIndex !== -1) {
      result[elIndex] = { ...result[elIndex], x, y };
    }
  });

  const nodeMap = new Map();
  result.forEach(el => {
    if (el.type === 'rectangle' || el.type === 'circle' || el.type === 'text') {
      nodeMap.set(el.id, el);
    }
  });

  result.forEach((el, index) => {
    if (el.type === 'arrow' || el.type === 'line') {
      let fromNode = null;
      let toNode = null;
      
      for (const [id, node] of nodeMap) {
        const distFromStart = Math.sqrt(
          Math.pow(el.x - (node.type === 'circle' ? node.x : node.x + node.width / 2), 2) +
          Math.pow(el.y - (node.type === 'circle' ? node.y : node.y + node.height / 2), 2)
        );
        const distFromEnd = Math.sqrt(
          Math.pow(el.endX - (node.type === 'circle' ? node.x : node.x + node.width / 2), 2) +
          Math.pow(el.endY - (node.type === 'circle' ? node.y : node.y + node.height / 2), 2)
        );
        
        if (distFromStart < 100 && !fromNode) {
          fromNode = node;
        }
        if (distFromEnd < 100 && !toNode) {
          toNode = node;
        }
      }
      
      if (fromNode && toNode) {
        let newX, newY, newEndX, newEndY;
        
        if (fromNode.type === 'circle') {
          newX = fromNode.x + fromNode.radiusX;
          newY = fromNode.y;
        } else {
          newX = fromNode.x + fromNode.width;
          newY = fromNode.y + fromNode.height / 2;
        }
        
        if (toNode.type === 'circle') {
          newEndX = toNode.x - toNode.radiusX;
          newEndY = toNode.y;
        } else {
          newEndX = toNode.x;
          newEndY = toNode.y + toNode.height / 2;
        }
        
        result[index] = {
          ...el,
          x: newX,
          y: newY,
          endX: newEndX,
          endY: newEndY
        };
      }
    }
  });

  return result;
}

export { callArkAPI };
