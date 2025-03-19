# Click Online 2.0

## 📋 Project Overview
Click Online 2.0 is a multiplayer incremental/idle game where players work together to progress through levels, defeat bosses, and unlock achievements. The game features real-time synchronization, team-based gameplay, and various progression systems.

## 🎮 Core Features
- **Multiplayer System**
  - Real-time player synchronization
  - Team-based progression
  - Player contributions tracking
  - Shared resources and achievements

- **Core Gameplay**
  - Click-based progression
  - Auto-clicker system
  - Team level system
  - Virtual currency (coins)
  - Fragments collection

- **Progression Systems**
  - Multiple upgrade tiers
  - Achievement system with categories
  - Prestige mechanics
  - Power-up system
  - Skill tree

- **Special Features**
  - Boss fights
  - Garden system
  - Theme customization
  - Audio system
  - History tracking

## 🛠 Technical Features
- Real-time WebSocket communication
- State management and synchronization
- Persistent game saves
- Event-driven architecture
- Modular code structure
- Character class system
- Equipment system
- Advanced progression tracking

## 📊 Game Systems

### Currency & Resources
- Team Coins
- Fragments
- Experience/Level Progress
- Prestige Points
- Class Tokens
- Equipment Materials
- Skill Points

### Upgrade Systems
- Tier 1/2/3 Upgrades
- Prestige Upgrades
- Garden Upgrades
- Achievement Boosts
- Class-Specific Upgrades
- Equipment Enhancement
- Skill Tree Progression

### Bonus Stats
- Click Power
- Auto Clicker
- Coin Multiplier
- Progress Boost
- Team Synergy
- Shared Rewards
- Achievement Bonus
- Prestige Multiplier
- Power-up Bonus
- Class-Specific Bonuses
- Equipment Stats
- Skill Tree Effects
- Team Composition Bonus

### Interactive Elements
- Click Area
- Boss Battles
- Garden Management
- Power-up Activation
- Skill Tree Navigation

### Character Equipment System
- Weapon Slots (2)
- Armor Slots (3)
- Accessory Slots (3)
- Enhancement System
- Material Collection
- Equipment Rarity Tiers
- Set Bonuses
- Equipment Trading

### Skill System
- Class-Specific Skills
- Active Abilities
- Passive Bonuses
- Skill Point Distribution
- Team Synergy Skills
- Ultimate Abilities
- Skill Combinations

### Team Mechanics
- Class Composition Bonuses
- Team Formation Benefits
- Joint Skills
- Resource Sharing
- Team Achievements
- Guild System Integration

## 🔧 Technical Architecture

### Core Modules
- CoreModule: Game state and core functionality
- InputModule: Player input handling
- UIModule: User interface management
- AudioModule: Sound system
- PrestigeModule: Prestige mechanics
- PowerUpModule: Power-up system
- BossModule: Boss fight mechanics
- GardenModule: Garden system
- PersistenceModule: Save/load functionality
- ThemeModule: Visual theme management
- HistoryModule: Progress tracking
- UtilsModule: Utility functions
- CharacterModule: Character selection and management

### Networking
- WebSocket-based real-time communication
- Delta updates for optimization
- State synchronization
- Event broadcasting

## 🎨 UI Features
- Real-time progress indicators
- Achievement notifications
- Player list
- Team goal display
- Upgrade shop
- Boss fight overlay
- Garden interface
- History overlay
- Prestige skill tree
- Theme customization
- Character selection interface

## 🔄 Game Loop
1. Player clicks generate progress
2. Auto-clickers contribute passive progress
3. Team level increases with progress
4. Coins and materials earned through progression
5. Equipment and skills enhance player power
6. Class abilities provide unique advantages
7. Boss fights require team coordination
8. Achievements unlock through actions
9. Equipment upgrades strengthen characters
10. Prestige system for meta-progression

## 🔐 Save System
- Automatic state persistence
- Multiple player profiles
- Achievement tracking
- Upgrade history
- Garden progress
- Prestige data
- Character selection persistence

## 🚧 Ongoing Development

### Character Selection System
- **New Character Classes**
  - ⚔️ **Warrior**: High click power (25% stronger clicks), 10% decreased auto-clicker efficiency, 10% critical hit chance
  - 🏹 **Archer**: Balanced click power, 20% increased auto-clicker efficiency, 15% double attack chance
  - 🔮 **Mage**: Reduced click power (10% weaker clicks), 50% increased auto-clicker efficiency, 10% area-of-effect attack chance

- **Character Interface**
  - Intuitive character selection screen
  - Class-specific stats and bonuses display
  - Visual character representations with class icons
  - Equipment slots for future expansion (4 left/4 right slots per character)
  - Expandable inventory system for future items

- **Gameplay Impact**
  - Character class affects click power and auto-clicker efficiency
  - Different character bonuses create unique gameplay styles
  - Characters shown in player list with class icons
  - Character selection saved between sessions
  - Real-time synchronization of character selection between players

## 🎯 Future Development
- [ ] New boss types
- [ ] Additional garden seeds
- [ ] More achievements
- [ ] Extended skill tree
- [ ] Improve all game balance
- [ ] Equipment crafting system
- [ ] Guild wars feature
- [ ] Seasonal events
- [ ] PvP arena system
- [ ] Trading marketplace
- [ ] Raid bosses
- [ ] Daily challenges

## 🤝 Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## 📝 License
This project is licensed under the MIT License - see [LICENSE.md](LICENSE.md) for details.