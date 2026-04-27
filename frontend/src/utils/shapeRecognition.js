import { v4 as uuidv4 } from 'uuid';
import { callArkAPI } from './aiService';

export async function recognizeShape(element, apiConfig) {
  if (!element.points || element.points.length < 3) {
    return null;
  }

  const simpleShape = recognizeByGeometry(element);
  if (simpleShape) {
    return simpleShape;
  }

  if (apiConfig && apiConfig.apiKey) {
    try {
      const aiShape = await recognizeByAI(element, apiConfig);
      if (aiShape) {
        return aiShape;
      }
    } catch (error) {
      console.log('AI 形状识别失败，使用几何识别:', error);
    }
  }

  return null;
}

function recognizeByGeometry(element) {
  const points = element.points;
  if (points.length < 5) return null;

  const xCoords = points.map(p => p[0]);
  const yCoords = points.map(p => p[1]);
  
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  
  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const closingDistance = Math.sqrt(
    Math.pow(firstPoint[0] - lastPoint[0], 2) +
    Math.pow(firstPoint[1] - lastPoint[1], 2)
  );
  const isClosed = closingDistance < Math.max(width, height) * 0.3;

  if (!isClosed && points.length > 5) {
    const straightness = checkStraightness(points);
    if (straightness > 0.85) {
      return {
        id: element.id || uuidv4(),
        type: 'line',
        x: firstPoint[0],
        y: firstPoint[1],
        endX: lastPoint[0],
        endY: lastPoint[1],
        color: element.color || '#1e1e1e',
        strokeWidth: element.strokeWidth || 2,
        timestamp: Date.now()
      };
    }
  }

  if (isClosed) {
    const circularity = checkCircularity(points, centerX, centerY);
    
    if (circularity > 0.82) {
      const radius = Math.max(width, height) / 2;
      return {
        id: element.id || uuidv4(),
        type: 'circle',
        x: centerX - radius,
        y: centerY - radius,
        radiusX: radius,
        radiusY: radius,
        color: element.color || '#1e1e1e',
        strokeWidth: element.strokeWidth || 2,
        fill: 'transparent',
        timestamp: Date.now()
      };
    }

    const isEllipse = checkEllipse(points, centerX, centerY, width / 2, height / 2);
    if (isEllipse > 0.75) {
      return {
        id: element.id || uuidv4(),
        type: 'circle',
        x: centerX - width / 2,
        y: centerY - height / 2,
        radiusX: width / 2,
        radiusY: height / 2,
        color: element.color || '#1e1e1e',
        strokeWidth: element.strokeWidth || 2,
        fill: 'transparent',
        timestamp: Date.now()
      };
    }

    const rectangularity = checkRectangularity(points, minX, maxX, minY, maxY);
    if (rectangularity > 0.7) {
      return {
        id: element.id || uuidv4(),
        type: 'rectangle',
        x: minX,
        y: minY,
        width: width,
        height: height,
        color: element.color || '#1e1e1e',
        strokeWidth: element.strokeWidth || 2,
        fill: 'transparent',
        timestamp: Date.now()
      };
    }
  }

  return null;
}

function checkStraightness(points) {
  if (points.length < 3) return 0;

  const first = points[0];
  const last = points[points.length - 1];
  
  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistance += Math.sqrt(
      Math.pow(points[i][0] - points[i-1][0], 2) +
      Math.pow(points[i][1] - points[i-1][1], 2)
    );
  }

  const directDistance = Math.sqrt(
    Math.pow(last[0] - first[0], 2) +
    Math.pow(last[1] - first[1], 2)
  );

  if (totalDistance === 0) return 0;
  return directDistance / totalDistance;
}

function checkCircularity(points, centerX, centerY) {
  if (points.length < 5) return 0;

  let totalRadius = 0;
  for (const p of points) {
    totalRadius += Math.sqrt(
      Math.pow(p[0] - centerX, 2) +
      Math.pow(p[1] - centerY, 2)
    );
  }
  const avgRadius = totalRadius / points.length;

  if (avgRadius === 0) return 0;

  let variance = 0;
  for (const p of points) {
    const radius = Math.sqrt(
      Math.pow(p[0] - centerX, 2) +
      Math.pow(p[1] - centerY, 2)
    );
    variance += Math.pow(radius - avgRadius, 2);
  }
  variance /= points.length;

  const stdDev = Math.sqrt(variance);
  const normalizedDev = stdDev / avgRadius;

  return Math.max(0, 1 - normalizedDev * 2);
}

