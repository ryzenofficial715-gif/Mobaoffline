// ============================================
// MOBA OFFLINE 5v5 - FULL GAME ENGINE
// ============================================

// Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
minimapCanvas.width = 150;
minimapCanvas.height = 150;

// Game State
const GAME_STATE = {
    gold: 500,
    score: [0, 0],
    timer: 900, // 15 menit
    isRunning: true,
    isPaused: false,
    gameTime: 0,
    killFeed: [],
    selectedHero: null
};

// Map
const MAP = {
    width: 3000,
    height: 2000,
    towers: [
        { x: 800, y: 300, team: 'player', hp: 3000, maxHp: 3000, atk: 100 },
        { x: 2200, y: 300, team: 'player', hp: 3000, maxHp: 3000, atk: 100 },
        { x: 1500, y: 800, team: 'player', hp: 5000, maxHp: 5000, atk: 150 },
        { x: 800, y: 1700, team: 'enemy', hp: 3000, maxHp: 3000, atk: 100 },
        { x: 2200, y: 1700, team: 'enemy', hp: 3000, maxHp: 3000, atk: 100 },
        { x: 1500, y: 1200, team: 'enemy', hp: 5000, maxHp: 5000, atk: 150 },
    ],
    jungleCamps: [
        { x: 500, y: 800, type: 'wolf', respawnTimer: 0 },
        { x: 2500, y: 1200, type: 'golem', respawnTimer: 0 },
        { x: 1000, y: 1500, type: 'ghost', respawnTimer: 0 },
        { x: 2000, y: 500, type: 'wolf', respawnTimer: 0 },
        { x: 1500, y: 1000, type: 'dragon', respawnTimer: 0 },
    ]
};

// Camera
let camera = {
    x: 0,
    y: 0,
    zoom: 1
};

// Heroes Database
const HERO_DATABASE = {
    tank: {
        name: 'Tigreal',
        hp: 2000, maxHp: 2000,
        atk: 60, def: 30,
        speed: 2.5,
        range: 50,
        color: '#4488ff',
        skills: {
            skill1: { name: 'Shield Bash', damage: 150, cooldown: 8, aoe: 80 },
            skill2: { name: 'Taunt', damage: 50, cooldown: 12, aoe: 120, stun: 1.5 },
            ult: { name: 'Earthquake', damage: 300, cooldown: 30, aoe: 200, stun: 2 }
        }
    },
    assassin: {
        name: 'Hayabusa',
        hp: 1200, maxHp: 1200,
        atk: 120, def: 10,
        speed: 4,
        range: 40,
        color: '#ff44ff',
        skills: {
            skill1: { name: 'Shadow Strike', damage: 200, cooldown: 6, blink: true },
            skill2: { name: 'Smoke Bomb', damage: 0, cooldown: 15, invis: 3 },
            ult: { name: 'Death Mark', damage: 500, cooldown: 25, single: true }
        }
    },
    mage: {
        name: 'Eudora',
        hp: 1000, maxHp: 1000,
        atk: 150, def: 5,
        speed: 2.8,
        range: 200,
        color: '#8844ff',
        skills: {
            skill1: { name: 'Lightning Bolt', damage: 250, cooldown: 5, range: 250 },
            skill2: { name: 'Thunderstorm', damage: 200, cooldown: 10, aoe: 150 },
            ult: { name: 'Chain Lightning', damage: 400, cooldown: 20, chain: 3 }
        }
    },
    marksman: {
        name: 'Miya',
        hp: 900, maxHp: 900,
        atk: 100, def: 8,
        speed: 3.2,
        range: 300,
        color: '#ff8844',
        skills: {
            skill1: { name: 'Arrow Rain', damage: 180, cooldown: 7, aoe: 100 },
            skill2: { name: 'Multi Shot', damage: 150, cooldown: 6, multi: 3 },
            ult: { name: 'Arrow Storm', damage: 350, cooldown: 22, aoe: 250 }
        }
    },
    support: {
        name: 'Rafaela',
        hp: 1100, maxHp: 1100,
        atk: 50, def: 15,
        speed: 3,
        range: 180,
        color: '#44ff88',
        skills: {
            skill1: { name: 'Heal', damage: 0, cooldown: 8, heal: 400, aoe: 120 },
            skill2: { name: 'Speed Boost', damage: 0, cooldown: 12, speedBoost: 3 },
            ult: { name: 'Holy Light', damage: 200, cooldown: 18, heal: 600, aoe: 200 }
        }
    }
};

