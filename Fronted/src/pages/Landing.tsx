import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { APP_VERSION } from '@/constants/app';
import { NexusLogo } from '@/components/ui/NexusLogo';
import { Button } from '@/components/ui/Button';

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return;

    let animId: number;
    const startTime = Date.now();
    let mouse = [0.5, 0.5];

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = [
        (e.clientX - rect.left) / rect.width,
        1.0 - (e.clientY - rect.top) / rect.height,
      ];
    };
    window.addEventListener('mousemove', handleMouseMove);

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

void main() {
    vec2 uv = v_texCoord;
    vec2 m = u_mouse;
    float t = u_time * 0.1;

    float g1 = distance(uv, vec2(0.5 + 0.3 * sin(t), 0.5 + 0.3 * cos(t * 0.8)));
    float g2 = distance(uv, vec2(0.2 + 0.2 * cos(t * 1.2), 0.8 + 0.1 * sin(t * 0.5)));
    float g3 = distance(uv, vec2(0.8 - 0.1 * sin(t * 0.9), 0.2 + 0.2 * cos(t * 1.1)));

    vec3 baseColor = vec3(0.04, 0.04, 0.045);
    vec3 accentColor = vec3(0.2, 0.25, 0.35);

    float glow = smoothstep(0.8, 0.0, g1) * 0.2;
    glow += smoothstep(0.6, 0.0, g2) * 0.15;
    glow += smoothstep(0.7, 0.0, g3) * 0.18;

    float mouseGlow = smoothstep(0.4, 0.0, distance(uv, m)) * 0.15;
    vec3 finalColor = mix(baseColor, accentColor, glow + mouseGlow);

    gl_FragColor = vec4(finalColor, 1.0);
}`;

    const createShader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'u_time');
    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');

    const render = () => {
      if (!canvas || !gl) return;
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth || window.innerWidth;
        canvas.height = canvas.clientHeight || window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.uniform1f(uTime, (Date.now() - startTime) * 0.001);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouse[0], mouse[1]);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col relative overflow-hidden">
      {/* WebGL Canvas Background */}
      <div className="fixed inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NexusLogo size={36} />
          <span className="text-section-title font-section-title tracking-tight text-on-surface">NEXUS</span>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-body-sm font-body-sm text-on-surface-variant hover:text-on-surface transition-colors">
            Sign In
          </Link>
          <Link to="/dashboard">
            <Button variant="primary" size="sm">
              Launch Console
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 max-w-5xl mx-auto py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-high border border-outline-variant/20 mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-success-green animate-pulse" />
          <span className="text-label-caps font-label-caps text-on-surface-variant">
            NEXUS Operational Intelligence Platform v{APP_VERSION}
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-on-surface mb-6 max-w-4xl leading-[1.1]">
          Orchestrate enterprise operations with autonomous precision.
        </h1>

        <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mb-12 font-normal leading-relaxed">
          Unify real-time inventory, intelligent human-in-the-loop approvals, and AI-driven decision pipelines into a single glassmorphism control plane.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
          <Link to="/dashboard">
            <Button variant="primary" size="lg" className="px-8 py-4 text-base">
              Explore Live System
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg" className="px-8 py-4 text-base">
              Enterprise Access
            </Button>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          {[
            {
              icon: 'memory',
              title: 'Autonomous Decision Core',
              desc: 'Database-backed rule evaluation, automatic standard order routing, and deterministic stock reorder guidance.',
            },
            {
              icon: 'verified',
              title: 'Human-in-the-Loop',
              desc: 'Critical request escalation with contextual stock breakdown and AI-guided recommendation analysis.',
            },
            {
              icon: 'history_edu',
              title: 'Immutable Audit Trail',
              desc: 'End-to-end traceability across every decision, policy modification, and operational fulfillment.',
            },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-2xl bg-surface-container-low/70 border border-outline-variant/10 backdrop-blur-xl">
              <span className="material-symbols-outlined text-[28px] text-primary mb-4 block">
                {f.icon}
              </span>
              <h3 className="text-card-title font-card-title text-on-surface mb-2">{f.title}</h3>
              <p className="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-outline-variant/10 py-8 text-center text-metadata font-metadata text-on-surface-variant">
        <p>© 2026 NEXUS Corp · Operational Intelligence Platform · Backend readiness shown after login</p>
      </footer>
    </div>
  );
}
