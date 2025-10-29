import { auth, database, provider, signInWithPopup, signOut, onAuthStateChanged, ref, set, get, update, remove, onValue } from './firebase.js';

// DOM elements
const loginScreen = document.getElementById('login-screen');
const characterSelection = document.getElementById('character-selection');
const characterSheet = document.getElementById('character-sheet');
const loginBtn = document.getElementById('login-btn');
const navItems = document.querySelectorAll('.nav-item');
const adminPanel = document.getElementById('admin-panel');
const adminItems = document.querySelectorAll('.admin-item');
const characterSlots = document.querySelectorAll('.character-slot');
const characterCreateModal = document.getElementById('character-create-modal');
const characterForm = document.getElementById('character-form');
const cancelCreate = document.getElementById('cancel-create');
const adminModal = document.getElementById('admin-modal');
const closeAdmin = document.getElementById('close-admin');
const addAdminItem = document.getElementById('add-admin-item');
const addInventoryModal = document.getElementById('add-inventory-modal');
const inventoryForm = document.getElementById('inventory-form');
const cancelInventory = document.getElementById('cancel-inventory');

// Current user and data
let currentUser = null;
let currentCharacter = null;
let lightMode = false;
let editMode = false;
let currentAdminType = '';
let editingIndex = -1;

// Class base stats formulas
const classBaseStats = {
    'Arcanista': { hpBase: 9, manaBase: 10, staminaBase: 6, staminaStat: 'folego' },
    'Escudeiro': { hpBase: 18, manaBase: 3, staminaBase: 8, staminaStat: 'folego' },
    'Errante': { hpBase: 10, manaBase: 5, staminaBase: 12, staminaStat: 'folego' },
    'Luminar': { hpBase: 9, manaBase: 10, staminaBase: 6, staminaStat: 'essencia' }
};

// Weapons data
const weapons = [
    // Leves
    { name: 'Adaga', damage: '1d4 ou comum 1d6', type: 'Cortante', weight: 1, crit: 'comum 20 — 2x', category: 'Leves' },
    { name: 'Porrete', damage: '1d4 ou comum 1d6', type: 'Contundente', weight: 1, crit: 'comum 20 — 2x', category: 'Leves' },
    { name: 'Punhal Curvo', damage: '1d6 - 1 ou comum 1d8 - 2', type: 'Cortante', weight: 1, crit: 'comum 19 — 3x', category: 'Leves' },
    // Comuns
    { name: 'Espada Curta', damage: '1d8', type: 'Cortante', weight: 1.5, crit: '19 — 2x', category: 'Comuns' },
    { name: 'Maça', damage: '1d8', type: 'Contundente', weight: 2, crit: '20 — 2x', category: 'Comuns' },
    { name: 'Martelo', damage: '1d10', type: 'Contundente', weight: 2.5, crit: '20 — 2x', category: 'Comuns' },
    { name: 'Lança Curta', damage: '1d10', type: 'Perfurante', weight: 2, crit: '20 — 2x', category: 'Comuns' },
    { name: 'Machado de Mão', damage: '1d8 + 2', type: 'Perfurante', weight: 2, crit: '20 — 2x', category: 'Comuns' },
    { name: 'Cimitarra', damage: '1d8 + 1', type: 'Cortante', weight: 1.5, crit: '20 — 3x', category: 'Comuns' },
    // Duas Mãos
    { name: 'Montante', damage: '1d12', type: 'Cortante', weight: 4, crit: '20 — 2x', category: 'Duas Mãos' },
    { name: 'Machado de Batalha', damage: '1d10 + 2', type: 'Cortante', weight: 4, crit: '20 — 2x', category: 'Duas Mãos' },
    { name: 'Martelo Pesado', damage: '1d12', type: 'Contundente', weight: 4, crit: '20 — 2x', category: 'Duas Mãos' },
    { name: 'Maça Grande', damage: '1d12 + 2', type: 'Contundente', weight: 5, crit: '20 — 2x', category: 'Duas Mãos' },
    { name: 'Lança Longa', damage: '1d8 + 4', type: 'Perfurante', weight: 3.5, crit: '19 — 2x', category: 'Duas Mãos' },
    // Técnicas
    { name: 'Katana', damage: '1d10', type: 'Cortante', weight: 2, crit: '19 — 2x', category: 'Técnicas' },
    { name: 'Foice Lunar', damage: '1d6 + 2', type: 'Cortante', weight: 1.5, crit: '19 — 3x', category: 'Técnicas' },
    { name: 'Rapieira', damage: '1d4 + 2', type: 'Perfurante', weight: 2, crit: '18 — 3x', category: 'Técnicas' },
    { name: 'Arco Longo', damage: '1d6', type: 'Perfurante', weight: 1.5, crit: '18 — 2x', category: 'Técnicas' },
    { name: 'Crossbow', damage: '1d6 + 2', type: 'Perfurante', weight: 2, crit: '19 — 2x', category: 'Técnicas' }
];

