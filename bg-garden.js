/**
 * EduAdapt - Global 8-Bit Pixel Side-Scrolling Garden Background Engine
 */
(function () {
    // Inject Canvas Dynamically if not present to ensure instant integration on all pages
    let canvas = document.getElementById('network-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'network-canvas';
        document.body.insertBefore(canvas, document.body.firstChild);
    }

    // Explicitly enforce absolute layout tracking parameters inside the DOM structure
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';

    const ctx = canvas.getContext('2d');
    let creatures = [];
    let cloudVectors = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initializeClouds();
    }
    window.addEventListener('resize', resize);

    function initializeClouds() {
        cloudVectors = [];
        for (let i = 0; i < 4; i++) {
            cloudVectors.push({
                x: Math.random() * canvas.width,
                y: 30 + Math.random() * 60,
                speed: 0.1 + Math.random() * 0.15,
                scale: 1.5 + Math.random() * 1.5
            });
        }
    }

    class WalkingCreature {
        constructor() {
            this.x = Math.random() * window.innerWidth;
            this.vx = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.4);
            this.frame = 0;
            this.color = Math.random() > 0.5 ? '#10b981' : '#f59e0b'; // Dynamic Slime Sprites
        }

        update(groundLevel) {
            this.x += this.vx;
            this.y = groundLevel - 6; // Locks sprite stance to the pixel terrain height line
            if (this.x < -20 || this.x > canvas.width + 20) {
                this.vx *= -1; // Flip walking vector trajectory on border intersection
            }
            this.frame += 0.08;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            let walkBounce = Math.abs(Math.sin(this.frame)) * 4;
            
            ctx.fillStyle = this.color;
            ctx.fillRect(-8, -6 + walkBounce, 16, 12 - walkBounce);
            ctx.fillRect(-10, -2 + walkBounce, 20, 8 - walkBounce);
            
            // Render Eyes
            ctx.fillStyle = '#000000';
            ctx.fillRect(-4, -1 + walkBounce, 2, 2);
            ctx.fillRect(3, -1 + walkBounce, 2, 2);
            ctx.restore();
        }
    }

    for (let i = 0; i < 4; i++) { creatures.push(new WalkingCreature()); }
    resize();

    function engineAnimationTick() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw 8-Bit Sky Vault Color Fill
        ctx.fillStyle = isDark ? '#11111d' : '#87ceeb';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Draw 8-Bit Pixeled Floating Clouds
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)';
        cloudVectors.forEach(cloud => {
            cloud.x += cloud.speed;
            if (cloud.x > canvas.width + 40) cloud.x = -60;
            ctx.fillRect(cloud.x, cloud.y, 30 * cloud.scale, 8 * cloud.scale);
            ctx.fillRect(cloud.x + 6 * cloud.scale, cloud.y - 4 * cloud.scale, 18 * cloud.scale, 4 * cloud.scale);
        });

        // Compute Terrain heights relative to the window viewport size
        const horizonLineY = canvas.height * 0.75;

        // 3. Draw Deep Dirt / Soil Blocks Layers
        ctx.fillStyle = isDark ? '#231810' : '#8b5a2b';
        ctx.fillRect(0, horizonLineY, canvas.width, canvas.height - horizonLineY);

        // 4. Draw Double-layered Grass Terrain Accents
        ctx.fillStyle = isDark ? '#192b0f' : '#477d24';
        ctx.fillRect(0, horizonLineY - 12, canvas.width, 12);
        ctx.fillStyle = isDark ? '#243f16' : '#5c9e31';
        ctx.fillRect(0, horizonLineY - 20, canvas.width, 8);

        // 5. Draw Wandering Game Creatures walking along the grass line
        creatures.forEach(creature => {
            creature.update(horizonLineY - 20);
            creature.draw();
        });

        requestAnimationFrame(engineAnimationTick);
    }
    engineAnimationTick();
})();