// Hero Class
class Hero {
    constructor(x, y, type, team, isPlayer = false) {
        const data = HERO_DATABASE[type];
        Object.assign(this, data);
        
        this.x = x;
        this.y = y;
        this.type = type;
        this.team = team;
        this.isPlayer = isPlayer;
        this.alive = true;
        this.level = 1;
        this.exp = 0;
        this.kills = 0;
        this.deaths = 0;
        this.assists = 0;
        
        // Items
        this.items = [];
        
        // Cooldowns
        this.cooldowns = { skill1: 0, skill2: 0, ult: 0 };
        
        // State
        this.target = null;
        this.isMoving = false;
        this.moveTarget = null;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.isRecalling = false;
        this.recallTimer = 0;
        this.isStunned = false;
        this.stunTimer = 0;
        this.isInvisible = false;
        this.invisTimer = 0;
        
        // Respawn
        this.respawnTimer = 0;
        
        // Base position for recall
        this.baseX = x;
        this.baseY = y;
    }
    
    moveTo(tx, ty) {
        if (!this.alive || this.isStunned || this.isRecalling) return;
        
        this.isMoving = true;
        this.moveTarget = { x: tx, y: ty };
        
        let dx = tx - this.x;
        let dy = ty - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
            
            // Stop if close enough
            if (dist < 20) {
                this.isMoving = false;
                this.moveTarget = null;
            }
        }
    }
    
    findTarget(enemies) {
        let nearest = null;
        let minDist = this.range;
        
        enemies.forEach(enemy => {
            if (!enemy.alive || enemy.isInvisible) return;
            let dx = enemy.x - this.x;
            let dy = enemy.y - this.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        });
        
        return nearest;
    }
    
    attack(target) {
        if (!this.alive || this.isStunned || !target || !target.alive) return false;
        
        let dx = target.x - this.x;
        let dy = target.y - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.range && this.attackTimer <= 0) {
            // Calculate damage
            let damage = this.atk;
            
            // Crit chance
            if (this.items.includes('crit') && Math.random() < 0.25) {
                damage *= 2;
            }
            
            // Apply damage
            target.takeDamage(damage, this);
            
            // Lifesteal
            if (this.items.includes('lifesteal')) {
                this.hp = Math.min(this.maxHp, this.hp + damage * 0.15);
            }
            
            this.attackTimer = 0.8; // Attack speed
            return true;
        }
        return false;
    }
    
    takeDamage(damage, source) {
        if (!this.alive) return;
        
        // Defense reduction
        let reducedDamage = damage * (100 / (100 + this.def));
        this.hp -= reducedDamage;
        
        if (this.hp <= 0) {
            this.hp = 0;
            this.die(source);
        }
    }
    
    die(killer) {
        this.alive = false;
        this.deaths++;
        
        if (killer) {
            killer.kills++;
            killer.exp += 100;
            if (killer.team === 'player') {
                GAME_STATE.gold += 200;
            }
        }
        
        // Add to kill feed
        let feedMsg = `${killer ? killer.name : 'Turret'} killed ${this.name}`;
        GAME_STATE.killFeed.unshift({
            msg: feedMsg,
            timer: 3
        });
        if (GAME_STATE.killFeed.length > 5) GAME_STATE.killFeed.pop();
        
        // Respawn timer
        this.respawnTimer = 5 + (this.level * 2);
    }
    
    respawn() {
        this.alive = true;
        this.hp = this.maxHp;
        this.x = this.baseX;
        this.y = this.baseY;
        this.respawnTimer = 0;
    }
    
    useSkill(skillName, enemies, allies) {
        if (!this.alive || this.isStunned) return;
        
        const skill = this.skills[skillName];
        if (!skill) return;
        if (this.cooldowns[skillName] > 0) return;
        
        // Apply skill
        switch(skillName) {
            case 'skill1':
                this.applySkill(skill, enemies, allies);
                this.cooldowns.skill1 = skill.cooldown;
                break;
            case 'skill2':
                this.applySkill(skill, enemies, allies);
                this.cooldowns.skill2 = skill.cooldown;
                break;
            case 'ult':
                this.applySkill(skill, enemies, allies);
                this.cooldowns.ult = skill.cooldown;
                break;
        }
    }
    
    applySkill(skill, enemies, allies) {
        // Damage enemies
        if (skill.damage > 0) {
            enemies.forEach(enemy => {
                if (!enemy.alive) return;
                let dx = enemy.x - this.x;
                let dy = enemy.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < (skill.aoe || skill.range || this.range)) {
                    enemy.takeDamage(skill.damage, this);
                    
                    // Stun
                    if (skill.stun) {
                        enemy.isStunned = true;
                        enemy.stunTimer = skill.stun;
                    }
                }
            });
        }
        
        // Heal allies
        if (skill.heal) {
            [this, ...allies].forEach(ally => {
                if (!ally.alive) return;
                let dx = ally.x - this.x;
                let dy = ally.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < (skill.aoe || 100)) {
                    ally.hp = Math.min(ally.maxHp, ally.hp + skill.heal);
                }
            });
        }
        
        // Blink
        if (skill.blink && this.moveTarget) {
            this.x += (this.moveTarget.x - this.x) * 0.5;
            this.y += (this.moveTarget.y - this.y) * 0.5;
        }
        
        // Invisibility
        if (skill.invis) {
            this.isInvisible = true;
            this.invisTimer = skill.invis;
        }
        
        // Speed boost
        if (skill.speedBoost) {
            this.speed += skill.speedBoost;
            setTimeout(() => { this.speed -= skill.speedBoost; }, 3000);
        }
    }
    
    update(deltaTime, enemies, allies) {
        if (!this.alive) {
            this.respawnTimer -= deltaTime;
            if (this.respawnTimer <= 0) {
                this.respawn();
            }
            return;
        }
        
        // Update timers
        this.attackTimer -= deltaTime;
        this.stunTimer -= deltaTime;
        this.invisTimer -= deltaTime;
        
        Object.keys(this.cooldowns).forEach(key => {
            if (this.cooldowns[key] > 0) {
                this.cooldowns[key] -= deltaTime;
            }
        });
        
        // Stun check
        if (this.stunTimer <= 0) {
            this.isStunned = false;
        }
        
        // Invis check
        if (this.invisTimer <= 0) {
            this.isInvisible = false;
        }
        
        // Recall
        if (this.isRecalling) {
            this.recallTimer -= deltaTime;
            if (this.recallTimer <= 0) {
                this.x = this.baseX;
                this.y = this.baseY;
                this.hp = this.maxHp;
                this.isRecalling = false;
            }
            return;
        }
        
        // Auto-attack if target exists
        if (this.target && this.target.alive) {
            this.attack(this.target);
        }
        
        // Find new target if none
        if (!this.target || !this.target.alive) {
            this.target = this.findTarget(enemies);
        }
        
        // Move to target if exists
        if (this.isMoving && this.moveTarget) {
            this.moveTo(this.moveTarget.x, this.moveTarget.y);
        }
        
        // Auto-move to attack range if target exists
        if (this.target && this.target.alive && !this.isMoving) {
            let dx = this.target.x - this.x;
            let dy = this.target.y - this.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > this.range) {
                this.moveTo(this.target.x, this.target.y);
            }
        }
        
        // Exp and level up
        if (this.exp >= this.level * 200) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.level++;
        this.exp -= (this.level - 1) * 200;
        this.maxHp += 100;
        this.hp = this.maxHp;
        this.atk += 20;
        this.def += 5;
    }
    
    draw(ctx, camera) {
        if (!this.alive || this.isInvisible) return;
        
        let screenX = this.x - camera.x + canvas.width / 2;
        let screenY = this.y - camera.y + canvas.height / 2;
        
        // Don't draw if off screen
        if (screenX < -50 || screenX > canvas.width + 50 ||
            screenY < -50 || screenY > canvas.height + 50) return;
        
        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.team === 'player' ? '#00ff88' : '#ff4444';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // HP Bar
        let hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = '#333';
        ctx.fillRect(screenX - 25, screenY - 40, 50, 6);
        ctx.fillStyle = hpPercent > 0.5 ? '#00ff88' : hpPercent > 0.25 ? '#ffaa00' : '#ff0000';
        ctx.fillRect(screenX - 25, screenY - 40, 50 * hpPercent, 6);
        
        // Name & Level
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.name} Lv.${this.level}`, screenX, screenY - 48);
        
        // Stun indicator
        if (this.isStunned) {
            ctx.fillStyle = 'yellow';
            ctx.font = '20px Arial';
            ctx.fillText('⚡', screenX, screenY - 55);
        }
        
        // Recall indicator
        if (this.isRecalling) {
            ctx.fillStyle = 'cyan';
            ctx.font = '20px Arial';
            ctx.fillText('🔄', screenX, screenY - 55);
        }
    }
}

// Initialize Teams
let playerTeam = [];
let enemyTeam = [];

function initTeams() {
    playerTeam = [
        new Hero(300, 400, 'tank', 'player', true),
        new Hero(400, 500, 'assassin', 'player', false),
        new Hero(500, 600, 'mage', 'player', false),
        new Hero(600, 700, 'marksman', 'player', false),
        new Hero(700, 800, 'support', 'player', false),
    ];
    
    enemyTeam = [
        new Hero(2300, 1200, 'tank', 'enemy', false),
        new Hero(2400, 1300, 'assassin', 'enemy', false),
        new Hero(2500, 1400, 'mage', 'enemy', false),
        new Hero(2600, 1500, 'marksman', 'enemy', false),
        new Hero(2700, 1600, 'support', 'enemy', false),
    ];
}

// AI System
function aiUpdate(deltaTime) {
    enemyTeam.forEach(bot => {
        if (!bot.alive) return;
        
        // Different AI behavior based on type
        switch(bot.type) {
            case 'tank':
                // Push forward aggressively
                let frontHero = findNearestPlayer(bot);
                if (frontHero) {
                    bot.moveTo(frontHero.x, frontHero.y);
                    bot.target = frontHero;
                    if (Math.random() < 0.01) bot.useSkill('skill1', playerTeam, enemyTeam);
                    if (bot.hp < bot.maxHp * 0.3) bot.useSkill('skill2', playerTeam, enemyTeam);
                }
                break;
                
            case 'assassin':
                // Target squishy heroes
                let squishyTarget = findSquishiestPlayer(bot);
                if (squishyTarget && Math.random() < 0.02) {
                    bot.useSkill('skill1', [squishyTarget], enemyTeam);
                    if (Math.random() < 0.3) bot.useSkill('ult', playerTeam, enemyTeam);
                }
                break;
                
            case 'mage':
                // Stay back and poke
                let nearest = findNearestPlayer(bot);
                if (nearest) {
                    if (distance(bot, nearest) > 200) {
                        bot.moveTo(nearest.x, nearest.y);
                    } else {
                        bot.target = nearest;
                        if (Math.random() < 0.02) bot.useSkill('skill1', playerTeam, enemyTeam);
                    }
                }
                break;
                
            case 'marksman':
                // Attack from range
                let target = findNearestPlayer(bot);
                if (target) {
                    bot.target = target;
                    if (Math.random() < 0.015) bot.useSkill('ult', playerTeam, enemyTeam);
                }
                break;
                
            case 'support':
                // Heal allies
                let lowestAlly = findLowestHpAlly(bot);
                if (lowestAlly && lowestAlly.hp < lowestAlly.maxHp * 0.6) {
                    bot.moveTo(lowestAlly.x, lowestAlly.y);
                    bot.useSkill('skill1', playerTeam, enemyTeam);
                }
                break;
        }
    });
}

// Helper functions
function findNearestPlayer(bot) {
    let nearest = null;
    let minDist = Infinity;
    playerTeam.forEach(hero => {
        if (!hero.alive) return;
        let dist = distance(bot, hero);
        if (dist < minDist) {
            minDist = dist;
            nearest = hero;
        }
    });
    return nearest;
}

function findSquishiestPlayer(bot) {
    let squishy = null;
    let minHp = Infinity;
    playerTeam.forEach(hero => {
        if (!hero.alive) return;
        if (hero.hp < minHp && distance(bot, hero) < 400) {
            minHp = hero.hp;
            squishy = hero;
        }
    });
    return squishy;
}

function findLowestHpAlly(bot) {
    let lowest = null;
    let minHpPercent = Infinity;
    enemyTeam.forEach(ally => {
        if (!ally.alive || ally === bot) return;
        let hpPercent = ally.hp / ally.maxHp;
        if (hpPercent < minHpPercent) {
            minHpPercent = hpPercent;
            lowest = ally;
        }
    });
    return lowest;
}

function distance(a, b) {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Draw Minimap
function drawMinimap() {
    minimapCtx.clearRect(0, 0, 150, 150);
    
    // Background
    minimapCtx.fillStyle = 'rgba(0,0,0,0.8)';
    minimapCtx.fillRect(0, 0, 150, 150);
    
    // Scale
    let scaleX = 150 / MAP.width;
    let scaleY = 150 / MAP.height;
    
    // Draw towers
    MAP.towers.forEach(tower => {
        minimapCtx.fillStyle = tower.team === 'player' ? '#00ff88' : '#ff4444';
        minimapCtx.fillRect(tower.x * scaleX - 2, tower.y * scaleY - 2, 4, 4);
    });
    
    // Draw heroes
    [...playerTeam, ...enemyTeam].forEach(hero => {
        if (!hero.alive) return;
        minimapCtx.fillStyle = hero.team === 'player' ? '#00ff88' : '#ff4444';
        minimapCtx.beginPath();
        minimapCtx.arc(hero.x * scaleX, hero.y * scaleY, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    });
    
    // Camera view
    minimapCtx.strokeStyle = 'white';
    minimapCtx.strokeRect(
        camera.x * scaleX - (canvas.width / 2) * scaleX,
        camera.y * scaleY - (canvas.height / 2) * scaleY,
        canvas.width * scaleX,
        canvas.height * scaleY
    );
}

// Game Loop
let lastTime = 0;
let deltaTime = 0;

function gameLoop(timestamp) {
    if (!GAME_STATE.isRunning) return;
    
    deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    if (deltaTime > 0.1) deltaTime = 0.1; // Cap deltaTime
    
    update();
    render();
    
    requestAnimationFrame(gameLoop);
}

function update() {
    // Update game time
    GAME_STATE.gameTime += deltaTime;
    GAME_STATE.timer = Math.max(0, 900 - GAME_STATE.gameTime);
    
    // Update camera to follow first player
    if (playerTeam[0] && playerTeam[0].alive) {
        camera.x += (playerTeam[0].x - camera.x) * 5 * deltaTime;
        camera.y += (playerTeam[0].y - camera.y) * 5 * deltaTime;
    }
    
    // Clamp camera
    camera.x = Math.max(canvas.width / 2, Math.min(MAP.width - canvas.width / 2, camera.x));
    camera.y = Math.max(canvas.height / 2, Math.min(MAP.height - canvas.height / 2, camera.y));
    
    // Update heroes
    playerTeam.forEach(hero => hero.update(deltaTime, enemyTeam, playerTeam));
    enemyTeam.forEach(hero => hero.update(deltaTime, playerTeam, enemyTeam));
    
    // AI Update
    aiUpdate(deltaTime);
    
    // Update kill feed
    GAME_STATE.killFeed.forEach(entry => entry.timer -= deltaTime);
    GAME_STATE.killFeed = GAME_STATE.killFeed.filter(entry => entry.timer > 0);
    
    // Check win condition
    let playersAlive = playerTeam.filter(h => h.alive).length;
    let enemiesAlive = enemyTeam.filter(h => h.alive).length;
    
    if (enemiesAlive === 0) {
        GAME_STATE.score[0]++;
        GAME_STATE.gold += 1000;
        resetRound('victory');
    }
    
    if (playersAlive === 0) {
        GAME_STATE.score[1]++;
        resetRound('defeat');
    }
    
    // Timer end
    if (GAME_STATE.timer <= 0) {
        if (GAME_STATE.score[0] > GAME_STATE.score[1]) {
            endGame('victory');
        } else {
            endGame('defeat');
        }
    }
    
    // Update UI
    updateUI();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw map background
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw lanes
    ctx.strokeStyle = '#2a3a2a';
    ctx.lineWidth = 60;
    
    // Top lane
    ctx.beginPath();
    ctx.moveTo(0 - camera.x + canvas.width/2, 400 - camera.y + canvas.height/2);
    ctx.lineTo(MAP.width - camera.x + canvas.width/2, 400 - camera.y + canvas.height/2);
    ctx.stroke();
    
    // Mid lane
    ctx.beginPath();
    ctx.moveTo(0 - camera.x + canvas.width/2, 1000 - camera.y + canvas.height/2);
    ctx.lineTo(MAP.width - camera.x + canvas.width/2, 1000 - camera.y + canvas.height/2);
    ctx.stroke();
    
    // Bot lane
    ctx.beginPath();
    ctx.moveTo(0 - camera.x + canvas.width/2, 1600 - camera.y + canvas.height/2);
    ctx.lineTo(MAP.width - camera.x + canvas.width/2, 1600 - camera.y + canvas.height/2);
    ctx.stroke();
    
    // Draw towers
    MAP.towers.forEach(tower => {
        let sx = tower.x - camera.x + canvas.width / 2;
        let sy = tower.y - camera.y + canvas.height / 2;
        
        ctx.fillStyle = tower.team === 'player' ? '#00ff8844' : '#ff444444';
        ctx.fillRect(sx - 30, sy - 30, 60, 60);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(sx - 30, sy - 30, 60, 60);
        
        // Tower HP
        ctx.fillStyle = '#333';
        ctx.fillRect(sx - 30, sy - 40, 60, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(sx - 30, sy - 40, 60 * (tower.hp / tower.maxHp), 5);
    });
    
    // Draw heroes (sorted by Y for depth)
    let allHeroes = [...playerTeam, ...enemyTeam].filter(h => h.alive);
    allHeroes.sort((a, b) => a.y - b.y);
    allHeroes.forEach(hero => hero.draw(ctx, camera));
    
    // Draw minimap
    drawMinimap();
    
    // Draw kill feed
    let feedDiv = document.getElementById('kill-feed');
    feedDiv.innerHTML = GAME_STATE.killFeed.map(entry => 
        `<div class="kill-entry">${entry.msg}</div>`
    ).join('');
}

function updateUI() {
    document.getElementById('gold-display').textContent = `💰 ${Math.floor(GAME_STATE.gold)}`;
    document.getElementById('score-display').textContent = 
        `🏆 ${GAME_STATE.score[0]} - ${GAME_STATE.score[1]}`;
    document.getElementById('timer-display').textContent = 
        `⏱️ ${Math.floor(GAME_STATE.timer / 60)}:${String(Math.floor(GAME_STATE.timer % 60)).padStart(2, '0')}`;
    
    // Update cooldowns
    if (GAME_STATE.selectedHero && GAME_STATE.selectedHero.alive) {
        ['skill1', 'skill2', 'ult'].forEach(skill => {
            let cd = GAME_STATE.selectedHero.cooldowns[skill];
            let cdElement = document.querySelector(`#skill-${skill === 'ult' ? 'ult' : skill} .cooldown`);
            if (cd > 0) {
                cdElement.classList.add('show');
                cdElement.textContent = Math.ceil(cd);
            } else {
                cdElement.classList.remove('show');
            }
        });
    }
}