// Spells data (simplified)
const spells = [
    // Básicos
    { name: 'Raio Arcano', description: 'Concentra energia pura e dispara um feixe direto no alvo.', effect: '1d6 de dano mágico direto. Ignora armaduras físicas.', cost: 3, category: 'Básicos' },
    { name: 'Lâmina Etérea', description: 'Cria uma lâmina de energia arcana que corta o ar.', effect: '1d4 + Arc de dano mágico corpo a corpo.', cost: 2, category: 'Básicos' },
    // Add more spells...
];

const miracles = [];
const skills = [];
const equipment = [];

// Initialize app
function init() {
    // Auth state listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            showCharacterSelection();
            checkAdminAccess();
            loadCharacters();
        } else {
            currentUser = null;
            showLogin();
        }
    });

    // Event listeners
    loginBtn.addEventListener('click', signInWithGoogle);
    navItems.forEach(item => item.addEventListener('click', handleNavClick));
    adminItems.forEach(item => item.addEventListener('click', handleAdminClick));
    characterSlots.forEach(slot => slot.addEventListener('click', handleSlotClick));
    characterForm.addEventListener('submit', handleCharacterCreate);
    cancelCreate.addEventListener('click', () => characterCreateModal.classList.add('hidden'));
    closeAdmin.addEventListener('click', () => adminModal.classList.add('hidden'));
    document.getElementById('close-add-equipment').addEventListener('click', () => document.getElementById('add-equipment-modal').classList.add('hidden'));
    addAdminItem.addEventListener('click', handleAddAdminItem);

    // Stat distribution
    const statInputs = document.querySelectorAll('.stats-distribution input');
    statInputs.forEach(input => input.addEventListener('input', updatePointsRemaining));
}

// Authentication
async function signInWithGoogle() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Error signing in:', error);
    }
}

// Screen management
function showLogin() {
    loginScreen.classList.remove('hidden');
    characterSelection.classList.add('hidden');
    characterSheet.classList.add('hidden');
}

function showCharacterSelection() {
    loginScreen.classList.add('hidden');
    characterSelection.classList.remove('hidden');
    characterSheet.classList.add('hidden');
}

function showCharacterSheet(character) {
    currentCharacter = { ...character };
    if (!currentCharacter.equipment) currentCharacter.equipment = { weapons: [], spells: [], miracles: [], skills: [], equipment: [], inventory: [] };
    loginScreen.classList.add('hidden');
    characterSelection.classList.add('hidden');
    characterSheet.classList.remove('hidden');
    loadCharacterSheet();
}

// Navigation
function handleNavClick(e) {
    const screen = e.target.dataset.screen;
    if (screen === 'characters' || screen === 'back') {
        showCharacterSelection();
    } else if (screen === 'settings' || screen === 'theme-toggle') {
        toggleLightMode();
    }
}

// Admin access
function checkAdminAccess() {
    const adminEmails = ['knapicko@gmail.com', 'messytails4@gmail.com'];
    if (adminEmails.includes(currentUser.email)) {
        adminPanel.classList.remove('hidden');
    } else {
        adminPanel.classList.add('hidden');
    }
}

// Light mode toggle
function toggleLightMode() {
    lightMode = !lightMode;
    document.body.classList.toggle('light-mode', lightMode);
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = lightMode ? 'Modo Escuro' : 'Modo Claro';
    }
}

