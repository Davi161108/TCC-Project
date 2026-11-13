const BASE_URL = '../backend/public/api';

let currentUser = null;
let map = null;
let tileLayer = null;
let markersLayer = null;
let draftMarker = null;
let selectedCoords = null;
let selectedCategoryId = 1;
let allOccurrences = [];
let markerById = {};
let chartCatInstance = null;
let chartStatusInstance = null;

// Variáveis da Cena Espacial 3D Realista (Three.js)
let scene, camera, renderer, earthGroup, earthMesh, cloudsMesh, starsFar, starsNear, depthRingsGroup;
let raycaster, mouseNDC;
let globeAutoRotate = true;
let isDraggingGlobe = false;
let previousMousePosition = { x: 0, y: 0 };
let globeVelocity = { x: 0, y: 0 };
let targetParallax = { x: 0, y: 0 };
let currentRegisterView = false;

const MAP_SOURCES = {
    light: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri, Maxar, Earthstar Geographics'
    }
};

const STATUS_LABELS = {
    pending: 'Pendente',
    in_analysis: 'Em Análise',
    resolved: 'Resolvida',
    rejected: 'Rejeitada'
};

window.addEventListener('DOMContentLoaded', () => {
    inicializarGloboRealista3D();
    renderizarContasSalvasNoLogin();

    const savedUser = localStorage.getItem('urbs_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        entrarDiretoNoApp();
    } else {
        animarAproximacaoInicialDaTerra();
    }
});

// ================= NOTIFICAÇÕES =================
function notify(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'ri-check-line' : 'ri-information-line';
    toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 260);
    }, 3400);
}

// ================= TEXTURA DE ESTRELA CIRCULAR SUAVE =================
function criarTexturaEstrelaCircular() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(224, 242, 254, 0.85)');
    grad.addColorStop(0.6, 'rgba(147, 197, 253, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
}

// ================= TERRA 3D REALISTA + ANÉIS DE PROFUNDIDADE E INTERAÇÃO =================
function inicializarGloboRealista3D() {
    const canvas = document.getElementById('globeCanvas');
    if (!canvas || typeof THREE === 'undefined') return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 14.5);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    raycaster = new THREE.Raycaster();
    mouseNDC = new THREE.Vector2();

    // Iluminação natural de órbita (sem aspecto plastificado)
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
    sunLight.position.set(7, 3.5, 6);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    fillLight.position.set(-7, -4, -4);
    scene.add(fillLight);

    earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const loader = new THREE.TextureLoader();

    // 1. Esfera da Terra com Material Físico (PBR Matte/Natural)
    const earthGeo = new THREE.SphereGeometry(1.56, 96, 96);
    const earthMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.86,
        metalness: 0.04
    });

    loader.load('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg', (tex) => {
        tex.anisotropy = maxAniso;
        earthMat.map = tex;
        earthMat.needsUpdate = true;
    });

    loader.load('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png', (bump) => {
        bump.anisotropy = maxAniso;
        earthMat.bumpMap = bump;
        earthMat.bumpScale = 0.028;
        earthMat.needsUpdate = true;
    });

    earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    // 2. Camada Sutil de Nuvens Reais em Órbita
    const cloudsGeo = new THREE.SphereGeometry(1.578, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0.28,
        roughness: 1.0,
        depthWrite: false
    });
    loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png', (cloudTex) => {
        cloudsMat.map = cloudTex;
        cloudsMat.alphaMap = cloudTex;
        cloudsMat.needsUpdate = true;
    });
    cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    earthGroup.add(cloudsMesh);

    // 3. Atmosfera Realista via GLSL Shader Fresnel (Brilho suave apenas na curvatura do horizonte)
    const atmosGeo = new THREE.SphereGeometry(1.68, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
                gl_FragColor = vec4(0.38, 0.68, 1.0, 1.0) * intensity * 0.85;
            }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false
    });
    earthGroup.add(new THREE.Mesh(atmosGeo, atmosMat));

    // 4. Anéis Orbitais de Profundidade (Animam quando o mouse passa sobre a Terra)
    depthRingsGroup = new THREE.Group();
    const ringRadii = [1.82, 2.04, 2.28];
    ringRadii.forEach((radius, idx) => {
        const ringGeo = new THREE.RingGeometry(radius, radius + 0.006, 128);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x93c5fd,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.08 - idx * 0.02
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.3 + (idx * 0.14);
        ring.rotation.y = idx * 0.25;
        depthRingsGroup.add(ring);
    });
    earthGroup.add(depthRingsGroup);

    // 5. Marcador Discreto em Montes Claros - MG (-16.7286, -43.8582)
    const mocPos = latLongToVector3(-16.7286, -43.8582, 1.568);
    const pinGeo = new THREE.SphereGeometry(0.022, 16, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd });
    const mocPin = new THREE.Mesh(pinGeo, pinMat);
    mocPin.position.copy(mocPos);
    earthGroup.add(mocPin);

    // 6. Duas Camadas de Estrelas Circulares com Profundidade
    const starTexture = criarTexturaEstrelaCircular();
    starsFar = criarCamadaEstrelas(2400, 110, 0.16, 0.65, starTexture);
    starsNear = criarCamadaEstrelas(600, 65, 0.26, 0.9, starTexture);
    scene.add(starsFar);
    scene.add(starsNear);

    // Rotação inicial apontando para a América do Sul
    earthGroup.rotation.y = -0.65;
    earthGroup.rotation.x = 0.15;

    configurarInteracaoMouseGlobo(canvas);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animarCenaEspacial();
}