function resetRound(result) {
    setTimeout(() => {
        playerTeam.forEach(h => { h.alive = true; h.hp = h.maxHp; h.respawnTimer = 0; });
        enemyTeam.forEach(h => { h.alive = true; h.hp = h.maxHp; h.respawnTimer = 0; });
        GAME_STATE.gold += 300;
    }, 3000);
}

function endGame(result) {
    GAME_STATE.isRunning = false;
    let resultDiv = document.getElementById('game-over');
    let resultText = document.getElementById('result-text');
    
    resultDiv.classList.add('show');
    resultText.textContent = result === 'victory' ? 'VICTORY!' : 'DEFEAT';
    resultText.className = result === 'victory' ? 'victory' : 'defeat';
}

// Touch & Control Handlers
let joystickActive = false;
let joystickVector = { x: 0, y: 0 };

// Joystick
document.getElementById('joystick-base').addEventListener('touchstart', (e) => {
    e.preventDefault();
    joystickActive = true;
    handleJoystick(e.touches[0]);
});

document.getElementById('joystick-base').addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (joystickActive) handleJoystick(e.touches[0]);
});

document.getElementById('joystick-base').addEventListener('touchend', () => {
    joystickActive = false;
    joystickVector = { x: 0, y: 0 };
    document.getElementById('joystick-thumb').style.transform = 'translate(0px, 0px)';
    
    // Stop player movement
    playerTeam[0].isMoving = false;
    playerTeam[0].moveTarget = null;
});

