// Enemy classes - various types of enemies in the game
class Enemy extends Entity {
    constructor(x, y, radius, color, speed, health, damage, xpValue) {
        super(x, y, radius, color);
        this.speed = speed;
        this.health = health;
        this.maxHealth = health;
        this.damage = damage;
        this.xpValue = xpValue;
        this.shootCooldown = 0;
        this.shootTimer = Math.random() * this.shootCooldown;
        this.projectileSpeed = 0;
        this.projectileColor = '#FF00FF';
        this.projectileSize = 4.8; // 20% bigger projectiles
    }

    update(dt, player, gameWidth, gameHeight) {
        if (!this.active) return;

        const directionToPlayer = player.position.subtract(this.position).normalize();
        this.velocity = directionToPlayer.multiply(this.speed);
        super.update(dt);

        if (this.shootCooldown > 0 && this.shootTimer <= 0) {
            this.shoot(player.position);
            this.shootTimer = this.shootCooldown;
        } else if (this.shootCooldown > 0) {
            this.shootTimer -= dt;
        }
    }

    shoot(targetPosition) {
        const direction = targetPosition.subtract(this.position).normalize();
        const velocity = direction.multiply(this.projectileSpeed);
        const projectile = new Projectile(
            this.position.x,
            this.position.y,
            this.projectileSize,
            this.projectileColor,
            velocity,
            this.damage
        );
        game.enemyProjectiles.push(projectile);
    }

    takeDamage(amount) {
        this.health -= amount;
        
        // Vampirismo - jogador se cura baseado no dano causado
        if (game.player.hasVampirism) {
            const healAmount = Math.floor(amount * game.player.vampirismRate);
            game.player.health = Math.min(game.player.maxHealth, game.player.health + healAmount);
            game.uiManager.updatePlayerHealth();
        }
        
        if (this.health <= 0) {
            // Lightning Storm trigger
            if (game.player.hasLightningStorm) {
                game.player.lightningKillCount++;
                if (game.player.lightningKillCount >= game.player.lightningThreshold) {
                    game.triggerLightningStorm();
                    game.player.lightningKillCount = 0;
                }
            }
            
            this.destroy(); // Clean up sprite element
            game.player.addXP(this.xpValue);
            game.score += this.xpValue * 10;
            game.uiManager.updateScore(game.score);
            if (Math.random() < 0.05) {
                game.spawnHealthOrb(this.position.x, this.position.y);
            }
        }
    }

    draw(ctx) {
        super.draw(ctx);
        // Health bar - 20% bigger
        ctx.fillStyle = 'grey';
        ctx.fillRect(this.position.x - this.radius, this.position.y - this.radius - 8.4, this.radius * 2, 4.8); // 20% bigger height and offset
        ctx.fillStyle = 'red';
        ctx.fillRect(this.position.x - this.radius, this.position.y - this.radius - 8.4, this.radius * 2 * (this.health / this.maxHealth), 4.8); // 20% bigger
    }
}

class ChaserEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 14.4, '#FF6347', 100, 50, 10, 20); // 20% bigger radius
        this.loadSprite('sprites/melee_enemy.webp');
        this.spriteSize = 28.8; // 20% bigger sprite
    }
}

class ShooterEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 18, '#9370DB', 60, 80, 8, 30); // 20% bigger radius
        this.shootCooldown = 2.5;
        this.projectileSpeed = 200;
        this.projectileDamage = 10;
        this.loadSprite('sprites/ranged_enemy.webp');
        this.spriteSize = 36; // 20% bigger sprite
    }
    
    shoot(targetPosition) {
        const numProjectiles = 3;
        const spreadAngle = Math.PI / 8;
        const baseAngle = targetPosition.subtract(this.position).angle();

        for (let i = 0; i < numProjectiles; i++) {
            const angleOffset = (i - (numProjectiles - 1) / 2) * spreadAngle / (numProjectiles - 1);
            const currentAngle = baseAngle + angleOffset;
            const velocity = Vector2D.fromAngle(currentAngle, this.projectileSpeed);
            const projectile = new Projectile(
                this.position.x,
                this.position.y,
                this.projectileSize,
                this.projectileColor,
                velocity,
                Math.floor(this.projectileDamage * game.difficultyMultiplier)
            );
            game.enemyProjectiles.push(projectile);
        }
    }
}

class BossEnemy extends Enemy {
    constructor(x, y, level) {
        const bossSize = (30 + Math.floor(level / 10) * 5) * 1.2; // 20% bigger boss size
        const bossHealth = 500 + level * 50;
        const bossDamage = 25 + Math.floor(level / 5) * 5;
        const bossXP = 200 + level * 20;
        
        super(x, y, bossSize, '#FF0000', 80, bossHealth, bossDamage, bossXP);
        
        this.level = level;
        this.shootCooldown = 1.0;
        this.projectileSpeed = 250;
        this.projectileDamage = 20 + Math.floor(level / 5) * 5;
        this.projectileSize = 9.6; // 20% bigger projectiles
        this.projectileColor = '#FF4444';
        
        // Load boss sprite and set appropriate size
        this.loadSprite('sprites/boss.webp');
        this.spriteSize = bossSize * 2.4; // 20% bigger boss sprite
        
        // Boss special abilities
        this.chargeSpeed = this.speed * 2.5;
        this.chargeTimer = 0;
        this.chargeCooldown = 5.0;
        this.isCharging = false;
        this.chargeDirection = new Vector2D(0, 0);
        this.chargeDuration = 1.5;
        this.chargeTimeLeft = 0;
        
        // Multi-phase behavior
        this.phase = 1;
        this.maxPhases = Math.min(3, Math.floor(level / 10) + 1);
        this.phaseHealth = this.health / this.maxPhases;
    }
    
