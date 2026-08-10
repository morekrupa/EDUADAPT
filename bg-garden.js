(function () {
    let canvas = document.getElementById('network-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'network-canvas';
        document.body.insertBefore(canvas, document.body.firstChild);
    }

    const ctx = canvas.getContext('2d');
    let creatures = [];
    let cloudVectors = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        cloudVectors = Array.from({ length: 4 }, () => ({
            x: Math.random() * canvas.width,
            y: 30 + Math.random() * 60,
            speed: 0.1 + Math.random() * 0.15,
            scale: 1.5 + Math.random() * 1.5
        }));
    }
    window.addEventListener('resize', resize);
    resize();

    class WalkingCreature {
        constructor() {
            this.x = Math.random() * window.innerWidth;
            this.vx = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.4);
            this.frame = 0;
            this.color = Math.random() > 0.5 ? '#10b981' : '#f59e0b';
        }
        update(groundLevel) {
            this.x += this.vx;
            this.y = groundLevel - 6;
            if (this.x < -20 || this.x > canvas.width + 20) this.vx *= -1;
            this.frame += 0.08;
        }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            let bounce = Math.abs(Math.sin(this.frame)) * 4;
            ctx.fillStyle = this.color;
            ctx.fillRect(-8, -6 + bounce, 16, 12 - bounce);
            ctx.fillRect(-10, -2 + bounce, 20, 8 - bounce);
            ctx.fillStyle = '#000000';
            ctx.fillRect(-4, -1 + bounce, 2, 2);
            ctx.fillRect(3, -1 + bounce, 2, 2);
            ctx.restore();
        }
    }

    creatures = Array.from({ length: 4 }, () => new WalkingCreature());

    function render() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = isDark ? '#11111d' : '#87ceeb';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)';
        cloudVectors.forEach(c => {
            c.x += c.speed;
            if (c.x > canvas.width + 40) c.x = -60;
            ctx.fillRect(c.x, c.y, 30 * c.scale, 8 * c.scale);
            ctx.fillRect(c.x + 6 * c.scale, c.y - 4 * c.scale, 18 * c.scale, 4 * c.scale);
        });

        const horizon = canvas.height * 0.75;
        ctx.fillStyle = isDark ? '#231810' : '#8b5a2b';
        ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);

        ctx.fillStyle = isDark ? '#192b0f' : '#477d24';
        ctx.fillRect(0, horizon - 12, canvas.width, 12);
        ctx.fillStyle = isDark ? '#243f16' : '#5c9e31';
        ctx.fillRect(0, horizon - 20, canvas.width, 8);

        creatures.forEach(c => {
            c.update(horizon - 20);
            c.draw();
        });

        requestAnimationFrame(render);
    }
    render();
})();