// Character management
async function loadCharacters() {
    const charactersRef = ref(database, `users/${currentUser.uid}/characters`);
    onValue(charactersRef, (snapshot) => {
        const characters = snapshot.val() || {};
        updateCharacterSlots(characters);
    });
}

function updateCharacterSlots(characters) {
    characterSlots.forEach((slot, index) => {
        const slotNum = index + 1;
        const character = characters[slotNum];
        const slotContent = slot.querySelector('.slot-content');

        if (character) {
            slot.classList.add('created');
            slotContent.textContent = character.name;
            // Add edit button
            if (!slot.querySelector('.edit-btn')) {
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-btn';
                editBtn.textContent = '✏️';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showEditCharacterModal(slotNum, character);
                });
                slot.appendChild(editBtn);
            }
        } else {
            slot.classList.remove('created');
            slotContent.textContent = '+';
            const editBtn = slot.querySelector('.edit-btn');
            if (editBtn) editBtn.remove();
        }
    });
}

function handleSlotClick(e) {
    const slot = e.currentTarget;
    const slotNum = parseInt(slot.dataset.slot);
    const charactersRef = ref(database, `users/${currentUser.uid}/characters/${slotNum}`);
    
    get(charactersRef).then((snapshot) => {
        const character = snapshot.val();
        if (character) {
            showCharacterSheet({ ...character, slot: slotNum });
        } else {
            showCharacterCreateModal(slotNum);
        }
    });
}

function showCharacterCreateModal(slot) {
    document.getElementById('character-create-modal').classList.remove('hidden');
    characterForm.dataset.slot = slot;
    resetCharacterForm();
}

function resetCharacterForm() {
    characterForm.reset();
    updatePointsRemaining();
}

function updatePointsRemaining() {
    const inputs = document.querySelectorAll('.stats-distribution input');
    let total = 7;
    inputs.forEach(input => {
        const value = parseInt(input.value) || 0;
        if (value >= 0) {
            total -= value;
        } else if (value === -1) {
            total += 1; // -1 gives +1 point
        }
    });

    // Cap values to prevent exceeding available points
    inputs.forEach(input => {
        const value = parseInt(input.value) || 0;
        const maxAllowed = value + total + (value === -1 ? 1 : 0);
        input.max = maxAllowed;
        if (parseInt(input.value) > maxAllowed) {
            input.value = maxAllowed;
            // Recalculate total after capping
            total = 7;
            inputs.forEach(inp => {
                const val = parseInt(inp.value) || 0;
                if (val >= 0) {
                    total -= val;
                } else if (val === -1) {
                    total += 1;
                }
            });
        }
    });

    document.getElementById('points-remaining').textContent = `Pontos restantes: ${total}`;

    // Disable submit if points not exactly 7
    const submitBtn = document.querySelector('#character-form button[type="submit"]');
    submitBtn.disabled = total !== 0;
}

async function handleCharacterCreate(e) {
    e.preventDefault();

    // Check if all points are distributed
    const inputs = document.querySelectorAll('.stats-distribution input');
    let total = 7;
    inputs.forEach(input => {
        const value = parseInt(input.value) || 0;
        if (value >= 0) {
            total -= value;
        } else if (value === -1) {
            total += 1;
        }
    });
    if (total !== 0) {
        alert('Você deve distribuir exatamente 7 pontos nos atributos.');
        return;
    }

    const formData = new FormData(characterForm);
    const slot = characterForm.dataset.slot;

    const character = {
        name: formData.get('char-name'),
        class: formData.get('char-class'),
        path: formData.get('char-path'),
        stats: {
            bravura: parseInt(document.getElementById('bravura-input').value) || 0,
            arcana: parseInt(document.getElementById('arcana-input').value) || 0,
            tecnica: parseInt(document.getElementById('tecnica-input').value) || 0,
            folego: parseInt(document.getElementById('folego-input').value) || 0,
            essencia: parseInt(document.getElementById('essencia-input').value) || 0,
            intelecto: parseInt(document.getElementById('intelecto-input').value) || 0
        },
        history: formData.get('char-history'),
        appearance: formData.get('char-appearance'),
        equipment: {
            weapons: [],
            spells: [],
            miracles: [],
            skills: [],
            equipment: [],
            inventory: []
        },
        notes: '',
        coins: 0
    };

    // Check if class is selected
    if (!character.class || character.class === "") {
        alert('Selecione uma classe.');
        return;
    }

    // Calculate base stats
    const baseStats = classBaseStats[character.class];
    if (!baseStats) {
        alert('Classe inválida. Selecione uma classe válida.');
        return;
    }
    character.hp = baseStats.hpBase + character.stats.bravura;
    character.mana = baseStats.manaBase + character.stats.arcana;
    character.stamina = baseStats.staminaBase + character.stats[baseStats.staminaStat];

    // Adjust for negative stats
    Object.keys(character.stats).forEach(stat => {
        if (character.stats[stat] === -1) {
            character.stats[stat] = 0;
        }
    });

    try {
        const characterRef = ref(database, `users/${currentUser.uid}/characters/${slot}`);
        await set(characterRef, character);
        characterCreateModal.classList.add('hidden');
    } catch (error) {
        console.error('Error creating character:', error);
        alert('Erro ao criar personagem. Tente novamente.');
    }
}