function criarCamadaEstrelas(quantidade, dispersao, tamanho, opacidade, textura) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(quantidade * 3);
    for (let i = 0; i < quantidade * 3; i++) {
        pos[i] = (Math.random() - 0.5) * dispersao;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
        color: 0xe2e8f0,
        size: tamanho,
        map: textura,
        transparent: true,
        opacity: opacidade,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    return new THREE.Points(geo, mat);
}

function configurarInteracaoMouseGlobo(canvas) {
    const aura = document.getElementById('mouseDepthAura');

    window.addEventListener('mousemove', (e) => {
        // Atualizar posição da aura de profundidade
        if (aura) {
            aura.style.left = `${e.clientX}px`;
            aura.style.top = `${e.clientY}px`;
        }

        // Coordenadas normalizadas (-1 a +1) para Parallax e Raycast
        mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

        targetParallax.x = mouseNDC.x * 0.22;
        targetParallax.y = mouseNDC.y * 0.16;

        // Se estiver arrastando o globo manualmente
        if (isDraggingGlobe && earthGroup) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            globeVelocity.y = deltaX * 0.005;
            globeVelocity.x = deltaY * 0.003;
            earthGroup.rotation.y += globeVelocity.y;
            earthGroup.rotation.x = Math.max(-0.8, Math.min(0.8, earthGroup.rotation.x + globeVelocity.x));
            previousMousePosition = { x: e.clientX, y: e.clientY };
            return;
        }

        // Verificar se o mouse está em cima da Terra para acionar a animação redonda de profundidade
        if (raycaster && earthMesh && camera && !document.getElementById('authScreen').classList.contains('hidden')) {
            raycaster.setFromCamera(mouseNDC, camera);
            const hits = raycaster.intersectObject(earthMesh);
            const isHovering = hits.length > 0;

            canvas.style.cursor = isHovering ? 'grab' : 'default';
            if (aura) aura.classList.toggle('globe-hover', isHovering);

            if (depthRingsGroup) {
                gsap.to(depthRingsGroup.scale, {
                    x: isHovering ? 1.08 : 1.0,
                    y: isHovering ? 1.08 : 1.0,
                    z: isHovering ? 1.08 : 1.0,
                    duration: 0.6,
                    ease: 'power2.out'
                });
                depthRingsGroup.children.forEach((ring, idx) => {
                    gsap.to(ring.material, {
                        opacity: isHovering ? (0.22 - idx * 0.05) : (0.07 - idx * 0.02),
                        duration: 0.5
                    });
                });
            }
        }
    });

    canvas.addEventListener('mousedown', (e) => {
        if (!raycaster || !earthMesh) return;
        raycaster.setFromCamera(mouseNDC, camera);
        if (raycaster.intersectObject(earthMesh).length > 0) {
            isDraggingGlobe = true;
            canvas.style.cursor = 'grabbing';
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    window.addEventListener('mouseup', () => {
        isDraggingGlobe = false;
    });
}

function latLongToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return new THREE.Vector3(x, y, z);
}

function animarCenaEspacial() {
    requestAnimationFrame(animarCenaEspacial);

    if (earthGroup) {
        if (globeAutoRotate && !isDraggingGlobe) {
            earthGroup.rotation.y += 0.0012;
        }
        // Inércia suave após soltar o clique do mouse
        if (!isDraggingGlobe) {
            earthGroup.rotation.y += globeVelocity.y;
            earthGroup.rotation.x = Math.max(-0.8, Math.min(0.8, earthGroup.rotation.x + globeVelocity.x));
            globeVelocity.x *= 0.92;
            globeVelocity.y *= 0.92;
        }
    }

    if (cloudsMesh) {
        cloudsMesh.rotation.y += 0.00045;
    }

    if (depthRingsGroup) {
        depthRingsGroup.rotation.z += 0.0015;
    }

    // Parallax 3D suave no fundo de estrelas conforme o mouse se move
    if (starsFar && starsNear) {
        starsFar.rotation.y -= 0.00018;
        starsNear.rotation.y -= 0.00032;
        starsNear.position.x += (targetParallax.x - starsNear.position.x) * 0.05;
        starsNear.position.y += (targetParallax.y - starsNear.position.y) * 0.05;
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ================= NAVEGAÇÃO DO LOGO URBS (VOLTAR À TELA INICIAL) =================
function voltarParaTelaInicial() {
    fecharModais();
    const authHidden = document.getElementById('authScreen').classList.contains('hidden');

    // Se o usuário já está dentro do sistema, volta suavemente para a tela inicial do Globo
    if (authHidden) {
        const flash = document.getElementById('atmosphereFlash');
        flash.style.background = '#03060c';
        flash.style.opacity = '1';

        setTimeout(() => {
            document.getElementById('appContainer').classList.add('hidden');
            document.getElementById('authScreen').classList.remove('hidden');
            currentRegisterView = false;
            renderizarContasSalvasNoLogin();
            flash.style.opacity = '0';
            setTimeout(() => {
                flash.style.background = 'radial-gradient(circle, #ffffff 0%, #dbeafe 55%, #0f172a 100%)';
            }, 500);
            animarAproximacaoInicialDaTerra();
        }, 420);
        return;
    }

    // Se estiver na tela de Cadastro, rebobina para a tela inicial de Login
    if (currentRegisterView) {
        rebobinarParaLogin();
    } else {
        // Se já estiver na tela de Login, realinha o globo suavemente
        gsap.to(earthGroup.rotation, { x: 0.15, y: -0.65, duration: 1.1, ease: 'power2.out' });
    }
}

// 1. Animação de Entrada: Aproxima a câmera do espaço profundo até a Terra
function animarAproximacaoInicialDaTerra() {
    if (!camera || !earthGroup) return;
    globeAutoRotate = true;
    currentRegisterView = false;
    camera.position.set(0, 0, 14.5);
    earthGroup.position.set(0, 0, 0);

    const loginPanel = document.getElementById('loginPanel');
    const registerPanel = document.getElementById('registerPanel');
    gsap.set(loginPanel, { opacity: 0, x: 40, pointerEvents: 'none' });
    gsap.set(registerPanel, { opacity: 0, x: -40, pointerEvents: 'none' });

    const tl = gsap.timeline();
    tl.to(camera.position, {
        z: 4.35,
        duration: 2.2,
        ease: 'power3.out'
    })
    .to(earthGroup.position, {
        x: -1.1,
        duration: 1.4,
        ease: 'power2.inOut'
    }, '-=1.1')
    .to(loginPanel, {
        opacity: 1,
        x: 0,
        pointerEvents: 'auto',
        duration: 0.8,
        ease: 'power2.out'
    }, '-=0.6');
}

// 2. Girar para o outro lado da Terra (Cadastro)
function girarParaCadastro() {
    currentRegisterView = true;
    const loginPanel = document.getElementById('loginPanel');
    const registerPanel = document.getElementById('registerPanel');

    gsap.to(loginPanel, {
        opacity: 0,
        x: 50,
        pointerEvents: 'none',
        duration: 0.38,
        ease: 'power2.in'
    });

    gsap.to(earthGroup.rotation, {
        y: earthGroup.rotation.y + Math.PI * 1.25,
        duration: 1.15,
        ease: 'power3.inOut'
    });

    gsap.to(earthGroup.position, {
        x: 1.1,
        duration: 1.15,
        ease: 'power3.inOut'
    });

    gsap.to(registerPanel, {
        opacity: 1,
        x: 0,
        pointerEvents: 'auto',
        duration: 0.65,
        delay: 0.52,
        ease: 'power2.out'
    });
}

// 3. Rebobinar a Terra para o Login
function rebobinarParaLogin() {
    currentRegisterView = false;
    const loginPanel = document.getElementById('loginPanel');
    const registerPanel = document.getElementById('registerPanel');

    gsap.to(registerPanel, {
        opacity: 0,
        x: -50,
        pointerEvents: 'none',
        duration: 0.38,
        ease: 'power2.in'
    });

    gsap.to(earthGroup.rotation, {
        y: earthGroup.rotation.y - Math.PI * 1.25,
        duration: 1.15,
        ease: 'power3.inOut'
    });

    gsap.to(earthGroup.position, {
        x: -1.1,
        duration: 1.15,
        ease: 'power3.inOut'
    });

    gsap.to(loginPanel, {
        opacity: 1,
        x: 0,
        pointerEvents: 'auto',
        duration: 0.65,
        delay: 0.52,
        ease: 'power2.out'
    });
}

// 4. Mergulhar em Montes Claros ao efetuar Login
function mergulharEmMontesClaros(callbackAoEntrar) {
    globeAutoRotate = false;
    const loginPanel = document.getElementById('loginPanel');
    const diveHud = document.getElementById('diveHud');
    const flash = document.getElementById('atmosphereFlash');

    diveHud.classList.remove('hidden');

    gsap.to(loginPanel, {
        opacity: 0,
        scale: 0.94,
        pointerEvents: 'none',
        duration: 0.38
    });

    const tl = gsap.timeline();
    tl.to(earthGroup.position, {
        x: 0,
        y: 0.22,
        duration: 0.9,
        ease: 'power2.inOut'
    }, 0)
    .to(earthGroup.rotation, {
        x: -0.28,
        y: -0.82,
        duration: 1.0,
        ease: 'power2.inOut'
    }, 0)
    .to(camera.position, {
        z: 1.32,
        duration: 1.25,
        ease: 'power3.in'
    }, 0.65)
    .add(() => {
        flash.style.opacity = '1';
    }, 1.55)
    .add(() => {
        diveHud.classList.add('hidden');
        callbackAoEntrar();
        setTimeout(() => {
            flash.style.opacity = '0';
        }, 250);
    }, 1.95);
}

// ================= GESTÃO E ALTERNÂNCIA DE CONTAS =================
function salvarContaNoDispositivo(user, emailUsed) {
    const lista = JSON.parse(localStorage.getItem('urbs_saved_accounts') || '[]');
    const idx = lista.findIndex(a => a.id === user.id || a.email === emailUsed);
    const item = {
        id: user.id,
        name: user.name,
        email: emailUsed || user.email || '',
        role: user.role,
        company_name: user.company_name || null
    };
    if (idx >= 0) {
        lista[idx] = item;
    } else {
        lista.push(item);
    }
    localStorage.setItem('urbs_saved_accounts', JSON.stringify(lista));
}

function renderizarContasSalvasNoLogin() {
    const lista = JSON.parse(localStorage.getItem('urbs_saved_accounts') || '[]');
    const box = document.getElementById('savedAccountsLoginBox');
    const container = document.getElementById('savedAccountsLoginList');
    if (!box || !container) return;

    if (lista.length === 0) {
        box.classList.add('hidden');
        return;
    }

    box.classList.remove('hidden');
    container.innerHTML = lista.map(acc => `
        <button type="button" class="account-chip" onclick="preencherContaSalva('${acc.email}')">
            <span>${acc.name}</span>
        </button>
    `).join('');
}

function preencherContaSalva(email) {
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginPassword').focus();
    notify('Conta selecionada. Digite sua senha para entrar.');
}

function abrirModalContas() {
    const lista = JSON.parse(localStorage.getItem('urbs_saved_accounts') || '[]');
    const container = document.getElementById('accountSwitcherList');

    const roleLabels = {
        citizen: 'Cidadão',
        resolver: 'Empresa Solucionadora',
        master: 'Administrador Master'
    };

    container.innerHTML = lista.map(acc => {
        const isCurrent = currentUser && acc.id === currentUser.id;
        return `
            <div class="account-row ${isCurrent ? 'active-acc' : ''}" onclick="selecionarContaNoModal('${acc.email}', ${isCurrent})">
                <div>
                    <strong>${acc.name}</strong>
                    <div style="font-size:12px; color:#64748b;">${acc.email} • ${roleLabels[acc.role] || acc.role}</div>
                </div>
                <span class="badge-status ${isCurrent ? 'st-resolved' : 'st-in_analysis'}">
                    ${isCurrent ? 'Em uso' : 'Alternar'}
                </span>
            </div>
        `;
    }).join('');

    document.getElementById('modalContas').classList.remove('hidden');
}

function selecionarContaNoModal(email, isCurrent) {
    if (isCurrent) {
        fecharModais();
        return;
    }
    fecharModais();
    fazerLogout(email);
}

function adicionarOutraConta() {
    fecharModais();
    fazerLogout('');
}

// ================= AUTENTICAÇÃO =================
async function fazerLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${BASE_URL}/auth/login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = { ...data.user, email };
            localStorage.setItem('urbs_user', JSON.stringify(currentUser));
            salvarContaNoDispositivo(currentUser, email);

            mergulharEmMontesClaros(() => {
                entrarDiretoNoApp(true);
            });
        } else {
            notify(data.message, 'error');
        }
    } catch (err) {
        notify('Não foi possível conectar ao servidor.', 'error');
    }
}

