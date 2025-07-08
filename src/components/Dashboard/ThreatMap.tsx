import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

interface ThreatNode {
  id: string;
  name: string;
  type: 'server' | 'network' | 'endpoint' | 'cloud';
  severity: 'low' | 'medium' | 'high' | 'critical';
  x: number;
  y: number;
  connections: string[];
  lastSeen: Date;
  threatCount: number;
}

interface ThreatMapProps {
  data: ThreatNode[];
  width?: number;
  height?: number;
  onNodeClick?: (node: ThreatNode) => void;
}

// Moved outside the component for stability
const severityColors = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#7C2D12'
};

const nodeTypes = {
  server: { symbol: '🔲', size: 20 },
  network: { symbol: '🌐', size: 25 },
  endpoint: { symbol: '💻', size: 15 },
  cloud: { symbol: '☁️', size: 30 }
};

const ThreatMap: React.FC<ThreatMapProps> = ({
  data,
  width = 800,
  height = 600,
  onNodeClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<ThreatNode | null>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const g = svg.append('g');

    // Create force simulation
    const simulation = d3.forceSimulation(data)
      .force('link', d3.forceLink().id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create links
    const links = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.flatMap(node => 
        node.connections.map(targetId => ({ source: node.id, target: targetId }))
      ))
      .enter()
      .append('line')
      .attr('stroke', '#6B7280')
      .attr('stroke-width', 1)
      .attr('opacity', 0.6);

    // Create nodes
    const nodes = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag<any, ThreatNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add node circles
    nodes.append('circle')
      .attr('r', (d) => nodeTypes[d.type].size)
      .attr('fill', (d) => severityColors[d.severity])
      .attr('stroke', '#374151')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
      .on('click', (event, d) => {
        setSelectedNode(d);
        onNodeClick?.(d);
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', 3);
        
        // Show tooltip
        showTooltip(event, d);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('opacity', 0.8)
          .attr('stroke-width', 2);
        
        hideTooltip();
      });

    // Add node labels
    nodes.append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 35)
      .attr('font-size', '12px')
      .attr('fill', '#374151')
      .attr('font-weight', 'bold');

    // Add threat count badges
    nodes.append('circle')
      .attr('r', 8)
      .attr('cx', (d) => nodeTypes[d.type].size + 5)
      .attr('cy', (d) => -nodeTypes[d.type].size + 5)
      .attr('fill', '#EF4444')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2);

    nodes.append('text')
      .text((d) => d.threatCount)
      .attr('x', (d) => nodeTypes[d.type].size + 5)
      .attr('y', (d) => -nodeTypes[d.type].size + 5)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('fill', '#FFFFFF')
      .attr('font-weight', 'bold');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodes
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Tooltip functions
    function showTooltip(event: any, d: ThreatNode) {
      const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', 1000);

      tooltip.html(`
        <strong>${d.name}</strong><br/>
        Type: ${d.type}<br/>
        Severity: ${d.severity}<br/>
        Threats: ${d.threatCount}<br/>
        Last Seen: ${d.lastSeen.toLocaleString()}
      `);

      tooltip
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    }

    function hideTooltip() {
      d3.selectAll('.tooltip').remove();
    }

    // Cleanup
    return () => {
      simulation.stop();
      hideTooltip();
    };
  }, [data, width, height, onNodeClick]); // Removed nodeTypes and severityColors

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Network Threat Map</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-800"></div>
            <span>Critical</span>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="bg-gray-50"
        />
      </div>

      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <h4 className="font-semibold text-gray-900 mb-2">Selected Node: {selectedNode.name}</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Type:</span> {selectedNode.type}
            </div>
            <div>
              <span className="font-medium text-gray-600">Severity:</span> 
              <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                selectedNode.severity === 'critical' ? 'bg-red-100 text-red-800' :
                selectedNode.severity === 'high' ? 'bg-red-100 text-red-800' :
                selectedNode.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {selectedNode.severity}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Threat Count:</span> {selectedNode.threatCount}
            </div>
            <div>
              <span className="font-medium text-gray-600">Last Seen:</span> {selectedNode.lastSeen.toLocaleString()}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ThreatMap; 