// Character sheet
function loadCharacterSheet() {
    if (!currentCharacter) return;

    // Update stats
    document.getElementById('bravura').textContent = currentCharacter.stats.bravura;
    document.getElementById('arcana').textContent = currentCharacter.stats.arcana;
    document.getElementById('tecnica').textContent = currentCharacter.stats.tecnica;
    document.getElementById('folego').textContent = currentCharacter.stats.folego;
    document.getElementById('essencia').textContent = currentCharacter.stats.essencia;
    document.getElementById('intelecto').textContent = currentCharacter.stats.intelecto;

    // Update bars
    updateBars();

    // Load equipment
    loadEquipment();

    // Load history and appearance
    document.getElementById('history').value = currentCharacter.history || '';
    document.getElementById('appearance').value = currentCharacter.appearance || '';

    // Load coins
    document.getElementById('coins').value = currentCharacter.coins || 0;

    // Load edit spans
    document.getElementById('bravura-edit').textContent = currentCharacter.stats.bravura;
    document.getElementById('arcana-edit').textContent = currentCharacter.stats.arcana;
    document.getElementById('tecnica-edit').textContent = currentCharacter.stats.tecnica;
    document.getElementById('folego-edit').textContent = currentCharacter.stats.folego;
    document.getElementById('essencia-edit').textContent = currentCharacter.stats.essencia;
    document.getElementById('intelecto-edit').textContent = currentCharacter.stats.intelecto;
}

function updateBars() {
    const baseStats = classBaseStats[currentCharacter.class];
    const maxHp = baseStats.hpBase + currentCharacter.stats.bravura;
    const maxMana = baseStats.manaBase + currentCharacter.stats.arcana;
    const maxStamina = baseStats.staminaBase + currentCharacter.stats[baseStats.staminaStat];

    const hpPercent = (currentCharacter.hp / maxHp) * 100;
    const manaPercent = (currentCharacter.mana / maxMana) * 100;
    const staminaPercent = (currentCharacter.stamina / maxStamina) * 100;

    document.getElementById('hp-bar').style.width = `${hpPercent}%`;
    document.getElementById('mana-bar').style.width = `${manaPercent}%`;
    document.getElementById('stamina-bar').style.width = `${staminaPercent}%`;

    document.getElementById('hp-text').textContent = `${currentCharacter.hp}/${maxHp}`;
    document.getElementById('mana-text').textContent = `${currentCharacter.mana}/${maxMana}`;
    document.getElementById('stamina-text').textContent = `${currentCharacter.stamina}/${maxStamina}`;
}

function loadEquipment() {
    const equipment = currentCharacter.equipment || {};

    loadEquipmentList('weapons', equipment.weapons || []);
    loadEquipmentList('spells', equipment.spells || []);
    loadEquipmentList('miracles', equipment.miracles || []);
    loadEquipmentList('skills', equipment.skills || []);
    loadEquipmentList('equipment', equipment.equipment || []);

    loadInventory();

    document.getElementById('notes').value = currentCharacter.notes || '';
}

