import * as THREE from 'three';

export default class Sky {
    constructor(params = {}) {
        this.params = {
            radius: params.radius || 1000,
            color: params.color || 0x87CEEB,
            sunDirection: params.sunDirection || new THREE.Vector3(20, 30, 10),
            sunIntensity: params.sunIntensity || 0.8,
            ambientIntensity: params.ambientIntensity || 0.5,
      ...params
    };
    
    this.group = new THREE.Group();
    this.sky = null;
    this.sunLight = null;
    this.ambientLight = null;
  }
  
  init() {
    if (this.sky) return this.group;
    
    // Create sky dome
    const skyGeometry = new THREE.SphereGeometry(this.params.radius, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: this.params.color,
      side: THREE.BackSide
    });
    
    this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.group.add(this.sky);
    
    // Create sun directional light
    this.sunLight = new THREE.DirectionalLight(0xffffff, this.params.sunIntensity);
    this.sunLight.position.copy(this.params.sunDirection);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.group.add(this.sunLight);
    
    // Add ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, this.params.ambientIntensity);
    this.group.add(this.ambientLight);
    
    return this.group;
  }
  
  setDayTime(time) {
    // time is a value between 0 (dawn) and 1 (dusk)
    // Adjust sun position and sky color based on time of day
    const angle = Math.PI * time;
    const height = Math.sin(angle) * 30;
    
    // Update sun position
    this.sunLight.position.set(
      Math.cos(angle) * 30,
      height + 5, // Keep sun slightly above horizon
      Math.sin(angle + Math.PI/4) * 30 // Add offset for angled sunlight
    );
    
    // Update sky color based on time
    let skyColor;
    if (time < 0.2) { // Dawn
      skyColor = new THREE.Color(0xFFA07A); // Light salmon
    } else if (time < 0.4) { // Morning
      skyColor = new THREE.Color(0x87CEEB); // Sky blue
    } else if (time < 0.7) { // Afternoon
      skyColor = new THREE.Color(0x1E90FF); // Dodger blue
    } else if (time < 0.9) { // Dusk
      skyColor = new THREE.Color(0xFFA500); // Orange
    } else { // Night
      skyColor = new THREE.Color(0x191970); // Midnight blue
    }
    
    this.sky.material.color = skyColor;
    this.sky.material.needsUpdate = true;
    
    // Update light intensity
    const sunIntensity = Math.sin(angle) * 0.8 + 0.2;
    this.sunLight.intensity = Math.max(0.1, sunIntensity);
    
    // Night time has more ambient light to keep scene visible
    this.ambientLight.intensity = time > 0.9 || time < 0.1 ? 0.3 : 0.1;
  }
}