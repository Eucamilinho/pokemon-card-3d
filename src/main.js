import * as THREE from 'three';
import { PokemonCard } from './card.js';

class CardApp {
  constructor() {
    this.container = document.getElementById('app');
    this.canvas = document.getElementById('webgl-canvas');

    // State
    this.pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.isDragging = false;
    this.previousPointerPos = { x: 0, y: 0 };
    this.dragRotation = { x: 0, y: 0 };
    this.targetDragRotation = { x: 0, y: 0 };

    this.isFlipped = false;
    this.flipProgress = 0;
    this.targetFlip = 0;

    this.autoRotate = false;
    this.clock = new THREE.Clock();

    this.initScene();
    this.initCard();
    this.initLights();
    this.initParticles();
    this.initEventListeners();
    this.initUI();

    this.onResize();
    this.animate();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0d12);

    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 11.5);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  initCard() {
    this.card = new PokemonCard({
      frontTexture: '/assets/mega_gengar_ex.png',
      backTexture: '/assets/card_back.webp'
    });

    this.cardContainer = new THREE.Group();
    this.cardContainer.add(this.card.group);
    this.scene.add(this.cardContainer);
  }

  initLights() {
    // Soft Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    // Key Directional Light
    this.dirLight = new THREE.DirectionalLight(0xffeedd, 2.0);
    this.dirLight.position.set(5, 7, 8);
    this.scene.add(this.dirLight);

    // Fill Cool Light
    const fillLight = new THREE.DirectionalLight(0x6688cc, 1.0);
    fillLight.position.set(-6, -4, 5);
    this.scene.add(fillLight);

    // Dynamic Point Light for intense holographic flare
    this.pointLight = new THREE.PointLight(0xffffff, 2.5, 20);
    this.pointLight.position.set(0, 0, 6);
    this.scene.add(this.pointLight);
  }

  initParticles() {
    // Subtle fiery/golden embers floating in the background for Charmander
    const count = 70;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
      scales[i] = Math.random() * 0.5 + 0.3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff7a33,
      size: 0.12,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  initEventListeners() {
    window.addEventListener('resize', () => this.onResize());

    // Mouse & Touch tracking for tilt and dragging
    window.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', () => this.onPointerUp());
    window.addEventListener('pointercancel', () => this.onPointerUp());

    // Double click to flip
    this.canvas.addEventListener('dblclick', () => this.flipCard());

    // Keyboard shortcut (Spacebar to flip)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.flipCard();
      }
    });
  }

  onPointerDown(e) {
    if (e.target.closest('.ui-container') || e.target.closest('.btn-menu-toggle')) return;
    this.isDragging = true;
    this.previousPointerPos = { x: e.clientX, y: e.clientY };
  }

  onPointerMove(e) {
    // Normalized pointer coordinates (-1 to 1) from screen center
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;

    this.pointer.targetX = nx;
    this.pointer.targetY = ny;

    if (this.isDragging) {
      const deltaX = e.clientX - this.previousPointerPos.x;
      const deltaY = e.clientY - this.previousPointerPos.y;

      this.targetDragRotation.y += deltaX * 0.008;
      this.targetDragRotation.x += deltaY * 0.008;

      // Clamp vertical drag rotation to prevent getting upside down disorientation
      this.targetDragRotation.x = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, this.targetDragRotation.x));

      this.previousPointerPos = { x: e.clientX, y: e.clientY };
    }
  }

  onPointerUp() {
    this.isDragging = false;
  }

  flipCard() {
    this.isFlipped = !this.isFlipped;
    this.targetFlip = this.isFlipped ? Math.PI : 0;
  }

  resetOrientation() {
    this.targetDragRotation.x = 0;
    this.targetDragRotation.y = 0;
    this.targetFlip = 0;
    this.isFlipped = false;
  }

  initUI() {
    // Menu toggle button
    const toggleBtn = document.getElementById('btn-toggle-menu');
    const menu = document.getElementById('ui-menu');
    if (toggleBtn && menu) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCollapsed = menu.classList.toggle('collapsed');
        toggleBtn.classList.toggle('active', !isCollapsed);
      });

      // Close menu when clicking outside
      window.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !toggleBtn.contains(e.target)) {
          menu.classList.add('collapsed');
          toggleBtn.classList.remove('active');
        }
      });
    }

    // Flip button
    const flipBtn = document.getElementById('btn-flip');
    if (flipBtn) {
      flipBtn.addEventListener('click', () => this.flipCard());
    }

    // Reset button
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetOrientation());
    }

    // Auto-rotate toggle
    const autoBtn = document.getElementById('btn-auto');
    if (autoBtn) {
      autoBtn.addEventListener('click', () => {
        this.autoRotate = !this.autoRotate;
        autoBtn.classList.toggle('active', this.autoRotate);
      });
    }

    // Charmander card selector
    const cardSelect = document.getElementById('select-card');
    if (cardSelect) {
      cardSelect.addEventListener('change', (e) => {
        this.card.setCardTexture(e.target.value);
      });
    }

    // Holographic style selector
    const styleSelect = document.getElementById('select-style');
    if (styleSelect) {
      styleSelect.addEventListener('change', (e) => {
        this.card.setHoloStyle(parseInt(e.target.value, 10));
      });
    }

    // Holo Intensity slider
    const intensitySlider = document.getElementById('slider-intensity');
    if (intensitySlider) {
      intensitySlider.addEventListener('input', (e) => {
        this.card.setHoloIntensity(parseFloat(e.target.value));
      });
    }
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    
    // Adjust camera distance for mobile screens so card is always well framed
    if (width < 600) {
      this.camera.position.z = 13.5;
    } else {
      this.camera.position.z = 11.2;
    }
    
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Smooth Lerp for pointer coordinates
    this.pointer.x += (this.pointer.targetX - this.pointer.x) * 0.08;
    this.pointer.y += (this.pointer.targetY - this.pointer.y) * 0.08;

    // Smooth Lerp for Drag Rotation
    this.dragRotation.x += (this.targetDragRotation.x - this.dragRotation.x) * 0.1;
    this.dragRotation.y += (this.targetDragRotation.y - this.dragRotation.y) * 0.1;

    // Smooth Lerp for Flip Rotation
    this.flipProgress += (this.targetFlip - this.flipProgress) * 0.08;

    // Subtle breathing / idle floating oscillation
    const breathe = Math.sin(elapsedTime * 1.5) * 0.08;
    const idleRotY = this.autoRotate ? elapsedTime * 0.6 : 0;

    // Interactive Tilt calculations
    // When dragging, tilt contributes subtly; when not dragging, pointer tilt is prominent
    const tiltMultiplier = this.isDragging ? 0.15 : 0.45;
    const tiltX = -this.pointer.y * tiltMultiplier;
    const tiltY = this.pointer.x * tiltMultiplier;

    // Apply combined rotation to card container
    this.cardContainer.rotation.x = this.dragRotation.x + tiltX;
    this.cardContainer.rotation.y = this.dragRotation.y + this.flipProgress + tiltY + idleRotY;
    this.cardContainer.position.y = breathe;

    // Update dynamic point light position following pointer
    this.pointLight.position.x = this.pointer.x * 6;
    this.pointLight.position.y = this.pointer.y * 6;

    // Update particles animation
    if (this.particles) {
      this.particles.rotation.y = elapsedTime * 0.03;
    }

    // Update card shader uniforms
    this.card.update(elapsedTime, this.pointer);

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize reliably
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CardApp();
  });
} else {
  new CardApp();
}
