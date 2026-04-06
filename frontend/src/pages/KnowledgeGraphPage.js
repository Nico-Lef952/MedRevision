import React, { useState, useEffect, useRef } from 'react';
import { knowledgeGraphApi } from '../lib/api';
import { Network, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function KnowledgeGraphPage() {
  const [data, setData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await knowledgeGraphApi.get();
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || data.nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Simple force-directed layout
    const nodes = data.nodes.map((n, i) => ({
      ...n,
      x: width/2 + Math.cos(i * 2 * Math.PI / data.nodes.length) * 200,
      y: height/2 + Math.sin(i * 2 * Math.PI / data.nodes.length) * 200,
      vx: 0,
      vy: 0
    }));

    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    const links = data.links.map(l => ({
      ...l,
      source: nodeMap[l.source],
      target: nodeMap[l.target]
    })).filter(l => l.source && l.target);

    // Animation
    let animationId;
    const simulate = () => {
      // Apply forces
      nodes.forEach(node => {
        node.vx *= 0.9;
        node.vy *= 0.9;

        // Repulsion from other nodes
        nodes.forEach(other => {
          if (node === other) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 500 / (dist * dist);
          node.vx += dx / dist * force;
          node.vy += dy / dist * force;
        });

        // Center gravity
        node.vx += (width/2 - node.x) * 0.01;
        node.vy += (height/2 - node.y) * 0.01;
      });

      // Apply link forces
      links.forEach(link => {
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 100) * 0.05;
        
        link.source.vx += dx / dist * force;
        link.source.vy += dy / dist * force;
        link.target.vx -= dx / dist * force;
        link.target.vy -= dy / dist * force;
      });

      // Update positions
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(50, Math.min(width - 50, node.x));
        node.y = Math.max(50, Math.min(height - 50, node.y));
      });

      // Draw
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(offset.x, offset.y);
      ctx.scale(zoom, zoom);

      // Draw links
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      links.forEach(link => {
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = node.color || '#3B82F6';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#0F172A';
        ctx.font = '11px IBM Plex Sans';
        ctx.textAlign = 'center';
        const label = node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label;
        ctx.fillText(label, node.x, node.y + 35);
      });

      ctx.restore();
      animationId = requestAnimationFrame(simulate);
    };

    simulate();

    return () => cancelAnimationFrame(animationId);
  }, [data, zoom, offset]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-[#E2E8F0] rounded" />
        <div className="h-[500px] bg-[#E2E8F0] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="knowledge-graph-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Carte des savoirs
          </h1>
          <p className="text-[#64748B] mt-1">
            Visualisez les liens entre vos cours
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="p-2 border border-[#E2E8F0] rounded-lg hover:bg-[#F1F5F9]"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            className="p-2 border border-[#E2E8F0] rounded-lg hover:bg-[#F1F5F9]"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
            className="p-2 border border-[#E2E8F0] rounded-lg hover:bg-[#F1F5F9]"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Graph */}
      {data.nodes.length > 0 ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <canvas
            ref={canvasRef}
            width={900}
            height={500}
            className="w-full"
            style={{ cursor: 'grab' }}
          />
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-[#E2E8F0]">
          <Network className="w-16 h-16 mx-auto text-[#E2E8F0] mb-4" />
          <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Pas encore de données</h3>
          <p className="text-[#64748B]">
            Ajoutez des cours pour voir les liens entre eux
          </p>
        </div>
      )}

      {/* Legend */}
      {data.nodes.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
          <h3 className="font-semibold text-[#0F172A] mb-3">Légende</h3>
          <div className="flex flex-wrap gap-4">
            {[...new Set(data.nodes.map(n => n.subject))].map((subject, i) => {
              const node = data.nodes.find(n => n.subject === subject);
              return (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: node?.color || '#3B82F6' }}
                  />
                  <span className="text-sm text-[#64748B]">{subject}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