function checkEllipse(points, centerX, centerY, a, b) {
  if (points.length < 5 || a === 0 || b === 0) return 0;

  let totalDeviation = 0;
  for (const p of points) {
    const x = p[0] - centerX;
    const y = p[1] - centerY;
    
    const value = (x * x) / (a * a) + (y * y) / (b * b);
    totalDeviation += Math.abs(value - 1);
  }

  const avgDeviation = totalDeviation / points.length;
  return Math.max(0, 1 - avgDeviation);
}

function checkRectangularity(points, minX, maxX, minY, maxY) {
  if (points.length < 5) return 0;

  const corners = findCorners(points);
  
  if (corners.length >= 3 && corners.length <= 6) {
    let rectangularity = 0;
    
    for (let i = 0; i < corners.length; i++) {
      const j = (i + 1) % corners.length;
      const k = (i + 2) % corners.length;
      
      const angle = calculateAngle(
        corners[j],
        corners[i],
        corners[k]
      );
      
      const angleDiff = Math.abs(angle - Math.PI / 2);
      rectangularity += 1 - (angleDiff / (Math.PI / 2));
    }
    
    rectangularity /= corners.length;
    
    const edgeStraightness = checkEdgeStraightness(points, corners);
    rectangularity = (rectangularity + edgeStraightness) / 2;
    
    return rectangularity;
  }

  let boundaryScore = 0;
  const tolerance = Math.max(maxX - minX, maxY - minY) * 0.1;
  
  for (const p of points) {
    const isNearLeft = Math.abs(p[0] - minX) < tolerance;
    const isNearRight = Math.abs(p[0] - maxX) < tolerance;
    const isNearTop = Math.abs(p[1] - minY) < tolerance;
    const isNearBottom = Math.abs(p[1] - maxY) < tolerance;
    
    if (isNearLeft || isNearRight || isNearTop || isNearBottom) {
      boundaryScore += 1;
    }
  }
  
  return boundaryScore / points.length;
}

function findCorners(points) {
  if (points.length < 5) return [];

  const corners = [];
  const windowSize = Math.max(3, Math.floor(points.length / 20));
  
  for (let i = windowSize; i < points.length - windowSize; i++) {
    const prev = points[i - windowSize];
    const curr = points[i];
    const next = points[i + windowSize];
    
    const angle = calculateAngle(curr, prev, next);
    
    if (angle < Math.PI * 0.7) {
      if (corners.length === 0 || 
          distance(points[corners[corners.length - 1]], curr) > windowSize * 2) {
        corners.push(i);
      }
    }
  }

  return corners.map(idx => points[idx]);
}

function calculateAngle(vertex, p1, p2) {
  const v1 = [p1[0] - vertex[0], p1[1] - vertex[1]];
  const v2 = [p2[0] - vertex[0], p2[1] - vertex[1]];
  
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
  const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
  
  if (mag1 === 0 || mag2 === 0) return Math.PI;
  
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle);
}

