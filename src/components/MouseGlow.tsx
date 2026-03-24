'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;

    constructor(w: number, h: number) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.8; // Slow floating velocity
        this.vy = (Math.random() - 0.5) * 0.8;
        this.size = Math.random() * 2 + 1;
    }

    update(w: number, h: number) {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.4)'; // Theme green
        ctx.fill();
    }
}

export default function MouseGlow() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pathname = usePathname();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let particles: Particle[] = [];
        const mouse = { x: -1000, y: -1000 };

        const initParticles = (w: number, h: number) => {
            particles = [];
            // Density: one particle per ~9000 square pixels
            const particleCount = Math.floor((w * h) / 9000);
            // Clamp count to keep performance reasonable on huge screens, ensure minimum on small
            const count = Math.min(Math.max(particleCount, 30), 150);

            for (let i = 0; i < count; i++) {
                particles.push(new Particle(w, h));
            }
        };

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                width = parent.offsetWidth;
                height = parent.offsetHeight;
                canvas.width = width;
                canvas.height = height;
                initParticles(width, height);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            // Page coordinates assume canvas is at (0,0) absolute on page (Hero section).
            mouse.x = e.pageX;
            mouse.y = e.pageY;
        };

        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);

        let animationFrameId: number;

        const render = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);

            // Update & Draw Particles
            particles.forEach(p => {
                p.update(width, height);
                p.draw(ctx);
            });

            // Draw Connections
            // 1. Particle-to-Particle
            const connectDist = 120;
            const mouseConnectDist = 180;

            for (let i = 0; i < particles.length; i++) {
                const p1 = particles[i];

                // Connect to Mouse
                const mdx = mouse.x - p1.x;
                const mdy = mouse.y - p1.y;
                const mDist = Math.hypot(mdx, mdy);

                if (mDist < mouseConnectDist) {
                    const opacity = 1 - mDist / mouseConnectDist;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(16, 185, 129, ${opacity})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Simple interaction: faint attraction
                    if (mDist > 50) {
                        p1.x += mdx * 0.02;
                        p1.y += mdy * 0.02;
                    }
                }

                // Connect to other particles
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist < connectDist) {
                        const opacity = 1 - dist / connectDist;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `rgba(16, 185, 129, ${opacity * 0.3})`; // Fainter lines
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };
        render();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    if (pathname !== '/') return null;

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1
            }}
        />
    );
}