function loadInventory() {
    const inventory = currentCharacter.equipment.inventory || [];
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';
    inventory.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';
        itemDiv.innerHTML = `
            <span>${item.name} (${item.weight}kg) - ${item.description}</span>
            <button onclick="removeInventoryItem(${index})">Remover</button>
        `;
        list.appendChild(itemDiv);
    });
}

function loadEquipmentSummary() {
    const equipment = currentCharacter.equipment || {};
    const list = document.getElementById('equipment-summary-list');
    list.innerHTML = '';
    const types = ['weapons', 'spells', 'miracles', 'skills', 'equipment'];
    types.forEach(type => {
        const items = equipment[type] || [];
        if (items.length > 0) {
            const header = document.createElement('h4');
            header.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            header.style.marginBottom = '0.5rem';
            header.style.color = 'rgb(92, 17, 2)';
            list.appendChild(header);
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'item';
                itemDiv.innerHTML = `<span>${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}</span>`;
                list.appendChild(itemDiv);
            });
        }
    });
}

function loadEquipmentList(type, items) {
    const list = document.getElementById(`${type}-list`);
    list.innerHTML = '';

    items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';
        itemDiv.innerHTML = `
            <span>${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}</span>
            <button onclick="removeEquipment('${type}', ${index})">Remover</button>
        `;
        list.appendChild(itemDiv);
    });
}

// Equipment management
function addEquipment(type) {
    if (type === 'inventory') {
        addInventoryModal.classList.remove('hidden');
    } else {
        showAddEquipmentModal(type);
    }
}

function showAddEquipmentModal(type) {
    const modal = document.getElementById('add-equipment-modal');
    const list = document.getElementById('add-equipment-list');
    const title = document.getElementById('add-equipment-title');
    title.textContent = `Adicionar ${type}`;
    list.innerHTML = '';
    let items = [];
    if (type === 'weapons') items = weapons;
    else if (type === 'spells') items = spells;
    else if (type === 'miracles') items = miracles;
    else if (type === 'skills') items = skills;
    else if (type === 'equipment') items = equipment;
    items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item';
        itemDiv.innerHTML = `
            <span>${item.name}</span>
            <button onclick="addItemToCharacter('${type}', ${index})">Adicionar</button>
        `;
        list.appendChild(itemDiv);
    });
    modal.classList.remove('hidden');
}

function removeEquipment(type, index) {
    const item = currentCharacter.equipment[type][index];
    if (item.quantity > 1) {
        item.quantity--;
    } else {
        currentCharacter.equipment[type].splice(index, 1);
    }
    saveCurrentCharacter();
    loadEquipment();
}

async function saveCurrentCharacter() {
    if (!currentUser) {
        alert('Usuário não logado. Faça login para salvar.');
        return;
    }
    try {
        const characterRef = ref(database, `users/${currentUser.uid}/characters/${currentCharacter.slot}`);
        await update(characterRef, currentCharacter);
    } catch (error) {
        alert('Erro ao salvar no Firebase: ' + error.message);
        // Fallback to localStorage
        localStorage.setItem('character', JSON.stringify(currentCharacter));
    }
}

// Admin functions
function handleAdminClick(e) {
    const action = e.target.dataset.action;
    showAdminModal(action);
}

function showAdminModal(type) {
    adminModal.classList.remove('hidden');
    document.getElementById('admin-modal-title').textContent = `Gerenciar ${type}`;
    loadAdminItems(type);
}

function loadAdminItems(type) {
    const list = document.getElementById('admin-items-list');
    list.innerHTML = '';

    let items = [];
    if (type === 'weapons') items = weapons;
    else if (type === 'spells') items = spells;
    else if (type === 'miracles') items = miracles;
    else if (type === 'skills') items = skills;
    else if (type === 'equipment') items = equipment;

    items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'admin-item-entry';
        itemDiv.innerHTML = `
            <span>${item.name}</span>
            <div class="actions">
                <button onclick="editAdminItem('${type}', ${index})">Editar</button>
                <button onclick="deleteAdminItem('${type}', ${index})">Excluir</button>
            </div>
        `;
        list.appendChild(itemDiv);
    });
}