    update(dt, player, gameWidth, gameHeight) {
        if (!this.active) return;

        this.chargeTimer += dt;
        
        const currentPhase = Math.ceil(this.health / this.phaseHealth);
        if (currentPhase !== this.phase && currentPhase > 0) {
            this.phase = currentPhase;
            this.onPhaseChange();
        }
        
        if (this.isCharging) {
            this.chargeTimeLeft -= dt;
            this.velocity = this.chargeDirection.multiply(this.chargeSpeed);
            
            if (this.chargeTimeLeft <= 0) {
                this.isCharging = false;
                this.chargeTimer = 0;
            }
        } else if (this.chargeTimer >= this.chargeCooldown) {
            this.startCharge(player);
        } else {
            const directionToPlayer = player.position.subtract(this.position).normalize();
            this.velocity = directionToPlayer.multiply(this.speed * 0.7);
        }
        
        Entity.prototype.update.call(this, dt);
        
        const adjustedShootCooldown = this.shootCooldown / this.phase;
        if (this.shootTimer <= 0) {
            this.shoot(player.position);
            this.shootTimer = adjustedShootCooldown;
        } else {
            this.shootTimer -= dt;
        }
    }
    
    startCharge(player) {
        this.isCharging = true;
        this.chargeTimeLeft = this.chargeDuration;
        this.chargeDirection = player.position.subtract(this.position).normalize();
        game.uiManager.showMessage('Boss está atacando!', 1.5);
    }
    
    onPhaseChange() {
        this.shootCooldown *= 0.8;
        this.chargeCooldown *= 0.9;
        game.uiManager.showMessage(`Boss Fase ${this.maxPhases - this.phase + 1}!`, 2);
    }
    
    shoot(targetPosition) {
        const numProjectiles = 3 + this.phase;
        const spreadAngle = Math.PI / 6;
        const baseAngle = targetPosition.subtract(this.position).angle();

        for (let i = 0; i < numProjectiles; i++) {
            const angleOffset = (i - (numProjectiles - 1) / 2) * spreadAngle / (numProjectiles - 1);
            const currentAngle = baseAngle + angleOffset;
            const velocity = Vector2D.fromAngle(currentAngle, this.projectileSpeed);
            const projectile = new Projectile(
                this.position.x,
                this.position.y,
                this.projectileSize,
                this.projectileColor,
                velocity,
                Math.floor(this.projectileDamage * game.difficultyMultiplier)
            );
            game.enemyProjectiles.push(projectile);
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        
        // Vampirismo - jogador se cura baseado no dano causado
        if (game.player.hasVampirism) {
            const healAmount = Math.floor(amount * game.player.vampirismRate);
            game.player.health = Math.min(game.player.maxHealth, game.player.health + healAmount);
            game.uiManager.updatePlayerHealth();
        }
        
        if (this.health <= 0) {
            // Lightning Storm trigger
            if (game.player.hasLightningStorm) {
                game.player.lightningKillCount++;
                if (game.player.lightningKillCount >= game.player.lightningThreshold) {
                    game.triggerLightningStorm();
                    game.player.lightningKillCount = 0;
                }
            }
            
            this.destroy(); // Clean up sprite element
            game.player.addXP(this.xpValue);
            game.score += this.xpValue * 10;
            game.uiManager.updateScore(game.score);
            game.uiManager.showMessage(`Boss Derrotado! +${this.xpValue} XP`, 3);
            
            // Boss drops multiple health orbs
            for (let i = 0; i < 3; i++) {
                const offsetX = (Math.random() - 0.5) * 60;
                const offsetY = (Math.random() - 0.5) * 60;
                game.spawnHealthOrb(this.position.x + offsetX, this.position.y + offsetY);
            }
        }
    }
    
    draw(ctx) {
        super.draw(ctx);
        
        // Draw boss health bar (20% bigger)
        const barWidth = this.radius * 3.6; // 20% bigger
        const barHeight = 9.6; // 20% bigger
        ctx.fillStyle = 'grey';
        ctx.fillRect(this.position.x - barWidth/2, this.position.y - this.radius - 18, barWidth, barHeight); // 20% bigger offset
        ctx.fillStyle = 'red';
        ctx.fillRect(this.position.x - barWidth/2, this.position.y - this.radius - 18, barWidth * (this.health / this.maxHealth), barHeight);
        
        // Draw boss indicator
        ctx.fillStyle = '#FFD700';
        ctx.font = '14.4px Arial'; // 20% bigger font
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', this.position.x, this.position.y - this.radius - 24); // 20% bigger offset
        
        // Draw charge indicator
        if (this.isCharging) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3.6; // 20% bigger line width
            ctx.beginPath();
            ctx.arc(this.position.x, this.position.y, this.radius + 6, 0, Math.PI * 2); // 20% bigger arc offset
            ctx.stroke();
        }
    }
}