async function fazerCadastro(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch(`${BASE_URL}/auth/register.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (data.success) {
            notify('Cadastro criado com sucesso!', 'success');
            document.getElementById('formRegister').reset();
            document.getElementById('loginEmail').value = email;
            rebobinarParaLogin();
        } else {
            notify(data.message, 'error');
        }
    } catch (err) {
        notify('Erro ao realizar o cadastro.', 'error');
    }
}

async function fazerLogout(prefillEmail = '') {
    await fetch(`${BASE_URL}/auth/logout.php`, { method: 'POST' });
    localStorage.removeItem('urbs_user');
    currentUser = null;

    const flash = document.getElementById('atmosphereFlash');
    flash.style.background = '#03060c';
    flash.style.opacity = '1';

    setTimeout(() => {
        document.getElementById('appContainer').classList.add('hidden');
        document.getElementById('authScreen').classList.remove('hidden');
        renderizarContasSalvasNoLogin();

        if (prefillEmail) {
            document.getElementById('loginEmail').value = prefillEmail;
            document.getElementById('loginPassword').value = '';
        }

        flash.style.opacity = '0';
        setTimeout(() => {
            flash.style.background = 'radial-gradient(circle, #ffffff 0%, #dbeafe 55%, #0f172a 100%)';
        }, 500);

        animarAproximacaoInicialDaTerra();
    }, 460);
}

// ================= INICIALIZAÇÃO DO SISTEMA =================
function entrarDiretoNoApp(veioDoMergulho = false) {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');

    document.getElementById('userNameDisplay').innerText = currentUser.name;
    document.getElementById('userInitials').innerText = currentUser.name.charAt(0).toUpperCase();

    const roleNames = {
        citizen: 'Cidadão',
        resolver: currentUser.company_name ? `Solucionador • ${currentUser.company_name}` : 'Solucionador',
        master: 'Administrador Master'
    };
    document.getElementById('roleBadge').innerText = roleNames[currentUser.role] || 'Cidadão';

    const isResolverOrMaster = ['resolver', 'master'].includes(currentUser.role);
    document.getElementById('navDashboard').classList.toggle('hidden', !isResolverOrMaster);
    document.getElementById('navParcerias').classList.toggle('hidden', currentUser.role !== 'master');
    document.getElementById('btnSolicitarParceria').classList.toggle('hidden', currentUser.role !== 'citizen');

    inicializarMapaMontesClaros(veioDoMergulho);
    carregarOcorrencias();
}

function mudarVisao(visao) {
    document.getElementById('viewMapa').classList.toggle('hidden', visao !== 'mapa');
    document.getElementById('viewDashboard').classList.toggle('hidden', visao !== 'dashboard');
    document.getElementById('viewParcerias').classList.toggle('hidden', visao !== 'parcerias');

    document.getElementById('navMapa').classList.toggle('active', visao === 'mapa');
    document.getElementById('navDashboard').classList.toggle('active', visao === 'dashboard');
    document.getElementById('navParcerias').classList.toggle('active', visao === 'parcerias');

    if (visao === 'mapa' && map) {
        setTimeout(() => map.invalidateSize(), 150);
        carregarOcorrencias();
    } else if (visao === 'dashboard') {
        carregarDashboard();
    } else if (visao === 'parcerias') {
        carregarSolicitacoesParceria();
    }
}

// ================= MAPA INTERATIVO DE MONTES CLAROS =================
function inicializarMapaMontesClaros(animarChegada = false) {
    if (!map) {
        map = L.map('map', { zoomControl: false }).setView([-16.7286, -43.8582], animarChegada ? 12 : 15);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        tileLayer = L.tileLayer(MAP_SOURCES.light.url, {
            attribution: MAP_SOURCES.light.attribution,
            maxZoom: 19
        }).addTo(map);

        markersLayer = L.layerGroup().addTo(map);

        map.on('click', (e) => {
            const drawerAberto = !document.getElementById('drawerOcorrencia').classList.contains('hidden');
            if (drawerAberto) {
                definirPontoNoMapa(e.latlng.lat, e.latlng.lng, 'Local selecionado');
            }
        });
    } else {
        setTimeout(() => map.invalidateSize(), 100);
    }

    if (animarChegada) {
        setTimeout(() => {
            map.flyTo([-16.7286, -43.8582], 15, { duration: 1.6 });
        }, 200);
    }
}

function trocarCamadaMapa(modo) {
    tileLayer.setUrl(MAP_SOURCES[modo].url);
    document.getElementById('btnLayerLight').classList.toggle('active', modo === 'light');
    document.getElementById('btnLayerSat').classList.toggle('active', modo === 'satellite');
}

function centralizarMontesClaros() {
    if (map) map.flyTo([-16.7286, -43.8582], 15, { duration: 1.2 });
}

function definirPontoNoMapa(lat, lng, origem) {
    selectedCoords = {
        lat: parseFloat(lat.toFixed(7)),
        lng: parseFloat(lng.toFixed(7))
    };

    if (draftMarker) {
        draftMarker.setLatLng([lat, lng]);
    } else {
        const icon = L.divIcon({
            className: '',
            html: `<div class="urbs-pin pin-draft"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        draftMarker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
        draftMarker.on('dragend', (ev) => {
            const pos = ev.target.getLatLng();
            definirPontoNoMapa(pos.lat, pos.lng, 'Marcador ajustado');
        });
    }

    const statusEl = document.getElementById('locationStatusText');
    statusEl.className = 'gps-status ready';
    statusEl.innerText = `${origem}: ${selectedCoords.lat}, ${selectedCoords.lng}`;
}

