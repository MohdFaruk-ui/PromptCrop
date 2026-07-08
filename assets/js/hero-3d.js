document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
        console.error('Three.js is not loaded.');
        return;
    }

    // SCENE SETUP
    const scene = new THREE.Scene();
    
    // CAMERA SETUP
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 40;

    // RENDERER SETUP
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap pixel ratio for performance
    renderer.setSize(window.innerWidth, window.innerHeight);

    // CREATE TEXTURE ATLAS FOR ASCII CHARACTERS
    function createAsciiAtlas() {
        const atlasSize = 512;
        const gridCount = 16;
        const cellSize = atlasSize / gridCount;
        
        const ctxCanvas = document.createElement('canvas');
        ctxCanvas.width = atlasSize;
        ctxCanvas.height = atlasSize;
        const ctx = ctxCanvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, atlasSize, atlasSize);
        
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${cellSize * 0.7}px monospace`;
        
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>/{}[]";
        
        for (let y = 0; y < gridCount; y++) {
            for (let x = 0; x < gridCount; x++) {
                const char = chars.charAt(Math.floor(Math.random() * chars.length));
                ctx.fillText(char, x * cellSize + cellSize/2, y * cellSize + cellSize/2);
            }
        }
        
        const texture = new THREE.CanvasTexture(ctxCanvas);
        texture.minFilter = THREE.LinearFilter;
        return { texture, gridCount };
    }

    const atlas = createAsciiAtlas();

    // PARTICLES (THE GRID)
    const particleCount = window.innerWidth < 768 ? 1000 : 2500;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const randoms = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
        // Distribute points in a wide box
        positions[i * 3] = (Math.random() - 0.5) * 160;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40 - 5;
        
        randoms[i] = Math.random();
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    // CUSTOM SHADER MATERIAL
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTexture: { value: atlas.texture },
            uTime: { value: 0 },
            uMouse: { value: new THREE.Vector3(-999, -999, 0) },
            uGridCount: { value: atlas.gridCount },
            uColorDim: { value: new THREE.Color('#2d3748') },
            uColorGlow: { value: new THREE.Color('#00e5ff') } // Cyan highlight
        },
        vertexShader: `
            attribute float aRandom;
            varying float vRandom;
            varying vec3 vWorldPosition;
            
            void main() {
                vRandom = aRandom;
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                
                vec4 mvPosition = viewMatrix * worldPosition;
                // Size attenuation
                gl_PointSize = 300.0 * (1.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D uTexture;
            uniform float uGridCount;
            uniform vec3 uMouse;
            uniform vec3 uColorDim;
            uniform vec3 uColorGlow;
            
            varying float vRandom;
            varying vec3 vWorldPosition;
            
            void main() {
                // Select random cell from atlas
                float cellIndex = floor(vRandom * uGridCount * uGridCount);
                float col = mod(cellIndex, uGridCount);
                float row = floor(cellIndex / uGridCount);
                
                vec2 uv = gl_PointCoord;
                uv.x = (col + uv.x) / uGridCount;
                uv.y = 1.0 - ((row + 1.0 - uv.y) / uGridCount);
                
                vec4 texColor = texture2D(uTexture, uv);
                if (texColor.a < 0.1) discard;
                
                // Calculate distance to mouse
                float dist = distance(vWorldPosition.xy, uMouse.xy);
                float radius = 12.0;
                
                float glowIntensity = 1.0 - smoothstep(0.0, radius, dist);
                vec3 finalColor = mix(uColorDim, uColorGlow, glowIntensity * 1.5);
                float alpha = mix(0.1, 0.9, glowIntensity);
                
                gl_FragColor = vec4(finalColor, alpha * texColor.a);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // SCANNER BOX
    const boxGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(8, 8));
    const boxMaterial = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.6 });
    const scannerBox = new THREE.LineSegments(boxGeometry, boxMaterial);
    scene.add(scannerBox);

    // MOUSE TRACKING
    const mouse = new THREE.Vector2(-999, -999);
    const targetMouse = new THREE.Vector3(-999, -999, 0);
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    const heroSection = document.querySelector('.hero');

    window.addEventListener('mousemove', (e) => {
        if (!heroSection) return;
        const rect = heroSection.getBoundingClientRect();
        
        // Only track mouse if inside hero section (roughly)
        if (e.clientY > rect.bottom) return;

        // Normalize mouse coordinates (-1 to +1) based on window
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        
        // Raycast to find 3D intersection on Z=0 plane
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(plane, targetMouse);
    });

    // Reset scanner box if mouse leaves window
    window.addEventListener('mouseout', () => {
        targetMouse.set(-999, -999, 0);
    });

    // RESIZE HANDLING
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ANIMATION LOOP
    const clock = new THREE.Clock();
    let isVisible = true;

    // Use IntersectionObserver to pause when hero is off-screen
    if (heroSection) {
        const observer = new IntersectionObserver((entries) => {
            isVisible = entries[0].isIntersecting;
        });
        observer.observe(heroSection);
    }

    function animate() {
        requestAnimationFrame(animate);
        
        if (!isVisible) return;
        
        const elapsedTime = clock.getElapsedTime();
        
        // Gentle global rotation
        particles.rotation.y = Math.sin(elapsedTime * 0.05) * 0.05;
        particles.rotation.x = Math.cos(elapsedTime * 0.05) * 0.02;
        
        // Smoothly move scanner box to target mouse position
        scannerBox.position.lerp(targetMouse, 0.1);
        
        // Update shader uniforms
        material.uniforms.uTime.value = elapsedTime;
        material.uniforms.uMouse.value.copy(scannerBox.position);
        
        // Dynamic box scaling (pulsing effect)
        const scale = 1.0 + Math.sin(elapsedTime * 5.0) * 0.05;
        scannerBox.scale.set(scale, scale, scale);

        renderer.render(scene, camera);
    }
    
    animate();
});