function handleAddAdminItem() {
    currentAdminType = document.getElementById('admin-modal-title').textContent.split(' ')[1].toLowerCase();
    editingIndex = -1;
    document.getElementById('admin-form-title').textContent = 'Adicionar Item';
    adminForm.style.display = 'block';
}

document.getElementById('edit-character-btn').addEventListener('click', () => {
    editMode = !editMode;
    document.body.classList.toggle('edit-mode', editMode);
    document.getElementById('edit-character-btn').textContent = editMode ? 'Salvar' : 'Editar Ficha';
    if (!editMode) {
        // Save
        currentCharacter.stats.bravura = parseInt(document.getElementById('bravura-edit').textContent) || 0;
        currentCharacter.stats.arcana = parseInt(document.getElementById('arcana-edit').textContent) || 0;
        currentCharacter.stats.tecnica = parseInt(document.getElementById('tecnica-edit').textContent) || 0;
        currentCharacter.stats.folego = parseInt(document.getElementById('folego-edit').textContent) || 0;
        currentCharacter.stats.essencia = parseInt(document.getElementById('essencia-edit').textContent) || 0;
        currentCharacter.stats.intelecto = parseInt(document.getElementById('intelecto-edit').textContent) || 0;
        // Recalculate
        const baseStats = classBaseStats[currentCharacter.class];
        currentCharacter.hp = baseStats.hpBase + currentCharacter.stats.bravura;
        currentCharacter.mana = baseStats.manaBase + currentCharacter.stats.arcana;
        currentCharacter.stamina = baseStats.staminaBase + currentCharacter.stats[baseStats.staminaStat];
        saveCurrentCharacter();
        loadCharacterSheet();
    } else {
        // Load to spans
        document.getElementById('bravura-edit').textContent = currentCharacter.stats.bravura;
        document.getElementById('arcana-edit').textContent = currentCharacter.stats.arcana;
        document.getElementById('tecnica-edit').textContent = currentCharacter.stats.tecnica;
        document.getElementById('folego-edit').textContent = currentCharacter.stats.folego;
        document.getElementById('essencia-edit').textContent = currentCharacter.stats.essencia;
        document.getElementById('intelecto-edit').textContent = currentCharacter.stats.intelecto;
    }
});

// Admin form submit
const adminForm = document.getElementById('admin-form');
const adminItemForm = document.getElementById('admin-item-form');
const cancelAdminForm = document.getElementById('cancel-admin-form');

cancelAdminForm.addEventListener('click', () => {
    adminForm.style.display = 'none';
    adminItemForm.reset();
});

adminItemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('item-name').value;
    const description = document.getElementById('item-description').value;
    const damage = document.getElementById('item-damage').value;
    const cost = parseInt(document.getElementById('item-cost').value);
    const item = { name, description, damage, cost };
    let items = [];
    if (currentAdminType === 'weapons') items = weapons;
    else if (currentAdminType === 'spells') items = spells;
    else if (currentAdminType === 'miracles') items = miracles;
    else if (currentAdminType === 'skills') items = skills;
    else if (currentAdminType === 'equipment') items = equipment;
    if (editingIndex === -1) {
        items.push(item);
    } else {
        items[editingIndex] = item;
    }
    adminForm.style.display = 'none';
    adminItemForm.reset();
    loadAdminItems(currentAdminType);
});

cancelInventory.addEventListener('click', () => addInventoryModal.classList.add('hidden'));

inventoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('inv-name').value;
    const weight = parseFloat(document.getElementById('inv-weight').value) || 0;
    const description = document.getElementById('inv-description').value;
    if (!currentCharacter.equipment.inventory) currentCharacter.equipment.inventory = [];
    currentCharacter.equipment.inventory.push({ name, weight, description });
    saveCurrentCharacter();
    loadInventory();
    addInventoryModal.classList.add('hidden');
    inventoryForm.reset();
});

