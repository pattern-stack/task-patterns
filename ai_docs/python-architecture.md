# Atomic Architecture v2.1
## Services and Domain Entities Pattern for CRM-Style Applications

### Table of Contents
1. [Philosophy & Principles](#philosophy--principles)
2. [Architecture Overview](#architecture-overview)
3. [Layer Definitions](#layer-definitions)
4. [Services vs Domain Entities](#services-vs-domain-entities)
5. [Data Flow Patterns](#data-flow-patterns)
6. [Schema Architecture](#schema-architecture)
7. [Implementation Patterns](#implementation-patterns)
8. [Testing Architecture](#testing-architecture)
9. [Common Patterns & Anti-Patterns](#common-patterns--anti-patterns)
10. [Migration Guide](#migration-guide)
11. [Reference Implementation](#reference-implementation)

---

## Philosophy & Principles

### Core Tenets

1. **Unidirectional Dependencies**: Dependencies flow downward only (Organisms → Molecules → Features → Atoms)
2. **Single Responsibility**: Each layer has one clear purpose
3. **Clean Boundaries**: No business logic in models, no permissions in services
4. **Explicit Over Implicit**: Clear imports, no magic, predictable behavior
5. **Composition Over Inheritance**: Prefer combining simple pieces over complex hierarchies
6. **Testability First**: Every component must be independently testable
7. **Services Handle Data, Entities Compose**: Features are data services, Molecules create domain entities

### The Four Questions

Every architectural decision should answer:
1. **Where does this belong?** (Which layer?)
2. **What can it import?** (Dependency rules)
3. **Who can use it?** (Consumer rules)
4. **How is it tested?** (Testing strategy)

### The Service/Entity Distinction

- **Services (Features)**: Handle data operations for a specific table/model
- **Domain Entities (Molecules)**: Compose multiple services into cohesive business objects
- **Workflows (Molecules)**: Orchestrate operations across multiple entities

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        ORGANISMS                             │
│                    (User Interfaces)                         │
│    • HTTP APIs  • GraphQL  • CLI  • WebSockets  • MCP      │
└────────────────────────┬────────────────────────────────────┘
                         │ exposes
┌────────────────────────▼────────────────────────────────────┐
│                       MOLECULES                              │
│              (Domain Entities & Workflows)                   │
│    • entities/  - Composed domain objects                   │
│    • apis/      - Permission facades                        │
│    • workflows/ - Cross-entity orchestration                │
└────────────────────────┬────────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────────┐
│                       FEATURES                               │
│                   (Data Services)                            │
│    • Models  • Schemas  • Services  • Repositories          │
└────────────────────────┬────────────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────────────┐
│                        ATOMS                                 │
│                 (Foundation Layer)                           │
│    • Shared  • Data  • Models  • Security  • Validators     │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer Definitions

### 1. Atoms Layer - Foundation Building Blocks

**Purpose**: Provide reusable, domain-agnostic utilities and base functionality

**Structure**:
```
app/atoms/
├── shared/           # Core dependencies
│   ├── settings.py   # Application configuration
│   ├── events.py     # Event system
│   └── infra.py      # Infrastructure utilities
├── data/             # Database layer
│   ├── base.py       # SQLAlchemy Base
│   ├── session.py    # Session management
│   └── mixins.py     # Reusable model mixins
├── models/           # Shared domain types
│   ├── enums.py      # Application-wide enums
│   └── types.py      # Custom type definitions
├── security/         # Auth & security
│   ├── auth.py       # Authentication utilities
│   ├── hashing.py    # Password hashing
│   └── tokens.py     # JWT handling
└── validators/       # Reusable validators
    ├── common.py     # Common field validators
    └── business.py   # Business rule validators
```

**Import Rules**:
- `shared/` imports nothing (it's the foundation)
- Other atoms import from `shared/` only
- No cross-imports between atoms subdirectories
- No imports from features or higher layers

### 2. Features Layer - Data Services

**Purpose**: Implement data operations for specific database models

**Structure**:
```
app/features/{feature}/
├── __init__.py       # Public exports
├── models.py         # SQLAlchemy models (pure data, NO behavior)
├── schemas/          # Pydantic schemas (organized by type)
│   ├── __init__.py   # Re-exports all schemas
│   ├── input.py      # Input schemas (Create, Update, Filter)
│   ├── internal.py   # Internal schemas (InDB)
│   ├── output.py     # Output schemas (Response, Summary, Reference)
│   └── specialized.py # Specialized schemas (Stats, Export, etc.)
├── service.py        # Data operations for this model
└── repository.py     # Complex queries (optional)
```

**Key Principles**:
- **Models**: Pure data representation, NO methods except property getters
- **Services**: Data operations ONLY for their specific model
- **No Cross-Feature Logic**: Services don't know about other features
- **No Permissions**: Services assume permission to operate

**Import Rules**:
- Import from atoms layer only
- No imports from other features
- No imports from molecules or organisms

#### Feature Splitting Decision Framework

**When to Split Features:**

Split into separate features when you have:
1. **Different Business Entities**: Distinct concepts with independent existence (e.g., Player vs PlayerStats)
2. **Independent Lifecycles**: Created, updated, and deleted at different times and rates
3. **Separate Query Patterns**: Often queried independently without needing the related data
4. **Different Bounded Contexts**: Belong to different business domains or could be owned by different teams
5. **Different Data Patterns**: Entity data vs time-series records vs configuration data

**When to Keep in Single Feature:**

Combine into a single feature when you have:
1. **Cohesive Bounded Context**: All models part of the same business concept
2. **Coupled Usage**: Models are typically used together in operations
3. **Shared Lifecycle**: Created and managed in the same workflows
4. **Artificial Separation**: Splitting would create tiny features with high coupling

**Examples:**

✅ **Separate Features:**
```
features/
├── player/           # Player entity (name, team, jersey)
├── player_stats/     # Performance records (per-game stats)
└── player_positions/ # Position assignments
```
Why: Player is an entity, stats are time-series records with independent queries

✅ **Single Feature:**
```
features/
└── auth/
    ├── models.py     # AuthToken, RefreshToken, Session, LoginAttempt
    └── service.py    # All auth-related operations
```
Why: All part of authentication bounded context, used together in auth flows

❌ **Avoid Over-Splitting:**
```
features/
├── access_token/     # Just AccessToken model
├── refresh_token/    # Just RefreshToken model
└── session/          # Just Session model
```
Why: Creates artificial boundaries, high coupling, tiny services

#### Example: Player Features

```python
# features/player/models.py - PURE DATA
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.atoms.data.base import Base

class Player(Base):
    """Pure database representation."""
    __tablename__ = "players"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    team_id: Mapped[UUID] = mapped_column(ForeignKey("teams.id"))
    name: Mapped[str] = mapped_column(String(255))
    jersey_number: Mapped[int]

    # Relationships
    team: Mapped["Team"] = relationship(back_populates="players")
    stats: Mapped[List["PlayerStat"]] = relationship(back_populates="player")
    positions: Mapped[List["PlayerPosition"]] = relationship(back_populates="player")

# features/player/service.py - DATA SERVICE
class PlayerService:
    """Handles player data operations."""

    async def create(
        self,
        db: AsyncSession,
        player_data: PlayerCreate
    ) -> Player:
        """Create a new player."""
        player = Player(**player_data.model_dump())
        db.add(player)
        await db.commit()
        return player

    async def get(self, db: AsyncSession, player_id: UUID) -> Optional[Player]:
        """Get player by ID."""
        return await db.get(Player, player_id)

    async def update(
        self,
        db: AsyncSession,
        player: Player,
        update_data: PlayerUpdate
    ) -> Player:
        """Update player data."""
        for field, value in update_data.model_dump(exclude_unset=True).items():
            setattr(player, field, value)
        await db.commit()
        return player

# features/player_stats/service.py - SEPARATE SERVICE
class PlayerStatsService:
    """Handles player statistics operations."""

    async def get_season_stats(
        self,
        db: AsyncSession,
        player_id: UUID,
        season: int
    ) -> List[PlayerStat]:
        """Get stats for a specific season."""
        result = await db.execute(
            select(PlayerStat)
            .where(PlayerStat.player_id == player_id)
            .where(PlayerStat.season == season)
        )
        return result.scalars().all()

    async def calculate_average(
        self,
        db: AsyncSession,
        player_id: UUID,
        stat_type: str
    ) -> float:
        """Calculate average for a stat type."""
        # Pure data calculation
        pass

# features/player_positions/service.py - SEPARATE SERVICE
class PlayerPositionsService:
    """Handles player position operations."""

    async def get_positions(
        self,
        db: AsyncSession,
        player_id: UUID
    ) -> List[PlayerPosition]:
        """Get all positions for a player."""
        result = await db.execute(
            select(PlayerPosition)
            .where(PlayerPosition.player_id == player_id)
        )
        return result.scalars().all()
```

### 3. Molecules Layer - Domain Entities & Orchestration

**Purpose**: Compose services into domain entities and orchestrate complex operations

**Structure**:
```
app/molecules/
├── entities/         # Domain objects (what users actually use)
│   ├── player.py     # Player entity composing multiple services
│   ├── team.py       # Team entity
│   └── league.py     # League entity
├── apis/             # API Facades (permissions + routing)
│   ├── player_api.py # Player operations with permissions
│   ├── team_api.py   # Team operations with permissions
│   └── league_api.py # League operations with permissions
└── workflows/        # Multi-entity orchestration
    ├── draft_workflow.py     # Player + Team + League
    ├── trade_workflow.py     # Player + Team + Transaction
    └── season_workflow.py    # League + Team + Schedule
```

**Key Evolution**: Domain Entities live in molecules/entities/, not in features!

**Key Principles**:
- **Entities**: Compose multiple services into cohesive objects
- **API Facades**: Add permission layer to entity operations
- **Workflows**: Orchestrate multiple entities for complex operations
- **No Direct Service Access**: External layers use entities, not services

#### Example: Player Entity

```python
# molecules/entities/player.py - THE DOMAIN ENTITY
from app.features.player.service import PlayerService
from app.features.player_stats.service import PlayerStatsService
from app.features.player_positions.service import PlayerPositionsService

class Player:
    """The complete Player domain entity."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._player_service = PlayerService()
        self._stats_service = PlayerStatsService()
        self._positions_service = PlayerPositionsService()

    # Core player operations
    async def get(self, player_id: UUID) -> PlayerModel:
        """Get player data."""
        return await self._player_service.get(self.db, player_id)

    async def create(self, player_data: PlayerCreate) -> PlayerModel:
        """Create new player."""
        return await self._player_service.create(self.db, player_data)

    async def update(self, player_id: UUID, update_data: PlayerUpdate) -> PlayerModel:
        """Update player."""
        player = await self.get(player_id)
        if not player:
            raise NotFoundError("Player not found")
        return await self._player_service.update(self.db, player, update_data)

    # Stats namespace
    @property
    def stats(self) -> 'PlayerStats':
        """Access player statistics."""
        return PlayerStats(self.db, self._stats_service)

    # Positions namespace
    @property
    def positions(self) -> 'PlayerPositions':
        """Access player positions."""
        return PlayerPositions(self.db, self._positions_service)

    # Composite operations that need multiple services
    async def get_complete_profile(self, player_id: UUID) -> PlayerProfile:
        """Get player with all related data."""
        player = await self.get(player_id)
        if not player:
            raise NotFoundError("Player not found")

        current_positions = await self._positions_service.get_positions(self.db, player_id)
        season_stats = await self._stats_service.get_season_stats(
            self.db, player_id, datetime.now().year
        )

        return PlayerProfile(
            player=player,
            positions=current_positions,
            current_season_stats=season_stats
        )

class PlayerStats:
    """Stats namespace for Player entity."""

    def __init__(self, db: AsyncSession, stats_service: PlayerStatsService):
        self.db = db
        self._service = stats_service

    async def last_n_games(self, player_id: UUID, n: int = 10) -> List[PlayerStat]:
        """Get stats for last N games."""
        # Implementation
        pass

    async def season_average(self, player_id: UUID, season: int) -> StatsSummary:
        """Get season averages."""
        stats = await self._service.get_season_stats(self.db, player_id, season)
        # Calculate averages
        return StatsSummary(...)

# molecules/apis/player_api.py - PERMISSION LAYER
class PlayerAPI:
    """External API with permission checks."""

    def __init__(self):
        # Note: We don't initialize entity here, we create per-request with db
        pass

    async def get_player(
        self,
        db: AsyncSession,
        player_id: UUID,
        current_user: User
    ) -> PlayerResponse:
        """Get player with permission check."""
        # Permission check
        if not self._can_view_player(current_user, player_id):
            raise PermissionError("Cannot view player")

        # Create entity with db session
        player_entity = Player(db)

        # Use entity to get data
        player = await player_entity.get(player_id)
        if not player:
            raise NotFoundError("Player not found")

        return PlayerResponse.from_orm(player)

    def _can_view_player(self, user: User, player_id: UUID) -> bool:
        """Check if user can view player."""
        # Permission logic
        return True

# molecules/workflows/trade_workflow.py - MULTI-ENTITY ORCHESTRATION
class TradeWorkflow:
    """Orchestrate player trades between teams."""

    async def execute_trade(
        self,
        db: AsyncSession,
        trade_data: TradeData
    ) -> TradeResult:
        """Execute a trade between teams."""
        # Create entities
        player_entity = Player(db)
        team_entity = Team(db)
        transaction_entity = Transaction(db)

        # Orchestrate the trade
        async with db.begin():
            # Get players
            player1 = await player_entity.get(trade_data.player1_id)
            player2 = await player_entity.get(trade_data.player2_id)

            # Validate teams
            team1 = await team_entity.get(player1.team_id)
            team2 = await team_entity.get(player2.team_id)

            # Create transaction record
            transaction = await transaction_entity.create_trade(
                player1, player2, team1, team2
            )

            # Update player teams
            await player_entity.update(player1.id, PlayerUpdate(team_id=team2.id))
            await player_entity.update(player2.id, PlayerUpdate(team_id=team1.id))

            # Update team rosters
            await team_entity.roster.remove_player(team1.id, player1.id)
            await team_entity.roster.add_player(team1.id, player2.id)
            await team_entity.roster.remove_player(team2.id, player2.id)
            await team_entity.roster.add_player(team2.id, player1.id)

        return TradeResult(transaction=transaction)
```

### 4. Organisms Layer - User Interfaces

**Purpose**: Expose functionality through various interfaces (HTTP, CLI, etc.)

**Structure**:
```
app/organisms/
├── api/                    # HTTP APIs
│   ├── v1/                 # API version 1
│   │   ├── __init__.py     # Router aggregation
│   │   ├── auth.py         # Auth endpoints
│   │   ├── players.py      # Player endpoints
│   │   └── teams.py        # Team endpoints
│   ├── dependencies/       # Shared dependencies
│   │   ├── __init__.py     # Re-exports common deps
│   │   ├── database.py     # Database session deps
│   │   ├── auth.py         # Auth validation deps
│   │   ├── entities.py     # Entity injection deps
│   │   └── pagination.py   # Pagination deps
│   └── middleware/         # HTTP middleware
│       ├── __init__.py
│       ├── cors.py         # CORS configuration
│       └── logging.py      # Request logging
├── cli/                    # Command line interface
│   ├── __init__.py
│   └── commands/
│       ├── auth.py         # Auth CLI commands
│       └── admin.py        # Admin CLI commands
├── graphql/                # GraphQL interface
└── mcp/                    # Model Context Protocol
```

**Key Principles**:
- Thin wrappers around molecules
- NO business logic
- Handle protocol-specific concerns only
- Use dependency injection for entities
- Dependencies organized by concern

**Dependency Organization**:

```python
# organisms/api/dependencies/database.py
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Database session dependency."""
    async with async_session() as session:
        yield session

# organisms/api/dependencies/auth.py
async def get_current_token(
    authorization: str = Header(...)
) -> TokenPayload:
    """Extract and validate token from header."""
    # Token validation logic
    pass

async def get_current_user(
    token: TokenPayload = Depends(get_current_token),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user."""
    # User lookup logic
    pass

class RequirePermissions:
    """Dependency for permission checking."""
    def __init__(self, permissions: list[str]):
        self.permissions = permissions

    async def __call__(
        self,
        user: User = Depends(get_current_user)
    ) -> User:
        # Check permissions
        return user

# organisms/api/dependencies/entities.py
async def get_player_entity(
    db: AsyncSession = Depends(get_db)
) -> Player:
    """Inject Player entity with db session."""
    return Player(db)

async def get_player_api() -> PlayerAPI:
    """Inject Player API facade."""
    return PlayerAPI()

# organisms/api/dependencies/__init__.py
"""Re-export common dependencies for convenience."""
from .database import get_db
from .auth import get_current_user, RequirePermissions
from .entities import get_player_entity, get_player_api

__all__ = [
    "get_db",
    "get_current_user",
    "RequirePermissions",
    "get_player_entity",
    "get_player_api",
]

# organisms/api/v1/players.py
from fastapi import APIRouter, Depends, HTTPException
from app.organisms.api.dependencies import (
    get_db,
    get_current_user,
    get_player_api,
    get_player_entity,
    RequirePermissions
)
from app.molecules.apis.player_api import PlayerAPI
from app.molecules.entities.player import Player

router = APIRouter(prefix="/players", tags=["Players"])

@router.post("/", response_model=PlayerResponse)
async def create_player(
    player_data: PlayerCreate,
    db: AsyncSession = Depends(get_db),
    player_api: PlayerAPI = Depends(get_player_api),
    current_user: User = Depends(get_current_user)
):
    """Create a new player."""
    try:
        return await player_api.create_player(db, player_data, current_user)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

# Using permission dependencies
@router.delete("/{player_id}")
async def delete_player(
    player_id: UUID,
    player_api: PlayerAPI = Depends(get_player_api),
    current_user: User = Depends(RequirePermissions(["admin", "team_manager"]))
):
    """Delete a player (requires admin or team_manager role)."""
    return await player_api.delete_player(player_id, current_user)

# Direct entity usage (for simpler operations)
@router.get("/{player_id}/stats")
async def get_player_stats(
    player_id: UUID,
    player: Player = Depends(get_player_entity),
    current_user: User = Depends(get_current_user)
):
    """Get player statistics."""
    # For read-only operations, might skip API facade
    stats = await player.stats.last_n_games(player_id, n=10)
    return {"stats": stats}
```

---

## Services vs Domain Entities

### The Key Distinction

**Services (Features Layer)**:
- Handle data operations for ONE model/table
- No cross-domain knowledge
- No permission checks
- Pure CRUD + business logic for their data

**Domain Entities (Molecules Layer)**:
- Compose multiple services
- Provide intuitive API (player.stats.last_10_games())
- Handle composite operations
- The "real" objects users interact with

### Visual Representation

```
User Code
    ↓
Domain Entity (Player)
    ├── PlayerService
    ├── PlayerStatsService
    └── PlayerPositionsService
```

### Why This Separation?

1. **Single Responsibility**: Each service handles one table
2. **Composability**: Entities can mix and match services
3. **Testability**: Test services in isolation
4. **Flexibility**: Different entities can use same services differently
5. **Natural API**: `player.stats.average()` vs `player_stats_service.calculate_average()`

---

## Data Flow Patterns

### 1. Request Flow (Top-Down)
```
HTTP Request
    ↓
Organism (validates protocol format)
    ↓ [injects db session]
API Facade (checks permissions)
    ↓ [creates entity with db]
Domain Entity (coordinates services)
    ↓
Service (executes data operation)
    ↓
Model (persists data)
    ↓
Database
```

### 2. Entity Composition
```
Player Entity
    ├── PlayerService (core data)
    ├── PlayerStatsService (statistics)
    └── PlayerPositionsService (positions)

Team Entity
    ├── TeamService (core data)
    ├── TeamRosterService (roster management)
    └── TeamStatsService (team statistics)
```

### 3. Workflow Orchestration
```
TradeWorkflow
    ├── Player Entity
    │   ├── Update player team
    │   └── Record trade stats
    ├── Team Entity
    │   ├── Update roster
    │   └── Validate roster rules
    └── Transaction Entity
        └── Record trade details
```

---

## Schema Architecture

(Same as v2.0 - schemas remain in features)

---

## Implementation Patterns

### 1. Service Pattern (Features)

```python
# features/{feature}/service.py
class {Feature}Service:
    """Pure data operations for {feature}."""

    async def create(
        self,
        db: AsyncSession,
        data: {Feature}Create
    ) -> {Feature}Model:
        """Create a {feature}."""
        # Simple validation
        if await self._exists(db, data.name):
            raise ValueError(f"{Feature} already exists")

        # Create
        entity = {Feature}Model(**data.model_dump())
        db.add(entity)
        await db.commit()
        return entity

    async def get(
        self,
        db: AsyncSession,
        id: UUID
    ) -> Optional[{Feature}Model]:
        """Get by ID."""
        return await db.get({Feature}Model, id)
```

### 2. Entity Pattern (Molecules)

```python
# molecules/entities/{entity}.py
class {Entity}:
    """Domain entity composing multiple services."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._{feature}_service = {Feature}Service()
        self._{related}_service = {Related}Service()

    # Delegate simple operations
    async def get(self, id: UUID) -> {Feature}Model:
        """Get entity."""
        return await self._{feature}_service.get(self.db, id)

    # Composite operations
    async def get_with_related(self, id: UUID) -> {Entity}Complete:
        """Get entity with all related data."""
        entity = await self.get(id)
        related = await self._{related}_service.get_for_entity(self.db, id)
        return {Entity}Complete(entity=entity, related=related)

    # Namespace for related operations
    @property
    def related(self) -> '{Entity}Related':
        """Access related operations."""
        return {Entity}Related(self.db, self._{related}_service)
```

### 3. API Facade Pattern

```python
# molecules/apis/{entity}_api.py
class {Entity}API:
    """External API with permissions."""

    async def get_{entity}(
        self,
        db: AsyncSession,
        id: UUID,
        current_user: User
    ) -> {Entity}Response:
        """Get with permission check."""
        # Check permission
        if not self._can_view(current_user, id):
            raise PermissionError()

        # Create entity and get data
        entity = {Entity}(db)
        data = await entity.get_with_related(id)

        return {Entity}Response.from_complete(data)
```

---

## Testing Architecture

### Test Structure

```
app/__tests__/
├── features/
│   ├── player/
│   │   ├── test_models.py
│   │   ├── test_service.py    # Test data operations
│   │   └── test_schemas.py
│   └── player_stats/
│       └── test_service.py
├── molecules/
│   ├── entities/
│   │   ├── test_player.py     # Test entity composition
│   │   └── test_team.py
│   ├── apis/
│   │   └── test_player_api.py # Test permissions
│   └── workflows/
│       └── test_trade_workflow.py
└── organisms/
    └── api/
        └── test_players.py
```

### Testing Patterns

```python
# Test Service (isolated)
class TestPlayerService:
    async def test_create_player(self, db_session):
        service = PlayerService()
        player = await service.create(
            db_session,
            PlayerCreate(name="Test Player", team_id=uuid4())
        )
        assert player.name == "Test Player"

# Test Entity (composed)
class TestPlayerEntity:
    async def test_get_complete_profile(self, db_session, sample_player):
        player = Player(db_session)
        profile = await player.get_complete_profile(sample_player.id)
        assert profile.player.id == sample_player.id
        assert len(profile.positions) > 0

# Test Workflow (orchestration)
class TestTradeWorkflow:
    async def test_execute_trade(self, db_session, player1, player2):
        workflow = TradeWorkflow()
        result = await workflow.execute_trade(
            db_session,
            TradeData(player1_id=player1.id, player2_id=player2.id)
        )
        assert result.transaction.status == "completed"
```

---

## Common Patterns & Anti-Patterns

### ✅ DO: Services Stay Focused

```python
# GOOD: Service handles one model
class PlayerService:
    async def get(self, db, player_id): ...
    async def update(self, db, player, data): ...

class PlayerStatsService:
    async def get_stats(self, db, player_id): ...
```

### ❌ DON'T: Services Cross Boundaries

```python
# BAD: Service knows about other models
class PlayerService:
    async def get_with_team(self, db, player_id):  # ❌
        player = await self.get(db, player_id)
        team = await db.get(Team, player.team_id)  # ❌ Crossing boundary
```

### ✅ DO: Entities Compose

```python
# GOOD: Entity coordinates services
class Player:
    async def get_with_team(self, player_id):
        player = await self._player_service.get(self.db, player_id)
        team = await self._team_service.get(self.db, player.team_id)
        return PlayerWithTeam(player=player, team=team)
```

### ❌ DON'T: Direct Service Access

```python
# BAD: Organism using service directly
@router.get("/players/{id}")
async def get_player(id: UUID, db: AsyncSession = Depends(get_db)):
    service = PlayerService()  # ❌ Should use entity or API
    return await service.get(db, id)
```

### ✅ DO: Dependency Injection

```python
# GOOD: Inject entities with session
@router.get("/players/{id}")
async def get_player(
    id: UUID,
    player: Player = Depends(get_player_entity)
):
    return await player.get(id)
```

---

## Migration Guide

### From v2.0 to v2.1

1. **Keep Services in Features**
   - No need to rename service.py files
   - Services remain focused on single model

2. **Create Domain Entities in Molecules**
   ```bash
   mkdir -p app/molecules/entities
   touch app/molecules/entities/player.py
   ```

3. **Update Imports**
   ```python
   # Before (direct service use)
   from app.features.player.service import PlayerService

   # After (use entity)
   from app.molecules.entities.player import Player
   ```

4. **Add Dependency Injection**
   ```python
   # Add to organisms/api/deps.py
   async def get_player_entity(db: AsyncSession = Depends(get_db)) -> Player:
       return Player(db)
   ```

---

## Reference Implementation

### Complete Example: Player Management

```python
# features/player/models.py
class Player(Base):
    __tablename__ = "players"
    id: Mapped[UUID] = mapped_column(primary_key=True)
    name: Mapped[str]
    team_id: Mapped[UUID]

# features/player/service.py
class PlayerService:
    """Player data operations."""
    async def get(self, db: AsyncSession, player_id: UUID) -> Optional[Player]:
        return await db.get(Player, player_id)

# features/player_stats/service.py
class PlayerStatsService:
    """Player statistics operations."""
    async def get_season_stats(self, db: AsyncSession, player_id: UUID, season: int):
        # Query logic
        pass

# molecules/entities/player.py
class Player:
    """Complete Player domain entity."""
    def __init__(self, db: AsyncSession):
        self.db = db
        self._player_service = PlayerService()
        self._stats_service = PlayerStatsService()

    async def get(self, player_id: UUID):
        return await self._player_service.get(self.db, player_id)

    @property
    def stats(self):
        return PlayerStats(self.db, self._stats_service)

# molecules/apis/player_api.py
class PlayerAPI:
    """Player API with permissions."""
    async def get_player(self, db: AsyncSession, player_id: UUID, current_user: User):
        if not self._can_view(current_user, player_id):
            raise PermissionError()

        player = Player(db)
        return await player.get(player_id)

# organisms/api/v1/players.py
@router.get("/{player_id}")
async def get_player(
    player_id: UUID,
    player: Player = Depends(get_player_entity)
):
    return await player.get(player_id)
```

---

## Conclusion

Version 2.1 clarifies the distinction between Services and Domain Entities:

1. **Services (Features)**: Pure data operations for single models
2. **Domain Entities (Molecules)**: Composed objects that users actually use
3. **Clear Boundaries**: Services don't know about each other
4. **Natural API**: `player.stats.average()` feels intuitive
5. **Clean Testing**: Each layer can be tested in isolation

This architecture provides the perfect balance between separation of concerns and usability, making it clear where each piece of logic belongs while providing an intuitive API for consumers.