function handleJoystick(touch) {
    let base = document.getElementById('joystick-base');
    let rect = base.getBoundingClientRect();
    let centerX = rect.left + rect.width / 2;
    let centerY = rect.top + rect.height / 2;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    let maxDist = 40;
    
    if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
    }
    
    joystickVector = {
        x: dx / maxDist,
        y: dy / maxDist
    };
    
    document.getElementById('joystick-thumb').style.transform = 
        `translate(${dx}px, ${dy}px)`;
    
    // Move player
    if (playerTeam[0] && playerTeam[0].alive) {
        let hero = playerTeam[0];
        hero.isMoving = true;
        hero.moveTarget = {
            x: hero.x + joystickVector.x * 200,
            y: hero.y + joystickVector.y * 200
        };
    }
}

// Skill buttons
document.getElementById('skill-atk').addEventListener('click', () => {
    if (!playerTeam[0] || !playerTeam[0].alive) return;
    let target = playerTeam[0].findTarget(enemyTeam);
    if (target) playerTeam[0].attack(target);
});

document.getElementById('skill1').addEventListener('click', () => {
    if (!playerTeam[0] || !playerTeam[0].alive) return;
    playerTeam[0].useSkill('skill1', enemyTeam, playerTeam);
});

document.getElementById('skill2').addEventListener('click', () => {
    if (!playerTeam[0] || !playerTeam[0].alive) return;
    playerTeam[0].useSkill('skill2', enemyTeam, playerTeam);
});