function usarMeuGPS() {
    if (!navigator.geolocation) {
        notify('Geolocalização não suportada pelo navegador.', 'error');
        return;
    }

    const statusEl = document.getElementById('locationStatusText');
    statusEl.innerText = 'Obtendo coordenadas via GPS...';

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            map.flyTo([lat, lng], 17);
            definirPontoNoMapa(lat, lng, 'GPS capturado');
            notify('Coordenadas GPS obtidas.');
        },
        () => {
            statusEl.innerText = 'Permissão negada. Clique direto no mapa ao lado.';
            notify('Clique no mapa para definir o ponto.', 'error');
        },
        { enableHighAccuracy: true }
    );
}

function iniciarNovaOcorrencia() {
    document.getElementById('drawerOcorrencia').classList.remove('hidden');
    document.getElementById('mapPickBanner').classList.remove('hidden');
}

function fecharDrawerOcorrencia() {
    document.getElementById('drawerOcorrencia').classList.add('hidden');
    document.getElementById('mapPickBanner').classList.add('hidden');
    if (draftMarker) {
        map.removeLayer(draftMarker);
        draftMarker = null;
    }
    selectedCoords = null;
}

function selecionarCategoriaCard(id, el) {
    selectedCategoryId = id;
    document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
}

// ================= CRUD E FEED DE OCORRÊNCIAS =================
async function salvarOcorrencia(e) {
    e.preventDefault();
    if (!selectedCoords) {
        notify('Selecione um ponto no mapa ou use o GPS.', 'error');
        return;
    }

    const payload = {
        title: document.getElementById('occTitle').value,
        description: document.getElementById('occDescription').value,
        category_id: selectedCategoryId,
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lng
    };

    const res = await fetch(`${BASE_URL}/occurrences/create.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
        notify('Ocorrência registrada com sucesso.');
        document.getElementById('formOcorrencia').reset();
        fecharDrawerOcorrencia();
        carregarOcorrencias();
    } else {
        notify(data.message || 'Erro ao registrar.', 'error');
    }
}

function filtrarPorStatusRapido(statusValue, btnEl) {
    document.getElementById('filtroStatus').value = statusValue;
    document.querySelectorAll('.s-pill').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
    carregarOcorrencias();
}

async function carregarOcorrencias() {
    const cat = document.getElementById('filtroCategoria').value;
    const status = document.getElementById('filtroStatus').value;
    const minhas = document.getElementById('filtroMinhas').checked ? '1' : '';

    const params = new URLSearchParams();
    if (cat) params.append('category_id', cat);
    if (status) params.append('status', status);
    if (minhas) params.append('my_occurrences', '1');

    const res = await fetch(`${BASE_URL}/occurrences/list.php?${params.toString()}`);
    if (res.status === 401) {
        localStorage.removeItem('urbs_user');
        location.reload();
        return;
    }

    const result = await res.json();
    if (!result.success) return;

    allOccurrences = result.data || [];
    atualizarMiniContadores();
    renderizarFeedEMarcadores();
}

async function atualizarMiniContadores() {
    const res = await fetch(`${BASE_URL}/occurrences/stats.php`);
    const stats = await res.json();
    if (stats.success) {
        document.getElementById('miniTotal').innerText = stats.counts.total;
        document.getElementById('miniPending').innerText = stats.counts.pending;
        document.getElementById('miniAnalysis').innerText = stats.counts.in_analysis;
        document.getElementById('miniResolved').innerText = stats.counts.resolved;
    }
}

function renderizarFeedEMarcadores() {
    const termo = (document.getElementById('inputBuscaTexto').value || '').toLowerCase();
    const filtradas = allOccurrences.filter(occ =>
        occ.title.toLowerCase().includes(termo) ||
        occ.description.toLowerCase().includes(termo) ||
        occ.category_name.toLowerCase().includes(termo)
    );

    document.getElementById('contadorFeed').innerText = `${filtradas.length} registro(s) mapeado(s)`;

    markersLayer.clearLayers();
    markerById = {};

    const feedEl = document.getElementById('occurrencesFeed');

    if (filtradas.length === 0) {
        feedEl.innerHTML = `
            <div style="text-align:center; padding:40px 16px; color:#64748b; font-size:13px;">
                Nenhuma ocorrência encontrada para os critérios selecionados.
            </div>
        `;
        return;
    }

    feedEl.innerHTML = filtradas.map(occ => `
        <article class="occ-item-card" onclick="focarOcorrenciaNoMapa(${occ.id})">
            <div class="occ-item-head">
                <span class="occ-sector">${occ.category_name}</span>
                <span class="badge-status st-${occ.status}">${STATUS_LABELS[occ.status] || occ.status}</span>
            </div>
            <h4>${occ.title}</h4>
            <p>${occ.description}</p>
            <div class="occ-item-foot">
                <span>${occ.user_name}</span>
                <strong>#${occ.id}</strong>
            </div>
        </article>
    `).join('');

    filtradas.forEach(occ => {
        const lat = parseFloat(occ.latitude);
        const lng = parseFloat(occ.longitude);

        const icon = L.divIcon({
            className: '',
            html: `<div class="urbs-pin pin-${occ.status}"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        const marker = L.marker([lat, lng], { icon }).addTo(markersLayer);
        markerById[occ.id] = { marker, lat, lng };

        const podeExcluir = currentUser.role === 'master' || (occ.user_name === currentUser.name && occ.status === 'pending');

        const popupHtml = `
            <div style="min-width:220px; padding:4px; font-family:'Plus Jakarta Sans',sans-serif;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">${occ.category_name}</span>
                    <span class="badge-status st-${occ.status}">${STATUS_LABELS[occ.status] || occ.status}</span>
                </div>
                <h4 style="margin:0 0 6px; font-size:14px; color:#0f172a;">${occ.title}</h4>
                <p style="margin:0 0 10px; font-size:12.5px; color:#475569;">${occ.description}</p>
                <div style="font-size:11px; color:#64748b; margin-bottom:10px;">
                    Registrado por <strong>${occ.user_name}</strong>
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="abrirHistorico(${occ.id})" class="btn-secondary" style="flex:1; justify-content:center; padding:6px;">
                        Histórico
                    </button>
                    ${podeExcluir ? `
                    <button onclick="excluirOcorrencia(${occ.id})" class="btn-secondary" style="color:#e11d48; border-color:#fecdd3; padding:6px 10px;">
                        <i class="ri-delete-bin-line"></i>
                    </button>` : ''}
                </div>
            </div>
        `;
        marker.bindPopup(popupHtml);
    });
}