// Make functions global for onclick
window.removeEquipment = removeEquipment;
window.addItemToCharacter = (type, index) => {
    const quantity = parseInt(prompt('Quantidade:', '1')) || 1;
    let items = [];
    if (type === 'weapons') items = weapons;
    else if (type === 'spells') items = spells;
    else if (type === 'miracles') items = miracles;
    else if (type === 'skills') items = skills;
    const item = { ...items[index], quantity };
    if (!currentCharacter.equipment[type]) currentCharacter.equipment[type] = [];
    currentCharacter.equipment[type].push(item);
    saveCurrentCharacter();
    loadEquipment();
    addEquipmentModal.classList.add('hidden');
};
window.editAdminItem = (type, index) => {
    currentAdminType = type;
    editingIndex = index;
    document.getElementById('admin-form-title').textContent = 'Editar Item';
    let items = [];
    if (type === 'weapons') items = weapons;
    else if (type === 'spells') items = spells;
    else if (type === 'miracles') items = miracles;
    else if (type === 'skills') items = skills;
    else if (type === 'equipment') items = equipment;
    const item = items[index];
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-description').value = item.description || '';
    document.getElementById('item-damage').value = item.damage || '';
    document.getElementById('item-cost').value = item.cost || '';
    adminForm.style.display = 'block';
};
window.deleteAdminItem = (type, index) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
        let items = [];
        if (type === 'weapons') items = weapons;
        else if (type === 'spells') items = spells;
        else if (type === 'miracles') items = miracles;
        else if (type === 'skills') items = skills;
        else if (type === 'equipment') items = equipment;
        items.splice(index, 1);
        loadAdminItems(type);
    }
};

function showEditCharacterModal(slotNum, character) {
    // Simple edit: allow delete or change image (placeholder)
    if (confirm(`Deseja apagar o personagem ${character.name}?`)) {
        const characterRef = ref(database, `users/${currentUser.uid}/characters/${slotNum}`);
        remove(characterRef);
    }
}

// Notes saving
document.getElementById('notes').addEventListener('input', (e) => {
    if (currentCharacter) {
        currentCharacter.notes = e.target.value;
        saveCurrentCharacter();
    }
});

// History and appearance saving
document.getElementById('history').addEventListener('input', (e) => {
    if (currentCharacter) {
        currentCharacter.history = e.target.value;
        saveCurrentCharacter();
    }
});

document.getElementById('appearance').addEventListener('input', (e) => {
    if (currentCharacter) {
        currentCharacter.appearance = e.target.value;
        saveCurrentCharacter();
    }
});

document.getElementById('coins').addEventListener('input', (e) => {
    if (currentCharacter) {
        currentCharacter.coins = parseInt(e.target.value) || 0;
        saveCurrentCharacter();
    }
});

// Stat buttons
document.querySelectorAll('.stat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const stat = e.target.dataset.stat;
        const action = e.target.dataset.action;
        const span = document.getElementById(`${stat}-edit`);
        let value = parseInt(span.textContent) || 0;
        if (action === 'increase') value++;
        else if (action === 'decrease') value--;
        if (value < -1) value = -1;
        span.textContent = value;
    });
});

// Bar buttons
document.querySelectorAll('.bar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const bar = e.target.dataset.bar;
        const action = e.target.dataset.action;
        const baseStats = classBaseStats[currentCharacter.class];
        let max = 0;
        if (bar === 'hp') max = baseStats.hpBase + currentCharacter.stats.bravura;
        else if (bar === 'mana') max = baseStats.manaBase + currentCharacter.stats.arcana;
        else if (bar === 'stamina') max = baseStats.staminaBase + currentCharacter.stats[baseStats.staminaStat];
        let current = currentCharacter[bar];
        if (action === 'increase') current = Math.min(max, current + 1);
        else if (action === 'decrease') current = Math.max(0, current - 1);
        currentCharacter[bar] = current;
        updateBars();
        saveCurrentCharacter();
    });
});

// Add event listeners for add buttons
document.querySelectorAll('.add-item-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const type = e.target.dataset.type;
        addEquipment(type);
    });
});

// Make functions global for onclick
window.removeInventoryItem = (index) => {
    currentCharacter.equipment.inventory.splice(index, 1);
    saveCurrentCharacter();
    loadInventory();
};

// Initialize
init();