function distance(p1, p2) {
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

function checkEdgeStraightness(points, corners) {
  if (corners.length < 2) return 0.5;

  let totalStraightness = 0;
  let edgeCount = 0;

  for (let i = 0; i < corners.length; i++) {
    const j = (i + 1) % corners.length;
    
    const startIdx = points.findIndex(p => p[0] === corners[i][0] && p[1] === corners[i][1]);
    const endIdx = points.findIndex(p => p[0] === corners[j][0] && p[1] === corners[j][1]);
    
    if (startIdx !== -1 && endIdx !== -1) {
      const edgePoints = [];
      if (endIdx > startIdx) {
        for (let k = startIdx; k <= endIdx; k++) {
          edgePoints.push(points[k]);
        }
      }
      
      if (edgePoints.length > 2) {
        totalStraightness += checkStraightness(edgePoints);
        edgeCount++;
      }
    }
  }

  return edgeCount > 0 ? totalStraightness / edgeCount : 0.5;
}

async function recognizeByAI(element, apiConfig) {
  const points = element.points;
  
  const simplifiedPoints = simplifyPoints(points, 30);
  
  const shapeDescription = describeShape(simplifiedPoints);

  const messages = [
    {
      role: 'system',
      content: `你是一个形状识别专家。用户会提供手绘轨迹的描述，你需要判断这是什么几何图形。

可能的图形类型：
- rectangle (矩形)：四个角大致为90度，四条边
- circle (圆形/椭圆形)：封闭的曲线，大致圆形或椭圆形
- line (直线)：开放的，大致笔直的线条
- arrow (箭头)：带有箭头指向的线条（一端有三角形状）
- keep (保持原样)：无法识别为标准图形，保持手绘笔迹

请以 JSON 格式返回结果，只包含一个对象：
{
  "type": "rectangle|circle|line|arrow|keep",
  "confidence": 0-1之间的数字
}

只返回 JSON，不要有其他内容。`
    },
    {
      role: 'user',
      content: `请分析以下手绘轨迹：

${shapeDescription}

这是什么图形？`
    }
  ];

  try {
    const response = await callArkAPI(apiConfig, messages, {
      temperature: 0.1,
      max_tokens: 200
    });

    const result = parseAIResponse(response);
    if (result && result.type !== 'keep' && result.confidence > 0.6) {
      return convertToStandardShape(result.type, element);
    }
  } catch (error) {
    console.error('AI 形状识别错误:', error);
  }

  return null;
}

function simplifyPoints(points, maxCount) {
  if (points.length <= maxCount) return points;
  
  const step = Math.floor(points.length / maxCount);
  const simplified = [];
  
  for (let i = 0; i < points.length; i += step) {
    simplified.push(points[i]);
  }
  
  return simplified;
}

function describeShape(points) {
  if (points.length < 2) return '无效数据';

  const xCoords = points.map(p => p[0]);
  const yCoords = points.map(p => p[1]);
  
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  
  const width = maxX - minX;
  const height = maxY - minY;
  const aspectRatio = width > 0 ? height / width : 1;

  const first = points[0];
  const last = points[points.length - 1];
  const closingDistance = Math.sqrt(
    Math.pow(first[0] - last[0], 2) +
    Math.pow(first[1] - last[1], 2)
  );
  const isClosed = closingDistance < Math.max(width, height) * 0.3;

  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    pathLength += Math.sqrt(
      Math.pow(points[i][0] - points[i-1][0], 2) +
      Math.pow(points[i][1] - points[i-1][1], 2)
    );
  }

  const directDistance = Math.sqrt(
    Math.pow(last[0] - first[0], 2) +
    Math.pow(last[1] - first[1], 2)
  );
  const straightness = pathLength > 0 ? directDistance / pathLength : 0;

  return `轨迹信息：
- 点数：${points.length}
- 边界框：宽 ${width.toFixed(1)}，高 ${height.toFixed(1)}
- 宽高比：${aspectRatio.toFixed(2)}
- 是否封闭：${isClosed ? '是' : '否'}
- 封闭距离：${closingDistance.toFixed(1)}
- 路径长度：${pathLength.toFixed(1)}
- 直线度：${straightness.toFixed(2)}（越接近1越直）
- 起始点：(${first[0].toFixed(1)}, ${first[1].toFixed(1)})
- 结束点：(${last[0].toFixed(1)}, ${last[1].toFixed(1)})`;
}

function parseAIResponse(response) {
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
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error('解析 AI 响应失败:', error);
    return null;
  }
}

function convertToStandardShape(type, element) {
  const points = element.points;
  const xCoords = points.map(p => p[0]);
  const yCoords = points.map(p => p[1]);
  
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  
  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const first = points[0];
  const last = points[points.length - 1];

  switch (type) {
    case 'rectangle':
      return {
        id: element.id || uuidv4(),
        type: 'rectangle',
        x: minX,
        y: minY,
        width: width,
        height: height,
        color: element.color || '#1e1e1e',
        strokeWidth: element.strokeWidth || 2,
        fill: 'transparent',
        timestamp: Date.now()
      };

    case 'circle':
      const radius = Math.max(width, height) / 2;
      return {
        id: element.id || uuidv4(),
        type: 'circle',
        x: centerX - width / 2,
        y: centerY - height / 2,
        radiusX: width / 2,
        radiusY: height / 2,
        color: element.color || '#1e1e1e',
        strokeWidth: element.strokeWidth || 2,
        fill: 'transparent',
        timestamp: Date.now()
      };

    case 'line':
      return {
        id: element.id || uuidv4(),
        type: 'line',
        x: first[0],
        y: first[1],
        endX: last[0],
        endY: last[1],
        color: element.color || '#1e1e1e',
        strokeWidth: element.strokeWidth || 2,
        timestamp: Date.now()
      };

    case 'arrow':
      return {
        id: element.id || uuidv4(),
        type: 'arrow',
        x: first[0],
        y: first[1],
        endX: last[0],
        endY: last[1],
        color: element.color || '#1e1e1e',
        strokeWidth: element.strokeWidth || 2,
        timestamp: Date.now()
      };

    default:
      return null;
  }
}