document.getElementById('skill-ult').addEventListener('click', () => {
    if (!playerTeam[0] || !playerTeam[0].alive) return;
    playerTeam[0].useSkill('ult', enemyTeam, playerTeam);
});

// Recall
document.getElementById('btn-recall').addEventListener('click', () => {
    if (!playerTeam[0] || !playerTeam[0].alive) return;
    playerTeam[0].isRecalling = true;
    playerTeam[0].recallTimer = 5;
    setTimeout(() => {
        playerTeam[0].isRecalling = false;
    }, 5000);
});

// Shop
document.getElementById('btn-shop').addEventListener('click', () => {
    document.getElementById('shop-panel').classList.toggle('show');
});

document.getElementById('close-shop').addEventListener('click', () => {
    document.getElementById('shop-panel').classList.remove('show');
});

// Shop items
document.querySelectorAll('.shop-item').forEach(button => {
    button.addEventListener('click', () => {
        let item = button.dataset.item;
        let prices = { sword: 300, armor: 400, boots: 250, crit: 600, lifesteal: 500, ultimate: 1000 };
        
        if (GAME_STATE.gold >= prices[item] && !button.classList.contains('bought')) {
            GAME_STATE.gold -= prices[item];
            button.classList.add('bought');
            
            // Apply item effect
            if (playerTeam[0]) {
                switch(item) {
                    case 'sword': playerTeam[0].atk += 50; break;
                    case 'armor': playerTeam[0].maxHp += 500; playerTeam[0].hp += 500; break;
                    case 'boots': playerTeam[0].speed += 2; break;
                    case 'crit': playerTeam[0].items.push('crit'); break;
                    case 'lifesteal': playerTeam[0].items.push('lifesteal'); break;
                    case 'ultimate': playerTeam[0].skills.ult.damage += 200; break;
                }
            }
        }
    });
});

// Restart
document.getElementById('btn-restart').addEventListener('click', () => {
    location.reload();
});

// Initialize and Start
window.addEventListener('load', () => {
    initTeams();
    GAME_STATE.selectedHero = playerTeam[0];
    
    // Hide loading
    setTimeout(() => {
        document.body.classList.add('loaded');
        requestAnimationFrame(gameLoop);
    }, 2000);
});

// Handle resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