function focarOcorrenciaNoMapa(id) {
    const item = markerById[id];
    if (!item) return;
    map.flyTo([item.lat, item.lng], 17, { duration: 1.0 });
    setTimeout(() => item.marker.openPopup(), 350);
}

async function abrirHistorico(occId) {
    const res = await fetch(`${BASE_URL}/occurrences/history.php?occurrence_id=${occId}`);
    const data = await res.json();
    if (!data.success) return;

    const container = document.getElementById('timelineContainer');
    container.innerHTML = data.history.map(h => `
        <div class="timeline-step">
            <span class="badge-status st-${h.new_status}">${STATUS_LABELS[h.new_status] || h.new_status}</span>
            <p>${h.comment || 'Registro inicial.'}</p>
            <small>${h.changed_by} (${h.company_name || h.changed_by_role}) • ${h.created_at}</small>
        </div>
    `).join('');

    document.getElementById('modalHistorico').classList.remove('hidden');
}

async function excluirOcorrencia(occId) {
    if (!confirm('Confirma a exclusão desta ocorrência?')) return;

    const res = await fetch(`${BASE_URL}/occurrences/delete.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occurrence_id: occId })
    });
    const data = await res.json();
    if (data.success) {
        notify('Ocorrência excluída.');
        carregarOcorrencias();
        if (!document.getElementById('viewDashboard').classList.contains('hidden')) {
            carregarDashboard();
        }
    } else {
        notify(data.message, 'error');
    }
}

// ================= PAINEL DE GESTÃO E GRÁFICOS =================
async function carregarDashboard() {
    const resStats = await fetch(`${BASE_URL}/occurrences/stats.php`);
    const stats = await resStats.json();

    if (stats.success) {
        document.getElementById('kpiTotal').innerText = stats.counts.total;
        document.getElementById('kpiPending').innerText = stats.counts.pending;
        document.getElementById('kpiAnalysis').innerText = stats.counts.in_analysis;
        document.getElementById('kpiResolved').innerText = stats.counts.resolved;

        renderizarGraficos(stats);
    }

    const query = currentUser.role === 'resolver' ? '?my_company=1' : '';
    const resList = await fetch(`${BASE_URL}/occurrences/list.php${query}`);
    const list = await resList.json();

    const tbody = document.getElementById('tabelaGestaoBody');
    if (!list.success || list.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; padding:24px;">Nenhuma ocorrência encontrada.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.data.map(occ => `
        <tr>
            <td><strong>#${occ.id}</strong></td>
            <td>
                <strong>${occ.title}</strong>
                <div style="font-size:12px; color:#64748b;">${occ.description}</div>
            </td>
            <td>${occ.category_name}</td>
            <td>${occ.user_name}</td>
            <td><span class="badge-status st-${occ.status}">${STATUS_LABELS[occ.status] || occ.status}</span></td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="btn-secondary" onclick="abrirModalStatus(${occ.id}, '${occ.status}')">
                        Atualizar Status
                    </button>
                    <button class="btn-secondary" onclick="abrirHistorico(${occ.id})">
                        <i class="ri-history-line"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderizarGraficos(stats) {
    if (typeof Chart === 'undefined') return;

    const ctxCat = document.getElementById('chartCategories');
    const ctxStatus = document.getElementById('chartStatus');

    if (chartCatInstance) chartCatInstance.destroy();
    if (chartStatusInstance) chartStatusInstance.destroy();

    const labelsCat = (stats.by_category || []).map(c => c.category_name);
    const dataCat = (stats.by_category || []).map(c => parseInt(c.total));

    chartCatInstance = new Chart(ctxCat, {
        type: 'bar',
        data: {
            labels: labelsCat,
            datasets: [{
                label: 'Ocorrências',
                data: dataCat,
                backgroundColor: '#0f172a',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#475569', font: { size: 11 } }, grid: { display: false } },
                y: { ticks: { color: '#64748b', stepSize: 1 }, grid: { color: '#e2e8f0' } }
            }
        }
    });

    chartStatusInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Pendentes', 'Em Análise', 'Resolvidas', 'Rejeitadas'],
            datasets: [{
                data: [
                    stats.counts.pending,
                    stats.counts.in_analysis,
                    stats.counts.resolved,
                    stats.counts.rejected
                ],
                backgroundColor: ['#d97706', '#0284c7', '#059669', '#e11d48'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#475569', padding: 14 } }
            }
        }
    });
}

function abrirModalStatus(occId, statusAtual) {
    document.getElementById('statusOccId').value = occId;
    document.getElementById('statusNovoValor').value = statusAtual;
    document.getElementById('statusComentario').value = '';
    document.getElementById('modalStatus').classList.remove('hidden');
}

async function confirmarAtualizacaoStatus(e) {
    e.preventDefault();
    const payload = {
        occurrence_id: parseInt(document.getElementById('statusOccId').value),
        status: document.getElementById('statusNovoValor').value,
        comment: document.getElementById('statusComentario').value
    };

    const res = await fetch(`${BASE_URL}/occurrences/update_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
        notify('Status atualizado com sucesso.');
        fecharModais();
        carregarDashboard();
        carregarOcorrencias();
    } else {
        notify(data.message, 'error');
    }
}

// ================= CREDENCIAMENTO DE EMPRESAS =================
function abrirModalParceria() {
    document.getElementById('modalParceria').classList.remove('hidden');
}

async function enviarSolicitacaoParceria(e) {
    e.preventDefault();
    const payload = {
        company_name: document.getElementById('partCompany').value,
        cnpj: document.getElementById('partCnpj').value,
        category_id: parseInt(document.getElementById('partCategory').value),
        justification: document.getElementById('partJustification').value
    };

    const res = await fetch(`${BASE_URL}/partners/request.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
        notify(data.message, 'success');
        fecharModais();
    } else {
        notify(data.message, 'error');
    }
}

async function carregarSolicitacoesParceria() {
    const res = await fetch(`${BASE_URL}/partners/manage.php`);
    const data = await res.json();
    const tbody = document.getElementById('tabelaParceriasBody');

    if (!data.success || data.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#64748b; padding:24px;">Nenhuma solicitação pendente.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.data.map(req => `
        <tr>
            <td><strong>#${req.id}</strong></td>
            <td><strong>${req.company_name}</strong></td>
            <td>${req.cnpj}</td>
            <td>${req.user_name}<br><small style="color:#64748b;">${req.user_email}</small></td>
            <td>${req.category_name}</td>
            <td>${req.justification || '-'}</td>
            <td><span class="badge-status st-${req.status === 'approved' ? 'resolved' : (req.status === 'rejected' ? 'rejected' : 'pending')}">${req.status}</span></td>
            <td>
                ${req.status === 'pending' ? `
                    <button class="btn-secondary" style="color:#065f46; border-color:#a7f3d0;" onclick="decidirParceria(${req.id}, 'approve')">Aprovar</button>
                    <button class="btn-secondary" style="color:#9f1239; border-color:#fecdd3;" onclick="decidirParceria(${req.id}, 'reject')">Rejeitar</button>
                ` : '<span style="color:#64748b; font-size:12px;">Processado</span>'}
            </td>
        </tr>
    `).join('');
}

async function decidirParceria(requestId, action) {
    const res = await fetch(`${BASE_URL}/partners/manage.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action })
    });
    const data = await res.json();
    notify(data.message, data.success ? 'success' : 'error');
    carregarSolicitacoesParceria();
}

function fecharModais() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
}